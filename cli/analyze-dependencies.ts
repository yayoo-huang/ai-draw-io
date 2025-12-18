#!/usr/bin/env node

/**
 * AI Draw.io Dependency Analyzer CLI
 *
 * Usage:
 *   cd /path/to/your/codebase
 *   node /path/to/analyze-dependencies.js analyze
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "fs"
import { join, relative } from "path"

// ===== Embedded dependency analysis logic =====
interface CodeFile {
    name: string
    path: string
    content: string
    language: string
    size: number
}

interface Dependency {
    serviceName: string
    source: "client_class" | "config" | "import" | "di"
    confidence: "high" | "medium" | "low"
    evidence: string
}

interface ServiceAnalysis {
    serviceName: string
    dependencies: Dependency[]
}

function inferServiceName(files: CodeFile[]): string {
    if (files.length === 0) return "UnknownService"

    const firstPath = files[0].path
    const parts = firstPath.split("/")

    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i]
        const skipNames = [
            "src",
            "main",
            "java",
            "app",
            "lib",
            "pkg",
            "com",
            "amazon",
            "internal",
        ]
        if (skipNames.some((skip) => part.toLowerCase().includes(skip)))
            continue

        if (
            part.length > 3 &&
            (/[A-Z]/.test(part) ||
                part.includes("Service") ||
                part.includes("Gateway"))
        ) {
            return part
        }
    }

    return parts.filter((p) => p && p !== "src")[0] || "UnknownService"
}

function analyzeServiceDependencies(files: CodeFile[]): ServiceAnalysis {
    const serviceName = inferServiceName(files)
    const dependencies: Dependency[] = []

    for (const file of files) {
        if (file.language === "java") {
            // @Provides pattern
            const providesPattern =
                /@Provides[\s\S]{0,200}?public\s+(\w+(?:Client|Service|Lambda|Authority))\s+\w+/g
            let match
            while ((match = providesPattern.exec(file.content)) !== null) {
                const clientClass = match[1]
                const depName = clientClass
                    .replace(/Client$/, "")
                    .replace(/ServiceClient$/, "")
                if (depName.length > 2 && depName.length < 100) {
                    dependencies.push({
                        serviceName: depName,
                        source: "client_class",
                        confidence: "high",
                        evidence: `Found in ${file.name}: @Provides ${clientClass}`,
                    })
                }
            }

            // ClientBuilder pattern
            const clientBuilderPattern =
                /new\s+ClientBuilder\(\)[\s\S]{0,100}?\.remoteOf\((\w+)\.class\)/g
            while ((match = clientBuilderPattern.exec(file.content)) !== null) {
                const clientClass = match[1]
                const depName = clientClass.replace(/Client$/, "")
                if (depName.length > 2 && depName.length < 100) {
                    dependencies.push({
                        serviceName: depName,
                        source: "client_class",
                        confidence: "high",
                        evidence: `Found in ${file.name}: ClientBuilder.remoteOf(${clientClass})`,
                    })
                }
            }

            // Import statements
            const importPattern =
                /import\s+[\w.]+\.(\w+(?:Client|Service|Lambda|Authority))\s*;/g
            while ((match = importPattern.exec(file.content)) !== null) {
                const importedClass = match[1]
                const depName = importedClass
                    .replace(/Client$/, "")
                    .replace(/ServiceClient$/, "")
                if (depName.length > 2 && depName.length < 100) {
                    dependencies.push({
                        serviceName: depName,
                        source: "import",
                        confidence: "medium",
                        evidence: `Found in ${file.name}: import ${importedClass}`,
                    })
                }
            }
        }
    }

    // Deduplicate
    const serviceMap = new Map<string, Dependency>()
    for (const dep of dependencies) {
        const existing = serviceMap.get(dep.serviceName)
        if (
            !existing ||
            (dep.confidence === "high" && existing.confidence !== "high")
        ) {
            serviceMap.set(dep.serviceName, dep)
        }
    }

    return {
        serviceName,
        dependencies: Array.from(serviceMap.values()).sort((a, b) =>
            a.serviceName.localeCompare(b.serviceName),
        ),
    }
}

function generateDependencyContext(analysis: ServiceAnalysis): string {
    const { serviceName, dependencies } = analysis

    if (dependencies.length === 0) {
        return `# Service Dependency Analysis\n\n**Service**: ${serviceName}\n\n**Dependencies**: None detected`
    }

    const depList = dependencies
        .map(
            (dep, index) =>
                `${index + 1}. **${dep.serviceName}** (${dep.confidence} confidence)`,
        )
        .join("\n")

    return `# Service Dependency Analysis

**Service**: ${serviceName}

**Dependencies Detected** (${dependencies.length} total):

${depList}

## Diagram Requirements:

- Main service: **${serviceName}** (Blue rectangle, left side)
- Dependency services (Green rectangles, right side):
${dependencies.map((d) => `  • ${d.serviceName}`).join("\n")}

Generate a clean dependency diagram showing these relationships.`
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

interface CliOptions {
    serviceName?: string
    path?: string
    output?: string
    verbose?: boolean
}

/**
 * Recursively scan directory and collect code files
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

                // Skip files that are too large
                if (stats.size > 5 * 1024 * 1024) continue
                if (stats.size === 0) continue

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

/**
 * Detect programming language
 */
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
 * Analyze dependencies in current directory
 */
async function analyzeCurrentDirectory(options: CliOptions) {
    const targetDir = options.path || process.cwd()
    const _serviceName = options.serviceName

    console.log("🔍 Scanning codebase...")
    console.log(`📁 Directory: ${targetDir}`)

    // Scan files
    const files = scanDirectory(targetDir)

    console.log(`✅ Found ${files.length} code files`)

    if (files.length === 0) {
        console.error("❌ No code files found")
        process.exit(1)
    }

    // Analyze dependencies
    console.log("\n🔬 Analyzing dependencies...")
    const analysis = analyzeServiceDependencies(files)

    console.log(`\n📊 Analysis results:`)
    console.log(`   Service name: ${analysis.serviceName}`)
    console.log(`   Dependencies count: ${analysis.dependencies.length}`)

    if (analysis.dependencies.length > 0) {
        console.log(`\n📦 Dependencies list:`)
        analysis.dependencies.forEach((dep, index) => {
            console.log(
                `   ${index + 1}. ${dep.serviceName} (${dep.confidence})`,
            )
            if (options.verbose) {
                console.log(`      Source: ${dep.source}`)
                console.log(`      Evidence: ${dep.evidence}`)
            }
        })
    } else {
        console.log(`   ⚠️  No dependencies found (may need more config files)`)
    }

    // Generate context
    const context = generateDependencyContext(analysis)

    // Save to file
    if (options.output) {
        writeFileSync(options.output, JSON.stringify(analysis, null, 2))
        console.log(`\n✅ Analysis results saved to: ${options.output}`)
    }

    // Generate AI prompt
    console.log(`\n📝 Use the following prompt to generate diagram:`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(context)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(
        `\n💡 Copy the content above and paste it into AI Draw.io chat box to generate the diagram`,
    )

    return analysis
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2)

    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
        console.log(`
AI Draw.io Dependency Analysis Tool

Usage:
  npx ai-drawio-deps analyze [options] [service-name]
  
Options:
  --path, -p <path>      Specify codebase path (default: current directory)
  --output, -o <file>    Save analysis results to file
  --verbose, -v          Show detailed information
  --help, -h             Show help information

Examples:
  # Analyze current directory
  npx ai-drawio-deps analyze
  
  # Analyze specified directory
  npx ai-drawio-deps analyze --path ./AglTransportationBookingApiGateway
  
  # Save results to file
  npx ai-drawio-deps analyze --output analysis.json
  
  # Show detailed information
  npx ai-drawio-deps analyze --verbose
`)
        process.exit(0)
    }

    const options: CliOptions = {
        verbose: args.includes("--verbose") || args.includes("-v"),
    }

    // Parse path parameter
    const pathIndex = args.findIndex((arg) => arg === "--path" || arg === "-p")
    if (pathIndex !== -1 && args[pathIndex + 1]) {
        options.path = args[pathIndex + 1]
    }

    // Parse output parameter
    const outputIndex = args.findIndex(
        (arg) => arg === "--output" || arg === "-o",
    )
    if (outputIndex !== -1 && args[outputIndex + 1]) {
        options.output = args[outputIndex + 1]
    }

    // Service name (non-option parameter)
    const serviceName = args.find(
        (arg) => !arg.startsWith("-") && arg !== "analyze",
    )
    if (serviceName) {
        options.serviceName = serviceName
    }

    try {
        await analyzeCurrentDirectory(options)
    } catch (error) {
        console.error("❌ Analysis failed:", error)
        process.exit(1)
    }
}

main()
