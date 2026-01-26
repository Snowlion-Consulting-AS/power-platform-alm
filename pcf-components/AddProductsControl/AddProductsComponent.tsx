/* eslint-disable @typescript-eslint/no-base-to-string */
import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";

// Types
export interface Product {
  id: string;
  name: string;
  localizedName?: string;
  description?: string;
  unitPrice: number;
  unit?: string;
  category?: string;
  assetNo?: string;
  itemId?: string;
}

export interface CartItem extends Product {
  quantity: number;
  discount: number;
  extendedAmount: number;
}

export interface IAddProductsProps {
  recordId: string;
  entityName: string;
  headerColor: string;
  webAPI: ComponentFramework.WebApi;
  onSave: (items: CartItem[]) => void;
}

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
  }).format(amount);
};

// Main Component
export const AddProductsComponent: React.FC<IAddProductsProps> = ({
  recordId,
  entityName,
  headerColor,
  webAPI,
  onSave,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [discounts, setDiscounts] = useState<Record<string, number>>({});

  // Get entity display name
  const getEntityDisplayName = (): string => {
    switch (entityName) {
      case "sl_project":
        return "Project";
      case "sl_offer":
        return "Offer";
      case "sl_order":
        return "Order";
      default:
        return "Record";
    }
  };

  // Load products from Dataverse - sl_salespricelistitem
  useEffect(() => {
    const loadProducts = async (): Promise<void> => {
      setIsLoading(true);
      try {
        // Query sales price list items with expanded item details
        const result = await webAPI.retrieveMultipleRecords(
          "sl_salespricelistitem",
          "?$select=sl_salespricelistitemid,sl_name,sl_localizedname,sl_amount,sl_unitofmeasure,sl_assetno&$expand=sl_item($select=sl_name,sl_description,sl_itemcategory,sl_productnumber)&$orderby=sl_name"
        );

        const loadedProducts: Product[] = result.entities.map((entity) => {
          const e = entity as Record<string, unknown>;
          const item = e.sl_item as Record<string, unknown> | undefined;

          return {
            id: String(e.sl_salespricelistitemid ?? ""),
            name: String(e.sl_name ?? "Unnamed Product"),
            localizedName: e.sl_localizedname ? String(e.sl_localizedname) : undefined,
            description: item?.sl_description ? String(item.sl_description) : undefined,
            unitPrice: Number(e.sl_amount ?? 0),
            unit: e.sl_unitofmeasure ? String(e.sl_unitofmeasure) : "Each",
            category: item?.sl_itemcategory ? String(item.sl_itemcategory) : "Uncategorized",
            assetNo: e.sl_assetno ? String(e.sl_assetno) : undefined,
            itemId: item?.sl_productnumber ? String(item.sl_productnumber) : undefined,
          };
        });

        setProducts(loadedProducts);
      } catch (error) {
        console.error("Error loading products:", error);
        // Load sample data for demo if API fails
        setProducts([
          { id: "1", name: "Anti corrosion treatment", unitPrice: 11660, category: "RS 400", unit: "Each" },
          { id: "2", name: "Cabwalk entry", unitPrice: 8500, category: "RS 400", unit: "Each" },
          { id: "3", name: "Engine heater 220 V", unitPrice: 2500, category: "Electrical", unit: "Each" },
          { id: "4", name: "Battery charger 220 V", unitPrice: 1800, category: "Electrical", unit: "Each" },
          { id: "5", name: "Central lubrication system", unitPrice: 15000, category: "Hydraulic", unit: "Each" },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadProducts();
  }, [webAPI]);

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Filter products by search term and category
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.localizedName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (product.assetNo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach((product) => {
      const cat = product.category ?? "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(product);
    });
    return groups;
  }, [filteredProducts]);

  // Handle quantity change
  const handleQuantityChange = (productId: string, value: number): void => {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(1, value) }));
  };

  // Handle discount change
  const handleDiscountChange = (productId: string, value: number): void => {
    setDiscounts((prev) => ({ ...prev, [productId]: Math.min(100, Math.max(0, value)) }));
  };

  // Add to cart
  const addToCart = useCallback((product: Product): void => {
    const quantity = quantities[product.id] ?? 1;
    const discount = discounts[product.id] ?? 0;
    const discountMultiplier = 1 - discount / 100;
    const extendedAmount = product.unitPrice * quantity * discountMultiplier;

    const existingIndex = cartItems.findIndex((item) => item.id === product.id);

    if (existingIndex >= 0) {
      const updatedItems = [...cartItems];
      updatedItems[existingIndex] = {
        ...product,
        quantity,
        discount,
        extendedAmount,
      };
      setCartItems(updatedItems);
    } else {
      setCartItems([
        ...cartItems,
        {
          ...product,
          quantity,
          discount,
          extendedAmount,
        },
      ]);
    }

    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    setDiscounts((prev) => ({ ...prev, [product.id]: 0 }));
  }, [cartItems, quantities, discounts]);

  // Remove from cart
  const removeFromCart = (productId: string): void => {
    setCartItems(cartItems.filter((item) => item.id !== productId));
  };

  // Calculate cart total
  const cartTotal = cartItems.reduce((sum, item) => sum + item.extendedAmount, 0);

  // Handle save
  const handleSave = (): void => {
    setIsSaving(true);
    try {
      onSave(cartItems);
      setCartItems([]);
      setIsCartOpen(false);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="add-products-container">
      {/* Header */}
      <div className="add-products-header" style={{ backgroundColor: headerColor }}>
        <h1>Add Products to {getEntityDisplayName()}</h1>
        <div className="header-actions">
          <button
            className="cart-badge"
            onClick={() => setIsCartOpen(true)}
            style={{ color: headerColor }}
          >
            🛒 Cart ({cartItems.length})
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="search-section">
        <div className="search-filter-row">
          <input
            type="text"
            className="search-input"
            placeholder="Search products by name, description, or asset number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat} ({products.filter((p) => p.category === cat).length})
              </option>
            ))}
          </select>
        </div>
        <div className="filter-summary">
          Showing {filteredProducts.length} of {products.length} products
          {selectedCategory !== "all" && ` in "${selectedCategory}"`}
        </div>
      </div>

      {/* Products Grid - Grouped by Category */}
      <div className="products-grid">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading products from price list...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p>No products found matching your criteria</p>
          </div>
        ) : (
          Object.entries(groupedProducts).map(([category, categoryProducts]) => (
            <div key={category} className="category-group">
              <div className="category-header" style={{ backgroundColor: headerColor }}>
                <h3>{category}</h3>
                <span className="category-count">{categoryProducts.length} items</span>
              </div>
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Asset #</th>
                    <th>Unit Price</th>
                    <th>Qty</th>
                    <th>Discount %</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryProducts.map((product) => {
                    const qty = quantities[product.id] ?? 1;
                    const disc = discounts[product.id] ?? 0;
                    const extended = product.unitPrice * qty * (1 - disc / 100);
                    const isInCart = cartItems.some((item) => item.id === product.id);

                    return (
                      <tr key={product.id} className={isInCart ? "in-cart" : ""}>
                        <td className="product-cell">
                          <div className="product-name">{product.name}</div>
                          {product.localizedName && (
                            <div className="product-local-name">{product.localizedName}</div>
                          )}
                          {product.description && (
                            <div className="product-description">{product.description}</div>
                          )}
                        </td>
                        <td className="asset-cell">{product.assetNo ?? "-"}</td>
                        <td className="price-cell">{formatCurrency(product.unitPrice)}</td>
                        <td className="qty-cell">
                          <div className="quantity-control">
                            <button
                              className="qty-btn"
                              onClick={() => handleQuantityChange(product.id, qty - 1)}
                              disabled={qty <= 1}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              className="qty-input"
                              value={qty}
                              onChange={(e) =>
                                handleQuantityChange(product.id, parseInt(e.target.value) || 1)
                              }
                              min="1"
                            />
                            <button
                              className="qty-btn"
                              onClick={() => handleQuantityChange(product.id, qty + 1)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="discount-cell">
                          <input
                            type="number"
                            className="discount-input"
                            value={disc}
                            onChange={(e) =>
                              handleDiscountChange(product.id, parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            max="100"
                          />
                        </td>
                        <td className="amount-cell">{formatCurrency(extended)}</td>
                        <td className="action-cell">
                          <button
                            className={`add-btn ${isInCart ? "update" : ""}`}
                            onClick={() => addToCart(product)}
                            style={{ backgroundColor: isInCart ? "#107C10" : headerColor }}
                          >
                            {isInCart ? "✓ Update" : "+ Add"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* Cart Overlay */}
      <div
        className={`cart-overlay ${isCartOpen ? "visible" : ""}`}
        onClick={() => setIsCartOpen(false)}
      />

      {/* Cart Panel */}
      <div className={`cart-panel ${isCartOpen ? "open" : ""}`}>
        <div className="cart-header" style={{ backgroundColor: headerColor }}>
          <h2>🛒 Shopping Cart</h2>
          <button className="close-cart-btn" onClick={() => setIsCartOpen(false)}>
            ×
          </button>
        </div>

        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛒</div>
              <p>Your cart is empty</p>
              <p className="empty-hint">Add products from the list</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-category">{item.category}</div>
                  <div className="cart-item-details">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                    {item.discount > 0 && (
                      <span className="discount-badge">-{item.discount}%</span>
                    )}
                  </div>
                  <div className="cart-item-price">{formatCurrency(item.extendedAmount)}</div>
                </div>
                <button
                  className="remove-item-btn"
                  onClick={() => removeFromCart(item.id)}
                  title="Remove item"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-summary">
            <div className="cart-line">
              <span>Items:</span>
              <span>{cartItems.length}</span>
            </div>
            <div className="cart-line">
              <span>Total Qty:</span>
              <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="cart-total">
              <span>Total:</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
          </div>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={cartItems.length === 0 || isSaving}
            style={{ backgroundColor: cartItems.length > 0 ? "#107C10" : "#ccc" }}
          >
            {isSaving ? "Saving..." : `Save ${cartItems.length} Products to ${getEntityDisplayName()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductsComponent;
