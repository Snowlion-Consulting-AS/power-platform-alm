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
- "Build and deploy the AddProductsControl PCF component"
- "Modify the PCF to change the color scheme"

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
├── tenants.json           # Multi-tenant configuration
├── solutions/             # Unpacked solution files (Git-tracked)
│   └── MySolution/
│       ├── Entities/      # Tables, forms, views
│       ├── WebResources/  # JavaScript, CSS, HTML
│       ├── Workflows/     # Cloud Flows
│       └── ...
├── pcf-components/        # PCF component projects (TypeScript)
│   ├── MyControl/         # PCF control source
│   └── Solutions/         # Solution projects for deploying PCFs
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

## Currently Supported

| Component | Support Level | Method |
|-----------|---------------|--------|
| Tables/Columns | Full | Web API |
| Forms | Full | SystemForm API |
| Views | Full | XML + Web API |
| Web Resources (JS/CSS/HTML) | Full | Direct edit |
| Cloud Flows | Full | JSON edit |
| Canvas Apps | Full | Python zipfile |
| PCF Components | Full | npm + dotnet build |
| Security Roles | Full | XML edit |
| Option Sets/Choices | Full | Web API |
| Environment Variables | Full | API or folder edit |
| Connection References | Full | Web API |
| Model-driven App SiteMap | Full | XML edit |

## Currently Not Supported

The following Power Platform components are **not yet supported** by this workflow:

| Component | Reason |
|-----------|--------|
| **Plugins (C#)** | Requires Visual Studio compilation, ILMerge, and plugin registration tool |
| **Business Rules** | Stored as complex XAML; best edited in the UI |
| **Dashboards** | XML structure is complex; easier to edit in UI |
| **Charts** | XML-based but tightly coupled to views |
| **Ribbon/Command Bar** | RibbonDiffXml is complex and error-prone to edit manually |
| **SSRS Reports** | Requires Report Authoring Extension and RDL knowledge |
| **Power BI Embedded** | Managed through Power BI service, not solution files |
| **Power Pages (Portals)** | Separate deployment model with PAC CLI paportal commands |
| **Copilot Studio** | Separate service with its own ALM |
| **AI Builder** | Models managed through AI Builder interface |

These components can still be included in solutions but are better managed through their native interfaces.

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

## Using with Claude for GitHub (Async)

You can also use Claude for GitHub to make changes asynchronously:

1. **Create an issue** using the "Power Platform Change Request" template
2. **Assign to Claude** - Claude will create a PR with the solution file changes
3. **Review and merge** - Changes auto-deploy to Dataverse via GitHub Actions

### Multi-Tenancy Support

This repo supports **multiple Power Platform tenants** from a single GitHub repository. Each tenant is defined in `tenants.json` with a unique prefix for its credentials:

```json
{
  "tenants": {
    "snowlion": {
      "display_name": "Snowlion",
      "secret_prefix": "SNOWLION",
      "environments": ["demo"]
    },
    "acme": {
      "display_name": "Acme Corp",
      "secret_prefix": "ACME",
      "environments": ["dev", "prod"]
    }
  }
}
```

When creating issues, mention the tenant name (e.g., "In the **Snowlion** demo environment..."). Claude will automatically authenticate to the correct tenant using the prefixed environment variables.

### GitHub Actions Setup

For each tenant, configure secrets with the tenant's prefix:

| Secret Pattern | Example for "SNOWLION" | Description |
|----------------|------------------------|-------------|
| `{PREFIX}_PP_CLIENT_ID` | `SNOWLION_PP_CLIENT_ID` | Azure AD App Client ID |
| `{PREFIX}_PP_CLIENT_SECRET` | `SNOWLION_PP_CLIENT_SECRET` | Azure AD App Secret |
| `{PREFIX}_PP_TENANT_ID` | `SNOWLION_PP_TENANT_ID` | Azure AD Tenant ID |
| `{PREFIX}_PP_ENVIRONMENT_URL` | `SNOWLION_PP_ENVIRONMENT_URL` | Dataverse URL |

Then map them in `.github/workflows/claude.yml`:

```yaml
env:
  SNOWLION_PP_CLIENT_ID: ${{ secrets.SNOWLION_PP_CLIENT_ID }}
  SNOWLION_PP_CLIENT_SECRET: ${{ secrets.SNOWLION_PP_CLIENT_SECRET }}
  # ... etc
```

**Creating the Service Principal (per tenant):**

```bash
# 1. Create App Registration in Azure AD
#    - Go to Azure Portal > Azure Active Directory > App registrations
#    - New registration > Name: "Power Platform Deploy"
#    - Create a client secret

# 2. Grant Power Platform permissions
#    - In Power Platform Admin Center
#    - Add the app as an Application User
#    - Assign System Administrator role (or appropriate role)

# 3. Add secrets to GitHub (with tenant prefix)
#    - Go to repo Settings > Secrets and variables > Actions
#    - Add each secret with the prefix (e.g., SNOWLION_PP_CLIENT_ID)
```

## License

MIT
