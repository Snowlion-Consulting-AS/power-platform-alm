# Power Platform ALM - Claude Code Instructions

You are helping develop Power Platform solutions (Dynamics 365, Power Apps, Dataverse) using a Git-based ALM workflow.

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
