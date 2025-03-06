import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Button,
  Divider,
  TextField,
  Typography,
  MenuItem,
  Select,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  createTheme,
  ThemeProvider,
  useMediaQuery,
  InputAdornment,
} from "@mui/material";
import { motion } from "framer-motion";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";

import {
  addToCart,
  removeFromCart,
  setSelection,
  setDiscountModalOpen,
  setDiscountType,
  setDiscountValue,
  setAppliedDiscount,
  setShippingInput,
  setShippingCost,
  setPhoneNumber,
  setAddresses,
  setAddressCategory,
  setSelectedAddressIndex,
  setNewAddress,
  setConfirmedAddress,
  setAddressConfirmed,
  setPaymentMethod,
  setRazorpayLink,
  setTransactionId,
  setCustomerName,
  setCustomerId,
  setBillingSameAsShipping,
} from "../features/cart/cartSlice";

// List of Indian states/UTs for the dropdown
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

// Custom theme with a consistent color palette and typography
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2", // Modern blue
    },
    secondary: {
      main: "#f50057",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: 14, // Suitable for a 14-inch laptop
    h6: {
      fontWeight: 600,
      fontSize: "1rem", // slightly smaller for ordering section items
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: "0.8rem",
    },
  },
});

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const CartDrawer = ({ closeDrawer }) => {
  const dispatch = useDispatch();
  const [activeSection, setActiveSection] = useState("ordering");
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);

  const {
    cart,
    selection,
    discountModalOpen,
    discountType,
    discountValue,
    appliedDiscount,
    shippingInput,
    shippingCost,
    phoneNumber,
    addresses,
    addressCategory,
    selectedAddressIndex,
    newAddress,
    confirmedAddress,
    addressConfirmed,
    paymentMethod,
    razorpayLink,
    transactionId,
    customerName,
    customerId,
    billingSameAsShipping,
  } = useSelector((state) => state.cart);

  // Responsive design hook
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Fetch products on mount
  useEffect(() => {
    async function fetchProducts() { 
      try {
        const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/products");
        setProducts(response.data);
        setFilteredProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    }
    fetchProducts();
  }, []);

  // Filter products when searchQuery changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const matched = products.filter((p) =>
        p.title.toLowerCase().includes(lowerQuery)
      );
      setFilteredProducts(matched);
    }
  }, [searchQuery, products]);

  // ORDERING SECTION HANDLERS
  const handleVariantChange = (productId, variantId) => {
    dispatch(setSelection({ [productId]: { ...(selection[productId] || {}), variantId } }));
  };

  const handleQuantityChange = (productId, quantity) => {
    dispatch(setSelection({ [productId]: { ...(selection[productId] || {}), quantity } }));
  };

  const handleAddToCart = (product) => {
    const { variantId, quantity } = selection[product.id] || {};
    // Use 0 as default if not selected
    const qty = (quantity !== undefined ? quantity : 0);
    if (qty === 0) {
      alert("Please select a quantity greater than 0.");
      return;
    }
    const selectedVariant =
      product.variants.find((v) => v.id === variantId) || product.variants[0];
    dispatch(addToCart({ product, variant: selectedVariant, quantity: qty }));
  };

  const handleNext = () => {
    setActiveSection("cart");
  };

  // CART CALCULATIONS
  const calculateSubTotal = () =>
    cart.reduce((total, item) => total + item.variant.price * item.quantity, 0);

  const subTotal = calculateSubTotal();
  const finalTotal = subTotal + shippingCost - appliedDiscount;

  // DISCOUNT LOGIC
  const handleOpenDiscountModal = () => dispatch(setDiscountModalOpen(true));
  const handleCloseDiscountModal = () => {
    dispatch(setDiscountModalOpen(false));
    dispatch(setDiscountType(""));
    dispatch(setDiscountValue(""));
  };

  const handleApplyDiscount = () => {
    const numericValue = parseFloat(discountValue);
    if (isNaN(numericValue) || numericValue < 0) {
      alert("Please enter a valid positive number for discount.");
      return;
    }
    let discountAmount = 0;
    if (discountType === "amount") {
      discountAmount = numericValue;
    } else if (discountType === "percentage") {
      discountAmount = (subTotal * numericValue) / 100;
    }
    dispatch(setAppliedDiscount(discountAmount));
    dispatch(setDiscountModalOpen(false));
  };

  // SHIPPING LOGIC
  const handleApplyShipping = () => {
    const numericValue = parseFloat(shippingInput);
    if (isNaN(numericValue) || numericValue < 0) {
      alert("Please enter a valid positive shipping amount.");
      return;
    }
    dispatch(setShippingCost(numericValue));
  };

  // PHONE CHECK & ADDRESSES (PAYMENT SECTION)
  const handleCheckPhone = async () => {
    try {
      // Fetch previous orders (addresses)
      const ordersRes = await axios.get(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/customer-orders?phone=${phoneNumber}`
      );
      const fetchedAddresses = ordersRes.data.addresses || [];
      dispatch(setAddresses(fetchedAddresses));
      if (fetchedAddresses.length === 0) {
        dispatch(setAddressCategory("new"));
      } else {
        dispatch(setAddressCategory("existing"));
        dispatch(setSelectedAddressIndex(0));
      }
      // Check for existing customer by phone
      const customerRes = await axios.get(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/customer?phone=${phoneNumber}`
      );
      const customerData = customerRes.data;
      if (customerData && customerData.id && customerData.first_name) {
        dispatch(setCustomerId(customerData.id));
        dispatch(
          setCustomerName(
            `${customerData.first_name} ${customerData.last_name || ""}`.trim()
          )
        );
      } else {
        dispatch(setCustomerId(""));
        dispatch(setCustomerName(""));
      }
    } catch (err) {
      console.error("Error checking phone:", err);
    }
  };

  const handleSelectAddress = (index) => {
    dispatch(setSelectedAddressIndex(index));
  };

  // Update new address form fields
  const handleNewAddressChange = (field, value) => {
    dispatch(setNewAddress({ [field]: value }));
  };

  // Copy address logic
  const handleCopyAddress = () => {
    let addressString = "";
    if (addressCategory === "existing" && selectedAddressIndex !== null) {
      const addr = addresses[selectedAddressIndex];
      addressString = `${addr.fullName}, ${addr.address1}, ${addr.address2}, ${addr.city}, ${addr.state}, ${addr.country}, ${addr.pincode}`;
    } else {
      addressString = `${newAddress.fullName}, ${newAddress.address1}, ${newAddress.address2}, ${newAddress.city}, ${newAddress.state}, ${newAddress.country}, ${newAddress.pincode}`;
    }
    navigator.clipboard.writeText(addressString);
    alert("Address copied to clipboard!");
  };

  // Confirm address => store it + show Payment Method
  const handleConfirmAddress = () => {
    let finalAddr = null;
    if (addressCategory === "existing" && selectedAddressIndex !== null) {
      finalAddr = addresses[selectedAddressIndex];
    } else {
      finalAddr = { ...newAddress };
    }
    dispatch(setConfirmedAddress(finalAddr));
    dispatch(setAddressConfirmed(true));
  };

  // Payment Method & Order Creation
  const handleGeneratePaymentLink = async () => {
    try {
      const amountToCharge = parseFloat(finalTotal.toFixed(2));
      const response = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/razorpay/create-payment-link",
        {
          amount: amountToCharge,
          currency: "INR",
          customer: {
            name: confirmedAddress?.fullName || "Customer Name",
            email: confirmedAddress?.email || "customer@example.com",
            contact: phoneNumber || "1234567890",
          },
        }
      );
      dispatch(setRazorpayLink(response.data.paymentLink));
    } catch (error) {
      console.error("Error generating payment link:", error);
    }
  };

  const handleCreateOrder = async () => {
    // Create shipping and billing address objects including province field
    const shippingAddress = {
      firstName: confirmedAddress?.fullName?.split(" ")[0] || "",
      lastName: confirmedAddress?.fullName?.split(" ")[1] || "",
      address1: confirmedAddress?.address1 || "",
      city: confirmedAddress?.city || "",
      province: confirmedAddress?.state || "", // new field: province
      country: confirmedAddress?.country || "India",
      zip: confirmedAddress?.pincode || "",
    };

    const billingAddress = billingSameAsShipping
      ? { ...shippingAddress }
      : {
          firstName: confirmedAddress?.fullName?.split(" ")[0] || "",
          lastName: confirmedAddress?.fullName?.split(" ")[1] || "",
          address1: confirmedAddress?.address1 || "",
          city: confirmedAddress?.city || "",
          province: confirmedAddress?.state || "", // new field: province
          country: confirmedAddress?.country || "India",
          zip: confirmedAddress?.pincode || "",
        };

    const paymentStatus = paymentMethod === "Prepaid" ? "paid" : "COD";
    const orderData = {
      cartItems: cart.map((item) => ({
        variantId: item.variant.id,
        quantity: item.quantity,
      })),
      shippingAddress,
      billingAddress,
      paymentStatus,
      transactionId: transactionId || "",
      customerId: customerId,
      shippingCost: shippingCost,
      appliedDiscount: appliedDiscount,
    };

    try {
      await axios.post("http://localhost:5000/api/shopify/create-order", orderData);
      alert("Order placed successfully!");
    } catch (error) {
      console.error("Error placing order:", error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: isMobile ? "100%" : 350, p: 2, backgroundColor: "background.paper" }}>
        {/* Section Tabs with active state highlighting */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          {["ordering", "cart", "payment"].map((section) => (
            <Button
              key={section}
              variant={activeSection === section ? "contained" : "text"}
              color="primary"
              onClick={() => setActiveSection(section)}
              sx={{ textTransform: "capitalize", flex: 1, mx: 0.5 }}
            >
              {section}
            </Button>
          ))}
        </Box>
        <Divider sx={{ my: 2 }} />
 
        {activeSection === "ordering" && (
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5 }}
          >
            <Box>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search product by SKU"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": { paddingRight: 0 },
                  }}
                />
              </Box>
              {filteredProducts.map((product) => {
                const defaultVariantId = product.variants[0]?.id || "";
                const currentSelection = selection[product.id] || {};
                const currentVariantId = currentSelection.variantId || defaultVariantId;
                // Set default quantity to 0 if not defined
                const currentQuantity =
                  currentSelection.quantity !== undefined ? currentSelection.quantity : 0;
                const selectedVariant =
                  product.variants.find((v) => v.id === currentVariantId) ||
                  product.variants[0];
                return (
                  <motion.div
                    key={product.id}
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <Card
                      sx={{
                        mb: 2,
                        transition: "transform 0.3s",
                        "&:hover": { transform: "scale(1.02)" },
                        padding: 1,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <CardMedia
                          component="img"
                          sx={{ width: 80, height: 80, objectFit: "contain", m: 1 }}
                          image={product.image?.src}
                          alt={product.title}
                        />
                        <CardContent sx={{ p: 1, flex: 1 }}>
                          <Typography variant="h6" sx={{ fontSize: "0.9rem" }}>
                            {product.title}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                            <Typography variant="subtitle2" sx={{ mr: 1 }}>
                              Size:
                            </Typography>
                            <Select
                              size="small"
                              value={currentVariantId}
                              onChange={(e) => handleVariantChange(product.id, e.target.value)}
                              sx={{ minWidth: 100 }}
                            >
                              {product.variants.map((variant) => (
                                <MenuItem key={variant.id} value={variant.id}>
                                  {variant.title}
                                </MenuItem>
                              ))}
                            </Select>
                          </Box>
                          <Typography variant="h6" sx={{ mt: 1 }}>
                            ₹{selectedVariant.price}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                            <Typography sx={{ mr: 1 }}>Qty:</Typography>
                            <Select
                              size="small"
                              value={currentQuantity}
                              onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                            >
                              {Array.from({ length: 11 }, (_, i) => i).map((num) => (
                                <MenuItem key={num} value={num}>
                                  {num}
                                </MenuItem>
                              ))}
                            </Select>
                          </Box>
                        </CardContent>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          p: 2,
                          backgroundColor: "#f9f9f9",
                        }}
                      >
                        <Typography variant="subtitle2">
                          {currentQuantity} item selected
                        </Typography>
                        <Box>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddShoppingCartIcon />}
                            onClick={() => handleAddToCart(product)}
                            sx={{ mr: 1 }}
                          >
                            Add
                          </Button>
                          <IconButton color="primary" onClick={handleNext}>
                            <ArrowForwardIosIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </Card>
                  </motion.div>
                );
              })}
            </Box>
          </motion.div>
        )}

        {/* CART SECTION */}
        {activeSection === "cart" && (
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5 }}
          >
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Your Cart
              </Typography>
              {cart.map((item, idx) => (
                <Box key={idx} sx={{ my: 1, borderBottom: "1px solid #ccc" }}>
                  <Typography>{item.product.title}</Typography>
                  <Typography variant="caption">
                    {item.variant.title} - ₹{item.variant.price} x {item.quantity}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => dispatch(removeFromCart(idx))}
                  >
                    Remove
                  </Button>
                </Box>
              ))}
              <Divider sx={{ my: 2 }} />
              <Button
                variant="contained"
                onClick={handleOpenDiscountModal}
                sx={{ mb: 2 }}
              >
                Apply Discount
              </Button>
              <Dialog open={discountModalOpen} onClose={handleCloseDiscountModal}>
                <DialogTitle>Add Discount</DialogTitle>
                <DialogContent>
                  <Box mb={2}>
                    <Typography variant="subtitle2">Discount Type</Typography>
                    <Select
                      value={discountType}
                      onChange={(e) => dispatch(setDiscountType(e.target.value))}
                      fullWidth
                    >
                      <MenuItem value="">Select Discount Type</MenuItem>
                      <MenuItem value="amount">Amount</MenuItem>
                      <MenuItem value="percentage">Percentage</MenuItem>
                    </Select>
                  </Box>
                  {discountType && (
                    <TextField
                      label={discountType === "amount" ? "Discount Value" : "Discount Percentage"}
                      type="number"
                      fullWidth
                      value={discountValue}
                      onChange={(e) => dispatch(setDiscountValue(e.target.value))}
                    />
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseDiscountModal}>Cancel</Button>
                  <Button variant="contained" onClick={handleApplyDiscount}>
                    Apply
                  </Button>
                </DialogActions>
              </Dialog>
              <Typography>Shipping Charges (₹0 - ₹4000)</Typography>
              <Box display="flex" alignItems="center" mt={1} mb={2}>
                <TextField
                  label="Shipping"
                  type="number"
                  value={shippingInput}
                  onChange={(e) => dispatch(setShippingInput(e.target.value))}
                  sx={{ mr: 1 }}
                />
                <Button variant="contained" onClick={handleApplyShipping}>
                  Apply
                </Button>
              </Box>
              <Typography>Sub-Total: ₹{subTotal.toFixed(2)}</Typography>
              <Typography>Tax: ₹0.00</Typography>
              <Typography>
                Discount: -₹{appliedDiscount > 0 ? appliedDiscount.toFixed(2) : 0}
              </Typography>
              <Typography>Shipping: ₹{shippingCost.toFixed(2)}</Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>
                Total: ₹{finalTotal < 0 ? 0 : finalTotal.toFixed(2)}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
                onClick={() => setActiveSection("payment")}
              >
                Next
              </Button>
            </Box>
          </motion.div>
        )}
 
        {activeSection === "payment" && (
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5 }}
          >
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Payment Options
              </Typography>
              <Box sx={{ display: "flex", mb: 2 }}>
                <TextField
                  label="Enter Mobile Number"
                  variant="outlined"
                  value={phoneNumber}
                  onChange={(e) => dispatch(setPhoneNumber(e.target.value))}
                  sx={{ mr: 1 }}
                />
                <Button variant="contained" onClick={handleCheckPhone}>
                  Check
                </Button>
              </Box>
              {customerId && customerName && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    label="Customer Name"
                    fullWidth
                    value={customerName}
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    label="Customer ID"
                    fullWidth
                    value={customerId}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Box>
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={billingSameAsShipping}
                    onChange={(e) =>
                      dispatch(setBillingSameAsShipping(e.target.checked))
                    }
                  />
                }
                label="Billing address is same as shipping address"
              />
              {addresses.length > 0 ? (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    Select address category *
                  </Typography>
                  <Select
                    value={addressCategory}
                    onChange={(e) =>
                      dispatch(setAddressCategory(e.target.value))
                    }
                    fullWidth
                  >
                    <MenuItem value="existing">Existing address</MenuItem>
                    <MenuItem value="new">Add new address</MenuItem>
                  </Select>
                </Box>
              ) : (
                <Typography sx={{ mb: 1 }}>
                  No previous orders found. Please add a new address.
                </Typography>
              )}
              {addressCategory === "existing" && addresses.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  {addresses.map((addr, index) => (
                    <Box key={index} sx={{ border: "1px solid #ccc", p: 1, mb: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedAddressIndex === index}
                            onChange={() => handleSelectAddress(index)}
                          />
                        }
                        label={`${addr.fullName} (${addr.phone})\n${addr.address1}, ${addr.address2}, ${addr.city}, ${addr.state}, ${addr.country}, ${addr.pincode}`}
                      />
                    </Box>
                  ))}
                </Box>
              )}
              {addressCategory === "new" && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    label="Full Name"
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                    value={newAddress.fullName}
                    onChange={(e) =>
                      handleNewAddressChange("fullName", e.target.value)
                    }
                  />
                  <TextField
                    label="Phone"
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                    value={newAddress.phone}
                    onChange={(e) =>
                      handleNewAddressChange("phone", e.target.value)
                    }
                  />
                  <TextField
                    label="Email"
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                    value={newAddress.email}
                    onChange={(e) =>
                      handleNewAddressChange("email", e.target.value)
                    }
                  />
                  <TextField
                    label="Address 1"
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                    value={newAddress.address1}
                    onChange={(e) =>
                      handleNewAddressChange("address1", e.target.value)
                    }
                  />
                  <TextField
                    label="Address 2"
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                    value={newAddress.address2}
                    onChange={(e) =>
                      handleNewAddressChange("address2", e.target.value)
                    }
                  />
                  <TextField
                    label="City"
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                    value={newAddress.city}
                    onChange={(e) =>
                      handleNewAddressChange("city", e.target.value)
                    }
                  />
                  <Select
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                    value={newAddress.state}
                    onChange={(e) =>
                      handleNewAddressChange("state", e.target.value)
                    }
                  >
                    <MenuItem value="">Select State/UT</MenuItem>
                    {INDIAN_STATES.map((st) => (
                      <MenuItem key={st} value={st}>
                        {st}
                      </MenuItem>
                    ))}
                  </Select>
                  <TextField
                    label="Pincode"
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                    value={newAddress.pincode}
                    onChange={(e) =>
                      handleNewAddressChange("pincode", e.target.value)
                    }
                  />
                  <TextField
                    label="Country"
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                    value={newAddress.country}
                    onChange={(e) =>
                      handleNewAddressChange("country", e.target.value)
                    }
                  />
                </Box>
              )}
              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <Button variant="outlined" onClick={handleCopyAddress}>
                  Copy Address
                </Button>
                <Button
                  variant="contained"
                  onClick={handleConfirmAddress}
                  disabled={addressConfirmed}
                >
                  {addressConfirmed ? "Confirmed" : "Confirm Address"}
                </Button>
              </Box>
              {addressConfirmed && (
                <Box
                  sx={{
                    border: "1px solid #ccc",
                    p: 2,
                    borderRadius: 2,
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Select Payment Method
                  </Typography>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => dispatch(setPaymentMethod(e.target.value))}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    <MenuItem value="">Choose Method</MenuItem>
                    <MenuItem value="COD">COD</MenuItem>
                    <MenuItem value="Prepaid">Prepaid</MenuItem>
                  </Select>
                  {paymentMethod === "Prepaid" && (
                    <>
                      <Button
                        variant="contained"
                        onClick={handleGeneratePaymentLink}
                        sx={{ mb: 2 }}
                      >
                        Generate Payment Link
                      </Button>
                      {razorpayLink && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            Payment Link:
                          </Typography>
                          <Button
                            variant="outlined"
                            onClick={() =>
                              navigator.clipboard.writeText(razorpayLink)
                            }
                          >
                            Copy Link
                          </Button>
                        </Box>
                      )}
                      <TextField
                        label="Enter Transaction ID"
                        variant="outlined"
                        fullWidth
                        value={transactionId}
                        onChange={(e) =>
                          dispatch(setTransactionId(e.target.value))
                        }
                        sx={{ mb: 2 }}
                      />
                    </>
                  )}
                  {paymentMethod && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleCreateOrder}
                      disabled={paymentMethod === "Prepaid" && transactionId.trim() === ""}
                    >
                      Create Order
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </motion.div>
        )}

        <Button variant="text" fullWidth onClick={closeDrawer} sx={{ mt: 2 }}>
          Close
        </Button>
      </Box>
    </ThemeProvider>
  );
};

export default CartDrawer;