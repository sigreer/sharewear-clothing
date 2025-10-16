#!/usr/bin/env node
/**
 * Python Environment Test Script
 *
 * Tests the Python environment for render engine requirements:
 * - Python 3 installation and version
 * - Pillow (PIL) library for image compositing
 * - Blender installation and version
 * - Python script execution capability
 *
 * Usage:
 *   node test-python.js [--verbose]
 *
 * Options:
 *   --verbose  Show detailed output
 *   --help     Show this help message
 *
 * Exit codes:
 *   0: All requirements met
 *   1: Missing requirements
 *   2: Script execution error
 */

const path = require("path");
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

    // Set timeout
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
 * Test Python 3 installation
 */
async function testPython(verbose) {
  console.log(colorize("\n→ Testing Python 3...", "cyan"));

  const result = await executeCommand("python3", ["--version"]);

  if (result.success) {
    const version = result.stdout || result.stderr;
    console.log(colorize(`  ✓ Python 3 is installed: ${version}`, "green"));

    if (verbose) {
      // Get Python path
      const pathResult = await executeCommand("which", ["python3"]);
      if (pathResult.success) {
        console.log(colorize(`    Path: ${pathResult.stdout}`, "blue"));
      }
    }

    return { passed: true, version, message: "Python 3 is installed" };
  } else {
    console.log(colorize(`  ✗ Python 3 not found`, "red"));
    if (verbose && result.stderr) {
      console.log(colorize(`    Error: ${result.stderr}`, "red"));
    }
    return {
      passed: false,
      message: "Python 3 is not installed or not in PATH",
    };
  }
}

/**
 * Test Pillow (PIL) library
 */
async function testPillow(verbose) {
  console.log(colorize("\n→ Testing Pillow (PIL)...", "cyan"));

  const result = await executeCommand("python3", [
    "-c",
    "import PIL; print(f'Pillow {PIL.__version__}')",
  ]);

  if (result.success) {
    console.log(colorize(`  ✓ Pillow is installed: ${result.stdout}`, "green"));

    if (verbose) {
      // Get Pillow features
      const featuresResult = await executeCommand("python3", [
        "-c",
        "import PIL.features; features = PIL.features.get_supported(); print(','.join(sorted(features)))",
      ]);
      if (featuresResult.success) {
        console.log(
          colorize(`    Supported formats: ${featuresResult.stdout}`, "blue")
        );
      }
    }

    return { passed: true, version: result.stdout, message: "Pillow is installed" };
  } else {
    console.log(colorize(`  ✗ Pillow not found`, "red"));
    console.log(
      colorize(`    Install with: pip3 install Pillow`, "yellow")
    );
    if (verbose && result.stderr) {
      console.log(colorize(`    Error: ${result.stderr}`, "red"));
    }
    return {
      passed: false,
      message: "Pillow is not installed. Install with: pip3 install Pillow",
    };
  }
}

/**
 * Test Blender installation
 */
async function testBlender(verbose) {
  console.log(colorize("\n→ Testing Blender...", "cyan"));

  const result = await executeCommand("blender", ["--version"], 15000);

  if (result.success) {
    // Extract version from output
    const versionMatch = result.stdout.match(/Blender (\d+\.\d+\.\d+)/i);
    const version = versionMatch ? versionMatch[1] : "unknown";

    console.log(colorize(`  ✓ Blender is installed: ${version}`, "green"));

    if (verbose) {
      // Get Blender path
      const pathResult = await executeCommand("which", ["blender"]);
      if (pathResult.success) {
        console.log(colorize(`    Path: ${pathResult.stdout}`, "blue"));
      }

      // Show first few lines of version output
      const lines = result.stdout.split("\n").slice(0, 3);
      lines.forEach((line) => {
        if (line.trim()) {
          console.log(colorize(`    ${line}`, "blue"));
        }
      });
    }

    return { passed: true, version, message: "Blender is installed" };
  } else {
    console.log(colorize(`  ✗ Blender not found`, "red"));
    console.log(
      colorize(
        `    Install from: https://www.blender.org/download/`,
        "yellow"
      )
    );
    if (verbose && result.stderr) {
      console.log(colorize(`    Error: ${result.stderr}`, "red"));
    }
    return {
      passed: false,
      message:
        "Blender is not installed or not in PATH. Download from https://www.blender.org/download/",
    };
  }
}

/**
 * Test Python script execution
 */
async function testScriptExecution(verbose) {
  console.log(colorize("\n→ Testing Python script execution...", "cyan"));

  const projectRoot = path.resolve(__dirname, "../../../..");
  const composeScriptPath = path.join(projectRoot, "compose_design.py");
  const renderScriptPath = path.join(projectRoot, "render_design.py");

  const tests = [
    { name: "compose_design.py", path: composeScriptPath },
    { name: "render_design.py", path: renderScriptPath },
  ];

  const results = [];

  for (const test of tests) {
    const fs = require("fs");
    const exists = fs.existsSync(test.path);

    if (!exists) {
      console.log(colorize(`  ✗ Script not found: ${test.name}`, "red"));
      console.log(colorize(`    Expected at: ${test.path}`, "red"));
      results.push({
        passed: false,
        name: test.name,
        message: `Script not found: ${test.path}`,
      });
      continue;
    }

    // Test script can be parsed (syntax check)
    const result = await executeCommand("python3", ["-m", "py_compile", test.path]);

    if (result.success) {
      console.log(colorize(`  ✓ Script valid: ${test.name}`, "green"));
      if (verbose) {
        console.log(colorize(`    Path: ${test.path}`, "blue"));
      }
      results.push({
        passed: true,
        name: test.name,
        message: `Script is valid and executable`,
      });
    } else {
      console.log(colorize(`  ✗ Script has errors: ${test.name}`, "red"));
      if (verbose && result.stderr) {
        console.log(colorize(`    Error: ${result.stderr}`, "red"));
      }
      results.push({
        passed: false,
        name: test.name,
        message: `Script has syntax errors: ${result.stderr}`,
      });
    }
  }

  const allPassed = results.every((r) => r.passed);
  return {
    passed: allPassed,
    results,
    message: allPassed
      ? "All Python scripts are valid"
      : "Some Python scripts have errors",
  };
}

/**
 * Test PythonExecutorService integration
 */
async function testPythonExecutorService(verbose) {
  console.log(colorize("\n→ Testing PythonExecutorService...", "cyan"));

  try {
    // Dynamic import for ESM modules
    const { MedusaApp } = await import("@medusajs/framework/application");

    if (verbose) {
      console.log(colorize("  → Initializing Medusa application...", "blue"));
    }

    const app = await MedusaApp.create({}, {});
    const container = app.container;

    // Resolve the PythonExecutorService
    const pythonExecutor = container.resolve("pythonExecutorService");

    console.log(colorize("  ✓ PythonExecutorService resolved", "green"));

    // Test environment validation
    if (verbose) {
      console.log(colorize("  → Running environment validation...", "blue"));
    }

    const envValidation = await pythonExecutor.validatePythonEnvironment();

    console.log(colorize("  ✓ Environment validation completed", "green"));

    if (verbose) {
      console.log(
        colorize(
          `    Python: ${envValidation.pythonAvailable ? "✓" : "✗"} ${
            envValidation.pythonVersion || ""
          }`,
          envValidation.pythonAvailable ? "green" : "red"
        )
      );
      console.log(
        colorize(
          `    Pillow: ${envValidation.pillowAvailable ? "✓" : "✗"}`,
          envValidation.pillowAvailable ? "green" : "red"
        )
      );
      console.log(
        colorize(
          `    Blender: ${envValidation.blenderAvailable ? "✓" : "✗"} ${
            envValidation.blenderVersion || ""
          }`,
          envValidation.blenderAvailable ? "green" : "red"
        )
      );
    }

    // Cleanup
    if (container && container.dispose) {
      await container.dispose();
    }

    const allAvailable =
      envValidation.pythonAvailable &&
      envValidation.pillowAvailable &&
      envValidation.blenderAvailable;

    return {
      passed: allAvailable,
      validation: envValidation,
      message: allAvailable
        ? "PythonExecutorService environment is ready"
        : "PythonExecutorService has missing dependencies",
    };
  } catch (error) {
    console.log(
      colorize(`  ✗ PythonExecutorService test failed: ${error.message}`, "red")
    );
    if (verbose && error.stack) {
      console.log(colorize(`    Stack: ${error.stack}`, "red"));
    }
    return {
      passed: false,
      message: `PythonExecutorService test failed: ${error.message}`,
    };
  }
}

/**
 * Print test summary
 */
function printSummary(results) {
  console.log(colorize("\n" + "=".repeat(60), "bright"));
  console.log(colorize("TEST SUMMARY", "bright"));
  console.log(colorize("=".repeat(60), "bright"));

  const tests = [
    { name: "Python 3", result: results.python },
    { name: "Pillow (PIL)", result: results.pillow },
    { name: "Blender", result: results.blender },
    { name: "Script Execution", result: results.scripts },
    { name: "PythonExecutorService", result: results.service },
  ];

  let allPassed = true;

  tests.forEach((test) => {
    const status = test.result.passed
      ? colorize("✓ PASS", "green")
      : colorize("✗ FAIL", "red");
    console.log(`\n${status} - ${test.name}`);
    console.log(`  ${test.result.message}`);

    if (!test.result.passed) {
      allPassed = false;
    }
  });

  console.log(colorize("\n" + "=".repeat(60), "bright"));

  if (allPassed) {
    console.log(colorize("\n✓ All tests passed! Render engine is ready.\n", "green"));
  } else {
    console.log(
      colorize(
        "\n✗ Some tests failed. Fix the issues above before using the render engine.\n",
        "red"
      )
    );
  }

  return allPassed;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
${colorize("Python Environment Test Script", "bright")}

Tests the Python environment for render engine requirements.

${colorize("Usage:", "cyan")}
  node test-python.js [--verbose]

${colorize("Options:", "cyan")}
  --verbose  Show detailed output
  --help     Show this help message

${colorize("Tests:", "cyan")}
  • Python 3 installation and version
  • Pillow (PIL) library for image compositing
  • Blender installation and version
  • Python script execution capability
  • PythonExecutorService integration

${colorize("Exit codes:", "cyan")}
  0: All requirements met
  1: Missing requirements
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

  const verbose = args.includes("--verbose") || args.includes("-v");

  console.log(colorize("\n" + "=".repeat(60), "bright"));
  console.log(colorize("PYTHON ENVIRONMENT TESTER", "bright"));
  console.log(colorize("=".repeat(60) + "\n", "bright"));

  try {
    // Run all tests
    const results = {
      python: await testPython(verbose),
      pillow: await testPillow(verbose),
      blender: await testBlender(verbose),
      scripts: await testScriptExecution(verbose),
      service: await testPythonExecutorService(verbose),
    };

    // Print summary and exit with appropriate code
    const allPassed = printSummary(results);
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error(colorize("\n✗ Script execution failed:", "red"));
    console.error(colorize(`  ${error.message}`, "red"));

    if (error.stack) {
      console.error(colorize("\nStack trace:", "red"));
      console.error(error.stack);
    }

    process.exit(2);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  testPython,
  testPillow,
  testBlender,
  testScriptExecution,
  testPythonExecutorService,
};
