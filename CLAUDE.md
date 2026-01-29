# Power Platform ALM - Claude Code Instructions

You are helping develop Power Platform solutions (Dynamics 365, Power Apps, Dataverse) using a Git-based ALM workflow.

## CRITICAL: Mandatory Workflow for ALL Changes

### Step 1: Identify the Tenant and Authenticate

This repo supports **multiple Power Platform tenants**. The PAC CLI is NOT pre-authenticated — you must authenticate to the correct tenant yourself.

#### 1a. Read `tenants.json`

The file `tenants.json` in the repo root lists all available tenants and their secret prefix:

```json
{
  "tenants": {
    "snowlion": {
      "display_name": "Snowlion",
      "secret_prefix": "SNOWLION",
      "environments": ["demo"]
    }
  }
}
```

#### 1b. Determine the target tenant from the issue

Read the issue title and body to identify which tenant is being targeted. Match it against the keys in `tenants.json` (case-insensitive). If the issue does not clearly specify a tenant, **ask for clarification** by commenting on the issue.

#### 1c. Authenticate using prefixed environment variables

Each tenant's credentials are available as environment variables using the `secret_prefix` from `tenants.json`:

```bash
# For a tenant with secret_prefix "SNOWLION":
pac auth create \
  --applicationId "$SNOWLION_PP_CLIENT_ID" \
  --clientSecret "$SNOWLION_PP_CLIENT_SECRET" \
  --tenant "$SNOWLION_PP_TENANT_ID" \
  --environment "$SNOWLION_PP_ENVIRONMENT_URL"

pac org who
```

The pattern is always `{PREFIX}_PP_CLIENT_ID`, `{PREFIX}_PP_CLIENT_SECRET`, `{PREFIX}_PP_TENANT_ID`, `{PREFIX}_PP_ENVIRONMENT_URL`.

For connection references, the env vars are `{PREFIX}_DATAVERSE_CONNECTION_ID` and `{PREFIX}_CONTENT_CONVERSION_CONNECTION_ID`.

#### 1d. Discover solutions

After authenticating, discover which solutions exist:

```bash
pac solution list
```

Use `pac solution list` to find the correct unmanaged solution to work with.

### When to Ask for Clarification

**Do NOT immediately ask the user a list of questions.** Instead, follow this approach:

1. **Explore first.** Use the Dataverse Web API, export solutions, and inspect the environment to find the most likely match for what the user is asking. Search all form areas (tabs, sections) for anything matching the user's terms.

2. **Find the BEST match, not just any match.** Users may not know the exact name of elements. When searching:
   - Search ALL form element labels for the key terms the user mentioned
   - "PCF COMPONENT" does NOT match "PCF test" — it's missing "test"
   - "General" does NOT match "PCF test" — it's missing both terms

3. **ALWAYS propose your plan before implementing.** Comment on the issue with:
   - What you found and what you plan to do
   - The exact name of the form area you will modify
   - Example: *"I found 'PCF test' on the Project form. I'll add the 'Heisann' text field there. Proceeding now — comment if this is wrong."*

5. **If multiple possible matches exist, ask which one.** For example:
   - *"I found two areas that might match: 'PCF test' and 'PCF COMPONENT'. Which one should I add the field to?"*
   - **Do NOT guess** — wait for clarification

6. **If NO good match exists, stop and ask.** List what you DID find:
   - *"I searched the Project form and found: 'General', 'Timeline', 'PCF test', 'PCF COMPONENT'. Which area should I add the field to?"*
   - **Do NOT implement anything until you have clarity**

7. **Critical items that ALWAYS require clarity:**
   - Which **tenant** the change should target (e.g. Snowlion, Norbygg, etc.)
   - Which **environment** is intended (e.g. Dev, Test, Demo, Production)

   For everything else (solution, table, form, tab, section, field type), **explore the environment to find the answer yourself** before asking the user.

Even if the PAC CLI is already authenticated to an environment, **do not assume that is the correct target** for the task. If the issue mentions a different tenant or environment than what `pac org who` returns, stop and ask for clarification.

**The goal is to minimize back-and-forth while avoiding wrong implementations.** The user expects you to investigate and propose a plan, then implement correctly — not to ask unnecessary questions OR to implement in the wrong place.

---

## Natural Language Request Handling by Component Type

Users will describe changes in natural language. This section shows how to interpret requests for EVERY Power Platform component type.

### Interpreting User Intent

| User says... | Component type | What to do |
|--------------|---------------|------------|
| "add a field", "add column", "new attribute" | **Column/Attribute** | Use Web API to add column to table |
| "add to form", "show on form", "display field" | **Form** | Use SystemForm API to modify formxml |
| "create a flow", "automate when...", "trigger on..." | **Cloud Flow** | Edit Workflows/*.json |
| "change the view", "filter the list", "show only active" | **View** | Edit SavedQueries/*.xml |
| "add validation", "run script when...", "on save..." | **Web Resource (JS)** | Edit WebResources/*.js |
| "change permissions", "give access", "restrict..." | **Security Role** | Edit Roles/*.xml |
| "add to the app", "show in navigation", "add menu item" | **Model-driven App** | Edit AppModules/*.xml |
| "add dropdown option", "new choice value" | **Option Set** | Edit OptionSets/*.xml or use Web API |
| "change the setting", "update config", "environment value" | **Environment Variable** | Edit environmentvariabledefinitions/ |
| "update the app", "change screen", "modify button" | **Canvas App** | Edit .msapp (use Python zipfile!) |
| "create a table", "new entity" | **Table/Entity** | Use Web API or edit Entity.xml |

### Component-Specific Guidance

#### 1. Tables (Entities) - Creating or Modifying

**Natural language examples:**
- "Create a Projects table"
- "Add a new entity for tracking invoices"
- "I need a table to store customer feedback"

**How to handle:**
1. Use Web API to create the table (faster than solution cycle):
```python
table_def = {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    "SchemaName": "new_Project",
    "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"Label": "Project", "LanguageCode": 1033}]},
    "DisplayCollectionName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"Label": "Projects", "LanguageCode": 1033}]},
    "PrimaryNameAttribute": "new_name",
    "OwnershipType": "UserOwned"
}
# POST to /api/data/v9.2/EntityDefinitions
```
2. After creating, add the primary name column and any other columns

#### 2. Columns (Attributes)

**Natural language examples:**
- "Add a budget field to Projects"
- "I need a date column for due date"
- "Add a lookup to the Account table"

**How to handle:**
- Use Dataverse Web API (fast path) - see existing section
- Map user language to column types:
  | User says | Column type | OData type |
  |-----------|-------------|------------|
  | "text", "name", "description" | Single line text | StringAttributeMetadata |
  | "number", "amount", "count" | Whole number | IntegerAttributeMetadata |
  | "money", "price", "cost", "budget" | Currency | MoneyAttributeMetadata |
  | "date", "when", "due date" | Date only | DateTimeAttributeMetadata |
  | "yes/no", "checkbox", "is active" | Two options | BooleanAttributeMetadata |
  | "dropdown", "choice", "status" | Choice | PicklistAttributeMetadata |
  | "lookup", "related to", "link to" | Lookup | LookupAttributeMetadata |

#### 3. Forms - Adding/Modifying Fields

**Natural language examples:**
- "Add the budget field to the main form"
- "Show email on the contact form"
- "Put the status dropdown in the header"

**How to handle:**
- Use SystemForm API (fast path) - see existing section
- Find the correct form by searching for key terms
- Parse formxml, find target section, add cell with control

#### 4. Views (Saved Queries)

**Natural language examples:**
- "Show only active projects in the list"
- "Add the budget column to the view"
- "Filter to show my records only"
- "Sort by created date descending"

**How to handle:**
1. Query views via Web API:
```python
url = f"{env_url}/api/data/v9.2/savedqueries?$filter=returnedtypecode eq 'new_project'&$select=savedqueryid,name,fetchxml,layoutxml"
```
2. Modify the view XML:
   - **Add column**: Add `<cell name="fieldname" width="100" />` to layoutxml
   - **Add filter**: Add `<condition attribute="statecode" operator="eq" value="0" />` to fetchxml
   - **Change sort**: Modify `<order attribute="createdon" descending="true" />` in fetchxml
3. PATCH the view and publish

**View XML structure:**
```xml
<!-- layoutxml - controls columns shown -->
<grid><row><cell name="new_name" width="200" /><cell name="new_budget" width="100" /></row></grid>

<!-- fetchxml - controls filtering and data -->
<fetch><entity name="new_project">
  <attribute name="new_name" />
  <filter><condition attribute="statecode" operator="eq" value="0" /></filter>
  <order attribute="createdon" descending="true" />
</entity></fetch>
```

#### 5. Cloud Flows (Power Automate)

**Natural language examples:**
- "When a project is created, send an email"
- "Add approval before the record is updated"
- "If amount > 10000, notify the manager"

**How to handle:**
1. Export solution and find the flow in `Workflows/*.json`
2. Flows are stored as JSON with this structure:
```json
{
  "properties": {
    "definition": {
      "triggers": { ... },
      "actions": { ... }
    }
  }
}
```
3. **Add a condition**: Insert a new action with `"type": "If"` and `"expression": {...}`
4. **Add an action**: Add to the `actions` object with proper `runAfter` dependencies
5. **Modify trigger**: Edit the `triggers` object
6. Pack, import, publish

**Common flow patterns:**
- Trigger: `"When_a_record_is_created"` with `"type": "OpenApiConnectionWebhook"`
- Condition: `"type": "If"` with `"expression": {"equals": [...]}`
- Email: `"type": "OpenApiConnection"` with `"Send_an_email_(V2)"`

#### 6. Web Resources (JavaScript/CSS/HTML)

**Natural language examples:**
- "Add validation to the email field"
- "Show a warning when status changes"
- "Hide the budget field for non-managers"
- "Change the form styling"

**How to handle:**
1. Find the web resource in `WebResources/` folder
2. Edit the JavaScript/CSS/HTML directly
3. Pack, import, publish

**Common JavaScript patterns:**
```javascript
// Form validation
function validateEmail(executionContext) {
    var formContext = executionContext.getFormContext();
    var email = formContext.getAttribute("emailaddress1").getValue();
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        formContext.ui.setFormNotification("Invalid email format", "ERROR", "email_validation");
        return false;
    }
    formContext.ui.clearFormNotification("email_validation");
    return true;
}

// Hide field based on security role
function hideFieldForNonManagers(executionContext) {
    var formContext = executionContext.getFormContext();
    var userRoles = Xrm.Utility.getGlobalContext().userSettings.roles;
    var isManager = userRoles.get().some(r => r.name === "Manager");
    formContext.getControl("new_budget").setVisible(isManager);
}

// OnChange handler
function onStatusChange(executionContext) {
    var formContext = executionContext.getFormContext();
    var status = formContext.getAttribute("statuscode").getValue();
    if (status === 2) { // Inactive
        formContext.ui.setFormNotification("This record is inactive", "WARNING", "status_warning");
    }
}
```

#### 7. Security Roles

**Natural language examples:**
- "Give sales reps read access to projects"
- "Managers should be able to delete invoices"
- "Restrict the budget field to admins only"

**How to handle:**
1. Find the role in `Roles/*.xml`
2. Modify the privilege definitions:
```xml
<RolePrivilege name="prvReadnew_project" level="Basic" />  <!-- User level -->
<RolePrivilege name="prvWritenew_project" level="Local" />  <!-- Business Unit -->
<RolePrivilege name="prvDeletenew_invoice" level="Deep" />  <!-- Parent: Child BU -->
```
3. Privilege levels: None=0, Basic=1 (User), Local=2 (BU), Deep=4 (Parent:Child), Global=8 (Org)
4. Pack, import, publish

**Privilege naming pattern:** `prv{Action}{EntityName}`
- Actions: Create, Read, Write, Delete, Append, AppendTo, Assign, Share

#### 8. Model-driven Apps

**Natural language examples:**
- "Add Projects to the main app"
- "Create a new area for Reporting"
- "Add a dashboard to the navigation"

**How to handle:**
1. Find the app in `AppModules/` (XML format)
2. Modify the sitemap to add areas, groups, and subareas:
```xml
<SiteMap>
  <Area Id="Projects" Title="Projects">
    <Group Id="ProjectGroup" Title="Project Management">
      <SubArea Id="new_project" Entity="new_project" Title="Projects" />
    </Group>
  </Area>
</SiteMap>
```
3. Add components to the app definition
4. Pack, import, publish

#### 9. Option Sets (Choices)

**Natural language examples:**
- "Add 'Pending Review' to the status dropdown"
- "Create a priority choice with High, Medium, Low"

**How to handle:**
1. For global option sets, use Web API:
```python
# Add option to existing option set
option_data = {
    "Value": 100000003,
    "Label": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"Label": "Pending Review", "LanguageCode": 1033}]}
}
# POST to /api/data/v9.2/InsertOptionValue
```
2. For local option sets (on specific column), update the column metadata
3. Publish after changes

#### 10. Environment Variables

**Natural language examples:**
- "Set the API URL to https://api.example.com"
- "Add a setting for the notification email"

**How to handle:**
1. Find in `environmentvariabledefinitions/` folder
2. Structure:
```json
{
  "schemaname": "new_APIEndpoint",
  "displayname": "API Endpoint",
  "type": 100000000,  // String
  "defaultvalue": "https://api.example.com"
}
```
3. For current values, update `environmentvariablevalues/`
4. Or use Web API to update directly

#### 11. Canvas Apps (.msapp)

**Natural language examples:**
- "Change the header color to blue"
- "Add a button to submit the form"
- "Update the logo image"

**How to handle:**
- See existing "Canvas App Editing" section
- **CRITICAL**: Use Python zipfile, never unzip/zip commands
- Update ALL fill states (Fill, HoverFill, PressedFill, DisabledFill)
- Search for control references before changing properties

---

### FAST PATH: Use Dataverse Web API for Simple Changes

For simple metadata operations (adding columns, updating labels, querying data), **skip the solution export/import cycle** and use the Dataverse Web API directly. This is **10x faster** (~5 seconds vs 1-5 minutes).

**Use the Web API when:**
- Adding a new column to a table
- Updating column/table display names or descriptions
- Querying entities, forms, or views
- Creating or updating records
- Updating connection references
- **Adding fields to forms** (via SystemForm API - see below)

**Use the full solution cycle (Steps 2-5) ONLY when:**
- Working with Canvas apps (.msapp files)
- Working with Cloud flows (complex JSON)
- Working with PCF components
- Changes that absolutely require solution packaging

#### IMPORTANT: CI/CD Environment Constraints

When running in GitHub Actions (claude-code-action), bash commands using heredocs or redirects may be blocked by allowedTools patterns.

**CRITICAL: Use the Write tool to create Python scripts, then execute with Bash:**

1. First, use the **Write tool** to create `/tmp/api_script.py` with your Python code
2. Then use **Bash** to execute: `python3 /tmp/api_script.py`

**Do NOT use** `cat > /tmp/file.py << 'EOF'` - this pattern is blocked because `cat >` with redirects doesn't match `Bash(cat:*)`.

**Do NOT use** `python3 << 'EOF'` heredocs - these are also blocked.

Or use **curl** for simple GET requests:
```bash
# Get token
TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
  -d "grant_type=client_credentials&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&scope=$ENV_URL/.default" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Query API
curl -s "$ENV_URL/api/data/v9.2/EntityDefinitions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json"
```

#### Web API Quick Reference

**Step 1:** Use the **Write tool** to create `/tmp/create_column.py` with Python code like:
```python
import urllib.request, urllib.parse, json, os

# Get credentials from prefixed env vars (e.g., SNOWLION_PP_CLIENT_ID)
prefix = "SNOWLION"  # Change based on tenant
env_url = os.environ[f'{prefix}_PP_ENVIRONMENT_URL'].rstrip('/')
client_id = os.environ[f'{prefix}_PP_CLIENT_ID']
client_secret = os.environ[f'{prefix}_PP_CLIENT_SECRET']
tenant_id = os.environ[f'{prefix}_PP_TENANT_ID']

# Get access token
data = urllib.parse.urlencode({
    'grant_type': 'client_credentials',
    'client_id': client_id,
    'client_secret': client_secret,
    'scope': f'{env_url}/.default'
}).encode()
req = urllib.request.Request(f'https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token', data=data)
token = json.loads(urllib.request.urlopen(req).read())['access_token']

headers = {
    'Authorization': f'Bearer {token}',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
}

# Example: Create a new text column on account table
column_def = {
    "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
    "SchemaName": "new_mytextfield",
    "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "My Text Field", "LanguageCode": 1033}]},
    "RequiredLevel": {"Value": "None"},
    "MaxLength": 100,
    "FormatName": {"Value": "Text"}
}

url = f"{env_url}/api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes"
req = urllib.request.Request(url, data=json.dumps(column_def).encode(), method='POST')
for k, v in headers.items():
    req.add_header(k, v)
resp = urllib.request.urlopen(req)
print(f"Column created: {resp.status}")
```

**Step 2:** Execute with Bash: `python3 /tmp/create_column.py`

#### Common Web API Operations

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List tables | `/api/data/v9.2/EntityDefinitions?$select=LogicalName,DisplayName` | GET |
| List columns | `/api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes` | GET |
| Create column | `/api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes` | POST |
| Query forms | `/api/data/v9.2/systemforms?$filter=objecttypecode eq 'account'` | GET |
| Update form XML | `/api/data/v9.2/systemforms({formid})` | PATCH |
| Update connection ref | `/api/data/v9.2/connectionreferences({id})` | PATCH |

After making Web API changes, always run `pac solution publish` to publish customizations.

#### FAST: Adding Fields to Forms via SystemForm API

The `systemform` table has an updatable `formxml` column. This lets you modify forms **directly via Web API** without the slow solution export/import cycle (~30 seconds vs 5+ minutes).

**IMPORTANT: Use the Write tool to create the Python script, then execute with Bash.**

1. First, use the **Write tool** to create `/tmp/update_form.py` with your Python code:

```python
# /tmp/update_form.py - Save this using the Write tool
import urllib.request, urllib.parse, json, os, uuid

# Get credentials from prefixed env vars
prefix = "SNOWLION"  # Change based on tenant
env_url = os.environ[f'{prefix}_PP_ENVIRONMENT_URL'].rstrip('/')
client_id = os.environ[f'{prefix}_PP_CLIENT_ID']
client_secret = os.environ[f'{prefix}_PP_CLIENT_SECRET']
tenant_id = os.environ[f'{prefix}_PP_TENANT_ID']

# Get access token
data = urllib.parse.urlencode({
    'grant_type': 'client_credentials',
    'client_id': client_id,
    'client_secret': client_secret,
    'scope': f'{env_url}/.default'
}).encode()
req = urllib.request.Request(f'https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token', data=data)
token = json.loads(urllib.request.urlopen(req).read())['access_token']

headers = {
    'Authorization': f'Bearer {token}',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
}

# 1. Find the form (e.g., main form for "account" table)
table_name = "account"
form_url = f"{env_url}/api/data/v9.2/systemforms?$filter=objecttypecode eq '{table_name}' and type eq 2&$select=formid,name,formxml"
req = urllib.request.Request(form_url)
for k, v in headers.items():
    req.add_header(k, v)
forms = json.loads(urllib.request.urlopen(req).read()).get('value', [])
print(f"Found {len(forms)} main forms")

# Pick the form to modify (filter by name if needed)
form = forms[0]
form_id = form['formid']
form_xml = form['formxml']
print(f"Modifying form: {form['name']} ({form_id})")

# 2. Add a field to the form XML
field_name = "new_mytextfield"
if '</rows>' in form_xml:
    new_row = f'<row><cell id="{uuid.uuid4()}" showlabel="true" locklevel="0"><labels><label description="{field_name}" languagecode="1033" /></labels><control id="{field_name}" classid="{{4273EDBD-AC1D-40d3-9FB2-095C621B552D}}" datafieldname="{field_name}" /></cell></row>'
    form_xml = form_xml.replace('</rows>', f'{new_row}</rows>', 1)

# 3. PATCH the form with the modified XML
patch_url = f"{env_url}/api/data/v9.2/systemforms({form_id})"
patch_data = json.dumps({'formxml': form_xml}).encode()
patch_req = urllib.request.Request(patch_url, data=patch_data, method='PATCH')
for k, v in headers.items():
    patch_req.add_header(k, v)
urllib.request.urlopen(patch_req)
print(f"Form XML updated successfully")
```

2. Then execute with Bash:

```bash
python3 /tmp/update_form.py
pac solution publish
```

**Key points for SystemForm API:**
- `type eq 2` filters for main forms (type 2); quick view = 6, dashboard = 0
- The `formxml` column contains the full XML layout of the form
- Always generate new GUIDs for new elements (`id` attributes)
- The text control classid is `{4273EDBD-AC1D-40d3-9FB2-095C621B552D}`
- After PATCH, run `pac solution publish` to make changes visible

### Step 2: Export Fresh From the Environment (Full Cycle)

**DO NOT blindly trust solution files already in the repo.** They may be outdated or from a different project entirely. Always export fresh:

```bash
pac solution export --name "SOLUTION_NAME" --path /tmp/solution.zip --managed false
pac solution unpack --zipfile /tmp/solution.zip --folder /tmp/SOLUTION_NAME --allowWrite true --allowDelete true
```

### Step 3: Make Your Changes

Edit the freshly exported files in `/tmp/SOLUTION_NAME/`. Verify that tables, columns, and forms you need actually exist in the exported files before modifying them.

### Step 4: Deploy to the Environment (MANDATORY)

**Every change MUST be deployed.** Editing files without importing and publishing has no effect. Always run:

```bash
# Pack the modified solution
pac solution pack --folder /tmp/SOLUTION_NAME --zipfile /tmp/solution_modified.zip

# Import to the environment
pac solution import --path /tmp/solution_modified.zip --force-overwrite true

# Publish (required for changes to take effect)
pac solution publish
```

**Changes are NOT complete until `pac solution publish` succeeds.** If import or publish fails, debug and retry — do not just commit files to the repo and call it done.

### Step 5: Verify the Change

After publishing, verify your change was applied using the Dataverse Web API or by re-exporting the solution.

### Step 6: Provide a Review Link

After the change is deployed and verified, **always comment on the issue with a direct link** where the user can review the change in the Power Platform environment. This lets the user verify the result without having to navigate there themselves.

Get the environment ID from `pac org who` (the "Environment ID" field). Provide a link to the environment home page where the user can navigate to review the changes:

| What was changed | Link to provide |
|---|---|
| Any change | `https://make.powerapps.com/environments/{env-id}` |

Then describe where to find it:
- **Table/Columns/Forms**: Go to **Tables** in the left nav, search for the table name, then click **Columns** or **Forms**
- **Apps**: Go to **Apps** in the left nav
- **Cloud flows**: Go to **Flows** in the left nav
- **Solutions**: Go to **Solutions** in the left nav

**Important**: Direct deep links to specific tables (like `/tables/{table-name}/columns`) don't work reliably in Power Apps. Always use the environment home page link and provide navigation instructions.

### NEVER Do This

- **NEVER skip import and publish** — editing repo files alone does nothing to the live environment
- **NEVER edit solution files in the repo without first exporting from the environment**
- **NEVER assume a table, column, or form exists** just because files are in the repo — always verify against the live environment
- **NEVER hardcode environment URLs or solution names** — always discover them dynamically via `pac org who` and `pac solution list`
- **NEVER implement changes without proposing your plan first** — always comment on the issue with the exact element you found and plan to modify. If the user asks for "PCF test section" and you only find "PCF COMPONENT", that is NOT a match (missing "test"). List what you found and ask for clarification.

## Quick Start

```bash
# 1. Authenticate (opens browser)
pac auth create

# 2. Check connection
pac org who
```

## Core Workflow

### Export from Environment
```bash
# List solutions
pac solution list

# Export and unpack a solution
pac solution export --name "SolutionName" --path /tmp/solution.zip --managed false
pac solution unpack --zipfile /tmp/solution.zip --folder ./solutions/SolutionName --allowWrite true --allowDelete true
```

### Make Changes
- Edit files directly in `./solutions/SolutionName/`
- Web resources: `WebResources/*.js`, `*.css`, `*.html`
- Forms: `Entities/{TableName}/FormXml/main/*.xml`
- Tables/Columns: `Entities/{TableName}/Entity.xml`
- Views: `Entities/{TableName}/SavedQueries/*.xml`
- Workflows/Flows: `Workflows/*.json`

### Deploy Changes
```bash
# Pack and import
pac solution pack --folder ./solutions/SolutionName --zipfile /tmp/solution_modified.zip
pac solution import --path /tmp/solution_modified.zip --force-overwrite true

# Publish (required for changes to take effect)
pac solution publish
```

## PAC CLI Reference

| Action | Command |
|--------|---------|
| List auth profiles | `pac auth list` |
| Switch environment | `pac auth select --index N` |
| Check connection | `pac org who` |
| List solutions | `pac solution list` |
| Export solution | `pac solution export --name "X" --path /tmp/x.zip --managed false` |
| Unpack to folder | `pac solution unpack --zipfile /tmp/x.zip --folder ./solutions/X --allowWrite true` |
| Pack to zip | `pac solution pack --folder ./solutions/X --zipfile /tmp/x.zip` |
| Import solution | `pac solution import --path /tmp/x.zip --force-overwrite true` |
| Publish changes | `pac solution publish` |

## Solution Structure (Unpacked)

```
solutions/MySolution/
├── Other/Solution.xml              # Solution metadata
├── Entities/                       # Tables
│   └── {TableName}/
│       ├── Entity.xml              # Table & column definitions
│       ├── FormXml/main/*.xml      # Form layouts
│       └── SavedQueries/*.xml      # Views
├── WebResources/                   # JS, CSS, HTML, images
├── Workflows/                      # Cloud Flows (JSON)
├── Roles/                          # Security roles
├── OptionSets/                     # Choice columns
└── CanvasApps/                     # Canvas apps (.msapp)
```

## Common Tasks

### Add a column to a table
1. Find: `Entities/{TableName}/Entity.xml`
2. Add `<attribute>` element with Type, Name, LogicalName, DisplayMask, etc.
3. Pack, import, publish

### Add field to a form
1. Find: `Entities/{TableName}/FormXml/main/{formId}.xml`
2. Add `<cell>` with `<control datafieldname="fieldname">` inside a `<row>`
3. Pack, import, publish

### Edit JavaScript web resource
1. Find: `WebResources/{name}.js`
2. Edit the JavaScript directly
3. Pack, import, publish

### Modify a Cloud Flow
1. Find: `Workflows/{flowname}.json`
2. Edit the JSON definition
3. Pack, import, publish

## PCF Components

PCF (Power Apps Component Framework) components live in separate folders:

```bash
# Build PCF
cd pcf-components/MyControl
npm run build

# Build solution containing PCF
cd Solutions/MySolution
dotnet build

# Deploy
pac solution import --path bin/Debug/MySolution.zip --force-overwrite true
pac solution publish
```

## Environment Setup

Ensure PAC CLI is installed:
```bash
# Install
dotnet tool install --global Microsoft.PowerApps.CLI.Tool

# If not in PATH, add:
export DOTNET_ROOT="/opt/homebrew/Cellar/dotnet/9.0.8/libexec"  # macOS with Homebrew
export PATH="$PATH:$HOME/.dotnet/tools"
```

## Important Notes

1. **Always export before editing** - Get latest from environment
2. **Multiple forms** - Tables can have multiple forms; check which one is active
3. **Form `contenttype="singleComponent"`** - This attribute makes tabs show only one control full-screen; remove it to show multiple fields
4. **GUIDs** - Form elements need unique GUIDs; generate new ones for new elements
5. **Publish after import** - Changes don't take effect until published
6. **Canvas Apps** - `.msapp` files need special handling (see Canvas App Editing section below)
7. **Solution import time** - Large solutions with Canvas apps can take 5-10 minutes to import

## Canvas App Editing (.msapp files)

Canvas apps are stored as `.msapp` files in `CanvasApps/`. These are ZIP archives containing JSON files that define the app's controls, data sources, themes, etc.

### CRITICAL: Compression Requirements

**NEVER use `unzip`/`zip` commands to modify .msapp files.** The standard `zip` command creates uncompressed (STORED) archives, which corrupts the .msapp. Power Platform requires DEFLATE-compressed .msapp files.

**Always use Python's `zipfile` module** to modify .msapp files, preserving the original compression type for each entry:

```python
python3 -c "
import zipfile, json, io, shutil

MSAPP_PATH = 'path/to/app.msapp'

# 1. Read original
with open(MSAPP_PATH, 'rb') as f:
    original_data = f.read()

original_zip = zipfile.ZipFile(io.BytesIO(original_data), 'r')

# 2. Read all files
files = []
for info in original_zip.infolist():
    files.append({
        'info': info,
        'data': original_zip.read(info.filename) if not info.is_dir() else b''
    })

# 3. Modify the target file (e.g., Controls/4.json)
for entry in files:
    if entry['info'].filename == 'Controls/4.json':
        content = json.loads(entry['data'])
        # ... make your changes to content ...
        entry['modified_data'] = json.dumps(content, ensure_ascii=False).encode('utf-8')

# 4. Write new .msapp preserving compression
with zipfile.ZipFile(MSAPP_PATH, 'w') as out_zip:
    for entry in files:
        info = entry['info']
        if info.is_dir():
            dir_info = zipfile.ZipInfo(info.filename)
            dir_info.compress_type = zipfile.ZIP_STORED
            out_zip.writestr(dir_info, b'')
            continue
        new_info = zipfile.ZipInfo(info.filename)
        new_info.compress_type = info.compress_type  # PRESERVE original compression
        data = entry.get('modified_data', entry['data'])
        out_zip.writestr(new_info, data)

original_zip.close()
"
```

### .msapp Structure

```
app.msapp (ZIP with DEFLATE compression)
├── Header.json                    # App metadata
├── Properties.json                # App properties
├── References/
│   ├── DataSources.json          # Data connections
│   ├── Resources.json            # Media resources
│   ├── Templates.json            # Control templates
│   └── Themes.json               # Theme definitions
├── Controls/
│   ├── 1.json                    # Screen definitions
│   ├── 2.json, 3.json, ...      # More screens/controls
│   └── N.json                    # Each contains control tree
└── AppCheckerResult.sarif         # App checker results
```

### Control Properties in JSON

Controls have `Rules` arrays that define property values:
```json
{
  "Name": "shp_headerBackground",
  "Rules": [
    { "Property": "Fill", "InvariantScript": "RGBA(0, 120, 212, 1)" },
    { "Property": "Height", "InvariantScript": "80" }
  ],
  "Children": [...]
}
```

### CRITICAL: Changing Colors in Canvas Apps

When changing a control's color, you **MUST update ALL fill-related properties**, not just `Fill`. Controls have multiple fill states:

- `Fill` - Normal state
- `HoverFill` - Mouse hover state
- `PressedFill` - Click/pressed state
- `DisabledFill` - Disabled state
- `FocusedBorderColor` - Focus border
- `BorderColor` - Border color

**If you only change `Fill`, the control will still appear in the old color** because `HoverFill`, `PressedFill`, or `DisabledFill` may override it at runtime.

Also check for **other controls that reference the target control's properties**. For example, `Rectangle3.Fill = shp_headerBackground.DisabledFill` means Rectangle3 inherits from the header's disabled fill. Update these references too (e.g., change `.DisabledFill` to `.Fill`).

**Steps to change a control's color:**
1. Find the control by `Name` in the JSON
2. Update `InvariantScript` for ALL of: `Fill`, `HoverFill`, `PressedFill`, `DisabledFill`
3. Search the entire control tree for any controls referencing the target control (e.g., `grep` for the control name)
4. Update those references if they point to old color values

**Important:** The JSON structure starts with `content['TopParent']` - always begin traversal there.

### Common Color Values
- Theme primary: `App.Theme.Colors.Primary` (resolves at runtime)
- Explicit RGBA: `RGBA(255, 255, 0, 1)` (yellow), `RGBA(0, 120, 212, 1)` (blue)
- Use explicit RGBA values for reliable results

## Git Workflow

```bash
# 1. Create branch
git checkout -b feature/my-change

# 2. Export current state
pac solution export --name "MySolution" --path /tmp/sol.zip --managed false
pac solution unpack --zipfile /tmp/sol.zip --folder ./solutions/MySolution --allowWrite true

# 3. Make changes (edit files or use Power Apps UI then re-export)

# 4. Test
pac solution pack --folder ./solutions/MySolution --zipfile /tmp/modified.zip
pac solution import --path /tmp/modified.zip --force-overwrite true
pac solution publish

# 5. If UI changes were made, export again to capture them

# 6. Commit
git add solutions/
git commit -m "Description of changes"
git push -u origin feature/my-change

# 7. Create PR
gh pr create --title "My change" --body "Description"
```

## Managing Connections and Connection References

Connections in Power Platform can become invalidated when:
- The authentication token expires (~2 years)
- The connected user account no longer exists
- The connection needs re-authentication

This environment is pre-authenticated with a **service principal** via PAC CLI. The auth profile is created during CI setup.

### Check Current Auth
```bash
pac auth list
pac org who
```

### Connection References in Solutions
Connection references are stored in `ConnectionReferences/` within unpacked solutions. They map connectors to specific connections.

### Updating a Cloud Flow's Connector
Cloud flows are in `Workflows/*.json`. The connector API name for Dataverse is `shared_commondataserviceforapps`.

To fix a broken flow connection:
1. Export the solution containing the flow
2. Identify the connection reference used by the flow
3. Update connection reference mapping during import using deployment settings
4. Re-import and publish

### Using PAC CLI for Connection Management
```bash
# List connections in the environment
pac connection list

# List connection references in a solution
pac solution list

# Import with connection mapping (deployment settings)
pac solution import --path /tmp/solution.zip --force-overwrite true --settings-file /tmp/deployment-settings.json

# Publish after import
pac solution publish
```

### Deployment Settings File Format
```json
{
  "EnvironmentVariables": [],
  "ConnectionReferences": [
    {
      "LogicalName": "new_sharedcommondataserviceforapps_xxxxx",
      "ConnectionId": "shared-commondataser-xxxxxxxx-xxxx-xxxx",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    }
  ]
}
```

### Full Workflow for Fixing a Connection

**Method 0: Using Pre-Created Connection IDs + Dataverse Web API (PREFERRED)**

Pre-created connection IDs are available as environment variables, **prefixed by tenant** (see `tenants.json`):
- `{PREFIX}_DATAVERSE_CONNECTION_ID` — for Dataverse (`shared_commondataserviceforapps`) connection references
- `{PREFIX}_CONTENT_CONVERSION_CONNECTION_ID` — for Content Conversion (`shared_conversionservice`) connection references

For example, for the Snowlion tenant (prefix `SNOWLION`): `SNOWLION_DATAVERSE_CONNECTION_ID`, `SNOWLION_CONTENT_CONVERSION_CONNECTION_ID`.

**IMPORTANT:** Do NOT try to use `pac connection create` or `pac connection list` — they fail on Linux due to keyring issues. Do NOT try to create connections via the PowerApps REST API — the SPN lacks a user plan. Just use the pre-created IDs from the environment variables.

**CRITICAL: Connection ID format must be GUID-only** (e.g., `10b747de-5528-47fa-bbcf-ec5b229a7ec2`), NOT the full prefixed format (e.g., `shared-commondataser-10b747de-...`). The Dataverse Web API rejects the prefixed format with `ConnectionNotFound`.

**IMPORTANT: Use the Write tool to create the Python script, then execute with Bash.**

1. Use the **Write tool** to create `/tmp/fix_connections.py`:

```python
# /tmp/fix_connections.py - Save this using the Write tool
import urllib.request, urllib.parse, json, os

env_url = os.environ['PP_ENVIRONMENT_URL'].rstrip('/')
client_id = os.environ['PP_CLIENT_ID']
client_secret = os.environ['PP_CLIENT_SECRET']
tenant_id = os.environ['PP_TENANT_ID']
dataverse_conn_id = os.environ['DATAVERSE_CONNECTION_ID']
content_conv_conn_id = os.environ.get('CONTENT_CONVERSION_CONNECTION_ID', '')

# Map connector IDs to their pre-created connection IDs
connector_map = {
    '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps': dataverse_conn_id,
}
if content_conv_conn_id:
    connector_map['/providers/Microsoft.PowerApps/apis/shared_conversionservice'] = content_conv_conn_id

# Get Dataverse token
data = urllib.parse.urlencode({
    'grant_type': 'client_credentials',
    'client_id': client_id,
    'client_secret': client_secret,
    'scope': f'{env_url}/.default'
}).encode()
req = urllib.request.Request(f'https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token', data=data)
token = json.loads(urllib.request.urlopen(req).read())['access_token']

headers = {
    'Authorization': f'Bearer {token}',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    'Accept': 'application/json'
}

# Find ALL connection references with null connectionid
url = f"{env_url}/api/data/v9.2/connectionreferences?$select=connectionreferenceid,connectionreferencelogicalname,connectorid,connectionid&$filter=connectionid eq null"
req = urllib.request.Request(url)
for k, v in headers.items():
    req.add_header(k, v)
null_refs = json.loads(urllib.request.urlopen(req).read()).get('value', [])
print(f'Found {len(null_refs)} null connection references')

# Update each null reference with the matching pre-created connection
for ref in null_refs:
    connector_id = ref.get('connectorid', '')
    conn_id = connector_map.get(connector_id)
    if not conn_id:
        print(f'SKIP: No connection for connector {connector_id} ({ref["connectionreferencelogicalname"]})')
        continue
    ref_id = ref['connectionreferenceid']
    patch_url = f'{env_url}/api/data/v9.2/connectionreferences({ref_id})'
    patch_data = json.dumps({'connectionid': conn_id}).encode()
    patch_req = urllib.request.Request(patch_url, data=patch_data, method='PATCH')
    for k, v in headers.items():
        patch_req.add_header(k, v)
    patch_req.add_header('Content-Type', 'application/json')
    urllib.request.urlopen(patch_req)
    print(f'Updated {ref["connectionreferencelogicalname"]} with connection {conn_id}')

print('Done!')
```

2. Then execute with Bash:

```bash
python3 /tmp/fix_connections.py
pac solution publish
```

**Method 1: Using Dataverse Web API (Recommended for Service Principal)**

When `pac connection list` doesn't work with service principal auth, use the Dataverse Web API to query and update connection references directly:

```bash
# 1. Verify auth is working
pac org who

# 2. Get the environment URL
ENV_URL="$PP_ENVIRONMENT_URL"  # e.g., https://snowlion-demo.crm4.dynamics.com

# 3. Get an access token for Dataverse
TOKEN=$(python3 -c "
import urllib.request, urllib.parse, json, os
data = urllib.parse.urlencode({
    'grant_type': 'client_credentials',
    'client_id': os.environ['PP_CLIENT_ID'],
    'client_secret': os.environ['PP_CLIENT_SECRET'],
    'scope': '${ENV_URL}/.default'
}).encode()
req = urllib.request.Request('https://login.microsoftonline.com/${PP_TENANT_ID}/oauth2/v2.0/token', data=data)
resp = json.loads(urllib.request.urlopen(req).read())
print(resp['access_token'])
")

# 4. Query connection references in the environment
python3 -c "
import urllib.request, json
url = '${ENV_URL}/api/data/v9.2/connectionreferences?\$select=connectionreferenceid,connectionreferencelogicalname,connectorid,connectionid,statuscode'
req = urllib.request.Request(url)
req.add_header('Authorization', 'Bearer ${TOKEN}')
req.add_header('OData-MaxVersion', '4.0')
req.add_header('OData-Version', '4.0')
req.add_header('Accept', 'application/json')
resp = json.loads(urllib.request.urlopen(req).read())
for cr in resp.get('value', []):
    print(json.dumps(cr, indent=2))
"

# 5. Update a connection reference to point to a valid connection
# Replace CONNECTION_REF_ID and NEW_CONNECTION_ID with actual values
python3 -c "
import urllib.request, json
url = '${ENV_URL}/api/data/v9.2/connectionreferences(CONNECTION_REF_ID)'
data = json.dumps({'connectionid': 'NEW_CONNECTION_ID'}).encode()
req = urllib.request.Request(url, data=data, method='PATCH')
req.add_header('Authorization', 'Bearer ${TOKEN}')
req.add_header('Content-Type', 'application/json')
req.add_header('OData-MaxVersion', '4.0')
req.add_header('OData-Version', '4.0')
urllib.request.urlopen(req)
print('Connection reference updated successfully')
"

# 6. Publish changes
pac solution publish
```

**Method 2: Re-import with Deployment Settings**

```bash
# 1. Verify auth is working
pac org who

# 2. Export the solution
pac solution export --name "SolutionName" --path /tmp/sol.zip --managed false

# 3. Unpack to inspect
pac solution unpack --zipfile /tmp/sol.zip --folder /tmp/sol_unpacked --allowWrite true

# 4. Check connection references
cat /tmp/sol_unpacked/ConnectionReferences/*.json

# 5. List available connections to find a valid one
pac connection list

# 6. Create deployment settings with correct connection mapping
# 7. Re-import with deployment settings
pac solution import --path /tmp/sol.zip --force-overwrite true --settings-file /tmp/deployment-settings.json

# 8. Publish
pac solution publish
```

### If `pac connection list` Fails with Service Principal

The `pac connection list` command may fail with `AuthProfileSpnSecretNotFoundWithLinuxFallback` because it requires Power Platform Management API access which only supports delegated permissions. In this case:

1. **Use the Dataverse Web API** (Method 1 above) to query `connectionreferences` entity directly
2. **Query connections via API**: `GET {env_url}/api/data/v9.2/connections?$select=connectionid,name,connectorid,statuscode`
3. **Create a new connection** if needed, or use the service principal's own connection that gets created automatically when it authenticates

## Troubleshooting

### PAC command not found
```bash
export DOTNET_ROOT="/opt/homebrew/Cellar/dotnet/9.0.8/libexec"
export PATH="$PATH:$HOME/.dotnet/tools"
```

### Solution import stuck
Large solutions with Canvas apps take time. Check `pac org who` to confirm connection.

### Changes not visible
Run `pac solution publish` after import.

### Form field not showing
- Check you're editing the correct form (tables can have multiple)
- Remove `contenttype="singleComponent"` from tab if present
- Hard refresh browser (Ctrl+Shift+R)
