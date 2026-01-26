# Power Platform ALM with Claude Code

Git-based Application Lifecycle Management (ALM) for Power Platform, designed to work with Claude Code.

## What This Is

A workflow and toolset for managing Power Platform solutions (Dynamics 365, Power Apps, Dataverse) using Git. This enables:

- **Version control** for all customizations
- **Code review** via Pull Requests
- **AI-assisted development** with Claude Code
- **CI/CD pipelines** for automated deployments
- **Parallel development** across teams

## Quick Start

### Prerequisites

1. **PAC CLI** (Power Platform CLI):
   ```bash
   dotnet tool install --global Microsoft.PowerApps.CLI.Tool
   ```

2. **Add to PATH** (if needed):
   ```bash
   # macOS/Linux
   export PATH="$PATH:$HOME/.dotnet/tools"

   # Add to ~/.zshrc or ~/.bashrc for persistence
   ```

3. **Authenticate**:
   ```bash
   pac auth create  # Opens browser for login
   pac org who      # Verify connection
   ```

### Basic Workflow

```bash
# 1. Export a solution from your environment
./scripts/pp-export.sh MySolution

# 2. Make changes (edit files or use Claude Code)
#    - Edit XML/JSON files in solutions/MySolution/
#    - Or make changes in Power Apps UI then re-export

# 3. Import changes back
./scripts/pp-import.sh ./solutions/MySolution --publish

# 4. Test in browser, iterate as needed
```

## Using with Claude Code

Clone this repo and Claude Code will automatically read `CLAUDE.md` for context on how to work with Power Platform.

**Example prompts:**

- "Add a new text field called 'test' to the sl_project table and put it on the main form"
- "Edit the JavaScript in WebResources/validateForm.js to add email validation"
- "Show me what tables are in the SnowlionBusinessApplication solution"
- "Export the current solution from my dev environment"

Claude can:
- Edit form layouts (XML)
- Modify table/column definitions (XML)
- Edit JavaScript web resources
- Modify Cloud Flows (JSON)
- Create and deploy PCF components
- Run PAC CLI commands

## Repository Structure

```
power-platform-alm/
├── CLAUDE.md              # Instructions for Claude Code
├── README.md              # This file
├── COMPLETE-GUIDE.md      # Detailed documentation
├── WORKFLOW.md            # Step-by-step workflow guide
├── solutions/             # Unpacked solution files (Git-tracked)
│   └── MySolution/
│       ├── Entities/      # Tables, forms, views
│       ├── WebResources/  # JavaScript, CSS, HTML
│       ├── Workflows/     # Cloud Flows
│       └── ...
├── pcf-components/        # PCF component projects
│   └── MyControl/
├── scripts/               # Helper scripts
│   ├── pp-auth.sh         # Authentication helper
│   ├── pp-export.sh       # Export & unpack solution
│   └── pp-import.sh       # Pack & import solution
├── pipelines/             # CI/CD pipeline definitions
│   ├── azure-pipelines.yml
│   └── github-actions.yml
└── env-config/            # Environment-specific configs
```

## Scripts

| Script | Description |
|--------|-------------|
| `pp-auth.sh` | Manage PAC CLI authentication |
| `pp-export.sh <solution>` | Export and unpack a solution |
| `pp-import.sh <folder> [--publish]` | Pack and import a solution |

## Git Workflow

```
main (protected)
  │
  ├── feature/add-new-field
  ├── feature/update-form
  └── bugfix/fix-calculation
```

1. Create feature branch
2. Export current solution to branch
3. Make changes (Claude Code or Power Apps UI)
4. Test in dev environment
5. Commit and push
6. Create PR for review
7. Merge triggers CI/CD to Test/Prod

## Solution File Types

| Component | File Type | Claude Can Edit |
|-----------|-----------|-----------------|
| Tables/Columns | XML | Yes |
| Forms | XML | Yes |
| Views | XML | Yes |
| Web Resources | JS/CSS/HTML | Yes |
| Cloud Flows | JSON | Yes |
| Security Roles | XML | Yes |
| Canvas Apps | .msapp (zip) | Limited |
| PCF Controls | TypeScript | Yes (rebuild required) |

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Quick reference for Claude Code
- **[COMPLETE-GUIDE.md](./COMPLETE-GUIDE.md)** - Comprehensive documentation
- **[WORKFLOW.md](./WORKFLOW.md)** - Step-by-step workflow guide

## Environment Strategy

```
DEV (Unmanaged)  →  Git Repo  →  TEST (Managed)  →  PROD (Managed)
      ↑                              ↓                    ↓
  Developers              CI validates & builds    CD deploys
```

## License

MIT
