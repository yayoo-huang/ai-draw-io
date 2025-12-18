"use client"

import JSZip from "jszip"
import {
    FileArchive,
    FileCode,
    Folder,
    FolderOpen,
    Upload,
    X,
} from "lucide-react"
import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface CodeFile {
    name: string
    path: string
    content: string
    language: string
    size: number
}

interface CodeUploadProps {
    onFilesReady: (files: CodeFile[]) => void
    maxSize?: number // MB
    maxFiles?: number
}

export function CodeUpload({
    onFilesReady,
    maxSize = 50,
    maxFiles = 1000,
}: CodeUploadProps) {
    const [files, setFiles] = useState<CodeFile[]>([])
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string>("")
    const [dragActive, setDragActive] = useState(false)
    const [localPath, setLocalPath] = useState<string>("")
    const [analyzing, setAnalyzing] = useState(false)

    // Supported code file extensions
    const CODE_EXTENSIONS = [
        ".py",
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".java",
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
        ".sh",
        ".yml",
        ".yaml",
        ".json",
        ".xml",
        ".sql",
        ".proto",
        ".gradle",
    ]

    // Files/folders to ignore
    const IGNORE_PATTERNS = [
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
    ]

    const shouldIgnore = (path: string): boolean => {
        return IGNORE_PATTERNS.some(
            (pattern) =>
                path.includes(`/${pattern}/`) || path.startsWith(`${pattern}/`),
        )
    }

    const detectLanguage = (filename: string): string => {
        const ext = filename.substring(filename.lastIndexOf("."))
        const languageMap: Record<string, string> = {
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
        return languageMap[ext] || "text"
    }

    const handleFolderUpload = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const fileList = event.target.files
        if (!fileList) return

        setUploading(true)
        setError("")

        try {
            const processedFiles: CodeFile[] = []
            let totalSize = 0
            let skippedFiles = 0

            for (const file of Array.from(fileList)) {
                const path = file.webkitRelativePath || file.name

                if (shouldIgnore(path)) continue

                const isCodeFile = CODE_EXTENSIONS.some((ext) =>
                    file.name.endsWith(ext),
                )
                if (!isCodeFile) continue

                // Skip files that are too large or potentially problematic
                if (file.size === 0) {
                    skippedFiles++
                    continue
                }

                if (file.size > 5 * 1024 * 1024) {
                    // Skip individual files > 5MB
                    skippedFiles++
                    continue
                }

                totalSize += file.size
                if (totalSize > maxSize * 1024 * 1024) {
                    throw new Error(
                        `Total file size exceeds ${maxSize}MB limit`,
                    )
                }

                try {
                    const content = await file.text()

                    processedFiles.push({
                        name: file.name,
                        path: path,
                        content: content,
                        language: detectLanguage(file.name),
                        size: file.size,
                    })

                    if (processedFiles.length >= maxFiles) {
                        throw new Error(`File count exceeds ${maxFiles} limit`)
                    }
                } catch (fileErr) {
                    // Skip files that can't be read (permission issues, etc.)
                    console.warn(`Cannot read file ${path}:`, fileErr)
                    skippedFiles++
                }
            }

            if (processedFiles.length === 0) {
                throw new Error("No valid code files found")
            }

            setFiles(processedFiles)
            onFilesReady(processedFiles)

            // Show info about skipped files if any
            if (skippedFiles > 0) {
                console.log(`Skipped ${skippedFiles} unreadable files`)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed")
        } finally {
            setUploading(false)
        }
    }

    const handleZipUpload = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0]
        if (!file) return

        setUploading(true)
        setError("")

        try {
            if (!file.name.endsWith(".zip")) {
                throw new Error("Please upload a .zip file")
            }

            if (file.size > maxSize * 1024 * 1024) {
                throw new Error(`ZIP file size exceeds ${maxSize}MB limit`)
            }

            const zip = new JSZip()
            const zipContent = await zip.loadAsync(file)

            const processedFiles: CodeFile[] = []
            let totalSize = 0
            let skippedFiles = 0

            for (const [relativePath, zipEntry] of Object.entries(
                zipContent.files,
            )) {
                if (zipEntry.dir) continue
                if (shouldIgnore(relativePath)) continue

                const isCodeFile = CODE_EXTENSIONS.some((ext) =>
                    relativePath.endsWith(ext),
                )
                if (!isCodeFile) continue

                try {
                    const content = await zipEntry.async("text")
                    const fileName =
                        relativePath.split("/").pop() || relativePath

                    // Skip empty files or files that are too large
                    if (
                        content.length === 0 ||
                        content.length > 5 * 1024 * 1024
                    ) {
                        skippedFiles++
                        continue
                    }

                    totalSize += content.length
                    if (totalSize > maxSize * 1024 * 1024) {
                        throw new Error(
                            `Total file size exceeds ${maxSize}MB limit`,
                        )
                    }

                    processedFiles.push({
                        name: fileName,
                        path: relativePath,
                        content: content,
                        language: detectLanguage(fileName),
                        size: content.length,
                    })

                    if (processedFiles.length >= maxFiles) {
                        throw new Error(`File count exceeds ${maxFiles} limit`)
                    }
                } catch (fileErr) {
                    // Skip files that can't be extracted
                    console.warn(
                        `Cannot extract file ${relativePath}:`,
                        fileErr,
                    )
                    skippedFiles++
                }
            }

            if (processedFiles.length === 0) {
                throw new Error("No valid code files found in ZIP")
            }

            setFiles(processedFiles)
            onFilesReady(processedFiles)

            // Show info about skipped files if any
            if (skippedFiles > 0) {
                console.log(
                    `Skipped ${skippedFiles} files that could not be extracted`,
                )
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to extract ZIP",
            )
        } finally {
            setUploading(false)
        }
    }

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        const droppedFiles = Array.from(e.dataTransfer.files)
        if (droppedFiles.length === 0) return

        const firstFile = droppedFiles[0]

        if (firstFile.name.endsWith(".zip")) {
            // Create temporary input element to handle dropped ZIP file
            const input = document.createElement("input")
            const dataTransfer = new DataTransfer()
            dataTransfer.items.add(firstFile)
            input.files = dataTransfer.files

            const fakeEvent = {
                target: input,
            } as unknown as React.ChangeEvent<HTMLInputElement>
            await handleZipUpload(fakeEvent)
        } else {
            setError(
                'Please use "Select Folder" button to upload a folder, or drag & drop a ZIP file',
            )
        }
    }, [])

    const handleLocalPathAnalysis = async () => {
        if (!localPath.trim()) {
            setError("Please enter codebase path")
            return
        }

        setAnalyzing(true)
        setError("")

        try {
            const response = await fetch("/api/analyze-local", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ path: localPath.trim() }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Analysis failed")
            }

            // Convert to CodeFile format (although we don't actually need file content)
            const dummyFiles: CodeFile[] = [
                {
                    name: data.serviceName,
                    path: localPath,
                    content: data.context,
                    language: "analysis",
                    size: data.fileCount,
                },
            ]

            setFiles(dummyFiles)
            onFilesReady(dummyFiles)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Local analysis failed",
            )
        } finally {
            setAnalyzing(false)
        }
    }

    const clearFiles = () => {
        setFiles([])
        setError("")
        setLocalPath("")
    }

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + " B"
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
        return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    }

    return (
        <div className="space-y-4">
            {files.length === 0 && (
                <Card
                    className={`p-8 border-2 border-dashed transition-colors ${
                        dragActive
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-300"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <Upload className="w-12 h-12 text-gray-400" />

                        <div className="text-center">
                            <p className="text-lg font-medium">
                                Analyze Service Code
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                Automatically identify service dependencies and
                                generate architecture diagram
                            </p>
                        </div>

                        {/* Local path input */}
                        <div className="w-full max-w-md space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="/path/to/your/codebase"
                                    value={localPath}
                                    onChange={(e) =>
                                        setLocalPath(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleLocalPathAnalysis()
                                        }
                                    }}
                                    disabled={analyzing}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleLocalPathAnalysis}
                                    disabled={analyzing || !localPath.trim()}
                                    className="whitespace-nowrap"
                                >
                                    {analyzing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <FolderOpen className="w-4 h-4 mr-2" />
                                            Analyze
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 text-center">
                                Enter local codebase path (requires npm run dev)
                            </p>
                        </div>

                        <div className="w-full border-t border-gray-200 my-4" />

                        <p className="text-sm text-gray-500 mb-2">
                            Or upload files:
                        </p>

                        <div className="flex gap-3">
                            <label htmlFor="folder-upload">
                                <Button
                                    variant="outline"
                                    disabled={uploading}
                                    asChild
                                >
                                    <span className="cursor-pointer">
                                        <Folder className="w-4 h-4 mr-2" />
                                        Select Folder
                                    </span>
                                </Button>
                                <input
                                    id="folder-upload"
                                    type="file"
                                    /* @ts-expect-error */
                                    webkitdirectory=""
                                    directory=""
                                    multiple
                                    onChange={handleFolderUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                            </label>

                            <label htmlFor="zip-upload">
                                <Button
                                    variant="outline"
                                    disabled={uploading}
                                    asChild
                                >
                                    <span className="cursor-pointer">
                                        <FileArchive className="w-4 h-4 mr-2" />
                                        Upload ZIP
                                    </span>
                                </Button>
                                <input
                                    id="zip-upload"
                                    type="file"
                                    accept=".zip"
                                    onChange={handleZipUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                            </label>
                        </div>

                        <p className="text-xs text-gray-400">
                            Max {maxSize}MB, supports Java, Python, JavaScript,
                            TypeScript, etc.
                        </p>
                    </div>
                </Card>
            )}

            {uploading && (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">
                        Processing files...
                    </p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {files.length > 0 && (
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FileCode className="w-5 h-5 text-blue-500" />
                            <span className="font-medium">
                                Uploaded {files.length} files
                            </span>
                            <span className="text-sm text-gray-500">
                                (
                                {formatSize(
                                    files.reduce((sum, f) => sum + f.size, 0),
                                )}
                                )
                            </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearFiles}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1">
                        {files.slice(0, 10).map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between text-sm py-1 px-2 hover:bg-gray-50 rounded"
                            >
                                <span
                                    className="truncate flex-1"
                                    title={file.path}
                                >
                                    {file.path}
                                </span>
                                <span className="text-gray-400 text-xs ml-2">
                                    {formatSize(file.size)}
                                </span>
                            </div>
                        ))}
                        {files.length > 10 && (
                            <p className="text-xs text-gray-500 text-center pt-2">
                                ... and {files.length - 10} more files
                            </p>
                        )}
                    </div>
                </Card>
            )}
        </div>
    )
}
