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
  Checkbox,
  FormControlLabel,
  createTheme,
  ThemeProvider,
  useMediaQuery,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { motion } from "framer-motion";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import EditIcon from "@mui/icons-material/Edit";

import OrderDetailsPopup from "./OrderDetailsPopup";

import ReactConfetti from "react-confetti";
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
  updateCartItemQuantity,
} from "../features/cart/cartSlice";

// List of Indian states/UTs for the dropdown
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar",
];

// Custom theme with a consistent color palette and typography
const theme = createTheme({
  palette: {
    primary: {
      main: "#000000",
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
    fontSize: 14,
    h6: {
      fontWeight: 600,
      fontSize: "1rem",
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

// Consistent style for buttons
const buttonStyle = {
  textTransform: "none",
  borderRadius: "20px",
  padding: "6px 16px",
};

const CartDrawer = ({ closeDrawer }) => {
  const dispatch = useDispatch();
  const [activeSection, setActiveSection] = useState("ordering");
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [showOrderDetailsPopup, setShowOrderDetailsPopup] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [notesMessage, setNotesMessage] = useState("");
  const [shakeCart, setShakeCart] = useState(false);

  // At the top of your component (inside CartDrawer)
  const [editingAddressIndex, setEditingAddressIndex] = useState(null);
  const [editAddressData, setEditAddressData] = useState({});


  // Keep track of window size for react-confetti
  const [confettiSize, setConfettiSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Local state for new customer details
  const [newCustomerFirstName, setNewCustomerFirstName] = useState("");
  const [newCustomerLastName, setNewCustomerLastName] = useState("");

  const [isOrderLoading, setIsOrderLoading] = useState(false);

  const storedUser = sessionStorage.getItem("user");
  const loggedInUser = storedUser ? JSON.parse(storedUser) : {};
  const loggedInAgentName = loggedInUser.fullName || "Default Agent";

  // Pulling data from Redux store
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

  const [copyNamePhoneChecked, setCopyNamePhoneChecked] = useState(false);

  // Compute total items in the cart (sum of quantities)
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Responsive design hook
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Fetch products on mount
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await axios.get(
          "https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/products"
        );
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

  // Handle window resize for confetti
  useEffect(() => {
    function handleResize() {
      setConfettiSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check if item (productId + variantId) is in cart
  const isItemInCart = (productId, variantId) => {
    return cart.some(
      (item) => item.product.id === productId && item.variant.id === variantId
    );
  };

  // ----- ORDERING SECTION -----
  const handleVariantChange = (productId, variantId) => {
    dispatch(
      setSelection({
        [productId]: {
          ...(selection[productId] || {}),
          variantId,
        },
      })
    );
  };

  const handleQuantityChange = (productId, quantity) => {
    dispatch(
      setSelection({
        [productId]: {
          ...(selection[productId] || {}),
          quantity,
        },
      })
    );
  };

  const handleAddToCart = (product) => {
    const { variantId, quantity } = selection[product.id] || {};
    const qty = quantity !== undefined ? quantity : 1;
    if (qty === 0) {
      alert("Please select a quantity greater than 0.");
      return;
    }
    const selectedVariant =
      product.variants.find((v) => v.id === variantId) || product.variants[0];
    dispatch(addToCart({ product, variant: selectedVariant, quantity: qty }));
  };

  // Remove from cart specifically in ordering section
  const handleRemoveFromCartInOrdering = (productId, variantId) => {
    const index = cart.findIndex(
      (item) => item.product.id === productId && item.variant.id === variantId
    );
    if (index !== -1) {
      dispatch(removeFromCart(index));
    }
  };

  const handleResetAll = () => {
    // 1. Clear Redux states
    dispatch(setSelection({}));
    // Remove all items from cart
    for (let i = cart.length - 1; i >= 0; i--) {
      dispatch(removeFromCart(i));
    }
    // Clear addresses & phone
    dispatch(setAddresses([]));
    dispatch(setPhoneNumber(""));
    dispatch(setCustomerId(""));
    dispatch(setCustomerName(""));
    dispatch(setNewAddress({}));
    dispatch(setConfirmedAddress(null));
    dispatch(setAddressConfirmed(false));
    // Clear payment link & transaction
    dispatch(setRazorpayLink(""));
    dispatch(setTransactionId(""));
    // Reset payment method
    dispatch(setPaymentMethod("Prepaid"));
    // Clear shipping
    dispatch(setShippingInput(""));
    dispatch(setShippingCost(0));
    // Clear discount
    dispatch(setDiscountValue(""));
    dispatch(setAppliedDiscount(0));
    dispatch(setDiscountType("percentage"));

    // 2. Clear local states
    setNewCustomerFirstName("");
    setNewCustomerLastName("");
    setSearchQuery("");
    setFilteredProducts(products); // Reset to the full product list
    setShowOrderSuccess(false);
    setOrderId(null);
    setOrderNotes("");
    setActiveSection("ordering"); // Go back to first tab if you like


  };

  const handleNext = () => {
    setActiveSection("cart");
  };

  // ----- CART CALCULATIONS -----
  const calculateSubTotal = () =>
    cart.reduce((total, item) => total + item.variant.price * item.quantity, 0);

  const subTotal = calculateSubTotal();
  const finalTotal = subTotal + shippingCost - appliedDiscount;

  // ----- DISCOUNT LOGIC -----
  const handleOpenDiscountModal = () => {
    dispatch(setDiscountModalOpen(true));
  };

  const handleCloseDiscountModal = () => {
    dispatch(setDiscountModalOpen(false));
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

  // ----- SHIPPING LOGIC -----
  const handleApplyShipping = () => {
    const numericValue = parseFloat(shippingInput);
    if (isNaN(numericValue) || numericValue < 0) {
      alert("Please enter a valid positive shipping amount.");
      return;
    }
    dispatch(setShippingCost(numericValue));
  };

  // Add this helper function at the top of your file
  function standardizePhoneNumber(rawPhone) {
    let digits = rawPhone.replace(/\D/g, "");
    // If the number has 11 digits starting with '0', remove the leading '0'
    if (digits.length === 11 && digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    return digits;
  }


  // ----- PHONE CHECK & ADDRESSES -----
  const handleCheckPhone = async () => {
    try {
      // Standardize the phone number before use
      const standardizedPhone = standardizePhoneNumber(phoneNumber);
      // (Optional) Update state with standardized value
      dispatch(setPhoneNumber(standardizedPhone));

      // Fetch previous orders (addresses)
      const ordersRes = await axios.get(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/customer-orders?phone=${standardizedPhone}`
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
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/customer?phone=${standardizedPhone}`
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


  // New function to create a customer on Shopify
  const handleCreateCustomer = async () => {
    if (!phoneNumber) {
      alert("Please enter phone number");
      return;
    }
    if (!newCustomerFirstName || !newCustomerLastName) {
      alert("Please enter both first name and last name");
      return;
    }
    try {
      const response = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/create-customer",
        {
          phone: phoneNumber,
          first_name: newCustomerFirstName,
          last_name: newCustomerLastName,
        }
      );
      const customerData = response.data.customer;
      if (customerData && customerData.id) {
        dispatch(setCustomerId(customerData.id));
        dispatch(
          setCustomerName(
            `${customerData.first_name} ${customerData.last_name}`.trim()
          )
        );
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      alert("Error creating customer");
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
  };

  // Check if user has selected or filled an address
  const isAddressSelectedOrFilled = () => {
    if (addressCategory === "existing") {
      return (selectedAddressIndex !== null &&
        selectedAddressIndex !== undefined &&
        addresses[selectedAddressIndex] &&
        addresses[selectedAddressIndex].address1?.trim() !== "" &&
        addresses[selectedAddressIndex].address2?.trim() !== ""
      );
    } else if (addressCategory === "new") {
      return (
        newAddress.fullName.trim() !== "" &&
        newAddress.address1.trim() !== "" &&
        newAddress.city.trim() !== "" &&
        newAddress.pincode.trim() !== ""
      );
    }
    return false;
  };

  const handleConfirmAddress = () => {
    if (!isAddressSelectedOrFilled()) return;

    let finalAddr = null;
    if (addressCategory === "existing" && selectedAddressIndex !== null) {
      finalAddr = { ...addresses[selectedAddressIndex], valid: true };
    } else {
      finalAddr = { ...newAddress, valid: true };
    }
    dispatch(setConfirmedAddress(finalAddr));
    dispatch(setAddressConfirmed(true));
  };

  const handleEditAddress = (index) => {
    // Only allow edit if that address is selected
    setEditingAddressIndex(index);
    setEditAddressData({ ...addresses[index] });
  };

  const handleChangeEditAddress = (field, value) => {
    setEditAddressData((prev) => ({ ...prev, [field]: value }));
  };
  
  const handleSaveEditedAddress = async (index) => {
    try {
      if (!customerId) {
        alert("Please check phone or create a customer first.");
        return;
      }
      const addressToUpdate = addresses[index];
      if (!addressToUpdate?.id) {
        alert("This address does not have a Shopify ID.");
        return;
      }
      
      // Parse first and last name from fullName (for Shopify)
      const fullNameParts = editAddressData.fullName.trim().split(" ");
      const first_name = fullNameParts.shift() || "";
      const last_name = fullNameParts.join(" ");
  
      await axios.put("https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/customer-address", {
        customerId: customerId,
        addressId: addressToUpdate.id,   
        first_name,
        last_name,
        phone: editAddressData.phone || phoneNumber,
        address1: editAddressData.address1,
        address2: editAddressData.address2,
        city: editAddressData.city,
        province: editAddressData.state,
        country: editAddressData.country,
        zip: editAddressData.pincode,
      });
  
      // Update the Redux addresses state locally:
      const updatedAddresses = [...addresses];
      updatedAddresses[index] = { ...editAddressData };
      dispatch(setAddresses(updatedAddresses));
  
      // Clear editing state
      setEditingAddressIndex(null);
      setEditAddressData({}); 
    } catch (err) {
      console.error("Error updating address:", err);
      alert("Error updating address on Shopify.");
    }
  };

  
  // ----- PAYMENT & ORDER CREATION -----
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
    setIsOrderLoading(true);

    const shippingAddress = {
      firstName: confirmedAddress?.fullName?.split(" ")[0] || "",
      lastName: confirmedAddress?.fullName?.split(" ")[1] || "",
      address1: confirmedAddress?.address1 || "",
      address2: confirmedAddress?.address2 || "",
      city: confirmedAddress?.city || "",
      province: confirmedAddress?.state || "",
      country: confirmedAddress?.country || "India",
      zip: confirmedAddress?.pincode || "",
      phone: phoneNumber || "",
    };

    const billingAddress = billingSameAsShipping
      ? { ...shippingAddress }
      : {
        firstName: confirmedAddress?.fullName?.split(" ")[0] || "",
        lastName: confirmedAddress?.fullName?.split(" ")[1] || "",
        address1: confirmedAddress?.address1 || "",
        address2: confirmedAddress?.address2 || "",
        city: confirmedAddress?.city || "",
        province: confirmedAddress?.state || "",
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
      const response = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/create-order",
        orderData
      );
      // Capture order id from Shopify response
      const createdOrder = response.data.order;
      setOrderId(createdOrder.id);
      // Show the success popup (manual close via cross icon)
      setShowOrderSuccess(true);
    } catch (error) {
      console.error("Error placing order:", error);
    } finally {
      setIsOrderLoading(false);
    }
  };


  const handleAddNotesClick = async () => {
    if (!orderId) {
      alert("Order id is missing.");
      return;
    }
    if (!orderNotes.trim()) {
      alert("Please enter a note.");
      return;
    }
    try {
      await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/update-order-note",
        {
          orderId,
          note: orderNotes,
        }
      );
      setNotesMessage("Notes added.");
      setOrderNotes("");
      // Close the order success popup first:
      setShowOrderSuccess(false);
      // Then trigger the Order Details popup after a short delay:
      setTimeout(() => {
        setShowOrderDetailsPopup(true);
      }, 500);
    } catch (error) {
      console.error("Error adding notes:", error);
      alert("Error adding notes.");
    }
  };


  // Increase/Decrease quantity in the Cart
  const handleIncreaseQuantity = (index) => {
    const item = cart[index];
    dispatch(
      updateCartItemQuantity({
        index,
        quantity: item.quantity + 1,
      })
    );
  };

  const handleDecreaseQuantity = (index) => {
    const item = cart[index];
    if (item.quantity > 1) {
      dispatch(
        updateCartItemQuantity({
          index,
          quantity: item.quantity - 1,
        })
      );
    }
  };

  useEffect(() => {
    if (copyNamePhoneChecked) {
      // Copy from phoneNumber & customerName to newAddress
      dispatch(
        setNewAddress({
          fullName: customerName || "",
          phone: phoneNumber || "",
        })
      );
    }
  }, [copyNamePhoneChecked, dispatch, phoneNumber, customerName]);

  // Function to close the order success popup manually
  const handleCloseOrderPopup = () => {
    setShowOrderSuccess(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          width: isMobile ? "100%" : 350,
          p: 2,
          backgroundColor: "background.paper",
          position: "relative",
        }}
      >
        {/* Section Tabs + always-visible Delete icon */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", flex: 1 }}>
            {["ordering", "cart", "payment"].map((section) => {
              let label = section.charAt(0).toUpperCase() + section.slice(1);
              if (section === "cart") {
                label += ` (${totalItems})`;
              }
              const button = (
                <Button
                  key={section}
                  variant={activeSection === section ? "contained" : "text"}
                  color="primary"
                  onClick={() => {
                    if (section === "payment" && totalItems === 0) {
                      setShakeCart(true);
                      setTimeout(() => setShakeCart(false), 500);
                    } else {
                      setActiveSection(section);
                    }
                  }}
                  sx={{ ...buttonStyle, flex: 1, mx: 0.5 }}
                >
                  {label}
                </Button>
              );
              if (section === "cart") {
                return (
                  <motion.div
                    key={section}
                    animate={shakeCart ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {button}
                  </motion.div>
                );
              }
              return button;
            })}
          </Box>

          {/* Delete icon that resets all states */}
          <IconButton
            size="small"
            color="error"
            onClick={handleResetAll}
            sx={{ ml: 1 }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* ORDERING SECTION */}
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
                  size="small"
                />
              </Box>
              {filteredProducts.map((product) => {
                const defaultVariantId = product.variants[0]?.id || "";
                const currentSelection = selection[product.id] || {};
                const currentVariantId =
                  currentSelection.variantId || defaultVariantId;
                const currentQuantity =
                  currentSelection.quantity !== undefined
                    ? currentSelection.quantity
                    : 1;
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
                          sx={{
                            width: 80,
                            height: 80,
                            objectFit: "contain",
                            m: 1,
                          }}
                          image={product.image?.src}
                          alt={product.title}
                        />
                        <CardContent sx={{ p: 1, flex: 1 }}>
                          <Typography
                            variant="h6"
                            sx={{ fontSize: "0.9rem" }}
                          >
                            {product.title}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mt: 1,
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{ mr: 1 }}
                            >
                              Size:
                            </Typography>
                            <Select
                              size="small"
                              value={currentVariantId}
                              onChange={(e) =>
                                handleVariantChange(
                                  product.id,
                                  e.target.value
                                )
                              }
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
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mt: 1,
                            }}
                          >
                            <Typography sx={{ mr: 1 }}>Qty:</Typography>
                            <Select
                              size="small"
                              value={currentQuantity}
                              onChange={(e) =>
                                handleQuantityChange(
                                  product.id,
                                  parseInt(e.target.value)
                                )
                              }
                            >
                              {Array.from({ length: 5 }, (_, i) => i + 1).map(
                                (num) => (
                                  <MenuItem key={num} value={num}>
                                    {num}
                                  </MenuItem>
                                )
                              )}
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
                          {isItemInCart(product.id, currentVariantId) ? (
                            <Button
                              variant="contained"
                              color="error"
                              sx={{ ...buttonStyle, mr: 1 }}
                              onClick={() =>
                                handleRemoveFromCartInOrdering(
                                  product.id,
                                  currentVariantId
                                )
                              }
                            >
                              Delete
                            </Button>
                          ) : (
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<AddShoppingCartIcon />}
                              sx={{ ...buttonStyle, mr: 1 }}
                              onClick={() => handleAddToCart(product)}
                            >
                              Add
                            </Button>
                          )}
                          <IconButton
                            color="primary"
                            onClick={handleNext}
                          >
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

              {/* Cart Items with images, quantity +/- and delete icon */}
              {cart.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 2,
                    borderBottom: "1px solid #ccc",
                    pb: 1,
                  }}
                >
                  {/* Product Image */}
                  <Box sx={{ width: 60, height: 60, mr: 1 }}>
                    <img
                      src={item.product.image?.src}
                      alt={item.product.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </Box>

                  {/* Title, variant, quantity controls */}
                  <Box sx={{ flex: 1 }}>
                    {/* Show the product title and "x{quantity}" */}
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {item.product.title} x{item.quantity}
                    </Typography>
                    <Typography variant="caption">{item.variant.title}</Typography>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mt: 1,
                        gap: 1,
                      }}
                    >
                      <IconButton size="small" onClick={() => handleDecreaseQuantity(idx)}>
                        <RemoveIcon />
                      </IconButton>
                      <Typography>{item.quantity}</Typography>
                      <IconButton size="small" onClick={() => handleIncreaseQuantity(idx)}>
                        <AddIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Price and Delete */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                    }}
                  >
                    <Typography>₹{(item.variant.price * item.quantity).toFixed(2)}</Typography>
                    <IconButton size="small" onClick={() => dispatch(removeFromCart(idx))}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              ))}


              {/* Apply Discount Button */}
              <Divider sx={{ my: 2 }} />
              <Button
                variant="contained"
                onClick={handleOpenDiscountModal}
                sx={{ ...buttonStyle, mb: 2 }}
              >
                Apply Discount
              </Button>

              {/* Discount Popup */}
              {discountModalOpen && (
                <Box
                  sx={{
                    position: "absolute",
                    top: isMobile ? 120 : 120,
                    left: 0,
                    width: isMobile ? "100%" : 350,
                    backgroundColor: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: 1,
                    p: 2,
                    zIndex: 9999,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ fontSize: "1rem" }}
                    >
                      Add Discount + Partial Payment
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleCloseDiscountModal}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <Select
                      fullWidth
                      size="small"
                      value={discountType}
                      onChange={(e) =>
                        dispatch(
                          setDiscountType(e.target.value)
                        )
                      }
                    >
                      <MenuItem value="amount">Amount</MenuItem>
                      <MenuItem value="percentage">
                        Percentage
                      </MenuItem>
                    </Select>

                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      value={discountValue}
                      onChange={(e) =>
                        dispatch(
                          setDiscountValue(e.target.value)
                        )
                      }
                      placeholder={
                        discountType === "amount"
                          ? "Discount (₹)"
                          : "Discount (%)"
                      }
                    />
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 2,
                    }}
                  >
                    <Button
                      variant="text"
                      onClick={handleCloseDiscountModal}
                      sx={buttonStyle}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleApplyDiscount}
                      sx={buttonStyle}
                    >
                      Apply
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Shipping Charges */}
              <Typography>
                Shipping Charges
              </Typography>
              <Box
                display="flex"
                alignItems="center"
                mt={1}
                mb={2}
              >
                <TextField
                  label="Shipping"
                  type="number"
                  value={shippingInput}
                  onChange={(e) =>
                    dispatch(
                      setShippingInput(e.target.value)
                    )
                  }
                  sx={{ mr: 1 }}
                  size="small"
                />
                <Button
                  variant="contained"
                  onClick={handleApplyShipping}
                  sx={buttonStyle}
                >
                  Apply
                </Button>
              </Box>

              {/* Cart Summary */}
              <Typography>
                Sub-Total: ₹{subTotal.toFixed(2)}
              </Typography>
              <Typography>Tax: ₹0.00</Typography>
              <Typography>
                Discount: -₹
                {appliedDiscount > 0
                  ? appliedDiscount.toFixed(2)
                  : 0}
              </Typography>
              <Typography>
                Shipping: ₹{shippingCost.toFixed(2)}
              </Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>
                Total: ₹
                {finalTotal < 0
                  ? 0
                  : finalTotal.toFixed(2)}
              </Typography>

              <Button
                variant="contained"
                color="primary"
                sx={{ ...buttonStyle, mt: 2 }}
                onClick={() => {
                  if (cart.length === 0) {
                    setShakeCart(true);
                    setTimeout(() => setShakeCart(false), 500);
                  } else {
                    setActiveSection("payment");
                  }
                }}
              >
                Next
              </Button>
            </Box>
          </motion.div>
        )}

        {/* PAYMENT SECTION */}
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
                  onChange={(e) =>
                    dispatch(
                      setPhoneNumber(e.target.value)
                    )
                  }
                  sx={{ mr: 1 }}
                  size="small"
                />
                <Button
                  variant="contained"
                  onClick={handleCheckPhone}
                  sx={buttonStyle}
                >
                  Check
                </Button>
              </Box>

              {/* If no customer exists, show input fields for creating customer */}
              {!customerId && phoneNumber && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    label="First Name"
                    fullWidth
                    size="small"
                    margin="dense"
                    value={newCustomerFirstName}
                    onChange={(e) =>
                      setNewCustomerFirstName(e.target.value)
                    }
                  />
                  <TextField
                    label="Last Name"
                    fullWidth
                    size="small"
                    margin="dense"
                    value={newCustomerLastName}
                    onChange={(e) =>
                      setNewCustomerLastName(e.target.value)
                    }
                  />
                  <Button
                    variant="contained"
                    onClick={handleCreateCustomer}
                    sx={buttonStyle}
                  >
                    Create Customer
                  </Button>
                </Box>
              )}

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
                    size="small"
                  />
                  <TextField
                    label="Customer ID"
                    fullWidth
                    value={customerId}
                    InputProps={{
                      readOnly: true,
                    }}
                    size="small"
                  />
                </Box>
              )}

              <FormControlLabel
                control={
                  <Checkbox
                    checked={billingSameAsShipping}
                    onChange={(e) =>
                      dispatch(
                        setBillingSameAsShipping(
                          e.target.checked
                        )
                      )
                    }
                  />
                }
                label="Billing & shipping address is same"
              />

              {addresses.length > 0 ? (
                !addressConfirmed &&
                  addressCategory === "existing" ? (
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1 }}
                    >
                      Select address category *
                    </Typography>
                    <Select
                      value={addressCategory}
                      onChange={(e) =>
                        dispatch(
                          setAddressCategory(
                            e.target.value
                          )
                        )
                      }
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="existing">
                        Existing address
                      </MenuItem>
                      <MenuItem value="new">
                        Add new address
                      </MenuItem>
                    </Select>
                  </Box>
                ) : null
              ) : (
                <Typography sx={{ mb: 1 }}>
                  No orders yet. Add an address to continue.
                </Typography>
              )}

              {/* Existing addresses */}
              {/* Existing addresses */}
              {addressCategory === "existing" && addresses.length > 0 && !addressConfirmed && (
                <Box sx={{ mb: 2 }}>
                  {addresses.map((addr, index) => (
                    <Box key={index} sx={{ border: "1px solid #ccc", p: 1, mb: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedAddressIndex === index}
                              onChange={() => handleSelectAddress(index)}
                            />
                          }
                          label={`${addr.fullName} (${addr.phone})\n${addr.address1}, ${addr.address2}, ${addr.city}, ${addr.state}, ${addr.country}, ${addr.pincode}`}
                        />
                        {/* Show Edit icon only if this address is selected */}
                        {selectedAddressIndex === index && (
                          <IconButton
                            size="small"
                            onClick={() => handleEditAddress(index)}
                            sx={{ ml: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                      </Box>

                      {/* If editing this address, show an editable form */}
                      {editingAddressIndex === index && (
                        <Box sx={{ mt: 2, border: "1px solid #ddd", p: 1 }}>
                          <TextField
                            label="Full Name"
                            fullWidth
                            size="small"
                            margin="dense"
                            value={editAddressData.fullName || ""}
                            onChange={(e) => handleChangeEditAddress("fullName", e.target.value)}
                          />
                          <TextField
                            label="Phone"
                            fullWidth
                            size="small"
                            margin="dense"
                            value={editAddressData.phone || ""}
                            onChange={(e) => handleChangeEditAddress("phone", e.target.value)}
                          />
                          <TextField
                            label="Address 1"
                            fullWidth
                            size="small"
                            margin="dense"
                            value={editAddressData.address1 || ""}
                            onChange={(e) => handleChangeEditAddress("address1", e.target.value)}
                          />
                          <TextField
                            label="Address 2"
                            fullWidth
                            size="small"
                            margin="dense"
                            value={editAddressData.address2 || ""}
                            onChange={(e) => handleChangeEditAddress("address2", e.target.value)}
                          />
                          <TextField
                            label="City"
                            fullWidth
                            size="small"
                            margin="dense"
                            value={editAddressData.city || ""}
                            onChange={(e) => handleChangeEditAddress("city", e.target.value)}
                          />
                          <Select
                            fullWidth
                            size="small"
                            margin="dense"
                            value={editAddressData.state || ""}
                            onChange={(e) =>
                              handleChangeEditAddress("state", e.target.value)
                            }
                            sx={{ mb: 1 }}
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
                            margin="dense"
                            value={editAddressData.pincode || ""}
                            onChange={(e) =>
                              handleChangeEditAddress("pincode", e.target.value)
                            }
                          />
                          <TextField
                            label="Country"
                            fullWidth
                            size="small"
                            margin="dense"
                            value={editAddressData.country || ""}
                            onChange={(e) =>
                              handleChangeEditAddress("country", e.target.value)
                            }
                          />
                          <Button
                            variant="contained"
                            sx={{ mt: 1 }}
                            onClick={() => handleSaveEditedAddress(index)}
                          >
                            Save
                          </Button>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              )}

              {/* Confirmed existing address */}
              {addressCategory === "existing" &&
                addresses.length > 0 &&
                addressConfirmed &&
                selectedAddressIndex !== null && (
                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        border: "1px solid #ccc",
                        p: 1,
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2">
                        {addresses[
                          selectedAddressIndex
                        ].fullName} (
                        {addresses[
                          selectedAddressIndex
                        ].phone}
                        )
                      </Typography>
                      <Typography variant="caption">
                        {addresses[
                          selectedAddressIndex
                        ].address1},{" "}
                        {addresses[
                          selectedAddressIndex
                        ].address2},{" "}
                        {addresses[
                          selectedAddressIndex
                        ].city},{" "}
                        {addresses[
                          selectedAddressIndex
                        ].state},{" "}
                        {addresses[
                          selectedAddressIndex
                        ].country},{" "}
                        {addresses[
                          selectedAddressIndex
                        ].pincode}
                      </Typography>
                    </Box>
                  </Box>
                )}

              {/* New address */}
              {addressCategory === "new" && (
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={copyNamePhoneChecked}
                        onChange={(e) => setCopyNamePhoneChecked(e.target.checked)}
                      />
                    }
                    label="Use Name & Phone from above"
                  />
                  <TextField
                    label="Full Name"
                    fullWidth
                    size="small"
                    margin="dense"
                    value={newAddress.fullName || ""}
                    onChange={(e) => handleNewAddressChange("fullName", e.target.value)}
                  />
                  <TextField
                    label="Phone"
                    fullWidth
                    size="small"
                    margin="dense"
                    value={newAddress.phone || ""}
                    onChange={(e) => handleNewAddressChange("phone", e.target.value)}
                  />
                  <TextField
                    label="Email"
                    fullWidth
                    size="small"
                    margin="dense"
                    value={newAddress.email || ""}
                    onChange={(e) =>
                      handleNewAddressChange(
                        "email",
                        e.target.value
                      )
                    }
                  />
                  <TextField
                    label="Address 1"
                    fullWidth
                    size="small"
                    margin="dense"
                    value={newAddress.address1 || ""}
                    onChange={(e) =>
                      handleNewAddressChange(
                        "address1",
                        e.target.value
                      )
                    }
                  />
                  <TextField
                    label="Address 2"
                    fullWidth
                    size="small"
                    margin="dense"
                    value={newAddress.address2 || ""}
                    onChange={(e) =>
                      handleNewAddressChange(
                        "address2",
                        e.target.value
                      )
                    }
                  />
                  <TextField
                    label="City"
                    fullWidth
                    size="small"
                    margin="dense"
                    value={newAddress.city || ""}
                    onChange={(e) =>
                      handleNewAddressChange(
                        "city",
                        e.target.value
                      )
                    }
                  />
                  <Select
                    fullWidth
                    size="small"
                    margin="dense"
                    value={newAddress.state || ""}
                    onChange={(e) =>
                      handleNewAddressChange(
                        "state",
                        e.target.value
                      )
                    }
                    sx={{ mb: 1 }}
                  >
                    <MenuItem value="">
                      Select State/UT
                    </MenuItem>
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
                    margin="dense"
                    value={newAddress.pincode || ""}
                    onChange={(e) =>
                      handleNewAddressChange(
                        "pincode",
                        e.target.value
                      )
                    }
                  />
                  <TextField
                    label="Country"
                    fullWidth
                    size="small"
                    margin="dense"
                    value={newAddress.country || ""}
                    onChange={(e) =>
                      handleNewAddressChange(
                        "country",
                        e.target.value
                      )
                    }
                  />
                </Box>
              )}

              {/* Copy & Confirm in one line */}
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "nowrap",
                  gap: 2,
                  mb: 2,
                  overflowX: "auto",
                }}
              >
                <Button
                  variant="outlined"
                  onClick={handleCopyAddress}
                  sx={buttonStyle}
                >
                  Copy Address
                </Button>
                <Button
                  variant="contained"
                  onClick={handleConfirmAddress}
                  disabled={
                    addressConfirmed ||
                    !isAddressSelectedOrFilled()
                  }
                  sx={buttonStyle}
                >
                  {addressConfirmed
                    ? "Confirmed"
                    : "Confirm Address"}
                </Button>
              </Box>

              {/* Payment Method */}
              {addressConfirmed && (
                <Box
                  sx={{
                    border: "1px solid #ccc",
                    p: 2,
                    borderRadius: 2,
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1 }}
                  >
                    Select Payment Method
                  </Typography>
                  <Select
                    displayEmpty
                    value={paymentMethod || ""}
                    onChange={(e) => dispatch(setPaymentMethod(e.target.value))}
                    fullWidth
                    sx={{ mb: 2 }}
                    size="small"
                    renderValue={(selected) =>
                      selected === "" ? <em>Select Payment Method</em> : selected
                    }
                  >
                    <MenuItem value="Prepaid">Prepaid</MenuItem>
                    <MenuItem value="COD">COD</MenuItem>
                  </Select>

                  {(paymentMethod || "Prepaid") === "Prepaid" && (
                    <>
                      <Button
                        variant="contained"
                        onClick={handleGeneratePaymentLink}
                        sx={{ ...buttonStyle, mb: 2 }}
                        disabled={Boolean(razorpayLink)}
                      >
                        {razorpayLink
                          ? "Link Generated"
                          : "Generate Payment Link"}
                      </Button>
                      {razorpayLink && (
                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="body2"
                            sx={{ mb: 1 }}
                          >
                            Payment Link:
                          </Typography>
                          <Button
                            variant="outlined"
                            onClick={() =>
                              navigator.clipboard.writeText(
                                razorpayLink
                              )
                            }
                            sx={buttonStyle}
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
                          dispatch(
                            setTransactionId(
                              e.target.value
                            )
                          )
                        }
                        sx={{ mb: 2 }}
                        size="small"
                      />
                    </>
                  )}
                  {paymentMethod && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleCreateOrder}
                      disabled={
                        (paymentMethod === "Prepaid" && transactionId.trim() === "") ||
                        isOrderLoading ||
                        !confirmedAddress
                      }
                      sx={buttonStyle}
                    >
                      {isOrderLoading ? (
                        <CircularProgress size={20} sx={{ color: "lightgreen" }} />
                      ) : (
                        "Create Order"
                      )}
                    </Button>
                  )}

                </Box>
              )}
            </Box>
          </motion.div>
        )}

        <Button
          variant="text"
          fullWidth
          onClick={closeDrawer}
          sx={{ mt: 2 }}
        >
          Close
        </Button>

        {/* ORDER SUCCESS POPUP & CONFETTI */}
        {showOrderSuccess && (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              position: "fixed",
            }}
          >
            {/* Cross icon to close the popup */}

            <Box
              sx={{
                backgroundColor: "#fff",
                borderRadius: 2,
                p: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 300,
              }}
            >
              <img
                src="https://cdn.shopify.com/s/files/1/0734/7155/7942/files/website_right_tick_animation.gif?v=1741346413"
                alt="Success Animation"
                style={{ width: "80px", height: "80px" }}
              />

              <Typography
                variant="h5"
                sx={{ mt: 2, textAlign: "center" }}
              >
                Your order has been successfully created! 🎉
              </Typography>
              {orderId && (
                <Typography sx={{ mt: 1 }}>
                  Order id is: {orderId}
                </Typography>
              )}
              {/* Notes field and button */}
              <TextField
                label="Add Order Notes"
                variant="outlined"
                fullWidth
                value={orderNotes}
                onChange={(e) =>
                  setOrderNotes(e.target.value)
                }
                sx={{ mt: 2, mb: 1 }}
              />
              <Button
                variant="contained"
                onClick={handleAddNotesClick}
                sx={buttonStyle}
              >
                Add Notes
              </Button>
            </Box>

            <IconButton
              onClick={handleCloseOrderPopup}
              sx={{
                position: "absolute",
                top: 150,
                right: 400,
                color: "#fff",
                zIndex: 10000,
              }}
            >
              <CloseIcon />
            </IconButton>
            <ReactConfetti width={confettiSize.width} height={confettiSize.height} recycle={false} />
          </Box>
        )}
        {showOrderDetailsPopup && orderId && (
          <OrderDetailsPopup
            orderId={orderId}
            agentName={loggedInAgentName}
            onClose={() => setShowOrderDetailsPopup(false)}
          />
        )}
      </Box>
    </ThemeProvider>
  );
};

export default CartDrawer;
