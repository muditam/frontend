import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, CircularProgress, Avatar, Checkbox,
  TextField, IconButton, Divider, FormControlLabel, Radio, RadioGroup
} from "@mui/material";
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from "axios";

// Helper to normalize phone (always +91XXXXXXXXXX)
const normalizePhone = (phone) => {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) return '+91' + clean;
  if (clean.length === 12 && clean.startsWith('91')) return '+' + clean;
  if (clean.length === 13 && clean.startsWith('91')) return '+' + clean;
  if (clean.startsWith('0') && clean.length === 11) return '+91' + clean.slice(1);
  return '+91' + clean.slice(-10);
};

const CreateOrderPopup = ({ open, onClose, prefillCustomer = {} }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [shippingCharge, setShippingCharge] = useState();
  const [discount, setDiscount] = useState();
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });

  // Address selection state
  const [allAddresses, setAllAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [paymentLink, setPaymentLink] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);

  // Always set name/phone from prefillCustomer; fetch addresses from Shopify
  useEffect(() => {
    if (!prefillCustomer?.phone) return;
    setCustomer({
      name: prefillCustomer.name || '',
      phone: prefillCustomer.phone || '',
      address: '',
    });
    setAllAddresses([]);
    setSelectedAddressId(null);
    setPaymentLink("");
    setTransactionId("");
    setPaymentMethod("COD");
    const formattedPhone = normalizePhone(prefillCustomer.phone);
    fetchCustomerAddresses(formattedPhone);
    // eslint-disable-next-line
  }, [prefillCustomer?.phone]);

  // Fetch all addresses from Shopify for this customer
  const fetchCustomerAddresses = async (phone) => {
    try {
      const res = await axios.get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/customers?phone=${encodeURIComponent(phone)}`);
      if (res.data && Array.isArray(res.data.addresses)) {
        setAllAddresses(res.data.addresses);
        if (res.data.addresses.length === 1) {
          setSelectedAddressId(res.data.addresses[0].id);
          setCustomer(prev => ({ ...prev, address: res.data.addresses[0].formatted }));
        } else {
          setCustomer(prev => ({ ...prev, address: "" }));
        }
      }
    } catch (error) {
      setAllAddresses([]);
      setCustomer(prev => ({ ...prev, address: "" }));
    }
  };

  // When address selection changes, update
  useEffect(() => {
    if (!selectedAddressId) {
      setCustomer(prev => ({ ...prev, address: "" }));
    } else {
      const found = allAddresses.find(a => a.id === selectedAddressId);
      setCustomer(prev => ({ ...prev, address: found ? found.formatted : "" }));
    }
  }, [selectedAddressId, allAddresses]);

  // Fetch products from Shopify
  useEffect(() => {
    if (open) fetchProducts();
  }, [open]);
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/active-products");
      setProducts(res.data || []);
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  };

  // Cart and selection logic (unchanged)
  const handleVariantToggle = (variantId) => {
    setSelectedVariants(prev => ({
      ...prev,
      [variantId]: !prev[variantId],
    }));
  };

  const handleAdd = () => {
    const selected = [];
    products.forEach(product => {
      product.variants.forEach(variant => {
        if (selectedVariants[variant.id]) {
          selected.push({ ...variant, productTitle: product.title, image: product.image, quantity: 1 });
        }
      });
    });
    setCartItems(selected);
    setCartOpen(true);
  };

  const updateQuantity = (id, delta) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const removeItem = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - (discount || 0) + Number(shippingCharge || 0);

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleNext = () => {
    setCustomerDialogOpen(true);
    setCartOpen(false);
  };

  const handleBackToCart = () => {
    setCustomerDialogOpen(false);
    setCartOpen(true);
  };

  // Payment link handler
  const handleGeneratePaymentLink = async () => {
    setGeneratingPaymentLink(true);
    try {
      // Assume you have this API on your backend!
      const res = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/razorpay/generate-link", {
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        amount: total,
      });
      setPaymentLink(res.data.paymentLink);
    } catch (err) {
      alert("Error generating payment link");
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  const handlePlaceOrder = async () => {
    // Send to backend: name, phone, address, items, paymentMethod, transactionId, etc.
    try {
      await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/place-order", {
        customer,
        cartItems,
        paymentMethod,
        transactionId: paymentMethod === "Prepaid" ? transactionId : undefined,
        shippingCharge,
        discount,
        notes:
          paymentMethod === "Prepaid"
            ? `Prepaid. Transaction ID: ${transactionId || ""}`
            : "COD order.",
      });
      alert("Order placed successfully!");
      onClose();
    } catch (err) {
      alert("Order placement failed.");
    }
  };

  // --- UI render below ---
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Select products
        <IconButton sx={{ float: 'right' }} onClick={() => setCartOpen(true)}>
          <ShoppingCartIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: "70vh" }}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Search products"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>
        {loading ? (
          <CircularProgress />
        ) : (
          filteredProducts.map((product) => (
            <Box key={product.id} sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                {product.image && (
                  <Avatar src={product.image} variant="square" sx={{ width: 40, height: 40 }} />
                )}
                <Typography fontWeight="bold">{product.title}</Typography>
              </Box>
              {product.variants.map((variant) => (
                <Box
                  key={variant.id}
                  onClick={() => handleVariantToggle(variant.id)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 2,
                    py: 1,
                    borderBottom: "1px solid #eee",
                    backgroundColor: selectedVariants[variant.id] ? '#f0f0f0' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <Checkbox
                    checked={!!selectedVariants[variant.id]}
                    onChange={() => handleVariantToggle(variant.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Typography sx={{ flex: 1 }}>{variant.title}</Typography>
                  <Typography sx={{ width: 150, textAlign: "center" }}>
                    {variant.inventory_quantity} available
                  </Typography>
                  <Typography sx={{ width: 100, textAlign: "right" }}>
                    ₹{variant.price} INR
                  </Typography>
                </Box>
              ))}
            </Box>
          ))
        )}
      </DialogContent>
      <DialogActions>
        <Typography sx={{ flexGrow: 1, px: 2 }}>
          {Object.keys(selectedVariants).filter(id => selectedVariants[id]).length} variants selected
        </Typography>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleAdd}>Add</Button> 
      </DialogActions>

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onClose={() => setCartOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Your Cart</DialogTitle>
        <DialogContent dividers>
          {cartItems.map(item => (
            <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {item.image && (
                <Avatar src={item.image} variant="square" sx={{ width: 40, height: 40, mr: 1 }} />
              )}
              <Box sx={{ flexGrow: 1 }}>
                <Typography>{item.productTitle} x{item.quantity}</Typography>
                <Typography variant="body2" color="textSecondary">{item.title}</Typography>
              </Box>
              <Typography>₹{item.price * item.quantity}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mx: 1 }}>
                <Button size="small" onClick={() => updateQuantity(item.id, -1)}>-</Button>
                <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                <Button size="small" onClick={() => updateQuantity(item.id, 1)}>+</Button>
              </Box>
              <IconButton onClick={() => removeItem(item.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}

          <Divider sx={{ my: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Typography>Discount (₹)</Typography>
            <TextField
              fullWidth size="small" type="number"
              value={discount || ''}
              onChange={e => setDiscount(Number(e.target.value))}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography>Shipping Charges (₹)</Typography>
            <TextField
              fullWidth size="small" type="number"
              value={shippingCharge || ''}
              onChange={e => setShippingCharge(Number(e.target.value))}
            />
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography>Sub-Total: ₹{subtotal.toFixed(2)}</Typography>
          <Typography>Tax: ₹0.00</Typography>
          <Typography>Discount: -₹{(discount || 0).toFixed(2)}</Typography>
          <Typography>Shipping: ₹{(Number(shippingCharge) || 0).toFixed(2)}</Typography>
          <Typography fontWeight="bold">Total: ₹{total.toFixed(2)}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCartOpen(false)}>Close</Button>
          <Button variant="contained" onClick={handleNext}>Next</Button>
        </DialogActions>
      </Dialog>

      {/* Customer Info Dialog */}
      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Customer Information</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2">Name</Typography>
          <Typography sx={{ mb: 1 }}>{customer.name || '-'}</Typography>
          <Typography variant="subtitle2">Phone</Typography>
          <Typography sx={{ mb: 1 }}>{customer.phone || '-'}</Typography>
          <Typography variant="subtitle2">Address</Typography>
          {allAddresses.length > 1 && (
            <Box sx={{ mb: 2 }}>
              <RadioGroup
                value={selectedAddressId || ""}
                onChange={e => setSelectedAddressId(Number(e.target.value))}
              >
                {allAddresses.map(addr => (
                  <FormControlLabel
                    key={addr.id}
                    value={addr.id}
                    control={<Radio />}
                    label={addr.formatted}
                  />
                ))}
              </RadioGroup>
            </Box>
          )}
          {allAddresses.length === 1 && (
            <Typography sx={{ whiteSpace: 'pre-line' }}>
              {customer.address || '-'}
            </Typography>
          )}
          {allAddresses.length === 0 && (
            <Typography sx={{ whiteSpace: 'pre-line' }}>
              -
            </Typography>
          )}

          {/* Payment Method */}
          <Typography variant="subtitle2" sx={{ mt: 2 }}>Select Payment Method</Typography>
          <RadioGroup
            row
            value={paymentMethod}
            onChange={e => {
              setPaymentMethod(e.target.value);
              setPaymentLink("");
              setTransactionId("");
            }}
          >
            <FormControlLabel value="Prepaid" control={<Radio />} label="Prepaid" />
            <FormControlLabel value="COD" control={<Radio />} label="Cash on Delivery (COD)" />
          </RadioGroup>

          {/* Prepaid UI */}
          {paymentMethod === "Prepaid" && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleGeneratePaymentLink}
                disabled={generatingPaymentLink || !!paymentLink || !customer.address}
              >
                {generatingPaymentLink
                  ? "Generating..."
                  : paymentLink
                  ? "Payment Link Generated"
                  : "Generate Payment Link"}
              </Button>
              {paymentLink && (
                <Box sx={{ mt: 1 }}>
                  <TextField
                    fullWidth
                    value={paymentLink}
                    InputProps={{ readOnly: true }}
                    sx={{ mb: 1 }}
                  />
                  <Button onClick={() => navigator.clipboard.writeText(paymentLink)} sx={{ mb: 2 }}>
                    Copy Payment Link
                  </Button>
                  <TextField
                    fullWidth
                    label="Enter Transaction ID"
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    sx={{ mt: 2 }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBackToCart}>Back</Button>
          <Button
            variant="contained"
            onClick={handlePlaceOrder}
            disabled={
              !customer.address ||
              (paymentMethod === "Prepaid" && (!paymentLink || !transactionId))
            }
          >
            Place Order
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default CreateOrderPopup;
