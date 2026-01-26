# Power Platform ALM with Claude Code

## The Core Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        YOUR WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   1. CREATE BRANCH          2. SETUP ENV           3. MAKE CHANGES  │
│   ┌─────────────┐          ┌─────────────┐        ┌─────────────┐   │
│   │ git checkout│          │ pac solution│        │ Claude Code │   │
│   │ -b feature/ │    ───▶  │ import      │   ───▶ │ edits files │   │
│   │ my-feature  │          │ (unmanaged) │        │ in /solutions│  │
│   └─────────────┘          └─────────────┘        └─────────────┘   │
│                                                          │          │
│   ┌─────────────────────────────────────────────────────┘          │
│   │                                                                  │
│   ▼                                                                  │
│   4. TEST IN ENV           5. EXPORT/COMMIT        6. PR & MERGE    │
│   ┌─────────────┐          ┌─────────────┐        ┌─────────────┐   │
│   │ pac solution│          │ pac solution│        │ gh pr create│   │
│   │ import      │    ───▶  │ export      │   ───▶ │             │   │
│   │ (to test)   │          │ + unpack    │        │ CI deploys  │   │
│   └─────────────┘          └─────────────┘        │ managed     │   │
│                                                    └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- [PAC CLI](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction) installed
- Authenticated to Power Platform: `pac auth create`
- GitHub CLI (optional, for PR creation): `gh auth login`

### Step-by-Step

```bash
# 1. Create feature branch
./scripts/1-create-feature-branch.sh add-approval-flow

# 2. Setup dev environment with solution
./scripts/2-setup-dev-environment.sh MySolution dev-approval-flow

# 3. Make changes (two options):

#    OPTION A: Claude Code edits files directly
#    - Ask Claude to modify XML/JSON in /solutions/MySolution/
#    - Then test: ./scripts/claude-code-workflow.sh test MySolution

#    OPTION B: Edit in Power Platform UI
#    - Make changes in the browser
#    - Export: ./scripts/3-export-changes.sh MySolution

# 4. Commit and PR
./scripts/4-commit-and-pr.sh "Add approval flow for expenses"
```

## What Claude Code Can Edit

Claude Code can directly modify these solution files:

| Component | File Location | Format | Claude Can Edit? |
|-----------|--------------|--------|------------------|
| Tables/Entities | `/Entities/<name>/` | XML | ✅ Yes |
| Columns/Fields | `/Entities/<name>/Attributes/` | XML | ✅ Yes |
| Web Resources | `/WebResources/` | HTML/JS/CSS | ✅ Yes |
| Plugin Code | `/PluginAssemblies/` | DLL (source separate) | ⚠️ Source only |
| Cloud Flows | `/Workflows/` | JSON | ✅ Yes |
| Canvas Apps | `/CanvasApps/` | YAML/MSAPP | ⚠️ Limited |
| Model-driven Apps | `/AppModules/` | XML | ✅ Yes |
| Security Roles | `/Roles/` | XML | ✅ Yes |
| Environment Vars | `/environmentvariabledefinitions/` | JSON | ✅ Yes |

### Example: Claude Editing a Cloud Flow

```bash
# Ask Claude:
"Modify the expense-approval flow in /solutions/MySolution/Workflows/
to add a condition that routes requests over $10,000 to the CFO"

# Claude will:
1. Read the flow JSON
2. Add the condition node
3. Update the connections
4. You validate with: ./scripts/claude-code-workflow.sh validate MySolution
5. Test with: ./scripts/claude-code-workflow.sh test MySolution
```

## Two Editing Approaches

### Approach A: Direct File Editing (Claude Code Native)

Best for:
- Web resources (JS, HTML, CSS)
- Cloud Flow logic changes
- Table/column definitions
- Security role adjustments

```
Claude edits files ──▶ Pack & Import ──▶ Test ──▶ Commit
```

### Approach B: Environment-First (Traditional)

Best for:
- Canvas Apps (visual builder)
- Complex flow changes
- UI-heavy modifications

```
Edit in UI ──▶ Export ──▶ Unpack ──▶ Review diff ──▶ Commit
```

## CI/CD Pipeline (on merge to main)

The pipeline should:
1. **Validate**: Run solution checker
2. **Build**: Pack as MANAGED solution
3. **Deploy**: Import managed to Test/UAT
4. **Promote**: After approval, deploy to Prod

See `/pipelines/` for GitHub Actions and Azure DevOps examples.

## Common Commands

```bash
# List what's in a solution
./scripts/claude-code-workflow.sh list MySolution

# Validate solution structure
./scripts/claude-code-workflow.sh validate MySolution

# Test changes in current environment
./scripts/claude-code-workflow.sh test MySolution

# Export from environment to repo
./scripts/3-export-changes.sh MySolution

# See what environment you're connected to
pac org who

# Switch environment
pac org select --environment "MyDevEnv"
```

## Folder Structure

```
power-platform-alm/
├── solutions/
│   └── MySolution/           # Unpacked solution (source of truth)
│       ├── Other/
│       │   └── Solution.xml  # Solution manifest
│       ├── Entities/         # Tables
│       ├── Workflows/        # Cloud Flows
│       ├── WebResources/     # JS, HTML, CSS, images
│       └── ...
├── pipelines/
│   ├── azure-pipelines.yml
│   └── github-actions.yml
├── env-config/
│   └── settings.json         # Environment-specific config
├── scripts/
│   └── *.sh                  # Automation scripts
└── tests/
    └── solution-checker.yml  # Validation rules
```
