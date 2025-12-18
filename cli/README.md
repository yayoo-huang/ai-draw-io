# AI Draw.io Dependency Analysis CLI Tool

A locally-run dependency analysis tool that can quickly analyze service dependencies in large codebases and generate context for AI Draw.io.

## 🎯 Why Use the CLI?

### Problems
- ❌ Large codebases can't be uploaded via browser (hundreds of MB or even GB)
- ❌ File permission issues
- ❌ Slow network transfer

### Solutions
- ✅ Analyze locally without uploading
- ✅ Handle codebases of any size
- ✅ Output only streamlined dependency relationships (few KB)
- ✅ Support for P1 extension (multi-service analysis)

## 📦 Quick Start

### Easiest Method (Recommended)

```bash
# 1. Navigate to your codebase directory
cd /path/to/AglTransportationBookingApiGateway

# 2. Run analysis (requires compilation first)
# First compile the CLI in the ai-draw-io project
cd /path/to/ai-draw-io/cli
npm install
npm run build

# Then run in your codebase
cd /path/to/AglTransportationBookingApiGateway
node /path/to/ai-draw-io/cli/dist/analyze-dependencies.js analyze

# 3. Copy the terminal output
# 4. Paste it into the AI Draw.io web chat box
# 5. Wait for AI to generate the dependency diagram!
```

**Or use tsx (no compilation needed):**

```bash
cd /path/to/AglTransportationBookingApiGateway
npx tsx /path/to/ai-draw-io/cli/analyze-dependencies.ts analyze
```

## 🚀 Detailed Usage

### Method 1: Use After Compilation (Recommended, More Stable)

```bash
# One-time setup (in ai-draw-io project)
cd /path/to/ai-draw-io/cli
npm install
npm run build

# Then use each time (in any codebase)
cd /your/codebase
node /path/to/ai-draw-io/cli/dist/analyze-dependencies.js analyze
```

### Method 2: Use tsx (Convenient for Development)

```bash
# No compilation needed, run directly
cd /your/codebase
npx tsx /path/to/ai-draw-io/cli/analyze-dependencies.ts analyze
```

**Recommended: Create an Alias (Optional):**

Add to your `.bashrc` or `.zshrc`:

```bash
alias analyze-deps='node /path/to/ai-draw-io/cli/dist/analyze-dependencies.js analyze'
```

Then simply run:

```bash
cd /your/codebase
analyze-deps
```

## 📋 Command Line Options

```bash
ai-drawio-deps analyze [options]

Options:
  --path, -p <path>      Specify codebase path (default: current directory)
  --output, -o <file>    Save analysis results to JSON file
  --verbose, -v          Show detailed information (including evidence)
  --help, -h             Show help information
```

## 💡 Usage Examples

### Example 1: Analyze Current Directory

```bash
cd /Users/you/workspace/AglTransportationBookingApiGateway
node /path/to/ai-draw-io/cli/dist/analyze-dependencies.js analyze
```

### Example 2: Analyze Specific Directory

```bash
node /path/to/ai-draw-io/cli/dist/analyze-dependencies.js analyze --path ../MyOtherService
```

### Example 3: Save Results to File

```bash
cd /your/codebase
node /path/to/ai-draw-io/cli/dist/analyze-dependencies.js analyze --output deps.json
```

### Example 4: View Detailed Information

```bash
node /path/to/ai-draw-io/cli/dist/analyze-dependencies.js analyze --verbose
```

### Example 5: Use Alias (If Set Up)

```bash
cd /your/codebase
analyze-deps
analyze-deps --verbose
analyze-deps --output result.json
```

## 📊 Output Example

```
🔍 Scanning codebase...
📁 Directory: /Users/you/AglTransportationBookingApiGateway
✅ Found 247 code files

🔬 Analyzing dependencies...

📊 Analysis results:
   Service name: AglTransportationBookingApiGateway
   Dependencies count: 4

📦 Dependencies list:
   1. XBTBookingMgmtService (high)
   2. ProductOfferingMatcherServiceLambda (high)
   3. AmazonTransportationManagerAuthority (high)
   4. XbtIORService (medium)

📝 Use the following prompt to generate diagram:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Service Dependency Analysis

**Service**: AglTransportationBookingApiGateway

**Dependencies Detected** (4 total):

1. **XBTBookingMgmtService** (high confidence)
2. **ProductOfferingMatcherServiceLambda** (high confidence)
3. **AmazonTransportationManagerAuthority** (high confidence)
4. **XbtIORService** (medium confidence)

## Diagram Requirements:

- Main service: **AglTransportationBookingApiGateway** (Blue rectangle, left side)
- Dependency services (Green rectangles, right side):
  • XBTBookingMgmtService
  • ProductOfferingMatcherServiceLambda
  • AmazonTransportationManagerAuthority
  • XbtIORService

Generate a clean dependency diagram showing these relationships.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Copy the content above and paste it into AI Draw.io chat box to generate the diagram
```

## 🔍 How It Works

```
Local Codebase
    ↓
Scan & Filter
(Skip node_modules, .git, etc.)
    ↓
Intelligent Recognition
(Regex extract Client classes, Import statements, etc.)
    ↓
Generate Streamlined Context
(Only dependency names, few KB)
    ↓
Copy & Paste to AI Draw.io
    ↓
AI Generates Diagram
(Draw.io XML)
```

## 🎨 Supported Languages

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

## 🔧 Configuration

The tool automatically:
- Ignores `node_modules`, `.git`, `build`, `target`, etc.
- Only analyzes code files (based on extensions)
- Skips empty files and oversized files (> 5MB)
- Intelligently identifies key config files (ClientModule.java, etc.)

## 🚀 P1 Extension Plans

Future support:

```bash
# Analyze multiple services
tsx analyze-dependencies.ts analyze-multi \
  --services ./Service1,./Service2,./Service3

# Output: Complete service call relationship diagram
```

## ❓ FAQ

### Q: Why are some dependencies not detected?

A: The tool currently uses rule-based recognition (regex). Please ensure:
- ClientModule.java or similar config files exist
- Standard dependency injection patterns are used (@Provides, @Bean, etc.)

### Q: How large a codebase can it analyze?

A: No limit! The tool runs locally and can handle GB-sized codebases. Analysis speed depends on the number of files.

### Q: Will the analysis modify my code?

A: No. The tool is read-only, it only scans and analyzes without modifying any files.

### Q: What if the output is too long?

A: Use the `--output` option to save to a file, then copy from the file.

## 📝 Development

```bash
# Clone the project
git clone <repo>
cd ai-draw-io/cli

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build
```

## 📄 License

MIT
