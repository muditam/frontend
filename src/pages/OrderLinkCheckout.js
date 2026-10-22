import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Radio,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SchoolIcon from "@mui/icons-material/School";
import StarIcon from "@mui/icons-material/Star";
import VerifiedIcon from "@mui/icons-material/Verified";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import MedicalServicesOutlinedIcon from "@mui/icons-material/MedicalServicesOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import axios from "axios";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const LOGO = "/muditam-logo.avif";
const DEMO_EXPERT_IMAGE = "/demo-expert.svg";
const MUDITAM_HOME = "https://www.muditam.com";

const fmt = (n) => `₹${Number(n || 0).toFixed(0)}`;

const ui = {
  canvas: "#2d2633",
  paper: "#fff",
  ink: "#2d2633",
  muted: "#a591a7",
  line: "rgba(165, 145, 167, 0.25)",
  brand: "#83619f",
  brandDeep: "#5c3e75",
  brandSoft: "#eedeff",
  page: "#F5F0FF",
  green: "#047857",
  greenDeep: "#064e3b",
  greenSoft: "#ecfdf5",
  greenLine: "#a7f3d0",
};

const cardSx = {
  bgcolor: ui.paper,
  border: `1px solid ${ui.line}`,
  borderRadius: "16px",
  p: { xs: 1.75, lg: 2.5 },
  boxShadow: "0 1px 2px rgba(45, 38, 51, 0.05)",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    bgcolor: "rgba(238, 222, 255, 0.3)",
    fontSize: 15,
    color: ui.ink,
    "& fieldset": { borderColor: "rgba(165, 145, 167, 0.35)" },
    "&:hover fieldset": { borderColor: ui.brand },
    "&.Mui-focused fieldset": { borderColor: ui.brand, borderWidth: 1 },
    "&.Mui-focused": { bgcolor: ui.paper },
  },
  "& .MuiInputLabel-root": { fontSize: 15 },
};

const sectionLabelSx = {
  fontSize: 12.5,
  fontWeight: 700,
  color: ui.muted,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const initialsOf = (name) =>
  String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";

export const VERIFY_PAYMENT_TIMEOUT_MS = 45000;

export function markPaymentAttemptPending(link) {
  return link ? { ...link, status: "payment_pending" } : link;
}

export function verifyPaymentWithTimeout(url, payload, timeoutMs = VERIFY_PAYMENT_TIMEOUT_MS) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timeoutId;
  const request = axios.post(url, payload, controller ? { signal: controller.signal } : undefined);
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller?.abort();
      const error = new Error("Payment verification timed out");
      error.code = "PAYMENT_VERIFICATION_TIMEOUT";
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([request, timeout]).finally(() => clearTimeout(timeoutId));
}

export default function OrderLinkCheckout() {
  const { token } = useParams();
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [address, setAddress] = useState({});
  const [addressOpen, setAddressOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [codOtpOpen, setCodOtpOpen] = useState(false);
  const [codOtp, setCodOtp] = useState("");
  const [codOtpVerified, setCodOtpVerified] = useState(false);
  const [codOtpBusy, setCodOtpBusy] = useState(false);
  const [paymentState, setPaymentState] = useState("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const paymentVerificationRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/order-links/public/${token}`);
      setLink(data.orderLink);
      setAddress(data.orderLink.shippingAddress || {});
    } catch (err) {
      setError(err?.response?.data?.message || "Order link not found.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const query = productQuery.trim();
    if (!query || productsLoaded) return;
    let cancelled = false;
    setProductsLoading(true);
    setProductsError("");
    axios.get(`${API_BASE}/api/order-links/public/${token}/products`)
      .then(({ data }) => {
        if (cancelled) return;
        setProducts(data?.products || []);
        setProductsLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setProductsError(err?.response?.data?.message || "Could not load products.");
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productQuery, productsLoaded, token]);

  const isDone = link?.status === "order_created";
  const isExpired = link?.status === "expired";
  const locked = isDone || isExpired || link?.status === "payment_pending" || !!busy || paymentState === "checkout_open" || paymentState === "verification_failed";

  const addressSummary = useMemo(() => {
    const lineOne = [address?.address1, address?.address2].filter(Boolean).join(", ");
    const lineTwo = [address?.city, address?.province, address?.zip].filter(Boolean).join(", ");
    const lineThree = address?.country;
    return [lineOne, lineTwo, lineThree].filter(Boolean);
  }, [address]);
  const expertProfile = link?.expertProfile || null;
  const expert = link?.expert || {};
  const expertName = expertProfile?.displayName || expert.name || "Muditam Wellness Expert";
  const expertRole = expertProfile?.title || "Certified Dietician";
  const expertImage = expertProfile?.imageUrl || DEMO_EXPERT_IMAGE;
  const expertBio = expertProfile?.bio || "Your plan was reviewed with you on your call. I am here to guide you through your journey and answer any questions you may have.";
  const expertBadges = expertProfile?.badges?.length
    ? expertProfile.badges
    : [
        { label: "Verified Expert", iconType: "verified" },
        { label: "M.Sc. Nutrition", iconType: "education" },
        { label: "5+ Years Experience", iconType: "star" },
      ];
  const expertInitials = initialsOf(expertName);
  const testimonials = expertProfile?.testimonials?.length
    ? expertProfile.testimonials.map((item) => ({
        name: item.customerName || "Muditam Customer",
        city: item.city || "",
        quote: item.text || "",
        imageUrl: item.imageUrl || "",
        rating: Number(item.rating || 5),
        hba1cFrom: item.hba1cFrom || "",
        hba1cTo: item.hba1cTo || "",
      }))
    : [
        {
          name: "Priya S.",
          city: "Delhi",
          quote: `${expertName.split(" ")[0] || "My expert"} explained everything in a very simple way and answered all my questions.`,
          imageUrl: "",
          rating: 5,
        },
        {
          name: "Rohit K.",
          city: "Gurgaon",
          quote: "The consultation was helpful. I got clear guidance on the products and diet plan.",
          imageUrl: "",
          rating: 5,
        },
        {
          name: "Neha M.",
          city: "Noida",
          quote: "Very knowledgeable and patient. The right plan was suggested for my routine.",
          imageUrl: "",
          rating: 5,
        },
      ];
  const productMatches = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return [];
    return products
      .flatMap((product) => (product.variants || []).map((variant) => ({
        variantId: String(variant.id),
        productTitle: product.title,
        variantTitle: variant.title,
        image: product.image,
        unitPrice: Number(variant.price || 0),
      })))
      .filter((item) => `${item.productTitle} ${item.variantTitle}`.toLowerCase().includes(query))
      .slice(0, 6);
  }, [productQuery, products]);

  const syncCart = async (items) => {
    setBusy("cart");
    try {
      const { data } = await axios.patch(`${API_BASE}/api/order-links/public/${token}/cart`, { items });
      setLink(data.orderLink);
    } catch (err) {
      alert(err?.response?.data?.message || "Could not update cart.");
    } finally {
      setBusy("");
    }
  };

  const changeQty = (variantId, nextQty) => {
    const items = (link.cartItems || [])
      .map((item) => (item.variantId === variantId ? { ...item, quantity: Math.max(0, nextQty) } : item))
      .filter((item) => item.quantity > 0);
    syncCart(items);
  };

  const addProductToCart = (product) => {
    const currentItems = link.cartItems || [];
    const exists = currentItems.some((item) => item.variantId === product.variantId);
    const items = exists
      ? currentItems.map((item) => (item.variantId === product.variantId ? { ...item, quantity: Number(item.quantity || 0) + 1 } : item))
      : [...currentItems, { ...product, quantity: 1 }];
    syncCart(items);
  };

  const saveAddress = async () => {
    setBusy("address");
    try {
      const { data } = await axios.patch(`${API_BASE}/api/order-links/public/${token}/address`, { shippingAddress: address });
      setLink(data.orderLink);
      return true;
    } catch (err) {
      alert(err?.response?.data?.message || "Could not save address.");
      return false;
    } finally {
      setBusy("");
    }
  };

  const confirmCod = async () => {
    if (!codOtpVerified) {
      setCodOtpBusy(true);
      try {
        await axios.post(`${API_BASE}/api/order-links/public/${token}/cod-otp/send`);
        setCodOtp("");
        setCodOtpOpen(true);
      } catch (err) {
        alert(err?.response?.data?.message || "Could not send OTP.");
      } finally {
        setCodOtpBusy(false);
      }
      return;
    }
    setBusy("cod");
    try {
      const { data } = await axios.post(`${API_BASE}/api/order-links/public/${token}/confirm-cod`);
      setLink(data.orderLink);
    } catch (err) {
      alert(err?.response?.data?.message || "Could not confirm COD.");
    } finally {
      setBusy("");
    }
  };

  const verifyCodOtp = async () => {
    if (!codOtp.trim()) return;
    setCodOtpBusy(true);
    try {
      await axios.post(`${API_BASE}/api/order-links/public/${token}/cod-otp/verify`, { otp: codOtp });
      setCodOtpVerified(true);
      setCodOtpOpen(false);
      setBusy("cod");
      const { data } = await axios.post(`${API_BASE}/api/order-links/public/${token}/confirm-cod`);
      setLink(data.orderLink);
    } catch (err) {
      alert(err?.response?.data?.message || "Invalid OTP.");
    } finally {
      setCodOtpBusy(false);
      setBusy("");
    }
  };

  const payOnline = async (selectedMode) => {
    setPaymentMessage("");
    setPaymentState("starting");
    setBusy(selectedMode);
    try {
      const { data } = await axios.post(`${API_BASE}/api/order-links/public/${token}/payments/razorpay-order`, { selectedMode });
      if (!window.Razorpay) {
        setPaymentState("verification_failed");
        setPaymentMessage("Payment could not be started. Please refresh this page and try again.");
        return;
      }
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Muditam",
        description: selectedMode === "Partial Paid" ? "Advance payment" : "Order payment",
        order_id: data.orderId,
        handler: async (response) => {
          paymentVerificationRef.current = true;
          setPaymentState("verifying");
          setPaymentMessage("Payment received. Confirming your order...");
          try {
            const verify = await verifyPaymentWithTimeout(
              `${API_BASE}/api/order-links/public/${token}/payments/verify`,
              response
            );
            setLink(verify.data.orderLink);
            setPaymentState("complete");
            setPaymentMessage("");
          } catch (err) {
            setPaymentState("verification_failed");
            setPaymentMessage(
              err?.code === "PAYMENT_VERIFICATION_TIMEOUT"
                ? "Payment verification is taking longer than expected. Your payment may have gone through. Refresh the order status before trying again or contact support."
                : err?.response?.status === 409
                ? "Your payment is being processed. Please refresh the order status before trying again."
                : "Your payment may have gone through, but order confirmation is still pending. Refresh the status or contact support before paying again."
            );
          } finally {
            paymentVerificationRef.current = false;
            setBusy("");
          }
        },
        modal: {
          ondismiss: () => {
            if (!paymentVerificationRef.current) {
              setLink((current) => markPaymentAttemptPending(current));
              setPaymentState("idle");
              setPaymentMessage("Payment was not completed. You can cancel this payment attempt to edit your order.");
            }
            setBusy("");
          },
        },
        prefill: { name: link.customer?.name, contact: link.customer?.phone },
      });
      setPaymentState("checkout_open");
      checkout.open();
    } catch (err) {
      setPaymentState("verification_failed");
      setPaymentMessage(err?.response?.data?.message || "Could not start payment. Please refresh and try again.");
    } finally {
      if (paymentState !== "checkout_open" && paymentState !== "verifying") setBusy("");
    }
  };

  const refreshPaymentStatus = async () => {
    setPaymentMessage("Refreshing order status...");
    try {
      await load();
      setPaymentState("idle");
      setPaymentMessage("Status refreshed. If payment is still pending, you can safely continue from this order link.");
    } catch (err) {
      setPaymentMessage("Could not refresh the order status. Please try again.");
    }
  };

  const cancelPaymentAttempt = async () => {
    setBusy("cancel-payment");
    try {
      const { data } = await axios.post(`${API_BASE}/api/order-links/public/${token}/payments/cancel`);
      setLink(data.orderLink);
      setPaymentState("idle");
      setPaymentMessage("Payment attempt cancelled. You can now edit your order or address.");
    } catch (err) {
      setPaymentMessage(err?.response?.data?.message || "Could not cancel the payment attempt. Please refresh and try again.");
    } finally {
      setBusy("");
    }
  };


  const totals = link?.totals || {};
  const paymentMode = link?.paymentMode;
  const paymentOptions = [];
  if (paymentMode === "COD") {
    paymentOptions.push({ key: "cod", title: "Cash on Delivery", sub: "Pay the full amount at your doorstep", badge: "", amount: totals.codTotal });
  }
  if (paymentMode === "COD" || paymentMode === "Partial Paid") {
    paymentOptions.push({
      key: "partial",
      title: paymentMode === "Partial Paid" ? "Partially pay and confirm your order now" : "Pay 5% now and confirm your order instantly",
      sub: paymentMode === "Partial Paid"
        ? "Pay the configured advance now and the remaining balance on delivery."
        : "Confirm your order with a 5% online advance. The remaining amount is payable on delivery.",
      badge: "",
      amount: totals.partialAdvance,
    });
  }
  if (paymentMode === "COD" || paymentMode === "Partial Paid" || paymentMode === "Prepaid") {
    paymentOptions.push({
      key: "prepay",
      title: paymentMode === "COD" ? "Pay now & save 5%" : "Pay full amount now",
      sub: paymentMode === "COD" ? "Pay online (UPI / Card) and get priority dispatch" : "Pay online (UPI / Card) and get priority dispatch",
      badge: "Popular",
      amount: paymentMode === "COD" ? totals.fullOnlineTotal : totals.codTotal,
    });
  }
  const selected = paymentOptions.some((option) => option.key === selectedPayment) ? selectedPayment : paymentOptions[0]?.key;
  const selectedOption = paymentOptions.find((option) => option.key === selected);
  const prepayDiscount = paymentMode === "COD" && selected === "prepay" ? Math.max(0, Number(totals.codTotal || 0) - Number(totals.fullOnlineTotal || 0)) : 0;
  const orderTotal = selected === "prepay" ? Number(selectedOption?.amount || 0) : Number(totals.codTotal || 0);
  const payNow = selected === "partial" ? Number(totals.partialAdvance || 0) : Number(selectedOption?.amount || 0);
  const payLater = Math.max(0, Number(totals.codTotal || 0) - Number(totals.partialAdvance || 0));
  const totalSavings = Number(totals.agentDiscount || 0) + prepayDiscount;

  let actionLabel = "Place Order";
  if (selected === "cod") actionLabel = codOtpBusy ? "Sending OTP..." : `Place Order (COD - ${fmt(payNow)})`;
  else if (selected === "partial") actionLabel = busy === "Partial Paid" ? "Starting payment..." : `Pay ${fmt(payNow)} advance & confirm`;
  else if (selected === "prepay") actionLabel = busy === "Prepaid" ? "Starting payment..." : paymentMode === "COD" ? `Pay ${fmt(payNow)} & save 5%` : `Pay ${fmt(payNow)} now`;

  const mobileActionLabel = codOtpBusy || busy === "Partial Paid" || busy === "Prepaid"
    ? actionLabel
    : selected === "cod" ? "Place Order" : selected === "partial" ? "Pay & Confirm" : "Pay Now";

  const handlePrimaryAction = () => {
    if (selected === "cod") confirmCod();
    else payOnline(selected === "partial" ? "Partial Paid" : "Prepaid");
  };
  const primaryDisabled = selected === "cod" ? (!!busy || codOtpBusy) : locked;

  const saveAddressAndClose = async () => {
    const saved = await saveAddress();
    if (saved) setAddressOpen(false);
  };

  const renderActionButton = (label, compact = false) => (
    <Button
      fullWidth
      disabled={primaryDisabled}
      onClick={handlePrimaryAction}
      endIcon={compact ? null : <ChevronRightIcon />}
      sx={{
        bgcolor: ui.brand,
        color: "#fff",
        fontWeight: 700,
        fontSize: compact ? 15 : 16,
        py: compact ? 1.05 : 1.5,
        borderRadius: compact ? "14px" : "12px", letterSpacing: 0, whiteSpace: "nowrap",
        textTransform: "none",
        boxShadow: compact ? "none" : "0 6px 14px rgba(131, 97, 159, 0.3)",
        "&:hover": { bgcolor: ui.brandDeep },
        "&.Mui-disabled": { bgcolor: "rgba(131, 97, 159, 0.45)", color: "#fff" },
      }}
    >
      {label}
    </Button>
  );
  const actionButton = renderActionButton(actionLabel);

  const paymentStatusBlock = (paymentMessage || link?.status === "payment_pending") ? (
    <Box sx={{ mt: 1, p: 1.25, borderRadius: "12px", border: `1px solid ${ui.line}`, bgcolor: ui.paper }}>
      {paymentMessage && (
        <Typography sx={{ color: ui.ink, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{paymentMessage}</Typography>
      )}
      {paymentState === "verification_failed" && (
        <Button size="small" onClick={refreshPaymentStatus} sx={{ mt: 0.5, px: 0, textTransform: "none", fontWeight: 700, color: ui.brand }}>
          Refresh order status
        </Button>
      )}
      {link?.status === "payment_pending" && (
        <Button
          fullWidth
          variant="outlined"
          disabled={!!busy}
          onClick={cancelPaymentAttempt}
          startIcon={busy === "cancel-payment" ? <CircularProgress color="inherit" size={16} /> : <RestartAltIcon />}
          sx={{ mt: 1, minHeight: 44, borderRadius: "12px", borderColor: ui.brand, color: ui.brandDeep, textTransform: "none", fontWeight: 700, "&:hover": { borderColor: ui.brandDeep, bgcolor: ui.brandSoft } }}
        >
          {busy === "cancel-payment" ? "Cancelling payment..." : "Cancel payment and edit order"}
        </Button>
      )}
    </Box>
  ) : null;

  if (loading) {
    return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: ui.page }}><CircularProgress sx={{ color: ui.brand }} /></Box>;
  }

  if (error) {
    return <Box sx={{ minHeight: "100vh", bgcolor: ui.page, color: ui.ink }}><Container sx={{ py: 6 }}><Typography variant="h5">{error}</Typography></Container></Box>;
  }

  const addressCard = (
    <Box sx={cardSx}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 0.75 }}>
          <LocationOnIcon sx={{ fontSize: 18.5, color: ui.brand }} /> Delivery Address
        </Typography>
        <Button size="small" disabled={locked} onClick={() => setAddressOpen(true)} sx={{ minWidth: 0, p: 0, fontSize: 14, fontWeight: 700, textTransform: "none", color: ui.brand }}>
          Change
        </Button>
      </Box>
      <Box sx={{ pl: 1.5, borderLeft: `2px solid ${ui.brand}`, fontSize: 14, lineHeight: 1.6, color: "rgba(45, 38, 51, 0.7)" }}>
        {link.customer?.name && <Typography sx={{ fontSize: 14, fontWeight: 700, color: ui.ink }}>{link.customer.name}</Typography>}
        {addressSummary.length ? addressSummary.map((line) => (
          <Typography key={line} sx={{ fontSize: 14, lineHeight: 1.6 }}>{line}</Typography>
        )) : <Typography sx={{ fontSize: 14, fontWeight: 600 }}>No address added yet.</Typography>}
        {link.customer?.phone && <Typography sx={{ mt: 0.5, fontSize: 12.5, color: ui.muted }}>Phone: {link.customer.phone}</Typography>}
      </Box>
      <Box sx={{ mt: 1.25, px: 1.25, py: 0.9, borderRadius: "10px", bgcolor: ui.greenSoft, border: `1px solid ${ui.greenLine}`, display: "flex", alignItems: "center", gap: 1 }}>
        <LocalShippingOutlinedIcon sx={{ fontSize: 18, color: ui.green }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: ui.greenDeep }}>Estimated delivery in 2-3 days</Typography>
      </Box>
    </Box>
  );

  const billCard = (
    <Box sx={{ ...cardSx, p: 2 }}>
      <Typography sx={{ ...sectionLabelSx, mb: 1.5 }}>Bill Summary</Typography>
      <Stack spacing={1} sx={{ fontSize: 14 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", color: "rgba(45, 38, 51, 0.8)" }}>
          <span>Items Total</span>
          <Box component="span" sx={{ fontWeight: 600, color: ui.ink }}>{fmt(totals.subtotal)}</Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", color: Number(totals.agentDiscount || 0) > 0 ? ui.green : "rgba(45, 38, 51, 0.8)", fontWeight: Number(totals.agentDiscount || 0) > 0 ? 500 : 400 }}>
          <span>Discount</span>
          <span>{Number(totals.agentDiscount || 0) > 0 ? `-${fmt(totals.agentDiscount)}` : fmt(0)}</span>
        </Box>
        {prepayDiscount > 0 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", color: ui.green, fontWeight: 500 }}>
            <span>Prepay 5% Extra Discount</span>
            <span>-{fmt(prepayDiscount)}</span>
          </Box>
        )}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "rgba(45, 38, 51, 0.8)" }}>
          <span>Delivery Fee</span>
          {Number(totals.shipping || 0) > 0 ? (
            <Box component="span" sx={{ fontWeight: 600, color: ui.ink }}>{fmt(totals.shipping)}</Box>
          ) : (
            <Box component="span" sx={{ fontWeight: 700, color: ui.green, fontSize: 11.5, textTransform: "uppercase", bgcolor: ui.greenSoft, px: 0.75, py: 0.25, borderRadius: "4px" }}>Free</Box>
          )}
        </Box>
        <Box sx={{ borderTop: "1px dashed rgba(165, 145, 167, 0.4)", mt: 0.5, pt: 1.25, display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700 }}>
          <Box component="span">
            {selected === "partial" ? "Order Total" : "To Pay"}
            <Box component="span" sx={{ ml: 0.75, fontSize: 11.5, fontWeight: 500, color: ui.muted }}>(Inclusive of all taxes)</Box>
          </Box>
          <Box component="span" sx={{ color: ui.brand }}>{fmt(orderTotal)}</Box>
        </Box>
      </Stack>
    </Box>
  );

  const paymentCard = paymentOptions.length ? (
    <Box>
      <Typography sx={{ ...sectionLabelSx, mb: 1 }}>Select Payment Option</Typography>
      <Stack spacing={1.25}>
        {paymentOptions.map((option) => {
          const active = option.key === selected;
          return (
            <Box
              key={option.key}
              onClick={() => !locked && setSelectedPayment(option.key)}
              sx={{
                bgcolor: active ? "#f7efff" : ui.paper,
                border: active ? `2px solid ${ui.brand}` : `1px solid rgba(165, 145, 167, 0.3)`,
                m: active ? 0 : "1px",
                borderRadius: "16px",
                p: 1.5,
                cursor: locked ? "default" : "pointer",
                transition: "all .15s ease",
                "&:hover": locked ? undefined : { borderColor: ui.brand },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Radio checked={active} disabled={locked} size="small" sx={{ p: 0, mt: "2px", color: ui.muted, "&.Mui-checked": { color: ui.brand } }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, flexWrap: "wrap" }}>
                      <Typography sx={{ fontSize: 14.5, fontWeight: 700 }}>{option.title}</Typography>
                      {option.badge && (
                        <Box component="span" sx={{ fontSize: 10.5, fontWeight: 700, px: 0.9, py: 0.2, borderRadius: "999px", whiteSpace: "nowrap", bgcolor: "#d1fae5", color: "#065f46" }}>
                          {option.badge}
                        </Box>
                      )}
                    </Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: active ? ui.brand : ui.ink, whiteSpace: "nowrap" }}>{fmt(option.amount)}</Typography>
                  </Box>
                  <Typography sx={{ mt: 0.25, fontSize: 11.5, color: ui.muted }}>
                    {option.key === "partial" ? `${fmt(payLater)} payable on delivery · confirms your order instantly` : option.sub}
                  </Typography>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  ) : null;

  const expertCard = (
    <Box sx={{ p: { xs: 2, lg: 3 }, color: "#fff", borderRadius: "16px", position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${ui.brand} 0%, ${ui.brandDeep} 100%)`, boxShadow: "0 8px 20px rgba(92, 62, 117, 0.25)" }}>
      <Box sx={{ position: "absolute", right: -24, bottom: -24, width: 128, height: 128, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.1)", filter: "blur(16px)", pointerEvents: "none" }} />
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 2, lg: 3 }, position: "relative" }}>
        <Box sx={{ position: "relative", flexShrink: 0 }}>
          <Avatar src={expertImage} alt={expertName} sx={{ width: { xs: 100, lg: 120 }, height: { xs: 100, lg: 120 }, border: "3px solid rgba(255,255,255,0.45)", flexShrink: 0 }}>{expertInitials}</Avatar>
          <Box sx={{ position: "absolute", right: 0, bottom: 0, width: { xs: 16, lg: 22 }, height: { xs: 16, lg: 22 }, bgcolor: "#34d399", border: `2px solid ${ui.brand}`, borderRadius: "50%" }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 17, lg: 24 }, lineHeight: 1.2 }}>{expertName}</Typography>
          <Typography sx={{ fontSize: { xs: 13, lg: 16 }, fontWeight: 500, color: ui.brandSoft, mt: 0.5 }}>{expertRole}</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
            {expertBadges.map((badge, index) => {
              const BadgeIcon = badge.iconType === "education" ? SchoolIcon : badge.iconType === "star" ? StarIcon : VerifiedIcon;
              return (
                <Box key={`${badge.label}-${index}`} component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, fontSize: 10.5, fontWeight: 500, px: 1, py: 0.25, borderRadius: "999px", bgcolor: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <BadgeIcon sx={{ fontSize: 12.5 }} />
                  {badge.label}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
      <Box sx={{ mt: { xs: 1.75, lg: 2.5 }, p: { xs: 1.5, lg: 2 }, borderRadius: "12px", bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.1)", position: "relative" }}>
        <Typography sx={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: "rgba(255,255,255,0.95)" }}>{expertBio}</Typography>
      </Box>
    </Box>
  );

  const itemsCard = (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          Prescribed Items
          <Box component="span" sx={{ bgcolor: ui.brand, color: "#fff", fontSize: 11.5, px: 1, py: 0.25, borderRadius: "999px", fontWeight: 700 }}>
            {(link.cartItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} Items
          </Box>
        </Typography>
      </Box>
      <Stack spacing={1.5}>
        {(link.cartItems || []).map((item) => (
          <Box key={item.variantId} sx={{ ...cardSx, p: { xs: 1.25, lg: 1.5 }, display: "flex", alignItems: "center", gap: { xs: 1.5, lg: 2 } }}>
            <Avatar src={item.image} variant="rounded" sx={{ width: { xs: 64, lg: 80 }, height: { xs: 64, lg: 80 }, borderRadius: "12px", bgcolor: "rgba(238, 222, 255, 0.3)", border: "1px solid rgba(165, 145, 167, 0.1)", flexShrink: 0, "& img": { objectFit: "contain" } }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 15, lg: 16.5 }, fontWeight: 700, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.productTitle}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
                <Typography sx={{ fontSize: { xs: 15, lg: 16 }, fontWeight: 700 }}>{fmt(item.unitPrice)}</Typography>
                {item.variantTitle && item.variantTitle !== "Default Title" && (
                  <Box component="span" sx={{ bgcolor: ui.brandSoft, color: ui.brand, fontSize: 11.5, fontWeight: 700, px: 1, py: 0.15, borderRadius: "999px" }}>
                    {item.variantTitle}
                  </Box>
                )}
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", border: "1px solid rgba(165, 145, 167, 0.3)", borderRadius: "10px", bgcolor: "rgba(238, 222, 255, 0.3)", flexShrink: 0 }}>
              <IconButton size="small" disabled={locked} onClick={() => changeQty(item.variantId, item.quantity - 1)} sx={{ width: 30, height: 30, borderRadius: "10px 0 0 10px", color: ui.ink }}>
                {item.quantity === 1 ? <DeleteOutlineIcon sx={{ fontSize: 17 }} /> : <RemoveIcon sx={{ fontSize: 17 }} />}
              </IconButton>
              <Typography sx={{ width: 22, textAlign: "center", fontSize: 14, fontWeight: 700 }}>{item.quantity}</Typography>
              <IconButton size="small" disabled={locked} onClick={() => changeQty(item.variantId, item.quantity + 1)} sx={{ width: 30, height: 30, borderRadius: "0 10px 10px 0", color: ui.ink }}>
                <AddIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );

  const recommendationStrip = (
    <Box sx={{ p: 1.5, borderRadius: "16px", bgcolor: "rgba(236, 253, 245, 0.9)", border: `1px solid ${ui.greenLine}`, display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: "#d1fae5", color: ui.green, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <MedicalServicesOutlinedIcon sx={{ fontSize: 16 }} />
      </Box>
      <Typography sx={{ fontSize: 13, lineHeight: 1.4, fontWeight: 500, color: ui.greenDeep }}>
                  This plan is recommended based on your health needs discussed with{" "}
        <Box component="span" sx={{ fontWeight: 700, textDecoration: "underline", textDecorationColor: ui.greenLine }}>{expertName}</Box>
      </Typography>
    </Box>
  );

  const searchCard = !locked ? (
    <Box sx={{ ...cardSx, p: 1.75 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.75 }}>Search Other Products</Typography>
      <TextField
        fullWidth
        size="small"
        placeholder="Search other products..."
        value={productQuery}
        onChange={(e) => setProductQuery(e.target.value)}
        sx={inputSx}
        InputProps={{
          startAdornment: <SearchIcon sx={{ fontSize: 18.5, color: ui.muted, mr: 1 }} />,
          endAdornment: productQuery ? (
            <IconButton size="small" onClick={() => setProductQuery("")} aria-label="Clear search"><CloseIcon sx={{ fontSize: 17 }} /></IconButton>
          ) : null,
        }}
      />
      {productQuery.trim() && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${ui.line}` }}>
          {productsLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} />
              <Typography sx={{ color: ui.muted, fontSize: 14 }}>Searching products...</Typography>
            </Box>
          ) : productsError ? (
            <Typography sx={{ color: "#a34236", fontSize: 14 }}>{productsError}</Typography>
          ) : productMatches.length ? (
            <Stack spacing={1}>
              {productMatches.map((product) => (
                <Box key={product.variantId} sx={{ display: "flex", alignItems: "center", gap: 1.25, p: 1.25, borderRadius: "12px", bgcolor: "rgba(238, 222, 255, 0.2)", border: `1px solid ${ui.line}` }}>
                  <Avatar src={product.image} variant="rounded" sx={{ width: 40, height: 40, borderRadius: "8px" }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 14, fontWeight: 700 }}>{product.productTitle}</Typography>
                    <Typography noWrap sx={{ fontSize: 12.5, color: ui.muted }}>
                      {product.variantTitle && product.variantTitle !== "Default Title" ? `${product.variantTitle} · ` : ""}{fmt(product.unitPrice)}
                    </Typography>
                  </Box>
                  <Button size="small" disabled={!!busy} onClick={() => addProductToCart(product)} sx={{ bgcolor: ui.brand, color: "#fff", fontSize: 14, fontWeight: 700, px: 1.5, py: 0.5, borderRadius: "8px", textTransform: "none", minWidth: 0, "&:hover": { bgcolor: ui.brandDeep }, "&.Mui-disabled": { bgcolor: "rgba(131, 97, 159, 0.4)", color: "#fff" } }}>
                    + Add
                  </Button>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ color: ui.muted, fontSize: 14, textAlign: "center", py: 0.5 }}>No products found matching "{productQuery}"</Typography>
          )}
        </Box>
      )}
    </Box>
  ) : null;

  const testimonialsCard = (
    <Box sx={{ ...cardSx, p: 1.75 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25, gap: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 0.75 }}>
          <FavoriteBorderIcon sx={{ fontSize: 18.5, color: ui.brand }} />
          What clients say about {expertName}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", scrollBehavior: "smooth", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
        {testimonials.map((item) => (
          <Box key={item.name} sx={{ minWidth: 240, maxWidth: 240, flexShrink: 0, p: 1.5, borderRadius: "12px", bgcolor: "rgba(238, 222, 255, 0.2)", border: `1px solid ${ui.line}` }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
              <Avatar src={item.imageUrl || ""} sx={{ width: 28, height: 28, fontSize: 11.5, fontWeight: 700, bgcolor: "rgba(131, 97, 159, 0.2)", color: ui.brand }}>
                {initialsOf(item.name)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1 }}>{item.name}</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                  <Box sx={{ color: "#f6b800", display: "flex" }}>
                    {Array.from({ length: Math.max(1, Math.min(5, item.rating || 5)) }).map((_, i) => <StarIcon key={i} sx={{ fontSize: 11.5 }} />)}
                  </Box>
                  {item.city && <Typography sx={{ fontSize: 10.5, color: ui.muted, fontWeight: 500 }}>{item.city}</Typography>}
                </Box>
              </Box>
            </Box>
            <Typography sx={{ fontSize: 12.5, fontStyle: "italic", lineHeight: 1.4, color: "rgba(45, 38, 51, 0.8)" }}>"{item.quote}"</Typography>
            {(item.hba1cFrom || item.hba1cTo) && (
              <Box component="span" sx={{ mt: 1, display: "inline-flex", px: 0.8, py: 0.25, borderRadius: "6px", bgcolor: ui.greenSoft, color: ui.green, fontSize: 11.5, fontWeight: 700 }}>
                HbA1c {item.hba1cFrom || "-"} → {item.hba1cTo || "-"}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );

  const statusBanners = (
    <>
      {isDone && (
        <Box sx={{ p: 2, borderRadius: "16px", border: `1px solid ${ui.greenLine}`, bgcolor: ui.greenSoft }}>
          <Typography sx={{ fontWeight: 700, color: ui.greenDeep }}>Order confirmed</Typography>
          <Typography sx={{ fontSize: 15, color: ui.greenDeep }}>Shopify order: {link.shopifyOrder?.name}</Typography>
        </Box>
      )}
      {isExpired && (
        <Box sx={{ p: 2, borderRadius: "16px", border: "1px solid #E7B4A6", bgcolor: "#FFF1EC" }}>
          <Typography sx={{ fontWeight: 700 }}>This link has expired.</Typography>
        </Box>
      )}
    </>
  );

  const showCheckout = !isDone && !isExpired;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: ui.page, color: ui.ink, fontFamily: "'Inter', sans-serif" }}>
      <Box sx={{ width: "100%", bgcolor: ui.page, position: "relative" }}>
        <Box component="nav" sx={{ position: "sticky", top: 0, zIndex: 30, bgcolor: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${ui.line}`, px: { xs: 3, lg: 6 }, py: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box component="a" href={MUDITAM_HOME} target="_blank" rel="noreferrer" sx={{ display: "grid", textDecoration: "none" }}>
            <Box component="img" src={LOGO} alt="Muditam" sx={{ width: 104, height: 30, objectFit: "contain", objectPosition: "left center", display: "block" }} />
            <Typography component="span" sx={{ color: "rgba(45,38,51,0.6)", fontSize: 9, fontWeight: 600, letterSpacing: 0.7, lineHeight: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>The Plant Science</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.5, borderRadius: "999px", bgcolor: "#ecfdf5", color: "#059669", fontSize: 12.5, fontWeight: 700 }}>
            <LockOutlinedIcon sx={{ fontSize: 16 }} /> Secure checkout
          </Box>
        </Box>

        <Box sx={{ width: "100%", maxWidth: { xs: "100%", sm: 560, lg: 1480 }, mx: "auto", display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 8fr) minmax(0, 5fr)" }, gap: { xs: 2, lg: 2.5 }, alignItems: "start", p: { xs: 2, lg: 3 }, pb: { xs: showCheckout ? 14 : 3, lg: 4 } }}>
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            {statusBanners}
            <Box sx={{ ...cardSx, p: { xs: 1.75, lg: 2.5 } }}>
              <Typography sx={{ fontSize: { xs: 17, lg: 19 }, fontWeight: 700, lineHeight: 1.3 }}>
                Your <Box component="span" sx={{ display: { xs: "none", lg: "inline" } }}>personalized </Box>wellness plan is ready
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: { xs: 13, lg: 14 }, lineHeight: 1.5, color: "rgba(45, 38, 51, 0.7)" }}>
                <Box component="span" sx={{ display: { xs: "none", lg: "inline" } }}>Complete your order and take the next step towards a healthier you.</Box>
                <Box component="span" sx={{ display: { xs: "inline", lg: "none" } }}>Complete your order to start your journey.</Box>
              </Typography>
            </Box>
            {expertCard}
            {itemsCard}
            {recommendationStrip}
            {searchCard}
            {testimonialsCard}
            <Box sx={{ display: { xs: "block", lg: "none" } }}>{addressCard}</Box>
          </Stack>

          <Stack spacing={2} sx={{ minWidth: 0, position: { lg: "sticky" }, top: { lg: 76 } }}>
            <Box sx={{ display: { xs: "none", lg: "block" } }}>{addressCard}</Box>
            {billCard}
            {showCheckout && paymentCard}
            {showCheckout && (
              <Box sx={{ display: { xs: "none", lg: "block" } }}>
                {actionButton}
                {paymentStatusBlock}
              </Box>
            )}
          </Stack>
        </Box>

        {showCheckout && (
          <Box sx={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, display: { xs: "flex", lg: "none" }, justifyContent: "center" }}>
            <Box sx={{ width: "100%", maxWidth: { xs: "100%", sm: 560 }, bgcolor: "rgba(255,255,255,0.96)", backdropFilter: "blur(14px)", borderRadius: "20px 20px 0 0", boxShadow: "0 -4px 24px rgba(45, 38, 51, 0.12)", px: 2.25, pt: 1.25, pb: "calc(10px + env(safe-area-inset-bottom))" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                <Box sx={{ flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 500, color: ui.muted, lineHeight: 1.2 }}>{selected === "partial" ? "Pay now" : "Total"}</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.01em" }}>{fmt(payNow)}</Typography>
                  {totalSavings > 0 && (
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: ui.green, lineHeight: 1.2 }}>Saving {fmt(totalSavings)}</Typography>
                  )}
                </Box>
                <Box sx={{ flex: "0 0 46%", minWidth: 0 }}>{renderActionButton(mobileActionLabel, true)}</Box>
              </Box>
              {paymentStatusBlock}
            </Box>
          </Box>
        )}
      </Box>

      <Dialog
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        fullWidth
        maxWidth="xs"
        sx={{ "& .MuiDialog-container": { alignItems: { xs: "flex-end", sm: "center" } }, "& .MuiDialog-paper": { m: { xs: 0, sm: 2 }, width: "100%", borderRadius: { xs: "24px 24px 0 0", sm: "16px" } } }}
      >
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${ui.line}`, mb: 1.5 }}>
          Update Delivery Address
          <IconButton size="small" onClick={() => setAddressOpen(false)} aria-label="Close"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, pt: 0.5 }}>
            {[["address1", "Address line 1"], ["address2", "Address line 2"], ["city", "City"], ["province", "State"], ["zip", "Pincode"], ["country", "Country"]].map(([key, label]) => (
              <TextField key={key} size="small" label={label} value={address?.[key] || ""} disabled={locked} onChange={(e) => setAddress((p) => ({ ...p, [key]: e.target.value }))} sx={inputSx} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button fullWidth onClick={() => setAddressOpen(false)} sx={{ bgcolor: "rgba(238, 222, 255, 0.5)", color: ui.ink, borderRadius: "12px", fontWeight: 700, textTransform: "none", py: 1.1 }}>Cancel</Button>
          <Button fullWidth disabled={locked || busy === "address"} onClick={saveAddressAndClose} sx={{ bgcolor: ui.brand, color: "#fff", borderRadius: "12px", fontWeight: 700, textTransform: "none", py: 1.1, "&:hover": { bgcolor: ui.brandDeep }, "&.Mui-disabled": { bgcolor: "rgba(131, 97, 159, 0.45)", color: "#fff" } }}>
            {busy === "address" ? "Saving..." : "Save Address"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={codOtpOpen} onClose={() => !codOtpBusy && setCodOtpOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18.5 }}>Verify COD confirmation</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 1.5, fontSize: 15 }}>
            We sent a one-time password to the mobile number on this order. Enter it to confirm Cash on Delivery.
          </Typography>
          <TextField autoFocus fullWidth label="Enter OTP" value={codOtp} onChange={(event) => setCodOtp(event.target.value.replace(/\D/g, "").slice(0, 8))} inputProps={{ inputMode: "numeric", maxLength: 8 }} sx={inputSx} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCodOtpOpen(false)} disabled={codOtpBusy} sx={{ textTransform: "none", color: ui.ink }}>Cancel</Button>
          <Button variant="contained" onClick={verifyCodOtp} disabled={codOtpBusy || codOtp.length < 4} sx={{ textTransform: "none", bgcolor: ui.brand, "&:hover": { bgcolor: ui.brandDeep } }}>
            {codOtpBusy ? "Verifying..." : "Verify and confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
