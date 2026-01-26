# How to Test the AddProductsControl PCF

The PCF component is deployed to your DEMO environment. Here's how to test it:

## Option 1: Add to Project Form (Quick Test)

1. Go to [Power Apps Maker Portal](https://make.powerapps.com/environments/9795edd6-ae4e-e99b-b944-10bef85dbb59/home)

2. Navigate to **Tables** → **Project** → **Forms**

3. Open the **Main form** (or create a test form)

4. Add a **Text field** to the form (or use an existing one like "Description")

5. Select the field → Click **+ Component** in the properties panel

6. Search for **AddProductsControl**

7. Configure the properties:
   - `recordId`: Bind to the Project ID field
   - `entityName`: Set static value `sl_project`
   - `headerColor`: Set to `#0078D4` (blue)

8. **Save and Publish** the form

9. Open a Project record to see the PCF in action!

## Option 2: Create a Custom Page with PCF

1. Go to **Solutions** → **AddProductsSolution**

2. Click **New** → **Custom Page**

3. In the Canvas App designer:
   - Insert → Get more components → Code components
   - Select **AddProductsControl**
   - Place it on the page
   - Set properties

4. Save and add to your app's sitemap

## The PCF Component Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `recordId` | Text (bound) | The parent record GUID | Bind to record ID |
| `entityName` | Text | Entity type | `sl_project`, `sl_offer`, `sl_order` |
| `headerColor` | Text | Header background color | `#0078D4` |
| `selectedProducts` | Text (output) | JSON of selected products | Read-only output |

## What the PCF Does

- Shows a product selection table with blue header
- Search/filter products
- Set quantity and discount per product
- Add to cart functionality
- Calculates extended amounts
- Saves products to the parent record
