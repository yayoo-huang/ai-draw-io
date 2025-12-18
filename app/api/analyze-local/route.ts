import { generateText } from "ai"
import { readdirSync, readFileSync, statSync } from "fs"
import { type NextRequest, NextResponse } from "next/server"
import { join, relative } from "path"
import { getAIModel } from "@/lib/ai-providers"

interface CodeFile {
    name: string
    path: string
    content: string
    language: string
    size: number
}

// Code file extensions
const CODE_EXTENSIONS = [
    ".java",
    ".py",
    ".ts",
    ".js",
    ".jsx",
    ".tsx",
    ".go",
    ".cpp",
    ".c",
    ".h",
    ".cs",
    ".rb",
    ".php",
    ".swift",
    ".kt",
    ".rs",
    ".scala",
]

// Directories to ignore
const IGNORE_DIRS = [
    "node_modules",
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    "dist",
    "build",
    "target",
    ".idea",
    ".vscode",
    "bin",
    "obj",
    ".gradle",
    "out",
]

function detectLanguage(ext: string): string {
    const map: Record<string, string> = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".jsx": "javascript",
        ".tsx": "typescript",
        ".java": "java",
        ".go": "go",
        ".cpp": "cpp",
        ".c": "c",
        ".rb": "ruby",
        ".php": "php",
        ".swift": "swift",
        ".kt": "kotlin",
        ".rs": "rust",
        ".cs": "csharp",
    }
    return map[ext] || "text"
}

/**
 * Recursively scan directory
 */
function scanDirectory(dir: string, baseDir: string = dir): CodeFile[] {
    const files: CodeFile[] = []

    try {
        const entries = readdirSync(dir, { withFileTypes: true })

        for (const entry of entries) {
            const fullPath = join(dir, entry.name)
            const relativePath = relative(baseDir, fullPath)

            // Skip ignored directories
            if (entry.isDirectory()) {
                if (IGNORE_DIRS.includes(entry.name)) continue
                files.push(...scanDirectory(fullPath, baseDir))
                continue
            }

            // Only process code files
            const isCodeFile = CODE_EXTENSIONS.some((ext) =>
                entry.name.endsWith(ext),
            )
            if (!isCodeFile) continue

            try {
                const stats = statSync(fullPath)

                // Skip files that are too large or empty
                if (stats.size > 5 * 1024 * 1024 || stats.size === 0) continue

                const content = readFileSync(fullPath, "utf-8")
                const ext = entry.name.substring(entry.name.lastIndexOf("."))

                files.push({
                    name: entry.name,
                    path: relativePath,
                    content,
                    language: detectLanguage(ext),
                    size: stats.size,
                })
            } catch (_err) {
                // Skip unreadable files
                console.warn(`⚠️  Skipping file: ${relativePath}`)
            }
        }
    } catch (_err) {
        console.error(`❌ Cannot read directory: ${dir}`)
    }

    return files
}

export async function POST(req: NextRequest) {
    try {
        const { path } = await req.json()

        if (!path || typeof path !== "string") {
            return NextResponse.json(
                { error: "Please provide a valid directory path" },
                { status: 400 },
            )
        }

        console.log(`[analyze-local] Scanning directory: ${path}`)

        // 1. Scan all code files
        const allFiles = scanDirectory(path)

        console.log(`[analyze-local] Found ${allFiles.length} code files`)

        if (allFiles.length === 0) {
            return NextResponse.json(
                { error: "No code files found" },
                { status: 404 },
            )
        }

        // 2. Generate file list for AI to review
        const fileList = allFiles
            .filter((f) => f.size < 500000) // Only list files < 500KB
            .map(
                (f) =>
                    `${f.path} (${f.language}, ${Math.round(f.size / 1024)}KB)`,
            )
            .slice(0, 100) // Max 100 files
            .join("\n")

        console.log(`[analyze-local] Identifying config files...`)

        // 3. First AI call: Let AI select files to analyze with improved prompt
        const { model, providerOptions, headers } = getAIModel()

        const fileSelectionResult = await generateText({
            model,
            ...(providerOptions && { providerOptions }),
            ...(headers && { headers }),
            messages: [
                {
                    role: "user",
                    content: `Analyze this codebase file list and select files that contain service dependency configuration.

IMPORTANT: Look for dependency injection (DI) configuration files such as:
- Java: ClientModule.java, DependencyModule.java, ServiceModule.java, AppModule.java (files with @Provides, @Bean, or ClientBuilder)
- Python: di_config.py, dependencies.py, container.py (files with dependency injection setup)
- TypeScript: app.module.ts, *.module.ts (NestJS or Angular modules)
- Other: Any file clearly containing dependency/client/service configuration

DO NOT select:
- Test files (anything in /test/ or /tests/ directories)
- Bootstrap/runtime files (ruby_bootstrap.rb, etc.)
- Build/generated files (in /build/, /dist/, /target/)
- Generic config files without dependency information

File list:
${fileList}

Return JSON format:
{
  "selectedFiles": ["path1", "path2", "path3"]
}

Select the 3 most important dependency configuration files. Return ONLY the JSON.`,
                },
            ],
        })

        // Parse AI selected files
        console.log(
            "[analyze-local] File selection AI response:",
            fileSelectionResult.text.slice(0, 1000),
        )

        let selectedPaths: string[]
        const selectionMatch = fileSelectionResult.text.match(/\{[\s\S]*\}/)
        if (!selectionMatch) {
            console.log(
                "[analyze-local] AI did not return JSON, using fallback strategy",
            )
            // Fallback: Look for common module files
            const fallbackFiles = allFiles
                .filter(
                    (f) =>
                        (f.language === "java" &&
                            f.name.includes("Module") &&
                            !f.path.includes("/test/")) ||
                        (f.language === "python" &&
                            (f.name.includes("di_") ||
                                f.name.includes("dependencies"))) ||
                        (f.language === "typescript" &&
                            f.name.endsWith(".module.ts")),
                )
                .slice(0, 3)

            if (fallbackFiles.length === 0) {
                return NextResponse.json(
                    {
                        error: "No config files found, ensure codebase contains dependency configuration",
                    },
                    { status: 404 },
                )
            }

            selectedPaths = fallbackFiles.map((f) => f.path)
        } else {
            const selection = JSON.parse(selectionMatch[0])
            console.log("[analyze-local] Parsed selection:", selection)
            selectedPaths = selection.selectedFiles || []

            if (selectedPaths.length === 0) {
                console.log(
                    "[analyze-local] AI returned empty selectedFiles, using fallback",
                )
                // Use fallback when AI returns empty array
                const fallbackFiles = allFiles
                    .filter(
                        (f) =>
                            (f.language === "java" &&
                                f.name.includes("Module") &&
                                !f.path.includes("/test/")) ||
                            (f.language === "python" &&
                                (f.name.includes("di_") ||
                                    f.name.includes("dependencies"))) ||
                            (f.language === "typescript" &&
                                f.name.endsWith(".module.ts")),
                    )
                    .slice(0, 3)

                if (fallbackFiles.length === 0) {
                    return NextResponse.json(
                        {
                            error: "No config files found, ensure codebase contains dependency configuration",
                        },
                        { status: 404 },
                    )
                }

                selectedPaths = fallbackFiles.map((f) => f.path)
            }
        }

        console.log(
            `[analyze-local] Found ${selectedPaths.length} config files`,
        )
        console.log(`[analyze-local] Selected files:`, selectedPaths)

        // 4. Read selected file contents
        const selectedFiles = allFiles.filter((f) =>
            selectedPaths.includes(f.path),
        )
        console.log(`[analyze-local] Reading ${selectedFiles.length} files`)
        selectedFiles.forEach((f) => {
            console.log(
                `  - ${f.path} (${f.language}, ${f.size} bytes, content length: ${f.content.length})`,
            )
        })
        const filesContent = selectedFiles
            .map(
                (f) =>
                    `File: ${f.path}\n\`\`\`${f.language}\n${f.content.slice(0, 50000)}\n\`\`\``,
            )
            .join("\n\n")

        console.log(`[analyze-local] Analyzing service dependencies...`)
        console.log(
            `[analyze-local] Content preview (first 500 chars):`,
            filesContent.slice(0, 500),
        )

        // 5. Second AI call: Analyze dependencies
        const result = await generateText({
            model,
            ...(providerOptions && { providerOptions }),
            ...(headers && { headers }),
            messages: [
                {
                    role: "user",
                    content: `Analyze these configuration files and extract all real service dependencies.

Important rules:
1. Find dependency injection configuration (e.g., @Provides, @Bean, ClientBuilder, etc.)
2. Extract instantiated Client class names
3. Ignore test code, Mock objects, comments, utility classes
4. Only extract real business service dependencies

${filesContent}

Return JSON format:
{
  "serviceName": "Service name (inferred from package name or directory name)",
  "dependencies": ["ServiceA", "ServiceB", ...]
}

Return ONLY JSON, no other explanation.`,
                },
            ],
        })

        // 6. Parse AI returned JSON
        console.log(
            "[analyze-local] AI raw response:",
            result.text.slice(0, 1000),
        )

        const jsonMatch = result.text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            console.error("[analyze-local] AI response (full):", result.text)
            throw new Error(
                `AI did not return valid JSON format. Response: ${result.text.slice(0, 500)}...`,
            )
        }

        console.log("[analyze-local] Extracted JSON:", jsonMatch[0])

        let analysis
        try {
            analysis = JSON.parse(jsonMatch[0])
        } catch (parseError) {
            console.error("[analyze-local] JSON parse failed:", jsonMatch[0])
            throw new Error(
                `JSON parse error: ${parseError instanceof Error ? parseError.message : "unknown error"}`,
            )
        }

        console.log(`[analyze-local] Analysis complete`)
        console.log(`[analyze-local] Service: ${analysis.serviceName}`)
        console.log(`[analyze-local] Dependencies:`, analysis.dependencies)
        console.log(
            `[analyze-local] Dependencies count: ${analysis.dependencies?.length || 0}`,
        )

        // 7. Generate context for third AI call
        const context = generateDependencyContext(
            analysis.serviceName,
            analysis.dependencies || [],
        )

        return NextResponse.json({
            success: true,
            serviceName: analysis.serviceName,
            dependencies: analysis.dependencies || [],
            context: context,
            fileCount: allFiles.length,
        })
    } catch (error) {
        console.error("[analyze-local] Error:", error)

        const message =
            error instanceof Error ? error.message : "Analysis failed"

        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/**
 * Find key dependency configuration files
 */
function _findKeyConfigFiles(dir: string): string[] {
    const keyFiles: string[] = []
    const keyFileNames = [
        "ClientModule.java",
        "DependencyModule.java",
        "ServiceModule.java",
    ]

    function search(currentDir: string, depth: number = 0) {
        if (depth > 10) return // Limit recursion depth

        try {
            const entries = readdirSync(currentDir, { withFileTypes: true })

            for (const entry of entries) {
                const fullPath = join(currentDir, entry.name)

                if (entry.isDirectory()) {
                    if (IGNORE_DIRS.includes(entry.name)) continue
                    search(fullPath, depth + 1)
                } else if (keyFileNames.includes(entry.name)) {
                    keyFiles.push(fullPath)
                }
            }
        } catch (_err) {
            // Skip inaccessible directories
        }
    }

    search(dir)
    return keyFiles
}

/**
 * Generate dependency analysis context
 */
function generateDependencyContext(
    serviceName: string,
    dependencies: string[],
): string {
    if (dependencies.length === 0) {
        return `# Service Dependency Analysis\n\n**Service**: ${serviceName}\n\n**Dependencies**: None detected`
    }

    const depList = dependencies
        .map((dep, index) => `${index + 1}. **${dep}**`)
        .join("\n")

    return `# Service Dependency Analysis

**Service**: ${serviceName}

**Dependencies Detected** (${dependencies.length} total):

${depList}

## Diagram Requirements:

- Main service: **${serviceName}** (Blue rectangle, left side)
- Dependency services (Green rectangles, right side):
${dependencies.map((d) => `  • ${d}`).join("\n")}

## Arrow Style Requirements:
- Use orthogonal or curved arrows that route around shapes
- Set edgeStyle=orthogonalEdgeStyle for edges
- Set rounded=1 for smooth corners
- Avoid straight line arrows that go through shapes
- Arrows should intelligently route around rectangles

Generate a clean dependency diagram with smart arrow routing.`
}
