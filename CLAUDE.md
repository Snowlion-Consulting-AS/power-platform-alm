# Power Platform ALM - Claude Code Instructions

You are helping develop Power Platform solutions (Dynamics 365, Power Apps, Dataverse) using a Git-based ALM workflow.

## CRITICAL: Target Environment

This repository is connected to the **Snowlion Demo** environment:
- **Environment URL:** `https://snowlion-demo.crm4.dynamics.com/`
- **Tenant ID:** `664b9f74-6876-4101-a2b4-7651d24a27de`
- **Organization:** Snowlion Consulting AS
- **SPN App ID:** `314cd34d-3252-481e-911d-8ee7454f3dc4`

The PAC CLI in the GitHub Actions workflow is pre-authenticated to this environment via the service principal.

### Which Solution to Use

When making changes to Dataverse tables, columns, forms, flows, etc., use the **`SnowlionBusinessApplication`** solution. This is the main unmanaged solution in the environment.

**DO NOT blindly trust solution files already in the repo.** The repo may contain stale or leftover solution files from other projects. Always follow this workflow:

1. **Run `pac org who`** to confirm you are connected to `snowlion-demo.crm4.dynamics.com`
2. **Run `pac solution list`** to see what solutions exist in the environment
3. **Export fresh from the environment** before making any changes:
   ```bash
   pac solution export --name "SnowlionBusinessApplication" --path /tmp/solution.zip --managed false
   pac solution unpack --zipfile /tmp/solution.zip --folder ./solutions/SnowlionBusinessApplication --allowWrite true --allowDelete true
   ```
4. Make your changes on the freshly exported files
5. Pack, import, and publish

### NEVER Do This

- **NEVER edit solution files in the repo without first exporting from the environment.** The repo files may be outdated or from a different project entirely.
- **NEVER assume a table, column, or form exists** just because files are in the repo. Always verify against the live environment.
- **NEVER use the `Smalladjustments` solution** — it contains entities from a different project (Norbygg) and is not part of the Snowlion demo environment.

### Verifying Entities Exist

Before adding a column to a table or a field to a form, verify the entity exists in the target environment:

```bash
# Use Dataverse Web API to check if a table exists
python3 -c "
import urllib.request, urllib.parse, json, os
env_url = os.environ['PP_ENVIRONMENT_URL'].rstrip('/')
client_id = os.environ['PP_CLIENT_ID']
client_secret = os.environ['PP_CLIENT_SECRET']
tenant_id = os.environ['PP_TENANT_ID']

# Get token
data = urllib.parse.urlencode({
    'grant_type': 'client_credentials',
    'client_id': client_id,
    'client_secret': client_secret,
    'scope': f'{env_url}/.default'
}).encode()
req = urllib.request.Request(f'https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token', data=data)
token = json.loads(urllib.request.urlopen(req).read())['access_token']

# Query entity definitions
url = f'{env_url}/api/data/v9.2/EntityDefinitions?\$select=LogicalName,DisplayName&\$filter=LogicalName eq %27TABLE_LOGICAL_NAME%27'
req = urllib.request.Request(url)
req.add_header('Authorization', f'Bearer {token}')
req.add_header('OData-MaxVersion', '4.0')
req.add_header('OData-Version', '4.0')
req.add_header('Accept', 'application/json')
result = json.loads(urllib.request.urlopen(req).read())
print(json.dumps(result.get('value', []), indent=2))
"
```

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

The workflow provides pre-created connection IDs via environment variables:
- `DATAVERSE_CONNECTION_ID` — for Dataverse (`shared_commondataserviceforapps`) connection references
- `CONTENT_CONVERSION_CONNECTION_ID` — for Content Conversion (`shared_conversionservice`) connection references

**IMPORTANT:** Do NOT try to use `pac connection create` or `pac connection list` — they fail on Linux due to keyring issues. Do NOT try to create connections via the PowerApps REST API — the SPN lacks a user plan. Just use the pre-created IDs from the environment variables.

**CRITICAL: Connection ID format must be GUID-only** (e.g., `10b747de-5528-47fa-bbcf-ec5b229a7ec2`), NOT the full prefixed format (e.g., `shared-commondataser-10b747de-...`). The Dataverse Web API rejects the prefixed format with `ConnectionNotFound`.

```bash
# Use the Dataverse Web API to find null connection references and update them

python3 << 'PYEOF'
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
PYEOF

# Publish changes
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
