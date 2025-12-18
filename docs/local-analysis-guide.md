# Local Codebase Analysis - User Guide

## 🎯 Feature Overview

Fully automated local codebase dependency analysis - no code upload required!

### Workflow

```
Enter Path → Backend Analysis → Auto Send → AI Generates Diagram → Display
   (5s)          (2-3s)           (Auto)         (10-15s)          (Done)
```

## 🚀 Quick Start

### 1. Start the Service

```bash
cd /path/to/ai-draw-io
npm run dev
```

### 2. Open Browser

Visit: http://localhost:3000

### 3. Enter Path for Analysis

1. Click the **"Upload Code"** button (📤 icon) next to the chat input
2. Enter the codebase path in the top input field, for example:
   ```
   /Users/you/workspace/AglTransportationBookingApiGateway
   ```
3. Click the **"Analyze"** button
4. Wait for analysis to complete (2-3 seconds)
5. **Automatically sent to chat** - no manual action needed!
6. AI automatically generates dependency diagram (10-15 seconds)
7. Diagram is displayed in the interface ✅

## 📊 Interface Demo

```
┌─────────────────────────────────────────────┐
│  📤 Analyze Service Code                     │
├─────────────────────────────────────────────┤
│                                             │
│  [/path/to/your/codebase        ] [Analyze] │
│  Enter local codebase path                   │
│                                             │
│  ─────────────── Or upload files ────────── │
│                                             │
│  [ Select Folder ]  [ Upload ZIP ]          │
│                                             │
└─────────────────────────────────────────────┘
```

## ✨ Features

### ✅ Advantages

- **No Code Upload** - Data never leaves your machine
- **Fully Automatic** - Auto-sends after analysis, no copy-paste needed
- **Handles Large Codebases** - Can process GB-sized repositories
- **Fast Analysis** - Usually completes in 2-3 seconds
- **Smart Detection** - Automatically recognizes Java, Python, TypeScript, etc.

### 📝 What It Analyzes

The tool intelligently extracts:
- Client classes with `@Provides` annotations
- `ClientBuilder.remoteOf()` calls
- Service dependencies in `import` statements
- Dependency declarations in configuration files

## 🔧 Supported Languages

- ✅ Java (Guice, Spring)
- ✅ Python
- ✅ TypeScript / JavaScript
- ✅ Go
- ✅ C / C++
- ✅ C#
- ✅ Ruby
- ✅ PHP
- ✅ Swift
- ✅ Kotlin
- ✅ Rust
- ✅ Scala

## 📋 Complete Examples

### Example 1: Analyze Single Service

```
Path: /Users/you/AglTransportationBookingApiGateway

Analysis Result (auto-displayed in chat):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Service Dependency Analysis

**Service**: AglTransportationBookingApiGateway

**Dependencies Detected** (4 total):
1. XBTBookingMgmtService (high confidence)
2. ProductOfferingMatcherServiceLambda (high confidence)
3. AmazonTransportationManagerAuthority (high confidence)
4. XbtIORService (medium confidence)

Please generate a clear dependency diagram.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

↓ AI Automatically Generates Diagram ↓

[Dependency Diagram Displayed]
```

### Example 2: Multiple Analyses

```
1. Analyze Service A
   → Generate Diagram A
   
2. Click "New Chat" to clear

3. Analyze Service B
   → Generate Diagram B
```

## ⚙️ Advanced Settings

### Automatically Ignored Directories

The tool automatically skips:
- `node_modules`
- `.git`
- `.venv`
- `build`
- `target`
- `.idea`
- etc.

### File Size Limits

- Individual files > 5MB: Automatically skipped
- Empty files: Automatically skipped
- Binary files: Automatically skipped

## 🐛 Troubleshooting

### Issue 1: "No code files found" Error

**Cause:**
- Path doesn't exist
- No code files in the path
- Permission issues

**Solution:**
```bash
# Check if path is correct
ls -la /your/path

# Ensure read permissions
chmod +r /your/path -R
```

### Issue 2: No Dependencies Detected

**Cause:**
- Code uses non-standard dependency injection
- Key configuration files not in scan range

**Solution:**
- Manually upload `ClientModule.java` and other config files
- Or use "Upload Folder" feature

### Issue 3: Slow Analysis

**Cause:**
- Large codebase (thousands of files)
- Permission issues causing many file skips

**Solution:**
- Be patient (usually doesn't exceed 10 seconds)
- Check console logs for details

## 💡 Best Practices

### 1. Use Absolute Paths

```
✅ Good: /Users/you/workspace/MyService
❌ Bad:  ~/workspace/MyService
❌ Bad:  ../MyService
```

### 2. Ensure Service is Built

```bash
# Build service before analysis
cd /your/service
mvn clean install
# or
npm install
```

### 3. Analyze One Service at a Time

Avoid analyzing entire workspace, focus on single service:

```
✅ Good: /workspace/ServiceA
❌ Bad:  /workspace (contains multiple services)
```

## 🆚 Comparison with Other Methods

| Method | Pros | Cons |
|--------|------|------|
| **Local Path Analysis** | Fast, no upload, handles large files | Requires npm run dev |
| Upload Folder | No path needed, browser selection | File count limit, slower |
| Upload ZIP | Easy to share | Requires packaging, size limit |
| CLI Tool | Offline, automated | Manual copy of results |

## 📞 Get Help

- GitHub Issues: https://github.com/DayuanJiang/next-ai-draw-io/issues
- View full documentation: `/docs`

## 🎉 Summary

**3 Steps to Complete Dependency Analysis:**

1. **Enter Path** - `/path/to/your/codebase`
2. **Click Analyze** - Wait 2-3 seconds
3. **Auto Complete** - Diagram automatically generated and displayed!

Fully automated, zero manual operations! 🚀
