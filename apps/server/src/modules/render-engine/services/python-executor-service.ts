import { MedusaError } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import { spawn } from "child_process"
import path from "path"
import fs from "fs/promises"
import { existsSync } from "fs"
import { PresetType } from "../types"

type InjectedDependencies = {
  logger: Logger
}

/**
 * Parameters for executing the composition script
 */
export type ExecuteComposeParams = {
  /** Path to template PNG file */
  templatePath: string
  /** Path to uploaded design image */
  designPath: string
  /** Preset configuration for design placement */
  preset: PresetType
  /** Output path for composited result */
  outputPath: string
  /** Optional fabric/shirt color (hex #RRGGBB or named color like 'black', 'navy', 'red', etc.) */
  fabricColor?: string
}

/**
 * Result of composition script execution
 */
export type ComposeResult = {
  /** Whether execution succeeded */
  success: boolean
  /** Path to output file if successful */
  outputPath?: string
  /** Error message if failed */
  error?: string
}

/**
 * Render mode for Blender execution
 */
export type RenderMode = 'all' | 'images-only' | 'animation-only'

/**
 * Parameters for executing the render script
 */
export type ExecuteRenderParams = {
  /** Path to .blend template file */
  blendFile: string
  /** Path to composited texture image */
  texturePath: string
  /** Directory for output renders */
  outputDir: string
  /** Render samples for quality (default: 128) */
  samples?: number
  /** Render mode: 'all' (default), 'images-only', or 'animation-only' */
  renderMode?: RenderMode
  /** Optional fabric/shirt color (hex #RRGGBB or named color) - only used when applying texture without pre-composition */
  fabricColor?: string
  /** Optional background color (hex #RRGGBB, named color, or 'transparent' for transparent background) */
  backgroundColor?: string
}

/**
 * Result of render script execution
 */
export type RenderResult = {
  /** Whether execution succeeded */
  success: boolean
  /** Paths to rendered still images (typically 6 camera angles: front, left, right, back, front_45deg_left, front_45deg_right) */
  renderedImages?: string[]
  /** Path to animation file if successful and generated */
  animation?: string
  /** Error message if failed */
  error?: string
}

/**
 * Environment validation result
 */
export type EnvironmentValidation = {
  /** Whether Python 3 is available */
  pythonAvailable: boolean
  /** Python version if available */
  pythonVersion?: string
  /** Whether Pillow (PIL) is available */
  pillowAvailable: boolean
  /** Whether Blender is available */
  blenderAvailable: boolean
  /** Blender version if available */
  blenderVersion?: string
}

/**
 * Valid presets for design placement (must match presets in compose_design.py)
 */
const VALID_PRESETS: PresetType[] = [
  "chest-small",
  "chest-medium",
  "chest-large",
  "back-small",
  "back-medium",
  "back-large",
  "back-bottom-small",
  "back-bottom-medium",
  "back-bottom-large"
]

/**
 * Allowed file extensions for input files
 */
const ALLOWED_EXTENSIONS = {
  image: [".png", ".jpg", ".jpeg"],
  blend: [".blend"],
  all: [".png", ".jpg", ".jpeg", ".blend"]
}

/**
 * Script execution timeout in milliseconds (5 minutes)
 */
const SCRIPT_TIMEOUT_MS = 5 * 60 * 1000

/**
 * Project root directory
 */
const PROJECT_ROOT = path.resolve(__dirname, "../../../../../..")

/**
 * Python Executor Service
 *
 * Safely executes Python scripts (compose_design.py and render_design.py) in a
 * sandboxed environment with strict security controls.
 *
 * SECURITY FEATURES:
 * - Path sanitization and validation
 * - Input validation and allowed extensions
 * - Process timeouts with tree killing
 * - Limited environment variables
 * - Working directory isolation
 * - Stdout/stderr capture for debugging
 *
 * @service
 */
export default class PythonExecutorService {
  protected readonly logger_: Logger

  // Script paths relative to project root
  protected readonly composeScriptPath_: string
  protected readonly renderScriptPath_: string

  constructor(dependencies: InjectedDependencies) {
    this.logger_ = dependencies.logger

    // Set absolute paths to Python scripts
    this.composeScriptPath_ = path.join(PROJECT_ROOT, "compose_design.py")
    this.renderScriptPath_ = path.join(PROJECT_ROOT, "render_design.py")

    this.logger_.debug("PythonExecutorService initialized", {
      composeScript: this.composeScriptPath_,
      renderScript: this.renderScriptPath_,
      projectRoot: PROJECT_ROOT
    })
  }

  /**
   * Execute the composition script to composite a design onto a template
   *
   * @param params - Composition parameters
   * @returns Composition result
   * @throws {MedusaError} If validation fails
   */
  async executeCompose(params: ExecuteComposeParams): Promise<ComposeResult> {
    this.logger_.info("Executing composition script", {
      template: params.templatePath,
      design: params.designPath,
      preset: params.preset
    })

    try {
      // Validate inputs
      this.validateComposeParams(params)

      // Ensure output directory exists
      await this.ensureOutputDirectory(params.outputPath)

      // Build command arguments
      const args = [
        this.composeScriptPath_,
        "--template", params.templatePath,
        "--design", params.designPath,
        "--preset", params.preset,
        "--output", params.outputPath
      ]

      // Add optional fabric color if specified
      if (params.fabricColor) {
        args.push("--fabric-color", params.fabricColor)
      }

      // Execute Python script
      const result = await this.executePythonScript("python3", args)

      if (result.exitCode !== 0) {
        this.logger_.error("Composition script failed", {
          exitCode: result.exitCode,
          stderr: result.stderr,
          stdout: result.stdout
        })

        const composeResult: ComposeResult = {
          success: false,
          error: this.parseScriptError(result.stderr, result.stdout)
        }
        return composeResult
      }

      // Verify output file was created
      const outputExists = existsSync(params.outputPath)
      if (!outputExists) {
        this.logger_.error("Composition script succeeded but output file not found", {
          outputPath: params.outputPath
        })

        const composeResult: ComposeResult = {
          success: false,
          error: "Output file was not created"
        }
        return composeResult
      }

      this.logger_.info("Composition completed successfully", {
        outputPath: params.outputPath
      })

      const composeResult: ComposeResult = {
        success: true,
        outputPath: params.outputPath
      }
      return composeResult

    } catch (error) {
      this.logger_.error("Composition execution error", { error })

      if (error instanceof MedusaError) {
        throw error
      }

      const composeResult: ComposeResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during composition"
      }
      return composeResult
    }
  }

  /**
   * Execute the render script to render a 3D t-shirt with Blender
   *
   * @param params - Render parameters
   * @returns Render result
   * @throws {MedusaError} If validation fails
   */
  async executeRender(params: ExecuteRenderParams): Promise<RenderResult> {
    const samples = params.samples ?? 128
    const renderMode = params.renderMode ?? 'all'

    this.logger_.info("Executing render script", {
      blendFile: params.blendFile,
      texture: params.texturePath,
      outputDir: params.outputDir,
      samples,
      renderMode,
      fabricColor: params.fabricColor,
      backgroundColor: params.backgroundColor
    })

    try {
      // Validate inputs
      this.validateRenderParams(params)

      // Ensure output directory exists
      await this.ensureOutputDirectory(params.outputDir)

      // Build Blender command arguments
      // blender --background <blend_file> --python <script> -- <script_args>
      const blenderArgs = [
        "--background",
        params.blendFile,
        "--python",
        this.renderScriptPath_,
        "--",
        params.blendFile,
        params.texturePath,
        params.outputDir,
        samples.toString()
      ]

      // Add render mode flags
      if (renderMode === 'images-only') {
        blenderArgs.push("--images-only")
      } else if (renderMode === 'animation-only') {
        blenderArgs.push("--animation-only")
      }
      // 'all' mode needs no flag (default behavior)

      // Add optional fabric color
      if (params.fabricColor) {
        blenderArgs.push("--fabric-color", params.fabricColor)
      }

      // Add optional background color
      if (params.backgroundColor) {
        blenderArgs.push("--background-color", params.backgroundColor)
      }

      // Execute Blender script
      const result = await this.executePythonScript("blender", blenderArgs)

      if (result.exitCode !== 0) {
        this.logger_.error("Render script failed", {
          exitCode: result.exitCode,
          stderr: result.stderr,
          stdout: result.stdout
        })

        const renderResult: RenderResult = {
          success: false,
          error: this.parseScriptError(result.stderr, result.stdout)
        }
        return renderResult
      }

      // Parse output paths from stdout
      const { renderedImages, animation } = this.parseRenderOutput(
        result.stdout,
        params.outputDir,
        renderMode
      )

      this.logger_.info("Render completed successfully", {
        renderedImages,
        animation
      })

      const renderResult: RenderResult = {
        success: true,
        renderedImages,
        animation
      }
      return renderResult

    } catch (error) {
      this.logger_.error("Render execution error", { error })

      if (error instanceof MedusaError) {
        throw error
      }

      const renderResult: RenderResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during rendering"
      }
      return renderResult
    }
  }

  /**
   * Validate Python and Blender environment
   *
   * @returns Environment validation result
   */
  async validatePythonEnvironment(): Promise<EnvironmentValidation> {
    const envResult: EnvironmentValidation = {
      pythonAvailable: false,
      pillowAvailable: false,
      blenderAvailable: false
    }

    try {
      // Check Python 3 availability and version
      const pythonResult = await this.executePythonScript("python3", ["--version"])
      envResult.pythonAvailable = pythonResult.exitCode === 0
      if (envResult.pythonAvailable) {
        envResult.pythonVersion = pythonResult.stdout.trim() || pythonResult.stderr.trim()
      }

      // Check Pillow availability
      if (envResult.pythonAvailable) {
        const pillowResult = await this.executePythonScript("python3", [
          "-c",
          "import PIL; print(PIL.__version__)"
        ])
        envResult.pillowAvailable = pillowResult.exitCode === 0
      }

      // Check Blender availability and version
      const blenderResult = await this.executePythonScript("blender", ["--version"])
      envResult.blenderAvailable = blenderResult.exitCode === 0
      if (envResult.blenderAvailable) {
        const versionMatch = blenderResult.stdout.match(/Blender (\d+\.\d+\.\d+)/i)
        if (versionMatch) {
          envResult.blenderVersion = versionMatch[1]
        }
      }

    } catch (error) {
      this.logger_.error("Environment validation error", { error })
    }

    return envResult
  }

  /**
   * Validate composition parameters
   *
   * @param params - Parameters to validate
   * @throws {MedusaError} If validation fails
   */
  protected validateComposeParams(params: ExecuteComposeParams): void {
    // Validate and sanitize template path
    this.validatePath(params.templatePath, "templatePath", ALLOWED_EXTENSIONS.image)

    // Validate and sanitize design path
    this.validatePath(params.designPath, "designPath", ALLOWED_EXTENSIONS.image)

    // Validate preset
    if (!VALID_PRESETS.includes(params.preset)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid preset: ${params.preset}. Must be one of: ${VALID_PRESETS.join(", ")}`
      )
    }

    // Validate output path
    this.validatePath(params.outputPath, "outputPath", ALLOWED_EXTENSIONS.image, false)

    // Verify input files exist
    if (!existsSync(params.templatePath)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Template file not found: ${params.templatePath}`
      )
    }

    if (!existsSync(params.designPath)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Design file not found: ${params.designPath}`
      )
    }
  }

  /**
   * Validate render parameters
   *
   * @param params - Parameters to validate
   * @throws {MedusaError} If validation fails
   */
  protected validateRenderParams(params: ExecuteRenderParams): void {
    // Validate blend file path
    this.validatePath(params.blendFile, "blendFile", ALLOWED_EXTENSIONS.blend)

    // Validate texture path
    this.validatePath(params.texturePath, "texturePath", ALLOWED_EXTENSIONS.image)

    // Validate output directory path
    this.validatePath(params.outputDir, "outputDir", [], false)

    // Verify input files exist
    if (!existsSync(params.blendFile)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Blend file not found: ${params.blendFile}`
      )
    }

    if (!existsSync(params.texturePath)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Texture file not found: ${params.texturePath}`
      )
    }

    // Validate samples
    if (params.samples !== undefined) {
      if (typeof params.samples !== "number" || params.samples < 1 || params.samples > 4096) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Render samples must be a number between 1 and 4096"
        )
      }
    }
  }

  /**
   * Validate and sanitize a file path for security
   *
   * @param filePath - Path to validate
   * @param paramName - Parameter name for error messages
   * @param allowedExtensions - Array of allowed file extensions
   * @param checkExtension - Whether to check file extension (default: true)
   * @throws {MedusaError} If path is invalid or potentially malicious
   */
  protected validatePath(
    filePath: string,
    paramName: string,
    allowedExtensions: string[],
    checkExtension: boolean = true
  ): void {
    if (!filePath || typeof filePath !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${paramName} is required and must be a string`
      )
    }

    // Normalize path to prevent traversal attacks
    const normalizedPath = path.normalize(filePath)

    // Check for path traversal patterns
    if (normalizedPath.includes("..") || normalizedPath !== filePath) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${paramName} contains invalid path traversal: ${filePath}`
      )
    }

    // Ensure path is absolute
    if (!path.isAbsolute(normalizedPath)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${paramName} must be an absolute path: ${filePath}`
      )
    }

    // Check file extension if required
    if (checkExtension && allowedExtensions.length > 0) {
      const ext = path.extname(normalizedPath).toLowerCase()
      if (!allowedExtensions.includes(ext)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `${paramName} has invalid extension: ${ext}. Allowed: ${allowedExtensions.join(", ")}`
        )
      }
    }

    // Additional security: Check for suspicious patterns
    const suspiciousPatterns = ["/etc/", "/proc/", "/sys/", "/dev/", "\\\\"]
    for (const pattern of suspiciousPatterns) {
      if (normalizedPath.includes(pattern)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `${paramName} contains suspicious path pattern: ${pattern}`
        )
      }
    }
  }

  /**
   * Ensure the output directory exists, creating it if necessary
   *
   * @param outputPath - Path to output file or directory
   */
  protected async ensureOutputDirectory(outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath)

    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to create output directory: ${dir}`
      )
    }
  }

  /**
   * Execute a Python script with security controls
   *
   * @param command - Command to execute (python3 or blender)
   * @param args - Command arguments
   * @returns Execution result
   */
  protected async executePythonScript(
    command: string,
    args: string[]
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let stdout = ""
      let stderr = ""
      let timedOut = false

      // Spawn process with limited environment
      const child = spawn(command, args, {
        cwd: PROJECT_ROOT, // Isolated working directory
        env: {
          PATH: process.env.PATH, // Only inherit PATH
          HOME: process.env.HOME, // And HOME for Python/Blender to function
          PYTHONDONTWRITEBYTECODE: "1" // Don't create .pyc files
        },
        shell: false, // Prevent shell injection
        timeout: SCRIPT_TIMEOUT_MS
      })

      // Capture stdout
      child.stdout.on("data", (data: Buffer) => {
        stdout += data.toString()
      })

      // Capture stderr
      child.stderr.on("data", (data: Buffer) => {
        stderr += data.toString()
      })

      // Handle process completion
      child.on("close", (code: number | null) => {
        if (timedOut) {
          resolve({
            exitCode: -1,
            stdout,
            stderr: stderr + "\nError: Script execution timed out after 5 minutes"
          })
        } else {
          resolve({
            exitCode: code ?? -1,
            stdout,
            stderr
          })
        }
      })

      // Handle errors
      child.on("error", (error: Error) => {
        reject(new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Failed to execute ${command}: ${error.message}`
        ))
      })

      // Set timeout to kill process tree
      const timeoutHandle = setTimeout(() => {
        timedOut = true
        this.logger_.warn("Script execution timeout, killing process", {
          command,
          pid: child.pid
        })

        // Kill process tree (not just main process)
        if (child.pid) {
          try {
            // Send SIGTERM first
            process.kill(-child.pid, "SIGTERM")

            // Send SIGKILL after 5 seconds if still running
            setTimeout(() => {
              try {
                process.kill(-child.pid!, "SIGKILL")
              } catch (error) {
                // Process may have already exited
              }
            }, 5000)
          } catch (error) {
            // Process may have already exited
            this.logger_.debug("Error killing process", { error })
          }
        }
      }, SCRIPT_TIMEOUT_MS)

      // Clear timeout if process completes normally
      child.on("close", () => {
        clearTimeout(timeoutHandle)
      })
    })
  }

  /**
   * Parse error message from script output
   *
   * @param stderr - Standard error output
   * @param stdout - Standard output
   * @returns User-friendly error message
   */
  protected parseScriptError(stderr: string, stdout: string): string {
    // Look for Python error messages
    const pythonErrorMatch = stderr.match(/Error: (.+)/i) || stdout.match(/Error: (.+)/i)
    if (pythonErrorMatch) {
      return pythonErrorMatch[1]
    }

    // Return last non-empty line from stderr
    const stderrLines = stderr.trim().split("\n").filter(line => line.trim())
    if (stderrLines.length > 0) {
      return stderrLines[stderrLines.length - 1]
    }

    // Return last non-empty line from stdout
    const stdoutLines = stdout.trim().split("\n").filter(line => line.trim())
    if (stdoutLines.length > 0) {
      return stdoutLines[stdoutLines.length - 1]
    }

    return "Script execution failed with unknown error"
  }

  /**
   * Parse render output to extract file paths from multiple camera angles
   *
   * @param stdout - Standard output from render script
   * @param outputDir - Output directory
   * @param renderMode - Render mode (determines if animation should be parsed)
   * @returns Parsed file paths (array of images for 6 camera angles + optional animation)
   */
  protected parseRenderOutput(
    stdout: string,
    outputDir: string,
    renderMode: RenderMode
  ): { renderedImages?: string[]; animation?: string } {
    const result: { renderedImages?: string[]; animation?: string } = {}

    // Look for all "Rendered <angle>: <filename>" patterns
    // The script outputs lines like "Rendered front_0deg: design_front_0deg.png"
    const imageMatches = stdout.matchAll(/Rendered \w+(?:_\d+deg)?(?:_\w+)?: (.+\.png)/gi)
    const images: string[] = []
    for (const match of imageMatches) {
      images.push(path.join(outputDir, match[1]))
    }

    if (images.length > 0) {
      result.renderedImages = images
    }

    // Look for "Rendered animation: <filename>" pattern
    if (renderMode !== 'images-only') {
      const animationMatch = stdout.match(/Rendered animation: (.+\.mp4)/i)
      if (animationMatch) {
        result.animation = path.join(outputDir, animationMatch[1])
      }
    }

    return result
  }
}
