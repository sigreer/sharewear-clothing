#!/usr/bin/env node
/**
 * Render Engine Health Check Script
 *
 * Performs a comprehensive health check of the render engine system:
 * - Python environment (Python 3, Pillow, Blender)
 * - Database connectivity and templates
 * - Python scripts availability
 * - Service integration
 * - File system permissions
 *
 * Usage:
 *   node health-check.js [--json] [--verbose]
 *
 * Options:
 *   --json     Output results as JSON
 *   --verbose  Show detailed output
 *   --help     Show this help message
 *
 * Exit codes:
 *   0: System is healthy
 *   1: Health check failed
 *   2: Script execution error
 */

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

/**
 * Format colored output
 */
function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Execute a command and return result
 */
function executeCommand(command, args, timeout = 10000) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const child = spawn(command, args, {
      shell: false,
      timeout,
    });

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({
        success: code === 0 && !timedOut,
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut,
      });
    });

    child.on("error", (error) => {
      resolve({
        success: false,
        exitCode: -1,
        stdout: "",
        stderr: error.message,
        timedOut: false,
      });
    });

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch (error) {
          // Process may have already exited
        }
      }, 1000);
    }, timeout);

    child.on("close", () => {
      clearTimeout(timeoutHandle);
    });
  });
}

/**
 * Check Python environment
 */
async function checkPythonEnvironment(verbose) {
  if (verbose) {
    console.log(colorize("\n→ Checking Python environment...", "cyan"));
  }

  const checks = {
    python: false,
    pythonVersion: null,
    pillow: false,
    pillowVersion: null,
    blender: false,
    blenderVersion: null,
  };

  // Check Python 3
  const pythonResult = await executeCommand("python3", ["--version"]);
  if (pythonResult.success) {
    checks.python = true;
    checks.pythonVersion = pythonResult.stdout || pythonResult.stderr;
    if (verbose) {
      console.log(colorize(`  ✓ Python: ${checks.pythonVersion}`, "green"));
    }
  } else if (verbose) {
    console.log(colorize(`  ✗ Python 3 not found`, "red"));
  }

  // Check Pillow
  const pillowResult = await executeCommand("python3", [
    "-c",
    "import PIL; print(PIL.__version__)",
  ]);
  if (pillowResult.success) {
    checks.pillow = true;
    checks.pillowVersion = pillowResult.stdout;
    if (verbose) {
      console.log(colorize(`  ✓ Pillow: ${checks.pillowVersion}`, "green"));
    }
  } else if (verbose) {
    console.log(colorize(`  ✗ Pillow not found`, "red"));
  }

  // Check Blender
  const blenderResult = await executeCommand("blender", ["--version"], 15000);
  if (blenderResult.success) {
    checks.blender = true;
    const versionMatch = blenderResult.stdout.match(/Blender (\d+\.\d+\.\d+)/i);
    checks.blenderVersion = versionMatch ? versionMatch[1] : "unknown";
    if (verbose) {
      console.log(colorize(`  ✓ Blender: ${checks.blenderVersion}`, "green"));
    }
  } else if (verbose) {
    console.log(colorize(`  ✗ Blender not found`, "red"));
  }

  const healthy = checks.python && checks.pillow && checks.blender;

  return {
    healthy,
    checks,
    message: healthy
      ? "Python environment is ready"
      : "Python environment has missing dependencies",
  };
}

/**
 * Check database and templates
 */
async function checkDatabaseAndTemplates(verbose) {
  if (verbose) {
    console.log(colorize("\n→ Checking database and templates...", "cyan"));
  }

  try {
    const { MedusaApp } = await import("@medusajs/framework/application");
    const app = await MedusaApp.create({}, {});
    const container = app.container;

    const renderEngineService = container.resolve("renderEngineService");

    if (verbose) {
      console.log(colorize("  ✓ Database connection successful", "green"));
    }

    // Get templates
    const templates = await renderEngineService.listRenderTemplates();

    const templateCount = templates.length;
    const activeTemplates = templates.filter((t) => t.is_active).length;

    // Check for missing files
    const projectRoot = path.resolve(__dirname, "../../../..");
    let missingFiles = 0;

    templates.forEach((template) => {
      const templateImagePath = path.join(projectRoot, template.template_image_path);
      const blendFilePath = path.join(projectRoot, template.blend_file_path);

      if (!fs.existsSync(templateImagePath)) {
        missingFiles++;
        if (verbose) {
          console.log(
            colorize(`  ✗ Missing: ${template.template_image_path}`, "red")
          );
        }
      }

      if (!fs.existsSync(blendFilePath)) {
        missingFiles++;
        if (verbose) {
          console.log(colorize(`  ✗ Missing: ${template.blend_file_path}`, "red"));
        }
      }
    });

    if (verbose) {
      console.log(
        colorize(`  ✓ Templates: ${templateCount} total, ${activeTemplates} active`, "green")
      );
      if (missingFiles === 0) {
        console.log(colorize(`  ✓ All template files present`, "green"));
      }
    }

    // Cleanup
    if (container && container.dispose) {
      await container.dispose();
    }

    const healthy = templateCount > 0 && missingFiles === 0;

    return {
      healthy,
      templateCount,
      activeTemplates,
      missingFiles,
      message:
        templateCount === 0
          ? "No templates found in database"
          : missingFiles > 0
          ? `${missingFiles} template file(s) missing`
          : "Database and templates are ready",
    };
  } catch (error) {
    if (verbose) {
      console.log(
        colorize(`  ✗ Database check failed: ${error.message}`, "red")
      );
    }
    return {
      healthy: false,
      error: error.message,
      message: `Database check failed: ${error.message}`,
    };
  }
}

/**
 * Check Python scripts
 */
async function checkPythonScripts(verbose) {
  if (verbose) {
    console.log(colorize("\n→ Checking Python scripts...", "cyan"));
  }

  const projectRoot = path.resolve(__dirname, "../../../..");
  const scripts = [
    { name: "compose_design.py", path: path.join(projectRoot, "compose_design.py") },
    { name: "render_design.py", path: path.join(projectRoot, "render_design.py") },
  ];

  let allFound = true;
  let allValid = true;
  const results = [];

  for (const script of scripts) {
    const exists = fs.existsSync(script.path);

    if (!exists) {
      allFound = false;
      if (verbose) {
        console.log(colorize(`  ✗ Script not found: ${script.name}`, "red"));
      }
      results.push({ name: script.name, found: false, valid: false });
      continue;
    }

    // Test script syntax
    const result = await executeCommand("python3", ["-m", "py_compile", script.path]);

    if (result.success) {
      if (verbose) {
        console.log(colorize(`  ✓ Script valid: ${script.name}`, "green"));
      }
      results.push({ name: script.name, found: true, valid: true });
    } else {
      allValid = false;
      if (verbose) {
        console.log(colorize(`  ✗ Script has errors: ${script.name}`, "red"));
      }
      results.push({ name: script.name, found: true, valid: false });
    }
  }

  const healthy = allFound && allValid;

  return {
    healthy,
    scripts: results,
    message: healthy
      ? "All Python scripts are valid"
      : !allFound
      ? "Some Python scripts are missing"
      : "Some Python scripts have syntax errors",
  };
}

/**
 * Check file system permissions
 */
async function checkFileSystemPermissions(verbose) {
  if (verbose) {
    console.log(colorize("\n→ Checking file system permissions...", "cyan"));
  }

  const projectRoot = path.resolve(__dirname, "../../../..");
  const testDirs = [
    { name: "uploads", path: path.join(projectRoot, "apps/server/static/uploads") },
    { name: "renders", path: path.join(projectRoot, "apps/server/static/renders") },
  ];

  let allWritable = true;
  const results = [];

  for (const dir of testDirs) {
    try {
      // Check if directory exists
      if (!fs.existsSync(dir.path)) {
        // Try to create it
        fs.mkdirSync(dir.path, { recursive: true });
        if (verbose) {
          console.log(
            colorize(`  ✓ Created directory: ${dir.name}`, "green")
          );
        }
      }

      // Test write permission
      const testFile = path.join(dir.path, ".health-check-test");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);

      if (verbose) {
        console.log(colorize(`  ✓ Directory writable: ${dir.name}`, "green"));
      }

      results.push({ name: dir.name, path: dir.path, writable: true });
    } catch (error) {
      allWritable = false;
      if (verbose) {
        console.log(
          colorize(`  ✗ Directory not writable: ${dir.name}`, "red")
        );
        console.log(colorize(`    Error: ${error.message}`, "red"));
      }
      results.push({
        name: dir.name,
        path: dir.path,
        writable: false,
        error: error.message,
      });
    }
  }

  return {
    healthy: allWritable,
    directories: results,
    message: allWritable
      ? "All required directories are writable"
      : "Some directories are not writable",
  };
}

/**
 * Check service integration
 */
async function checkServiceIntegration(verbose) {
  if (verbose) {
    console.log(colorize("\n→ Checking service integration...", "cyan"));
  }

  try {
    const { MedusaApp } = await import("@medusajs/framework/application");
    const app = await MedusaApp.create({}, {});
    const container = app.container;

    // Check RenderEngineService
    const renderEngineService = container.resolve("renderEngineService");
    const hasRenderEngineService = !!renderEngineService;

    if (verbose && hasRenderEngineService) {
      console.log(colorize("  ✓ RenderEngineService resolved", "green"));
    }

    // Check PythonExecutorService
    const pythonExecutorService = container.resolve("pythonExecutorService");
    const hasPythonExecutorService = !!pythonExecutorService;

    if (verbose && hasPythonExecutorService) {
      console.log(colorize("  ✓ PythonExecutorService resolved", "green"));
    }

    // Check RenderJobService
    const renderJobService = container.resolve("renderJobService");
    const hasRenderJobService = !!renderJobService;

    if (verbose && hasRenderJobService) {
      console.log(colorize("  ✓ RenderJobService resolved", "green"));
    }

    // Cleanup
    if (container && container.dispose) {
      await container.dispose();
    }

    const healthy =
      hasRenderEngineService &&
      hasPythonExecutorService &&
      hasRenderJobService;

    return {
      healthy,
      services: {
        renderEngineService: hasRenderEngineService,
        pythonExecutorService: hasPythonExecutorService,
        renderJobService: hasRenderJobService,
      },
      message: healthy
        ? "All services are available"
        : "Some services are missing",
    };
  } catch (error) {
    if (verbose) {
      console.log(
        colorize(`  ✗ Service check failed: ${error.message}`, "red")
      );
    }
    return {
      healthy: false,
      error: error.message,
      message: `Service check failed: ${error.message}`,
    };
  }
}

/**
 * Print health check summary
 */
function printSummary(results) {
  console.log(colorize("\n" + "=".repeat(60), "bright"));
  console.log(colorize("HEALTH CHECK SUMMARY", "bright"));
  console.log(colorize("=".repeat(60), "bright"));

  const checks = [
    { name: "Python Environment", result: results.pythonEnvironment },
    { name: "Database & Templates", result: results.database },
    { name: "Python Scripts", result: results.scripts },
    { name: "File System", result: results.fileSystem },
    { name: "Service Integration", result: results.services },
  ];

  let overallHealthy = true;

  checks.forEach((check) => {
    const status = check.result.healthy
      ? colorize("✓ HEALTHY", "green")
      : colorize("✗ UNHEALTHY", "red");
    console.log(`\n${status} - ${check.name}`);
    console.log(`  ${check.result.message}`);

    if (!check.result.healthy) {
      overallHealthy = false;
    }
  });

  console.log(colorize("\n" + "=".repeat(60), "bright"));

  if (overallHealthy) {
    console.log(
      colorize(
        "\n✓ System is healthy! Render engine is ready to use.\n",
        "green"
      )
    );
  } else {
    console.log(
      colorize(
        "\n✗ System is unhealthy. Fix the issues above before using the render engine.\n",
        "red"
      )
    );
  }

  return overallHealthy;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
${colorize("Render Engine Health Check Script", "bright")}

Performs a comprehensive health check of the render engine system.

${colorize("Usage:", "cyan")}
  node health-check.js [--json] [--verbose]

${colorize("Options:", "cyan")}
  --json     Output results as JSON
  --verbose  Show detailed output
  --help     Show this help message

${colorize("Checks:", "cyan")}
  • Python environment (Python 3, Pillow, Blender)
  • Database connectivity and templates
  • Python scripts availability
  • Service integration
  • File system permissions

${colorize("Exit codes:", "cyan")}
  0: System is healthy
  1: Health check failed
  2: Script execution error
`);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  const jsonOutput = args.includes("--json");
  const verbose = args.includes("--verbose") || args.includes("-v");

  if (!jsonOutput) {
    console.log(colorize("\n" + "=".repeat(60), "bright"));
    console.log(colorize("RENDER ENGINE HEALTH CHECK", "bright"));
    console.log(colorize("=".repeat(60) + "\n", "bright"));
  }

  try {
    // Run all checks
    const results = {
      timestamp: new Date().toISOString(),
      pythonEnvironment: await checkPythonEnvironment(verbose && !jsonOutput),
      database: await checkDatabaseAndTemplates(verbose && !jsonOutput),
      scripts: await checkPythonScripts(verbose && !jsonOutput),
      fileSystem: await checkFileSystemPermissions(verbose && !jsonOutput),
      services: await checkServiceIntegration(verbose && !jsonOutput),
    };

    // Calculate overall health
    const overallHealthy =
      results.pythonEnvironment.healthy &&
      results.database.healthy &&
      results.scripts.healthy &&
      results.fileSystem.healthy &&
      results.services.healthy;

    results.overall = {
      healthy: overallHealthy,
      message: overallHealthy
        ? "System is healthy"
        : "System has health issues",
    };

    if (jsonOutput) {
      // Output JSON
      console.log(JSON.stringify(results, null, 2));
    } else {
      // Print summary
      printSummary(results);
    }

    process.exit(overallHealthy ? 0 : 1);
  } catch (error) {
    if (jsonOutput) {
      console.log(
        JSON.stringify({
          error: true,
          message: error.message,
          stack: error.stack,
        })
      );
    } else {
      console.error(colorize("\n✗ Health check failed:", "red"));
      console.error(colorize(`  ${error.message}`, "red"));

      if (error.stack) {
        console.error(colorize("\nStack trace:", "red"));
        console.error(error.stack);
      }
    }

    process.exit(2);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  checkPythonEnvironment,
  checkDatabaseAndTemplates,
  checkPythonScripts,
  checkFileSystemPermissions,
  checkServiceIntegration,
};
