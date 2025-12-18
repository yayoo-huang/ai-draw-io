// Dependency detection engine - rule-based system using programming knowledge

export interface CodeFile {
    name: string
    path: string
    content: string
    language: string
    size: number
}

export interface Dependency {
    serviceName: string
    source: "client_class" | "config" | "import" | "di"
    confidence: "high" | "medium" | "low"
    evidence: string
}

export interface ServiceAnalysis {
    serviceName: string
    dependencies: Dependency[]
}

// Architecture knowledge base - defines patterns for different languages/frameworks
const _ARCHITECTURAL_PATTERNS = {
    java_guice: {
        keyDirectories: ["module", "config"],
        keyFilePatterns: ["ClientModule.java", "Module.java", "Config.java"],
        clientPatterns: [
            // @Provides public XBTBookingMgmtServiceClient getClient()
            /@Provides[\s\S]*?public\s+(\w+(?:Client|Service|Lambda))\s+get/g,
            // new ClientBuilder().remoteOf(XBTBookingMgmtServiceClient.class)
            /\.remoteOf\((\w+(?:Client|Service))\.class\)/g,
            // import statements
            /import\s+[\w.]+\.(\w+(?:Client|Service|Lambda|Authority))\s*;/g,
        ],
    },
    java_spring: {
        keyDirectories: ["config", "configuration"],
        keyFilePatterns: ["Config.java", "Configuration.java"],
        clientPatterns: [
            /@Bean[\s\S]*?public\s+(\w+(?:Client|Service))/g,
            /@Autowired[\s\S]*?private\s+(\w+(?:Client|Service))/g,
        ],
    },
    python: {
        keyDirectories: ["clients", "services", "config"],
        keyFilePatterns: ["__init__.py", "client.py", "config.py"],
        clientPatterns: [
            /from\s+[\w.]+\s+import\s+(\w+(?:Client|Service))/g,
            /self\.\w+\s*=\s*(\w+Client)\(/g,
        ],
    },
}

/**
 * Main entry point: Analyze service dependencies
 */
export function analyzeServiceDependencies(files: CodeFile[]): ServiceAnalysis {
    console.log(`[Dependency Detector] Analyzing ${files.length} files...`)

    // Step 1: Infer service name
    const serviceName = inferServiceName(files)
    console.log(`[Dependency Detector] Service name: ${serviceName}`)

    // Step 2: Detect programming language
    const language = detectPrimaryLanguage(files)
    console.log(`[Dependency Detector] Primary language: ${language}`)

    // Step 3: Select key files (intelligent filtering)
    const keyFiles = selectKeyFiles(files, language)
    console.log(
        `[Dependency Detector] Selected ${keyFiles.length} key files for analysis`,
    )

    // Step 4: Extract dependencies
    const dependencies = extractDependencies(keyFiles, language)
    console.log(
        `[Dependency Detector] Found ${dependencies.length} dependencies`,
    )

    // Step 5: Deduplicate and clean
    const uniqueDeps = deduplicateAndClean(dependencies)
    console.log(
        `[Dependency Detector] After deduplication: ${uniqueDeps.length} dependencies`,
    )

    return {
        serviceName,
        dependencies: uniqueDeps,
    }
}

/**
 * Infer service name from file paths
 */
function inferServiceName(files: CodeFile[]): string {
    if (files.length === 0) return "UnknownService"

    // Extract service name from first file's path
    const firstPath = files[0].path
    const parts = firstPath.split("/")

    // Find the most likely service name part
    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i]

        // Skip common directory names
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

        // If it looks like a service name (contains uppercase or Service/Gateway/Lambda keywords)
        if (
            part.length > 3 &&
            (/[A-Z]/.test(part) ||
                part.includes("Service") ||
                part.includes("Gateway") ||
                part.includes("Lambda") ||
                part.includes("Api") ||
                part.includes("API"))
        ) {
            return part
        }
    }

    return parts.filter((p) => p && p !== "src")[0] || "UnknownService"
}

/**
 * Detect primary programming language
 */
function detectPrimaryLanguage(files: CodeFile[]): string {
    const langCounts: Record<string, number> = {}

    files.forEach((f) => {
        langCounts[f.language] = (langCounts[f.language] || 0) + 1
    })

    const sorted = Object.entries(langCounts).sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0] || "unknown"
}

/**
 * Intelligently select key files - based on architectural knowledge
 */
function selectKeyFiles(files: CodeFile[], _language: string): CodeFile[] {
    const scored: Array<{ file: CodeFile; score: number }> = []

    for (const file of files) {
        let score = 0
        const path = file.path.toLowerCase()
        const name = file.name.toLowerCase()

        // Rule 1: Directory name matching (based on architectural knowledge)
        if (path.includes("/module/")) score += 15
        if (path.includes("/config/")) score += 12
        if (path.includes("/accessor/")) score += 10
        if (path.includes("/client/")) score += 8

        // Rule 2: File name matching
        if (name.includes("clientmodule")) score += 20
        if (name.includes("client") && name.includes("config")) score += 15
        if (name.endsWith("module.java")) score += 15
        if (name.endsWith("config.java")) score += 12

        // Rule 3: Content feature quick scan (first 3000 characters)
        const preview = file.content.substring(0, 3000).toLowerCase()
        if (preview.includes("@provides")) score += 25
        if (preview.includes("@bean")) score += 25
        if (preview.includes("clientbuilder")) score += 20
        if (preview.includes("client;")) score += 5

        // Rule 4: File size reasonableness (files too small or too large are unlikely to be dependency definition files)
        if (file.size > 500 && file.size < 100000) score += 3

        if (score > 0) {
            scored.push({ file, score })
        }
    }

    // Return top 15 files with highest scores
    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 15)
        .map((s) => s.file)
}

/**
 * Extract dependencies - based on language-specific patterns
 */
function extractDependencies(
    files: CodeFile[],
    language: string,
): Dependency[] {
    const dependencies: Dependency[] = []

    for (const file of files) {
        // Java dependency extraction
        if (file.language === "java" || language === "java") {
            dependencies.push(...extractJavaDependencies(file))
        }

        // Python dependency extraction
        if (file.language === "python" || language === "python") {
            dependencies.push(...extractPythonDependencies(file))
        }

        // TypeScript/JavaScript dependency extraction
        if (file.language === "typescript" || file.language === "javascript") {
            dependencies.push(...extractJavaScriptDependencies(file))
        }
    }

    return dependencies
}

/**
 * Java dependency extraction
 */
function extractJavaDependencies(file: CodeFile): Dependency[] {
    const dependencies: Dependency[] = []
    const content = file.content

    // Pattern 1: @Provides methods (Guice)
    const providesPattern =
        /@Provides[\s\S]{0,200}?public\s+(\w+(?:Client|Service|Lambda|Authority))\s+\w+/g
    let match
    while ((match = providesPattern.exec(content)) !== null) {
        const clientClass = match[1]
        const serviceName = clientClass
            .replace(/Client$/, "")
            .replace(/ServiceClient$/, "")

        if (isValidServiceName(serviceName)) {
            dependencies.push({
                serviceName,
                source: "client_class",
                confidence: "high",
                evidence: `Found in ${file.name}: @Provides ${clientClass}`,
            })
        }
    }

    // Pattern 2: ClientBuilder pattern
    const clientBuilderPattern =
        /new\s+ClientBuilder\(\)[\s\S]{0,100}?\.remoteOf\((\w+)\.class\)/g
    while ((match = clientBuilderPattern.exec(content)) !== null) {
        const clientClass = match[1]
        const serviceName = clientClass.replace(/Client$/, "")

        if (isValidServiceName(serviceName)) {
            dependencies.push({
                serviceName,
                source: "client_class",
                confidence: "high",
                evidence: `Found in ${file.name}: ClientBuilder.remoteOf(${clientClass})`,
            })
        }
    }

    // Pattern 3: Import statements
    const importPattern =
        /import\s+[\w.]+\.(\w+(?:Client|Service|Lambda|Authority|Resource))\s*;/g
    while ((match = importPattern.exec(content)) !== null) {
        const importedClass = match[1]
        const serviceName = importedClass
            .replace(/Client$/, "")
            .replace(/ServiceClient$/, "")
            .replace(/Resource$/, "")

        if (isValidServiceName(serviceName)) {
            dependencies.push({
                serviceName,
                source: "import",
                confidence: "medium",
                evidence: `Found in ${file.name}: import ${importedClass}`,
            })
        }
    }

    return dependencies
}

/**
 * Python dependency extraction
 */
function extractPythonDependencies(file: CodeFile): Dependency[] {
    const dependencies: Dependency[] = []
    const content = file.content

    // from xxx import XxxClient
    const importPattern = /from\s+[\w.]+\s+import\s+(\w+(?:Client|Service))/g
    let match
    while ((match = importPattern.exec(content)) !== null) {
        const clientClass = match[1]
        const serviceName = clientClass.replace(/Client$/, "")

        if (isValidServiceName(serviceName)) {
            dependencies.push({
                serviceName,
                source: "import",
                confidence: "high",
                evidence: `Found in ${file.name}: import ${clientClass}`,
            })
        }
    }

    return dependencies
}

/**
 * JavaScript/TypeScript dependency extraction
 */
function extractJavaScriptDependencies(file: CodeFile): Dependency[] {
    const dependencies: Dependency[] = []
    const content = file.content

    // import { XxxClient } from 'xxx'
    const importPattern = /import\s+\{?\s*(\w+(?:Client|Service))\s*\}?\s+from/g
    let match
    while ((match = importPattern.exec(content)) !== null) {
        const clientClass = match[1]
        const serviceName = clientClass.replace(/Client$/, "")

        if (isValidServiceName(serviceName)) {
            dependencies.push({
                serviceName,
                source: "import",
                confidence: "high",
                evidence: `Found in ${file.name}: import ${clientClass}`,
            })
        }
    }

    return dependencies
}

/**
 * Validate if it's a valid service name
 */
function isValidServiceName(name: string): boolean {
    // Basic validation rules
    return (
        name.length > 2 &&
        name.length < 100 &&
        /^[A-Z]/.test(name) && // Starts with uppercase letter
        // Exclude basic types
        ![
            "String",
            "Integer",
            "Boolean",
            "Object",
            "List",
            "Map",
            "Set",
            "Array",
            "Http",
            "Rest",
            "Json",
            "Xml",
            "Builder",
        ].includes(name) &&
        // Exclude common non-service classes
        !name.endsWith("Builder") &&
        !name.endsWith("Factory") &&
        !name.endsWith("Utils") &&
        !name.endsWith("Helper")
    )
}

/**
 * Deduplicate and clean dependencies
 */
function deduplicateAndClean(dependencies: Dependency[]): Dependency[] {
    const serviceMap = new Map<string, Dependency>()

    for (const dep of dependencies) {
        const existing = serviceMap.get(dep.serviceName)

        if (!existing) {
            serviceMap.set(dep.serviceName, dep)
        } else {
            // Keep the one with higher confidence
            const confidenceRank = { high: 3, medium: 2, low: 1 }
            if (
                confidenceRank[dep.confidence] >
                confidenceRank[existing.confidence]
            ) {
                serviceMap.set(dep.serviceName, dep)
            }
        }
    }

    return Array.from(serviceMap.values()).sort((a, b) =>
        a.serviceName.localeCompare(b.serviceName),
    )
}

/**
 * Generate concise dependency context (for AI use)
 */
export function generateDependencyContext(analysis: ServiceAnalysis): string {
    const { serviceName, dependencies } = analysis

    if (dependencies.length === 0) {
        return `
# Service Dependency Analysis

**Service**: ${serviceName}

**Dependencies**: None detected

This service appears to be standalone or dependencies could not be automatically detected.
`
    }

    const depList = dependencies
        .map(
            (dep, index) =>
                `${index + 1}. **${dep.serviceName}** (${dep.confidence} confidence)`,
        )
        .join("\n")

    return `
# Service Dependency Analysis

**Service**: ${serviceName}

**Dependencies Detected** (${dependencies.length} total):

${depList}

## Diagram Requirements:

- Main service: **${serviceName}** (Blue rectangle, left side)
- Dependency services (Green rectangles, right side):
${dependencies.map((d) => `  • ${d.serviceName}`).join("\n")}

Generate a clean dependency diagram showing these relationships.
`
}
