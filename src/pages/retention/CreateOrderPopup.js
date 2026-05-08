import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, CircularProgress, Avatar, Checkbox,
  TextField, IconButton, Divider, FormControlLabel, Radio, RadioGroup,
  Paper, Collapse, Chip
} from "@mui/material";
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import OrderDetailsPopup from "../../ShopifyOrders/OrderDetailsPopup";
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PlaceIcon from "@mui/icons-material/Place";
import PersonIcon from "@mui/icons-material/Person";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import PaymentIcon from "@mui/icons-material/Payment";
import axios from "axios";

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
  const [expanded, setExpanded] = useState({}); // productId -> boolean
  const [loading, setLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [shippingCharge, setShippingCharge] = useState();
  const [discount, setDiscount] = useState();
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [discountType, setDiscountType] = useState("amount");
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Address selection state
  const [allAddresses, setAllAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [partialPayment, setPartialPayment] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);

  // Post-order note dialog
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [latestOrderId, setLatestOrderId] = useState(null);

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
    setPartialPayment("");
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
      setCustomer(prev => ({
        ...prev,
        customerId: res.data.id,
      }));
      if (res.data && Array.isArray(res.data.addresses)) {
        setAllAddresses(res.data.addresses);
        if (res.data.addresses.length === 1) {
          setSelectedAddressId(res.data.addresses[0].id);
          setCustomer(prev => ({ ...prev, address: res.data.addresses[0] }));
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
      setCustomer(prev => ({ ...prev, address: found ? found : "" }));
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
      // initialize collapsed state
      const init = {};
      (res.data || []).forEach(p => { init[p.id] = false; });
      setExpanded(init);
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  };

  // Cart and selection logic
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
  const discountAmount =
    discountType === "percentage"
      ? (subtotal * (discount || 0)) / 100
      : (discount || 0);

  const total = subtotal - discountAmount + Number(shippingCharge || 0);

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
    const requestedAmount =
      paymentMethod === "Partial Paid"
        ? Number(partialPayment || 0)
        : Number(total || 0);

    if (paymentMethod === "Partial Paid" && requestedAmount <= 0) {
      alert("Enter a valid partial payment amount.");
      return;
    }

    setGeneratingPaymentLink(true);
    try {
      const res = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/razorpay/generate-link", {
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address.formatted || customer.address,
        amount: requestedAmount,
      });
      setPaymentLink(res.data.paymentLink);
    } catch (err) {
      alert("Error generating payment link");
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  // Place Order Handler (no notes, always enabled after address select)
  const handlePlaceOrder = async () => {
    const partialAmount = Number(partialPayment || 0);
    const payableTotal = Number(total || 0);

    if (paymentMethod === "Prepaid" && !String(transactionId || "").trim()) {
      alert("Transaction ID is required for prepaid orders.");
      return;
    }

    if (paymentMethod === "Partial Paid") {
      if (!(partialAmount > 0)) {
        alert("Enter a valid partial payment amount.");
        return;
      }
      if (partialAmount >= payableTotal) {
        alert("Partial payment must be less than the total order amount.");
        return;
      }
      if (!String(transactionId || "").trim()) {
        alert("Transaction ID is required for partial payment orders.");
        return;
      }
    }

    try {
      const payload = {
        customer,
        cartItems,
        paymentMethod,
        transactionId:
          paymentMethod === "Prepaid" || paymentMethod === "Partial Paid"
            ? transactionId
            : undefined,
        partialPaidAmount: paymentMethod === "Partial Paid" ? partialAmount : 0,
        orderTotal: payableTotal,
        shippingCharge,
        discount,
        discountType,
      };

      const res = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/place-order", payload);
      const newOrderId = res.data?.shopifyOrder?.id;

      setLatestOrderId(newOrderId || null);
      setShowNoteDialog(true); // open note dialog after placing the order
    } catch (err) {
      alert("Order placement failed.");
    }
  };

  const handleAddNote = async () => {
    if (!latestOrderId || !noteText) return;
    try {
      await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/add-note", {
        orderId: latestOrderId,
        note: noteText,
      });
      // keep existing dialogs open; just show the details popup on top
      setShowNoteDialog(false);
      setShowOrderDetails(true);
      setNoteText("");
    } catch (err) {
      alert("Failed to add note.");
    }
  };

  const getLoggedInAgentName = () => {
    try {
      const u = JSON.parse(sessionStorage.getItem("user")) || {};
      return (
        u.fullName ||
        u.name ||
        (u.email ? u.email.split("@")[0] : "") ||
        "N/A"
      );
    } catch {
      return "N/A";
    }
  };
  const agentFullName = getLoggedInAgentName();

  const toggleExpand = (productId) => {
    setExpanded(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth disableEnforceFocus={showOrderDetails}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Create Order
          <IconButton
            sx={{ float: 'right', ml: 1 }}
            onClick={() => setCartOpen(true)} 
            aria-label="open cart"
          >
            <ShoppingCartIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          {/* Sticky search bar */}
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 2,
              backgroundColor: "background.paper",
              borderBottom: "1px solid",
              borderColor: "divider",
              p: 2
            }}
          >
            <TextField
              fullWidth
              placeholder="Search products..."
              variant="outlined"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Box>

          <Box sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              filteredProducts.map((product) => {
                const isExpanded = !!expanded[product.id];
                const selectedCount = (product.variants || []).reduce(
                  (acc, v) => acc + (selectedVariants[v.id] ? 1 : 0),
                  0
                );

                return (
                  <Paper
                    key={product.id}
                    variant="outlined"
                    sx={{
                      mb: 1.5,
                      borderRadius: 2,
                      overflow: "hidden",
                      borderColor: "divider",
                      backgroundColor: "#fff",
                    }}
                  >
                    {/* Product Header Row */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        px: 2,
                        py: 1.25,
                        cursor: "pointer",
                        "&:hover": { backgroundColor: "#fafafa" },
                      }}
                      onClick={() => toggleExpand(product.id)}
                    >
                      {product.image && (
                        <Avatar
                          src={product.image}
                          variant="square"
                          sx={{ width: 44, height: 44, borderRadius: 1 }}
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 600 }}>
                          {product.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          {product.variants?.length || 0} variant(s)
                          {selectedCount > 0 ? ` • ${selectedCount} selected` : ""}
                        </Typography>
                      </Box>

                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleExpand(product.id); }}>
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>

                    {/* Variants (TWO PER ROW) */}
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Divider />
                      <Box
                        sx={{
                          p: 1.25,
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, // 1 per row on xs, 2 per row on sm+
                          gap: 1.25
                        }}
                      >
                        {(product.variants || []).map((variant) => {
                          const checked = !!selectedVariants[variant.id];
                          return (
                            <Box
                              key={variant.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleVariantToggle(variant.id)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleVariantToggle(variant.id); }}
                              sx={{
                                border: "1px solid",
                                borderColor: checked ? "primary.main" : "divider",
                                borderRadius: 1.5,
                                p: 1.25,
                                cursor: "pointer",
                                bgcolor: checked ? "action.selected" : "background.paper",
                                transition: "background-color .15s ease, border-color .15s ease",
                                "&:hover": { backgroundColor: "action.hover" },
                                display: "grid",
                                gridTemplateRows: "auto auto",
                                alignItems: "start",
                                minHeight: 84
                              }}
                            >
                              {/* Top row: checkbox + title */}
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Checkbox
                                  checked={checked}
                                  tabIndex={-1}
                                  disableRipple
                                  sx={{ pointerEvents: "none", p: 0, mr: 0.5 }}
                                />
                                <Typography sx={{ fontWeight: 600 }} noWrap>
                                  {variant.title}
                                </Typography>
                              </Box>

                              {/* Bottom row: availability + price */}
                              <Box sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                mt: 0.75
                              }}>
                                <Typography variant="caption" color="text.secondary">
                                  {variant.inventory_quantity} available
                                </Typography>
                                <Typography sx={{ fontWeight: 700 }}>
                                  ₹{variant.price} INR
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Collapse>
                  </Paper>
                );
              })
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ flexGrow: 1, px: 1 }}>
            {Object.keys(selectedVariants).filter(id => selectedVariants[id]).length} variants selected
          </Typography>
          <Button onClick={onClose}>Close</Button>
          <Button variant="contained" onClick={handleAdd}>Add to Cart</Button>
        </DialogActions>

        {/* Cart Dialog */}
        <Dialog open={cartOpen} onClose={() => setCartOpen(false)} maxWidth="sm" fullWidth disableEnforceFocus={showOrderDetails}>
          <DialogTitle sx={{ fontWeight: 700 }}>Your Cart</DialogTitle>
          <DialogContent dividers>
            {cartItems.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                Your cart is empty.
              </Typography> 
            )}

            {cartItems.map(item => (
              <Paper key={item.id} variant="outlined" sx={{ p: 1.25, mb: 1.25, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {item.image && (
                    <Avatar src={item.image} variant="square" sx={{ width: 44, height: 44 }} />
                  )}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 600 }}>
                      {item.productTitle} <Box component="span" sx={{ fontWeight: 400 }}>({item.title})</Box>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ₹{item.price} each
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button size="small" onClick={() => updateQuantity(item.id, -1)}>-</Button>
                    <Typography sx={{ minWidth: 16, textAlign: "center" }}>{item.quantity}</Typography>
                    <Button size="small" onClick={() => updateQuantity(item.id, 1)}>+</Button>
                  </Box>

                  <Typography sx={{ width: 90, textAlign: "right", fontWeight: 600 }}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </Typography>

                  <IconButton onClick={() => removeItem(item.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            ))}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Discount</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  select
                  size="small"
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value)}
                  SelectProps={{ native: true }}
                  sx={{ width: 240 }}
                >
                  <option value="amount">Amount (₹)</option>
                  <option value="percentage">Percentage (%)</option>
                </TextField>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={discountType === "percentage" ? "Discount %" : "Discount ₹"}
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Shipping Charges (₹)</Typography>
              <TextField
                fullWidth size="small" type="number"
                value={shippingCharge || ''}
                onChange={e => setShippingCharge(Number(e.target.value))}
              />
            </Box>

            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 0.5 }}>
              <Typography>Sub-Total</Typography>
              <Typography sx={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</Typography>
              <Typography>Tax</Typography>
              <Typography sx={{ fontWeight: 600 }}>₹0.00</Typography>
              <Typography>Discount</Typography>
              <Typography sx={{ fontWeight: 600 }}>
                -₹{discountAmount.toFixed(2)} ({discountType === "percentage" ? `${discount || 0}%` : `₹${discount || 0}`})
              </Typography>
              <Typography>Shipping</Typography>
              <Typography sx={{ fontWeight: 600 }}>₹{(Number(shippingCharge) || 0).toFixed(2)}</Typography>
              <Divider sx={{ gridColumn: "1 / -1", my: 0.5 }} />
              <Typography sx={{ fontWeight: 700 }}>Total</Typography>
              <Typography sx={{ fontWeight: 700 }}>₹{total.toFixed(2)}</Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCartOpen(false)}>Close</Button>
            <Button variant="contained" onClick={handleNext}>Next</Button>
          </DialogActions>
        </Dialog>

        {/* Customer Info Dialog (REDESIGNED) */}
        <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="sm" fullWidth disableEnforceFocus={showOrderDetails}>
          <DialogTitle sx={{ fontWeight: 700 }}>Customer Information</DialogTitle>
          <DialogContent dividers>
            {/* Customer summary */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1.5, rowGap: 1 }}>
                <PersonIcon fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Name</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{customer.name || '-'}</Typography> 
                </Box>

                <LocalPhoneIcon fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography>{customer.phone || '-'}</Typography>
                </Box>
              </Box>
            </Paper>

            {/* Addresses */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <PlaceIcon fontSize="small" />
                <Typography sx={{ fontWeight: 600 }}>Shipping Address</Typography>
                {allAddresses?.length > 0 && (
                  <Chip size="small" label={`${allAddresses.length} saved`} />
                )}
              </Box>

              {allAddresses.length > 1 && (
                <Box sx={{ display: "grid", gap: 1, maxHeight: 200, overflowY: "auto" }}>
                  {allAddresses.map(addr => (
                    <Paper
                      key={addr.id}
                      variant="outlined"
                      onClick={() => setSelectedAddressId(addr.id)}
                      sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        cursor: "pointer",
                        borderColor: selectedAddressId === addr.id ? "primary.main" : "divider",
                        bgcolor: selectedAddressId === addr.id ? "action.selected" : "transparent"
                      }}
                    >
                      <FormControlLabel
                        value={addr.id}
                        control={<Radio checked={selectedAddressId === addr.id} />}
                        label={
                          <Typography sx={{ whiteSpace: "pre-line" }}>
                            {addr.formatted}
                          </Typography>
                        }
                        onChange={() => setSelectedAddressId(addr.id)}
                      />
                    </Paper>
                  ))}
                </Box>
              )}

              {allAddresses.length === 1 && (
                <Typography sx={{ whiteSpace: 'pre-line' }}>
                  {customer.address.formatted || '-'}
                </Typography>
              )}

              {allAddresses.length === 0 && (
                <Typography color="text.secondary">No saved addresses.</Typography>
              )}
            </Paper>

            {/* Payment */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <PaymentIcon fontSize="small" />
                <Typography sx={{ fontWeight: 600 }}>Payment</Typography>
              </Box>

              <RadioGroup
                row
                value={paymentMethod}
                onChange={e => {
                  setPaymentMethod(e.target.value);
                  setPartialPayment("");
                  setPaymentLink("");
                  setTransactionId("");
                }}
              >
                <FormControlLabel value="Prepaid" control={<Radio />} label="Prepaid" />
                <FormControlLabel value="COD" control={<Radio />} label="Cash on Delivery (COD)" />
                <FormControlLabel value="Partial Paid" control={<Radio />} label="Partial Paid" />
              </RadioGroup>

              {(paymentMethod === "Prepaid" || paymentMethod === "Partial Paid") && (
                <Box sx={{ mt: 1 }}>
                  {paymentMethod === "Partial Paid" && (
                    <TextField
                      fullWidth
                      label="Partial Payment Amount"
                      size="small"
                      type="number"
                      value={partialPayment}
                      onChange={e => {
                        setPartialPayment(e.target.value);
                        setPaymentLink("");
                        setTransactionId("");
                      }}
                      sx={{ mb: 1 }}
                      helperText={`Remaining COD: ₹${Math.max(0, Number(total || 0) - Number(partialPayment || 0)).toFixed(2)}`}
                    />
                  )}

                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      variant="outlined"
                      onClick={handleGeneratePaymentLink}
                      disabled={
                        generatingPaymentLink ||
                        !!paymentLink ||
                        !customer.address ||
                        (paymentMethod === "Partial Paid" &&
                          (!(Number(partialPayment || 0) > 0) || Number(partialPayment || 0) >= Number(total || 0)))
                      }
                    >
                      {generatingPaymentLink
                        ? "Generating..."
                        : paymentLink
                          ? "Payment Link Generated"
                          : "Generate Payment Link"}
                    </Button>
                    {!!paymentLink && (
                      <Button onClick={() => navigator.clipboard.writeText(paymentLink)}>
                        Copy Payment Link
                      </Button>
                    )}
                  </Box>

                  {!!paymentLink && (
                    <Box sx={{ mt: 1 }}>
                      <TextField
                        fullWidth
                        value={paymentLink}
                        InputProps={{ readOnly: true }}
                        label="Payment Link"
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        fullWidth
                        label="Transaction ID"
                        size="small"
                        value={transactionId}
                        onChange={e => setTransactionId(e.target.value)}
                      />
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleBackToCart}>Back</Button>
            <Button
              variant="contained"
              onClick={handlePlaceOrder}
              disabled={!customer.address}
            >
              Place Order
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onClose={() => setShowNoteDialog(false)} disableEnforceFocus={showOrderDetails}>
        <DialogTitle>Add Note to Order?</DialogTitle> 
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Order Note"
            type="text"
            fullWidth
            value={noteText} 
            onChange={e => setNoteText(e.target.value)}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNoteDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddNote} disabled={!noteText}>
            Add Note
          </Button>
        </DialogActions>
      </Dialog>

      {showOrderDetails && latestOrderId && (
        <OrderDetailsPopup
          orderId={latestOrderId}
          agentName={agentFullName}
          discount={discount || 0}
          discountType={discountType}
          paymentMethod={paymentMethod}
          upsellAmount={undefined}
          transactionId={transactionId}
          onClose={() => setShowOrderDetails(false)}
        />
      )}
    </>
  );
};

export default CreateOrderPopup;
