# Power Platform ALM with Claude Code - Complete Guide

## The Big Picture

Power Platform (Dynamics 365, Power Apps, Power Automate) stores everything in **Dataverse** - a cloud database. When you build apps, flows, tables, etc., they live in your environment as **solutions**.

The problem: These solutions are stored as binary blobs. You can't easily:
- See what changed between versions
- Review changes before deploying
- Have multiple developers work in parallel
- Roll back to a previous version

The fix: **Unpack solutions into text files** that Git can track.

---

## Part 1: What is a Solution?

A **solution** is a container that holds your customizations:

```
Solution "SnowlionBusinessApplication"
├── Tables (Entities)      → Customer, Project, Invoice
├── Columns (Fields)       → customer_name, project_budget
├── Forms                  → Main form, Quick create form
├── Views                  → Active Customers, My Projects
├── Web Resources          → JavaScript, HTML, CSS, images
├── Flows (Workflows)      → "When invoice created, send email"
├── Canvas Apps            → Mobile app for field workers
├── Model-driven Apps      → The main CRM interface
├── Security Roles         → Admin, Sales Rep, Manager
├── Connection References  → Links to SharePoint, Outlook
├── Environment Variables  → API keys, URLs, settings
└── Plugins                → C# code for complex logic
```

### Managed vs Unmanaged

| Type | Use | Can Edit? | Typical Environment |
|------|-----|-----------|---------------------|
| **Unmanaged** | Development | Yes | Dev |
| **Managed** | Deployment | No (locked) | Test, Prod |

**Rule**: Develop unmanaged, deploy managed.

---

## Part 2: The Solution File Formats

### As a .zip (what Power Platform uses)

When you export a solution from Power Platform, you get a `.zip` file:

```
MySolution.zip
├── solution.xml           → Metadata about the solution
├── customizations.xml     → All the component definitions
├── [Content_Types].xml    → File type mappings
└── WebResources/          → Actual JS/HTML/CSS files
```

**Problem**: `customizations.xml` is one giant XML file. Git can't diff it meaningfully.

### Unpacked (what we store in Git)

When you **unpack** the solution, each component becomes separate files:

```
MySolution/
├── Other/
│   └── Solution.xml                    → Solution metadata
├── Entities/
│   ├── Account/
│   │   ├── Entity.xml                  → Table definition
│   │   ├── Attributes/                 → Each column is a file
│   │   │   ├── name.xml
│   │   │   └── revenue.xml
│   │   ├── Forms/
│   │   │   └── main_form.xml           → Form layout
│   │   └── Views/
│   │       └── active_accounts.xml     → View definition
│   └── Contact/
│       └── ...
├── Workflows/
│   └── send_welcome_email.json         → Flow definition
├── WebResources/
│   ├── myScript.js                     → JavaScript (editable!)
│   ├── styles.css                      → CSS (editable!)
│   └── logo.png                        → Images
├── Roles/
│   └── sales_rep.xml                   → Security role
└── CanvasApps/
    └── mobile_app.msapp                → Canvas app package
```

**Now Git can**:
- Show exactly which column changed
- Let you review form layout changes
- Track JavaScript history
- Merge changes from different developers

---

## Part 3: The PAC CLI Commands

**PAC CLI** (Power Platform CLI) is the command-line tool that does the work.

### Authentication

```bash
# Create an auth profile (opens browser login)
pac auth create

# List your auth profiles
pac auth list
# Output:
# Index Active Kind      Name                    Environment
# [1]   *      UNIVERSAL simon@snowlion.no       snowlion-demo.crm4.dynamics.com
# [2]          UNIVERSAL other@company.com       other-env.crm4.dynamics.com

# Switch between profiles
pac auth select --index 2

# See current connection
pac org who
```

### Solution Operations

```bash
# List all solutions in current environment
pac solution list

# EXPORT: Environment → .zip file
pac solution export \
    --name "MySolution" \           # Solution unique name
    --path "/tmp/MySolution.zip" \  # Where to save
    --managed false                 # Unmanaged (editable)

# UNPACK: .zip file → folder of text files
pac solution unpack \
    --zipfile "/tmp/MySolution.zip" \
    --folder "./solutions/MySolution" \
    --packagetype Unmanaged \
    --allowWrite true \             # Overwrite existing
    --allowDelete true              # Remove deleted components

# PACK: folder → .zip file
pac solution pack \
    --folder "./solutions/MySolution" \
    --zipfile "/tmp/MySolution_modified.zip" \
    --packagetype Unmanaged         # Or "Managed" for deployment

# IMPORT: .zip file → Environment
pac solution import \
    --path "/tmp/MySolution_modified.zip" \
    --force-overwrite true \        # Overwrite existing
    --activate-plugins true         # Activate any plugins
```

### The Full Cycle

```
┌──────────────┐     export      ┌──────────────┐     unpack     ┌──────────────┐
│ Environment  │ ───────────────▶│   .zip file  │ ──────────────▶│  Git folder  │
│ (Dataverse)  │                 │              │                │  (text files)│
└──────────────┘                 └──────────────┘                └──────────────┘
       ▲                                                                │
       │                                                                │
       │         import          ┌──────────────┐      pack            │
       └─────────────────────────│   .zip file  │◀─────────────────────┘
                                 │  (modified)  │
                                 └──────────────┘
```

---

## Part 4: Git Workflow

### Repository Structure

```
my-powerplatform-repo/
├── solutions/
│   ├── MySolution/                 # Unpacked solution files
│   │   ├── Other/Solution.xml
│   │   ├── Entities/
│   │   ├── Workflows/
│   │   └── WebResources/
│   └── AnotherSolution/
├── pipelines/
│   ├── azure-pipelines.yml         # Azure DevOps CI/CD
│   └── github-actions.yml          # GitHub Actions CI/CD
├── scripts/
│   ├── export.sh                   # Helper scripts
│   └── import.sh
└── README.md
```

### Branching Strategy

```
main (protected)
  │
  ├── feature/add-approval-flow     ← Developer A
  │
  ├── feature/update-customer-form  ← Developer B
  │
  └── bugfix/fix-calculation        ← Developer C
```

Each developer:
1. Creates a branch
2. Has their own dev environment (or shares carefully)
3. Makes changes
4. Exports/unpacks to their branch
5. Creates PR
6. CI validates
7. Merge to main
8. CD deploys managed to Test/Prod

---

## Part 5: Environment Strategy

### The Environment Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ENVIRONMENTS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│  │   DEV       │     │   TEST      │     │   PROD      │            │
│  │  (sandbox)  │     │   (UAT)     │     │ (production)│            │
│  │             │     │             │     │             │            │
│  │ UNMANAGED   │     │  MANAGED    │     │  MANAGED    │            │
│  │ solutions   │     │  solutions  │     │  solutions  │            │
│  │             │     │             │     │             │            │
│  │ Developers  │     │ Testers     │     │ End users   │            │
│  │ edit here   │     │ verify here │     │ use here    │            │
│  └─────────────┘     └─────────────┘     └─────────────┘            │
│        │                   ▲                   ▲                     │
│        │                   │                   │                     │
│        ▼                   │                   │                     │
│  ┌─────────────┐           │                   │                     │
│  │   GIT       │───────────┴───────────────────┘                     │
│  │   REPO      │        CI/CD deploys managed                        │
│  └─────────────┘                                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Per-Developer Environments (Optional but Recommended)

For parallel work without conflicts:

```
Main Dev Environment        ← Integration point (baseline)
    │
    ├── Dev-Simon           ← Simon's sandbox
    ├── Dev-Erik            ← Erik's sandbox
    └── Dev-Feature-X       ← Dedicated to feature X
```

Each developer:
1. Gets a fresh environment
2. Imports the baseline solution (unmanaged)
3. Makes changes
4. Exports back to their branch
5. Environment can be deleted after merge

---

## Part 6: What Claude Code Can Edit

### Directly Editable (text files)

| Component | Location | Format | Example Edit |
|-----------|----------|--------|--------------|
| **Web Resources** | `WebResources/` | JS, HTML, CSS | Add validation logic |
| **Cloud Flows** | `Workflows/*.json` | JSON | Add a condition step |
| **Table definitions** | `Entities/*/Entity.xml` | XML | Add a new column |
| **Form layouts** | `Entities/*/Forms/*.xml` | XML | Rearrange fields |
| **Views** | `Entities/*/Views/*.xml` | XML | Change filter criteria |
| **Security Roles** | `Roles/*.xml` | XML | Add permissions |
| **Option Sets** | `OptionSets/*.xml` | XML | Add dropdown values |
| **Environment Variables** | `environmentvariabledefinitions/` | JSON | Change default value |

### Example: Claude Editing a JavaScript Web Resource

**Before** (`WebResources/validateForm.js`):
```javascript
function validateForm(context) {
    var formContext = context.getFormContext();
    var name = formContext.getAttribute("name").getValue();

    if (!name) {
        alert("Name is required");
        return false;
    }
    return true;
}
```

**Claude adds email validation**:
```javascript
function validateForm(context) {
    var formContext = context.getFormContext();
    var name = formContext.getAttribute("name").getValue();
    var email = formContext.getAttribute("email").getValue();

    if (!name) {
        formContext.ui.setFormNotification("Name is required", "ERROR", "name_error");
        return false;
    }

    // New: Email validation
    if (email && !isValidEmail(email)) {
        formContext.ui.setFormNotification("Invalid email format", "ERROR", "email_error");
        return false;
    }

    formContext.ui.clearFormNotification("name_error");
    formContext.ui.clearFormNotification("email_error");
    return true;
}

function isValidEmail(email) {
    var regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
```

### Example: Claude Editing a Flow (JSON)

Cloud Flows are stored as JSON. Claude can:
- Add conditions
- Add actions
- Modify expressions
- Change triggers

### Limited/Complex (binary or special format)

| Component | Why it's harder |
|-----------|-----------------|
| **Canvas Apps** | `.msapp` files are zipped, contain binary assets |
| **Plugins** | Compiled DLLs (source code is separate) |
| **Images** | Binary files |
| **PCF Controls** | Need to build with npm |

---

## Part 7: CI/CD Pipeline

### What Happens on PR (Validate)

```yaml
on: pull_request

jobs:
  validate:
    steps:
      # 1. Pack the solution (validates structure)
      - run: pac solution pack --folder solutions/MySolution --zipfile /tmp/sol.zip

      # 2. Run Solution Checker (finds issues)
      - run: pac solution check --path /tmp/sol.zip

      # 3. Report results on PR
```

### What Happens on Merge to Main (Build + Deploy)

```yaml
on:
  push:
    branches: [main]

jobs:
  build:
    steps:
      # 1. Pack as MANAGED (locked for deployment)
      - run: pac solution pack --folder solutions/MySolution --zipfile /tmp/sol_managed.zip --packagetype Managed

      # 2. Upload as artifact
      - uses: actions/upload-artifact@v4
        with:
          name: managed-solution
          path: /tmp/sol_managed.zip

  deploy-test:
    needs: build
    environment: test  # Requires approval
    steps:
      # 1. Download artifact
      - uses: actions/download-artifact@v4

      # 2. Import to Test environment
      - run: pac solution import --path sol_managed.zip --force-overwrite true

  deploy-prod:
    needs: deploy-test
    environment: production  # Requires approval
    steps:
      # Same as above, but to Prod
```

---

## Part 8: The Complete Developer Workflow

### Scenario: Add email validation to customer form

```bash
# 1. CREATE FEATURE BRANCH
git checkout main
git pull
git checkout -b feature/add-email-validation

# 2. EXPORT CURRENT STATE FROM DEV ENVIRONMENT
pac auth select --index 1  # Select your dev env
pac solution export --name "SnowlionBusinessApplication" --path /tmp/sol.zip --managed false
pac solution unpack --zipfile /tmp/sol.zip --folder solutions/SnowlionBusinessApplication --allowWrite true

# 3. MAKE CHANGES
# Option A: Edit in Power Platform UI, then re-export
# Option B: Ask Claude Code to edit the files directly

# Example Claude prompt:
# "Edit solutions/SnowlionBusinessApplication/WebResources/validateCustomer.js
#  to add email format validation"

# 4. TEST CHANGES
pac solution pack --folder solutions/SnowlionBusinessApplication --zipfile /tmp/modified.zip
pac solution import --path /tmp/modified.zip --force-overwrite true
# Now test in browser at https://snowlion-demo.crm4.dynamics.com

# 5. IF CHANGES WERE MADE IN UI, EXPORT AGAIN
pac solution export --name "SnowlionBusinessApplication" --path /tmp/final.zip --managed false
pac solution unpack --zipfile /tmp/final.zip --folder solutions/SnowlionBusinessApplication --allowWrite true

# 6. COMMIT AND PUSH
git add solutions/
git status  # Review what changed
git diff    # See the actual changes
git commit -m "Add email validation to customer form"
git push -u origin feature/add-email-validation

# 7. CREATE PR
gh pr create --title "Add email validation" --body "Adds email format validation to customer form"

# 8. AFTER PR APPROVED AND MERGED
# CI/CD automatically:
#   - Builds managed solution
#   - Deploys to Test
#   - (After approval) Deploys to Prod
```

---

## Part 9: Quick Reference

### PAC CLI Cheat Sheet

| Action | Command |
|--------|---------|
| List auth profiles | `pac auth list` |
| Switch profile | `pac auth select --index N` |
| List solutions | `pac solution list` |
| Export solution | `pac solution export --name "X" --path /tmp/x.zip --managed false` |
| Unpack solution | `pac solution unpack --zipfile /tmp/x.zip --folder ./solutions/X` |
| Pack solution | `pac solution pack --folder ./solutions/X --zipfile /tmp/x.zip` |
| Import solution | `pac solution import --path /tmp/x.zip --force-overwrite true` |

### File Locations

| What | Where |
|------|-------|
| This guide | `/Users/simonpettersennguyen/power-platform-alm/COMPLETE-GUIDE.md` |
| Solutions | `/Users/simonpettersennguyen/power-platform-alm/solutions/` |
| Scripts | `/Users/simonpettersennguyen/power-platform-alm/scripts/` |
| Pipelines | `/Users/simonpettersennguyen/power-platform-alm/pipelines/` |
