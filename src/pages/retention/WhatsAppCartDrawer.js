import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ShoppingCartCheckoutOutlinedIcon from "@mui/icons-material/ShoppingCartCheckoutOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DiamondOutlinedIcon from "@mui/icons-material/DiamondOutlined";
import axios from "axios";

import OrderDetailsPopup from "../../ShopifyOrders/OrderDetailsPopup";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const STEP_META = [
  { key: "ordering", label: "Products", icon: <Inventory2OutlinedIcon fontSize="small" /> },
  { key: "cart", label: "Cart", icon: <ShoppingCartCheckoutOutlinedIcon fontSize="small" /> },
  { key: "payment", label: "Checkout", icon: <PaymentsOutlinedIcon fontSize="small" /> },
];

const defaultManualAddress = (name = "", phone = "") => ({
  address1: "",
  address2: "",
  city: "",
  province: "",
  zip: "",
  country: "India",
  phone: phone || "",
  name: name || "",
});

const currency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const toSafeNumber = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizePhone = (phone = "") => {
  const clean = String(phone || "").replace(/\D/g, "");
  if (!clean) return "";
  if (clean.length === 10) return `+91${clean}`;
  if (clean.length === 12 && clean.startsWith("91")) return `+${clean}`;
  if (clean.length === 13 && clean.startsWith("+91")) return clean;
  if (clean.startsWith("0") && clean.length === 11) return `+91${clean.slice(1)}`;
  return `+91${clean.slice(-10)}`;
};

const getAddressLabel = (address = {}) =>
  [
    address.address1,
    address.address2,
    address.city,
    address.province,
    address.zip,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

const getAgentName = () => {
  try {
    const user =
      JSON.parse(sessionStorage.getItem("user")) ||
      JSON.parse(localStorage.getItem("user")) ||
      {};
    return user.fullName || user.name || (user.email ? user.email.split("@")[0] : "") || "N/A";
  } catch {
    return "N/A";
  }
};

export default function WhatsAppCartDrawer({
  open,
  onClose,
  chatWidthPx = 0,
  phone10 = "",
  leadName = "",
}) {
  const [activeStep, setActiveStep] = useState("ordering");
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [selection, setSelection] = useState({});
  const [search, setSearch] = useState("");
  const [cartItems, setCartItems] = useState([]);

  const [discountType, setDiscountType] = useState("amount");
  const [discount, setDiscount] = useState("");
  const [shippingCharge, setShippingCharge] = useState("");

  const [customer, setCustomer] = useState({
    name: leadName || "",
    phone: phone10 || "",
    customerId: "",
    address: null,
  });
  const [allAddresses, setAllAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressMode, setAddressMode] = useState("manual");
  const [manualAddress, setManualAddress] = useState(defaultManualAddress(leadName, phone10));
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [partialPaidAmount, setPartialPaidAmount] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [statusMessage, setStatusMessage] = useState(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [latestOrderId, setLatestOrderId] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const agentName = useMemo(() => getAgentName(), []);

  const paperSx = {
    width: { xs: "100%", sm: 480, md: 520 },
    maxWidth: "100vw",
    display: "flex",
    flexDirection: "column",
    right: { xs: 0, sm: `${chatWidthPx}px`, md: `${chatWidthPx}px` },
    borderRight: "1px solid rgba(0,0,0,0.08)",
    background:
      "linear-gradient(180deg, rgba(251,253,255,0.98) 0%, rgba(241,247,252,0.98) 100%)",
    boxShadow: "0 20px 44px rgba(15,23,42,0.2)",
  };

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => product.title.toLowerCase().includes(term));
  }, [products, search]);

  const selectedVariantCount = useMemo(
    () => Object.values(selection).filter((item) => item?.selected).length,
    [selection]
  );

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cartItems]
  );

  const discountAmount = useMemo(() => {
    const numericDiscount = Math.max(0, toSafeNumber(discount, 0));
    if (!numericDiscount) return 0;
    if (discountType === "percentage") {
      const percentage = Math.min(100, numericDiscount);
      return (subtotal * percentage) / 100;
    }
    return Math.min(subtotal, numericDiscount);
  }, [discount, discountType, subtotal]);

  const total = useMemo(
    () => Math.max(0, subtotal - discountAmount + toSafeNumber(shippingCharge, 0)),
    [discountAmount, shippingCharge, subtotal]
  );
  const partialPaidNumber = useMemo(() => toSafeNumber(partialPaidAmount, 0), [partialPaidAmount]);
  const isPartialPaid = paymentMethod === "Partial Paid";
  const partialPendingAmount = useMemo(() => {
    if (!isPartialPaid) return 0;
    return Math.max(0, total - partialPaidNumber);
  }, [isPartialPaid, partialPaidNumber, total]);
  const paymentLinkAmount = useMemo(() => {
    if (paymentMethod === "Prepaid") return total;
    if (isPartialPaid) return partialPaidNumber;
    return 0;
  }, [isPartialPaid, partialPaidNumber, paymentMethod, total]);

  const resolvedAddress = useMemo(() => {
    if (addressMode === "saved") {
      return allAddresses.find((addr) => addr.id === selectedAddressId) || null;
    }
    return manualAddress;
  }, [addressMode, allAddresses, manualAddress, selectedAddressId]);

  const addressReady = useMemo(() => {
    if (addressMode === "saved") return Boolean(resolvedAddress?.address1);
    return Boolean(
      manualAddress.name?.trim() &&
        manualAddress.address1?.trim() &&
        manualAddress.city?.trim() &&
        manualAddress.province?.trim() &&
        manualAddress.zip?.trim()
    );
  }, [addressMode, manualAddress, resolvedAddress]);

  useEffect(() => {
    if (!open) return;

    setActiveStep("ordering");
    setSearch("");
    setSelection({});
    setCartItems([]);
    setDiscountType("amount");
    setDiscount("");
    setShippingCharge("");
    setPaymentMethod("COD");
    setPartialPaidAmount("");
    setPaymentLink("");
    setTransactionId("");
    setStatusMessage(null);
    setShowNoteDialog(false);
    setNoteText("");
    setLatestOrderId(null);
    setShowOrderDetails(false);
    setCustomer({
      name: leadName || "",
      phone: phone10 || "",
      customerId: "",
      address: null,
    });
    setManualAddress(defaultManualAddress(leadName, phone10));
    fetchProducts();
    fetchCustomerAddresses(phone10, leadName);
  }, [open, phone10, leadName]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await axios.get(`${API_BASE}/api/shopify/active-products`);
      const nextProducts = res.data || [];
      setProducts(nextProducts);
      const nextExpanded = {};
      nextProducts.forEach((product) => {
        nextExpanded[product.id] = false;
      });
      setExpanded(nextExpanded);
    } catch (error) {
      setStatusMessage({ type: "error", text: "Failed to load products." });
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCustomerAddresses = async (phone, name) => {
    if (!phone) {
      setAllAddresses([]);
      setAddressMode("manual");
      return;
    }

    setLoadingAddresses(true);
    try {
      const formattedPhone = normalizePhone(phone);
      const res = await axios.get(
        `${API_BASE}/api/shopify/customers?phone=${encodeURIComponent(formattedPhone)}`
      );

      const customerId = res.data?.id || "";
      const addresses = Array.isArray(res.data?.addresses) ? res.data.addresses : [];

      setAllAddresses(addresses);
      setCustomer((prev) => ({
        ...prev,
        name: name || prev.name,
        phone,
        customerId,
      }));

      if (addresses.length > 0) {
        setAddressMode("saved");
        setSelectedAddressId(addresses[0].id);
      } else {
        setAddressMode("manual");
        setSelectedAddressId(null);
      }
    } catch (error) {
      setAllAddresses([]);
      setAddressMode("manual");
      setSelectedAddressId(null);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    setCustomer((prev) => ({
      ...prev,
      address: resolvedAddress,
    }));
  }, [resolvedAddress]);

  const toggleExpand = (productId) => {
    setExpanded((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const updateSelection = (productId, patch) => {
    setSelection((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        ...patch,
      },
    }));
  };

  const addProductToCart = (product) => {
    const chosen = selection[product.id] || {};
    const variant =
      product.variants.find((item) => item.id === chosen.variantId) || product.variants?.[0];

    if (!variant) return;

    const quantity = Math.max(1, Number(chosen.quantity || 1));

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === variant.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }

      return [
        ...prev,
        {
          id: variant.id,
          title: variant.title,
          price: Number(variant.price || 0),
          quantity,
          productTitle: product.title,
          image: product.image,
        },
      ];
    });

    updateSelection(product.id, { selected: true });
    setStatusMessage({ type: "success", text: `${product.title} added to cart.` });
  };

  const updateCartQuantity = (id, delta) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, Number(item.quantity || 1) + delta) }
          : item
      )
    );
  };

  const removeItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleGeneratePaymentLink = async () => {
    if (!addressReady) {
      setStatusMessage({ type: "warning", text: "Select or enter an address first." });
      return;
    }
    if (paymentMethod === "COD") {
      setStatusMessage({ type: "warning", text: "Payment link is not required for COD." });
      return;
    }
    if (isPartialPaid) {
      if (!partialPaidNumber || partialPaidNumber <= 0) {
        setStatusMessage({ type: "warning", text: "Enter a valid partial paid amount first." });
        return;
      }
      if (partialPaidNumber >= total) {
        setStatusMessage({ type: "warning", text: "Partial paid amount must be less than total payable." });
        return;
      }
    }

    setGeneratingPaymentLink(true);
    try {
      const res = await axios.post(`${API_BASE}/api/razorpay/generate-link`, {
        customerName: resolvedAddress?.name || customer.name || leadName || "Customer",
        customerPhone: customer.phone || phone10,
        customerAddress: resolvedAddress,
        amount: paymentLinkAmount,
      });
      setPaymentLink(res.data?.paymentLink || "");
      setStatusMessage({ type: "success", text: "Payment link generated." });
    } catch (error) {
      setStatusMessage({ type: "error", text: "Failed to generate payment link." });
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!cartItems.length) {
      setStatusMessage({ type: "warning", text: "Add at least one item to continue." });
      setActiveStep("cart");
      return;
    }

    if (!addressReady) {
      setStatusMessage({ type: "warning", text: "Address is required before placing the order." });
      setActiveStep("payment");
      return;
    }

    if (paymentMethod === "Prepaid" && paymentLink && !transactionId.trim()) {
      setStatusMessage({
        type: "warning",
        text: "Enter the transaction ID after collecting payment.",
      });
      return;
    }
    if (isPartialPaid) {
      if (!partialPaidNumber || partialPaidNumber <= 0) {
        setStatusMessage({ type: "warning", text: "Enter a valid partial paid amount." });
        return;
      }
      if (partialPaidNumber >= total) {
        setStatusMessage({ type: "warning", text: "Partial paid amount must be less than total payable." });
        return;
      }
      if (paymentLink && !transactionId.trim()) {
        setStatusMessage({ type: "warning", text: "Add transaction ID for the partial payment." });
        return;
      }
    }

    setPlacingOrder(true);
    try {
      const payload = {
        customer: {
          name: customer.name || resolvedAddress?.name || leadName || "",
          phone: customer.phone || phone10 || "",
          customerId: customer.customerId || "",
          address:
            addressMode === "saved"
              ? resolvedAddress
              : {
                  address1: manualAddress.address1,
                  address2: manualAddress.address2,
                  city: manualAddress.city,
                  province: manualAddress.province,
                  zip: manualAddress.zip,
                  country: manualAddress.country || "India",
                  phone: manualAddress.phone || customer.phone || phone10,
                  name: manualAddress.name || customer.name || leadName || "",
                },
        },
        cartItems: cartItems.map((item) => ({
          id: item.id,
          title: item.title,
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1),
          productTitle: item.productTitle,
        })),
        paymentMethod: paymentMethod === "Partial Paid" ? "COD" : paymentMethod,
        transactionId:
          paymentMethod === "Prepaid" || paymentMethod === "Partial Paid"
            ? transactionId || undefined
            : undefined,
        shippingCharge: toSafeNumber(shippingCharge, 0),
        discount: toSafeNumber(discount, 0),
        discountType,
      };

      const res = await axios.post(`${API_BASE}/api/shopify/place-order`, payload);
      const orderId = res.data?.shopifyOrder?.id || null;

      setLatestOrderId(orderId);
      if (paymentMethod === "Partial Paid") {
        const partialNote = [
          "Payment Mode: Partial Paid",
          `Total: ₹${currency(total)}`,
          `Paid: ₹${currency(partialPaidNumber)}`,
          `Pending (COD): ₹${currency(partialPendingAmount)}`,
          transactionId?.trim() ? `Transaction ID: ${transactionId.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n");
        setNoteText(partialNote);
      }
      setStatusMessage({ type: "success", text: "Order created successfully." });
      setShowNoteDialog(true);
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error?.response?.data?.error || "Order placement failed.",
      });
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleAddNote = async () => {
    if (!latestOrderId || !noteText.trim()) return;

    try {
      await axios.post(`${API_BASE}/api/shopify/add-note`, {
        orderId: latestOrderId,
        note: noteText.trim(),
      });
      setShowNoteDialog(false);
      setNoteText("");
      setShowOrderDetails(true);
    } catch (error) {
      setStatusMessage({ type: "error", text: "Failed to add order note." });
    }
  };

  const stepIndex = STEP_META.findIndex((step) => step.key === activeStep);

  const handleDecimalInput = (setter) => (event) => {
    const value = event.target.value;
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setter(value);
    }
  };

  const renderOrderingStep = () => (
    <Box sx={{ display: "grid", gap: 1.25 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: "#64748B" }} />
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 2.5,
            bgcolor: "#fff",
          },
        }}
      />

      {loadingProducts ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      ) : filteredProducts.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 3, borderRadius: 3, textAlign: "center", color: "#64748B", bgcolor: "#fff" }}
        >
          No products found.
        </Paper>
      ) : (
        filteredProducts.map((product) => {
          const selected = selection[product.id] || {};
          const selectedVariant =
            product.variants.find((variant) => variant.id === selected.variantId) || product.variants?.[0];
          const quantity = Number(selected.quantity || 1);
          const isExpanded = Boolean(expanded[product.id]);

          return (
            <Paper
              key={product.id}
              sx={{
                overflow: "hidden",
                borderRadius: 3,
                border: "1px solid #DCE6F2",
                bgcolor: "#fff",
                boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  px: 1.5,
                  py: 1.4,
                  cursor: "pointer",
                }}
                onClick={() => toggleExpand(product.id)}
              >
                <Avatar
                  src={product.image || undefined}
                  variant="rounded"
                  sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: "#F1F5F9" }}
                >
                  {product.title?.[0]}
                </Avatar>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 800, color: "#0F172A" }} noWrap>
                    {product.title}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: "#64748B" }}>
                      {product.variants?.length || 0} variants
                    </Typography>
                    {selectedVariant ? (
                      <Chip
                        size="small"
                        label={`₹${currency(selectedVariant.price)}`}
                        sx={{ bgcolor: "#ECFDF5", color: "#047857", fontWeight: 700 }}
                      />
                    ) : null}
                  </Stack>
                </Box>

                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpand(product.id);
                  }}
                  sx={{ bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}
                >
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>

              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Divider />
                <Box sx={{ p: 1.5, display: "grid", gap: 1.25 }}>
                  <Box sx={{ display: "grid", gap: 1 }}>
                    {(product.variants || []).map((variant) => {
                      const checked = selectedVariant?.id === variant.id;
                      return (
                        <Box
                          key={variant.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => updateSelection(product.id, { variantId: variant.id })}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              updateSelection(product.id, { variantId: variant.id });
                            }
                          }}
                          sx={{
                            p: 1.2,
                            borderRadius: 2,
                            border: checked ? "1px solid #2563EB" : "1px solid #E2E8F0",
                            bgcolor: checked ? "rgba(37,99,235,0.06)" : "#F8FAFC",
                            cursor: "pointer",
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 1,
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 700, color: "#0F172A" }}>
                              {variant.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#64748B" }}>
                              {variant.inventory_quantity} available
                            </Typography>
                          </Box>
                          <Typography sx={{ fontWeight: 800, color: "#0F172A" }}>
                            ₹{currency(variant.price)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ color: "#475569" }}>
                        Quantity
                      </Typography>
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 999,
                          border: "1px solid #D6E0EC",
                          overflow: "hidden",
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateSelection(product.id, { quantity: Math.max(1, quantity - 1) })
                          }
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ minWidth: 26, textAlign: "center", fontWeight: 700 }}>
                          {quantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => updateSelection(product.id, { quantity: quantity + 1 })}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Stack>

                    <Button
                      variant="contained"
                      onClick={() => addProductToCart(product)}
                      sx={{
                        textTransform: "none",
                        borderRadius: 999,
                        px: 2,
                        fontWeight: 800,
                        boxShadow: "none",
                        background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)",
                      }}
                    >
                      Add to cart
                    </Button>
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          );
        })
      )}
    </Box>
  );

  const renderCartStep = () => (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {!cartItems.length ? (
        <Paper
          variant="outlined"
          sx={{ p: 3.5, borderRadius: 3, textAlign: "center", bgcolor: "#fff", color: "#64748B" }}
        >
          Add products from the previous step to build the cart.
        </Paper>
      ) : (
        <>
          {cartItems.map((item) => (
            <Paper
              key={item.id}
              sx={{
                p: 1.4,
                borderRadius: 3,
                border: "1px solid #DCE6F2",
                bgcolor: "#fff",
                boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
              }}
            >
              <Box sx={{ display: "flex", gap: 1.25, alignItems: "center" }}>
                <Avatar
                  src={item.image || undefined}
                  variant="rounded"
                  sx={{ width: 54, height: 54, borderRadius: 2, bgcolor: "#F1F5F9" }}
                >
                  {item.productTitle?.[0]}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, color: "#0F172A" }} noWrap>
                    {item.productTitle}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748B" }}>
                    {item.title} • ₹{currency(item.price)} each
                  </Typography>
                </Box>

                <IconButton onClick={() => removeItem(item.id)} sx={{ color: "#DC2626" }}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>

              <Box sx={{ mt: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 999,
                    border: "1px solid #D6E0EC",
                    overflow: "hidden",
                  }}
                >
                  <IconButton size="small" onClick={() => updateCartQuantity(item.id, -1)}>
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <Typography sx={{ minWidth: 30, textAlign: "center", fontWeight: 800 }}>
                    {item.quantity}
                  </Typography>
                  <IconButton size="small" onClick={() => updateCartQuantity(item.id, 1)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Typography sx={{ fontWeight: 800, color: "#0F172A" }}>
                  ₹{currency(Number(item.price || 0) * Number(item.quantity || 0))}
                </Typography>
              </Box>
            </Paper>
          ))}

          <Paper
            sx={{
              p: 1.5,
              borderRadius: 3,
              border: "1px solid #DCE6F2",
              bgcolor: "#fff",
              boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
              display: "grid",
              gap: 1.25,
            }}
          >
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <TextField
                select
                size="small"
                label="Discount Type"
                value={discountType}
                onChange={(e) => {
                  setDiscountType(e.target.value);
                  setDiscount("");
                }}
                sx={{ minWidth: 160 }}
                SelectProps={{
                  MenuProps: {
                    disablePortal: true,
                    PaperProps: {
                      sx: {
                        zIndex: (theme) => theme.zIndex.modal + 6,
                      },
                    },
                  },
                }}
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <MenuItem value="amount">Amount</MenuItem>
                <MenuItem value="percentage">Percentage</MenuItem>
              </TextField>
              <TextField
                size="small"
                type="number"
                label={discountType === "percentage" ? "Discount %" : "Discount ₹"}
                value={discount}
                onChange={handleDecimalInput(setDiscount)}
                fullWidth
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
              />
            </Stack>

            <TextField
              size="small"
              type="number"
              label="Shipping charge ₹"
              value={shippingCharge}
              onChange={handleDecimalInput(setShippingCharge)}
              fullWidth
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            />

            <Divider />

            <Stack spacing={0.75}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ color: "#475569" }}>Sub-total</Typography>
                <Typography sx={{ fontWeight: 700 }}>₹{currency(subtotal)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ color: "#475569" }}>Discount</Typography>
                <Typography sx={{ fontWeight: 700 }}>-₹{currency(discountAmount)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ color: "#475569" }}>Shipping</Typography>
                <Typography sx={{ fontWeight: 700 }}>₹{currency(shippingCharge || 0)}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontWeight: 800, color: "#0F172A" }}>Total</Typography>
                <Typography sx={{ fontWeight: 900, color: "#0F172A" }}>₹{currency(total)}</Typography>
              </Box>
            </Stack>
          </Paper>
        </>
      )}
    </Box>
  );

  const renderPaymentStep = () => (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Paper
        sx={{
          p: 1.6,
          borderRadius: 3.2,
          border: "1px solid rgba(194,208,226,0.8)",
          bgcolor: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
          <PersonOutlineOutlinedIcon sx={{ color: "#334155" }} />
          <Typography sx={{ fontWeight: 800, color: "#0F172A" }}>Customer</Typography>
        </Stack>
        <Stack spacing={1.25}>
          <TextField
            size="small"
            label="Customer name"
            value={customer.name}
            onChange={(e) => {
              const value = e.target.value;
              setCustomer((prev) => ({ ...prev, name: value }));
              setManualAddress((prev) => ({ ...prev, name: value }));
            }}
            fullWidth
          />
          <TextField
            size="small"
            label="Phone"
            value={customer.phone}
            onChange={(e) => {
              const value = e.target.value;
              setCustomer((prev) => ({ ...prev, phone: value }));
              setManualAddress((prev) => ({ ...prev, phone: value }));
            }}
            fullWidth
          />
        </Stack>
      </Paper>

      <Paper
        sx={{
          p: 1.6,
          borderRadius: 3.2,
          border: "1px solid rgba(194,208,226,0.8)",
          bgcolor: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <LocalShippingOutlinedIcon sx={{ color: "#334155" }} />
            <Typography sx={{ fontWeight: 800, color: "#0F172A" }}>Address</Typography>
          </Stack>
          {loadingAddresses ? <CircularProgress size={18} /> : null}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <Button
            variant={addressMode === "saved" ? "contained" : "outlined"}
            onClick={() => setAddressMode("saved")}
            disabled={!allAddresses.length}
            sx={{ textTransform: "none", borderRadius: 999, fontWeight: 700 }}
          >
            Saved address
          </Button>
          <Button
            variant={addressMode === "manual" ? "contained" : "outlined"}
            onClick={() => setAddressMode("manual")}
            sx={{ textTransform: "none", borderRadius: 999, fontWeight: 700 }}
          >
            Manual address
          </Button>
        </Stack>

        {addressMode === "saved" ? (
          allAddresses.length ? (
            <Box sx={{ display: "grid", gap: 1 }}>
              {allAddresses.map((address) => {
                const checked = selectedAddressId === address.id;
                return (
                  <Paper
                    key={address.id}
                    variant="outlined"
                    onClick={() => setSelectedAddressId(address.id)}
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      cursor: "pointer",
                      borderColor: checked ? "#2563EB" : "#DCE6F2",
                      bgcolor: checked ? "rgba(37,99,235,0.06)" : "#F8FAFC",
                    }}
                  >
                    <FormControlLabel
                      control={<Radio checked={checked} />}
                      label={
                        <Typography sx={{ color: "#0F172A" }}>
                          {address.formatted || getAddressLabel(address)}
                        </Typography>
                      }
                    />
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No saved Shopify addresses found for this number. Use manual address.
            </Alert>
          )
        ) : (
          <Box sx={{ display: "grid", gap: 1.1 }}>
            <TextField
              size="small"
              label="Full name"
              value={manualAddress.name}
              onChange={(e) => setManualAddress((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <TextField
              size="small"
              label="Phone"
              value={manualAddress.phone}
              onChange={(e) => setManualAddress((prev) => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              size="small"
              label="Address line 1"
              value={manualAddress.address1}
              onChange={(e) => setManualAddress((prev) => ({ ...prev, address1: e.target.value }))}
              fullWidth
            />
            <TextField
              size="small"
              label="Address line 2"
              value={manualAddress.address2}
              onChange={(e) => setManualAddress((prev) => ({ ...prev, address2: e.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.1}>
              <TextField
                size="small"
                label="City"
                value={manualAddress.city}
                onChange={(e) => setManualAddress((prev) => ({ ...prev, city: e.target.value }))}
                fullWidth
              />
              <TextField
                size="small"
                label="State"
                value={manualAddress.province}
                onChange={(e) => setManualAddress((prev) => ({ ...prev, province: e.target.value }))}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.1}>
              <TextField
                size="small"
                label="Pincode"
                value={manualAddress.zip}
                onChange={(e) => setManualAddress((prev) => ({ ...prev, zip: e.target.value }))}
                fullWidth
              />
              <TextField
                size="small"
                label="Country"
                value={manualAddress.country}
                onChange={(e) => setManualAddress((prev) => ({ ...prev, country: e.target.value }))}
                fullWidth
              />
            </Stack>
          </Box>
        )}
      </Paper>

      <Paper
        sx={{
          p: 1.7,
          borderRadius: 3.2,
          border: "1px solid rgba(125,211,252,0.6)",
          background:
            "radial-gradient(160% 120% at 0% 0%, rgba(186,230,253,0.45) 0%, rgba(255,255,255,0.95) 45%, rgba(224,242,254,0.8) 100%)",
          boxShadow: "0 18px 34px rgba(15,23,42,0.1)",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.35 }}>
          <DiamondOutlinedIcon sx={{ color: "#1D4ED8" }} />
          <Typography sx={{ fontWeight: 800, color: "#0F172A" }}>Payment</Typography>
        </Stack>

        <RadioGroup
          row
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setPartialPaidAmount("");
            setPaymentLink("");
            setTransactionId("");
          }}
        >
          <FormControlLabel value="COD" control={<Radio />} label="Cash on Delivery" />
          <FormControlLabel value="Prepaid" control={<Radio />} label="Prepaid" />
          <FormControlLabel value="Partial Paid" control={<Radio />} label="Partial Paid" />
        </RadioGroup>

        {(paymentMethod === "Prepaid" || paymentMethod === "Partial Paid") ? (
          <Stack spacing={1.2} sx={{ mt: 1 }}>
            {paymentMethod === "Partial Paid" ? (
              <>
                <TextField
                  size="small"
                  type="number"
                  label="Partial paid amount ₹"
                  value={partialPaidAmount}
                  onChange={(e) => {
                    setPartialPaidAmount(e.target.value);
                    setPaymentLink("");
                    setTransactionId("");
                  }}
                  fullWidth
                />
                <Paper
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: "rgba(255,255,255,0.74)",
                    border: "1px solid rgba(148,163,184,0.3)",
                  }}
                >
                  <Stack spacing={0.4}>
                    <Typography variant="caption" sx={{ color: "#475569" }}>
                      Total payable: ₹{currency(total)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#475569" }}>
                      Collected now: ₹{currency(partialPaidNumber)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#0F172A", fontWeight: 800 }}>
                      Pending COD: ₹{currency(partialPendingAmount)}
                    </Typography>
                  </Stack>
                </Paper>
              </>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                onClick={handleGeneratePaymentLink}
                disabled={
                  generatingPaymentLink ||
                  !addressReady ||
                  !paymentLinkAmount ||
                  (paymentMethod === "Partial Paid" && partialPaidNumber >= total)
                }
                sx={{ textTransform: "none", borderRadius: 999, fontWeight: 700 }}
              >
                {generatingPaymentLink ? "Generating..." : paymentLink ? "Regenerate link" : "Generate payment link"}
              </Button>
              {paymentLink ? (
                <Button
                  variant="text"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => navigator.clipboard.writeText(paymentLink)}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Copy link
                </Button>
              ) : null}
            </Stack>

            {paymentLink ? (
              <>
                <TextField size="small" label="Payment link" value={paymentLink} fullWidth InputProps={{ readOnly: true }} />
                <TextField
                  size="small"
                  label="Transaction ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  fullWidth
                />
              </>
            ) : null}
          </Stack>
        ) : null}
      </Paper>

      <Paper
        sx={{
          p: 1.6,
          borderRadius: 3.2,
          border: "1px solid rgba(194,208,226,0.8)",
          bgcolor: "rgba(255,255,255,0.84)",
          boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
        }}
      >
        <Typography sx={{ fontWeight: 800, color: "#0F172A", mb: 1.1 }}>Order summary</Typography>
        <Stack spacing={0.75}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "#475569" }}>Items</Typography>
            <Typography sx={{ fontWeight: 700 }}>{cartItems.length}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "#475569" }}>Sub-total</Typography>
            <Typography sx={{ fontWeight: 700 }}>₹{currency(subtotal)}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "#475569" }}>Discount</Typography>
            <Typography sx={{ fontWeight: 700 }}>-₹{currency(discountAmount)}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "#475569" }}>Shipping</Typography>
            <Typography sx={{ fontWeight: 700 }}>₹{currency(shippingCharge || 0)}</Typography>
          </Box>
          {isPartialPaid ? (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ color: "#475569" }}>Collected now</Typography>
                <Typography sx={{ fontWeight: 700, color: "#166534" }}>
                  ₹{currency(partialPaidNumber)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ color: "#475569" }}>Pending COD</Typography>
                <Typography sx={{ fontWeight: 800, color: "#92400E" }}>
                  ₹{currency(partialPendingAmount)}
                </Typography>
              </Box>
            </>
          ) : null}
          <Divider />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 800, color: "#0F172A" }}>Payable</Typography>
            <Typography sx={{ fontWeight: 900, color: "#0F172A" }}>₹{currency(total)}</Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
        hideBackdrop
        ModalProps={{
          keepMounted: true,
          disableAutoFocus: true,
          disableEnforceFocus: true,
        }}
        PaperProps={{
          sx: {
            ...paperSx,
            zIndex: (theme) => theme.zIndex.modal + 2,
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.4,
            borderBottom: "1px solid #DCE6F2",
            background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,250,255,0.9) 100%)",
            backdropFilter: "blur(14px)",
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar sx={{ bgcolor: "#1D4ED8", fontWeight: 800 }}>{leadName?.[0] || "C"}</Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 900, color: "#0F172A" }} noWrap>
                Order / Cart
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748B" }} noWrap>
                {leadName ? `${leadName} • ` : ""}
                {phone10 || "No phone"}
              </Typography>
            </Box>

            <Tooltip title="Close">
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 1.4, flexWrap: "wrap" }}>
            {STEP_META.map((step, index) => {
              const active = step.key === activeStep;
              const done = index < stepIndex;
              return (
                <Button
                  key={step.key}
                  onClick={() => {
                    if (step.key === "cart" && !cartItems.length) return;
                    if (step.key === "payment" && !cartItems.length) return;
                    setActiveStep(step.key);
                  }}
                  startIcon={done ? <CheckCircleOutlineIcon fontSize="small" /> : step.icon}
                  sx={{
                    textTransform: "none",
                    borderRadius: 999,
                    px: 1.4,
                    py: 0.5,
                    fontWeight: 800,
                    color: active || done ? "#0F172A" : "#475569",
                    bgcolor: active ? "#DBEAFE" : done ? "#DCFCE7" : "#F8FAFC",
                    border: active ? "1px solid #93C5FD" : "1px solid #E2E8F0",
                  }}
                >
                  {step.label}
                </Button>
              );
            })}
          </Stack>
        </Box>

        <Box sx={{ px: 2, py: 1.25 }}>
          <Paper
            sx={{
              p: 1.35,
              borderRadius: 3,
              background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)",
              color: "#fff",
              boxShadow: "0 16px 30px rgba(15,23,42,0.22)",
            }}
          >
            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)" }}>
                  Current cart
                </Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 20 }}>₹{currency(total)}</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Chip label={`${cartItems.length} items`} sx={{ bgcolor: "rgba(255,255,255,0.14)", color: "#fff", fontWeight: 700 }} />
                <Chip label={`${selectedVariantCount} selected`} sx={{ bgcolor: "rgba(255,255,255,0.14)", color: "#fff", fontWeight: 700 }} />
              </Stack>
            </Stack>
          </Paper>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", px: 2, pb: 2 }}>
          {statusMessage ? (
            <Alert severity={statusMessage.type} sx={{ mb: 1.5, borderRadius: 2.5 }}>
              {statusMessage.text}
            </Alert>
          ) : null}

          {activeStep === "ordering" && renderOrderingStep()}
          {activeStep === "cart" && renderCartStep()}
          {activeStep === "payment" && renderPaymentStep()}
        </Box>

        <Divider />

        <Box sx={{ p: 1.4, display: "flex", alignItems: "center", gap: 1, bgcolor: "rgba(255,255,255,0.92)" }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => setActiveStep(STEP_META[Math.max(0, stepIndex - 1)].key)}
            disabled={stepIndex === 0}
            sx={{ textTransform: "none", borderRadius: 999, fontWeight: 700 }}
          >
            Back
          </Button>

          <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
            {activeStep !== "payment" ? (
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={() => {
                  if (activeStep === "ordering") {
                    setActiveStep("cart");
                    return;
                  }
                  if (!cartItems.length) {
                    setStatusMessage({ type: "warning", text: "Add products to continue." });
                    return;
                  }
                  setActiveStep("payment");
                }}
                sx={{
                  textTransform: "none",
                  borderRadius: 999,
                  px: 2,
                  fontWeight: 800,
                  boxShadow: "none",
                  background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)",
                }}
              >
                {activeStep === "ordering" ? "Review cart" : "Checkout"}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handlePlaceOrder}
                disabled={placingOrder || !cartItems.length || !addressReady}
                sx={{
                  textTransform: "none",
                  borderRadius: 999,
                  px: 2.4,
                  fontWeight: 800,
                  boxShadow: "none",
                  background: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
                }}
              >
                {placingOrder ? "Placing..." : "Place order"}
              </Button>
            )}
          </Box>
        </Box>
      </Drawer>

      <Dialog
        open={showNoteDialog}
        onClose={() => setShowNoteDialog(false)}
        fullWidth
        maxWidth="xs"
        disableEnforceFocus
        disableAutoFocus
        sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
        PaperProps={{
          sx: {
            zIndex: (theme) => theme.zIndex.modal + 10,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Add order note</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Order note"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowNoteDialog(false);
              setShowOrderDetails(true);
            }}
          >
            Skip
          </Button>
          <Button variant="contained" onClick={handleAddNote} disabled={!noteText.trim()}>
            Add note
          </Button>
        </DialogActions>
      </Dialog>

      {showOrderDetails && latestOrderId ? (
        <OrderDetailsPopup
          orderId={latestOrderId}
          agentName={agentName}
          customerPhone={customer.phone || phone10}
          discount={Number(discount || 0)}
          discountType={discountType}
          paymentMethod={paymentMethod}
          transactionId={transactionId}
          zIndex={3005}
          onClose={() => setShowOrderDetails(false)}
        />
      ) : null}
    </>
  );
}
