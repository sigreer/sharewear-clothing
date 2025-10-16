#!/usr/bin/env node
/**
 * Template Validation Script
 *
 * Validates that all render templates exist in the database and their
 * associated files (.blend and .png) are present in the file system.
 *
 * Usage:
 *   node validate-templates.js [--fix]
 *
 * Options:
 *   --fix    Attempt to fix missing templates by creating database records
 *   --help   Show this help message
 *
 * Exit codes:
 *   0: All templates valid
 *   1: Validation errors found
 *   2: Script execution error
 */

const path = require("path");
const fs = require("fs");

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
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Get absolute path relative to project root
 */
function getAbsolutePath(relativePath) {
  const projectRoot = path.resolve(__dirname, "../../../..");
  return path.join(projectRoot, relativePath);
}

/**
 * Validate database connection and load templates
 */
async function loadTemplatesFromDatabase() {
  try {
    // Dynamic import for ESM modules
    const { MedusaApp } = await import("@medusajs/framework/application");

    console.log(colorize("→ Initializing Medusa application...", "cyan"));

    // Initialize Medusa app
    const app = await MedusaApp.create({}, {});
    const container = app.container;

    // Resolve the render engine service
    const renderEngineService = container.resolve("renderEngineService");

    console.log(colorize("✓ Database connected successfully", "green"));

    // Load all templates from database
    const templates = await renderEngineService.listRenderTemplates();

    return { templates, container };
  } catch (error) {
    console.error(colorize("✗ Failed to load templates from database:", "red"));
    console.error(colorize(`  ${error.message}`, "red"));
    throw error;
  }
}

/**
 * Validate a single template
 */
function validateTemplate(template) {
  const issues = [];

  console.log(colorize(`\n→ Validating template: ${template.name}`, "cyan"));

  // Check template image file
  const templateImagePath = getAbsolutePath(template.template_image_path);
  const templateImageExists = fileExists(templateImagePath);

  if (!templateImageExists) {
    issues.push({
      type: "missing_file",
      field: "template_image_path",
      path: template.template_image_path,
      absolutePath: templateImagePath,
      message: "Template image file not found",
    });
    console.log(
      colorize(`  ✗ Template image missing: ${template.template_image_path}`, "red")
    );
  } else {
    console.log(
      colorize(`  ✓ Template image found: ${template.template_image_path}`, "green")
    );
  }

  // Check blend file
  const blendFilePath = getAbsolutePath(template.blend_file_path);
  const blendFileExists = fileExists(blendFilePath);

  if (!blendFileExists) {
    issues.push({
      type: "missing_file",
      field: "blend_file_path",
      path: template.blend_file_path,
      absolutePath: blendFilePath,
      message: "Blend file not found",
    });
    console.log(
      colorize(`  ✗ Blend file missing: ${template.blend_file_path}`, "red")
    );
  } else {
    console.log(
      colorize(`  ✓ Blend file found: ${template.blend_file_path}`, "green")
    );
  }

  // Check if template is active
  if (!template.is_active) {
    console.log(colorize(`  ⚠ Template is marked as inactive`, "yellow"));
  }

  // Check available presets
  if (!template.available_presets || template.available_presets.length === 0) {
    issues.push({
      type: "invalid_config",
      field: "available_presets",
      message: "No available presets configured",
    });
    console.log(colorize(`  ✗ No available presets configured`, "red"));
  } else {
    console.log(
      colorize(
        `  ✓ Available presets: ${template.available_presets.join(", ")}`,
        "green"
      )
    );
  }

  return issues;
}

/**
 * Print validation summary
 */
function printSummary(results) {
  console.log(colorize("\n" + "=".repeat(60), "bright"));
  console.log(colorize("VALIDATION SUMMARY", "bright"));
  console.log(colorize("=".repeat(60), "bright"));

  const totalTemplates = results.length;
  const validTemplates = results.filter((r) => r.issues.length === 0).length;
  const invalidTemplates = totalTemplates - validTemplates;

  console.log(colorize(`\nTotal templates: ${totalTemplates}`, "cyan"));
  console.log(colorize(`Valid templates: ${validTemplates}`, "green"));

  if (invalidTemplates > 0) {
    console.log(colorize(`Invalid templates: ${invalidTemplates}`, "red"));

    console.log(colorize("\nIssues found:", "yellow"));
    results.forEach((result) => {
      if (result.issues.length > 0) {
        console.log(colorize(`\n${result.template.name}:`, "yellow"));
        result.issues.forEach((issue) => {
          console.log(colorize(`  • ${issue.message}`, "red"));
          if (issue.path) {
            console.log(colorize(`    Path: ${issue.path}`, "red"));
          }
        });
      }
    });
  } else {
    console.log(colorize("\n✓ All templates are valid!", "green"));
  }

  console.log(colorize("\n" + "=".repeat(60) + "\n", "bright"));

  return invalidTemplates === 0;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
${colorize("Template Validation Script", "bright")}

Validates that all render templates exist in the database and their
associated files (.blend and .png) are present in the file system.

${colorize("Usage:", "cyan")}
  node validate-templates.js [--fix]

${colorize("Options:", "cyan")}
  --fix    Attempt to fix missing templates by creating database records
  --help   Show this help message

${colorize("Exit codes:", "cyan")}
  0: All templates valid
  1: Validation errors found
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

  const fixMode = args.includes("--fix");

  console.log(colorize("\n" + "=".repeat(60), "bright"));
  console.log(colorize("RENDER TEMPLATE VALIDATOR", "bright"));
  console.log(colorize("=".repeat(60) + "\n", "bright"));

  if (fixMode) {
    console.log(colorize("⚠ Fix mode enabled (not yet implemented)", "yellow"));
  }

  try {
    // Load templates from database
    const { templates, container } = await loadTemplatesFromDatabase();

    if (!templates || templates.length === 0) {
      console.log(colorize("\n⚠ No templates found in database", "yellow"));
      console.log(
        colorize(
          "  Create templates using the Medusa admin or seed scripts\n",
          "yellow"
        )
      );
      process.exit(1);
    }

    console.log(
      colorize(`\nFound ${templates.length} template(s) in database`, "cyan")
    );

    // Validate each template
    const results = templates.map((template) => ({
      template,
      issues: validateTemplate(template),
    }));

    // Print summary and exit with appropriate code
    const allValid = printSummary(results);

    // Cleanup
    if (container && container.dispose) {
      await container.dispose();
    }

    process.exit(allValid ? 0 : 1);
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

module.exports = { validateTemplate, fileExists, getAbsolutePath };
