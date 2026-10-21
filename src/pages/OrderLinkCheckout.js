import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EditIcon from "@mui/icons-material/Edit";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import SpaIcon from "@mui/icons-material/Spa";
import VerifiedIcon from "@mui/icons-material/Verified";
import GroupsIcon from "@mui/icons-material/Groups";
import SchoolIcon from "@mui/icons-material/School";
import StarIcon from "@mui/icons-material/Star";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import axios from "axios";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const LOGO = "/muditam-logo.avif";
const DEMO_EXPERT_IMAGE = "/demo-expert.svg";
const HERO_LEAVES_LEFT = "/order-link-leaves-left.svg";
const HERO_LEAVES_RIGHT = "/order-link-leaves-right.svg";
const MUDITAM_HOME = "https://www.muditam.com";

const fmt = (n) => `Rs ${Number(n || 0).toFixed(0)}`;

const ui = {
  canvas: "#f6f5f3",
  paper: "#fff",
  ink: "#17151a",
  muted: "#6f6a73",
  line: "#e7e4e9",
  soft: "#faf9fb",
  brand: "#5b358b",
  brandDeep: "#3d1f65",
  brandSoft: "#f1ebf7",
  green: "#15805a",
  greenDeep: "#174f37",
  greenSoft: "#e9f7f0",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "9px",
    bgcolor: ui.paper,
    fontWeight: 700,
    fontSize: 13,
    "& fieldset": { borderColor: "#dcd7df" },
    "&:hover fieldset": { borderColor: "#c9c1cf" },
    "&.Mui-focused fieldset": { borderColor: "#9b7bbd", boxShadow: "0 0 0 3px rgba(91,53,139,.08)" },
  },
  "& .MuiInputLabel-root": {
    color: ui.muted,
    fontSize: 12,
    fontWeight: 700,
  },
};

const panelSx = {
  borderRadius: "18px",
  border: `1px solid ${ui.line}`,
  bgcolor: ui.paper,
  boxShadow: "0 18px 44px rgba(26, 21, 32, 0.07)",
};

const iconBubbleSx = {
  width: 40,
  height: 40,
  borderRadius: "12px",
  display: "grid",
  placeItems: "center",
  bgcolor: ui.brandSoft,
  color: ui.brand,
  flex: "0 0 auto",
};

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
  const [mobileBillingOpen, setMobileBillingOpen] = useState(false);
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
  const expertInitials = expertName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";
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
  const paymentClarity = useMemo(() => {
    if (!link) return null;
    if (link.paymentMode === "COD") {
      return {
        title: "Cash on Delivery",
        body: "Confirm COD with OTP, pay 10% online and pay the rest on delivery, or pay fully online and save 5%.",
      };
    }
    if (link.paymentMode === "Partial Paid") {
      return {
        title: "Partial payment order",
        body: `Pay ${fmt(link.totals?.partialAdvance)} as advance now. The remaining amount will be collected on delivery.`,
      };
    }
    return {
      title: "Prepaid order",
      body: "Complete online payment now. Your Shopify order is created only after successful payment.",
    };
  }, [link]);

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
    } catch (err) {
      alert(err?.response?.data?.message || "Could not save address.");
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

  const paymentActions = link ? (
    <Stack spacing={1}>
      {link?.paymentMode === "COD" ? (
        <>
          <Button size="large" variant="contained" disabled={!!busy || codOtpBusy} onClick={confirmCod} endIcon={<ChevronRightIcon />} sx={{ justifyContent: "space-between", borderRadius: "10px", bgcolor: "#087f55", fontWeight: 850, py: 1.25, px: 1.7, textTransform: "none", letterSpacing: 0.05, boxShadow: "0 8px 18px rgba(8,127,85,.16)", "&:hover": { bgcolor: "#056b47", boxShadow: "0 10px 22px rgba(8,127,85,.22)" } }}>
            <span>{codOtpBusy ? "Sending OTP..." : `Confirm COD · ${fmt(link.totals?.codTotal)}`}</span>
          </Button>
          <Button size="large" variant="outlined" disabled={locked} onClick={() => payOnline("Partial Paid")} endIcon={<ChevronRightIcon />} sx={{ justifyContent: "space-between", borderRadius: "10px", borderColor: "#d8c9e8", color: "#482477", fontWeight: 850, py: 1.25, px: 1.7, textTransform: "none", "&:hover": { borderColor: "#482477", bgcolor: "#fbf8ff" } }}>
            Pay 10% advance · {fmt(link.totals?.partialAdvance)}
          </Button>
          <Button size="large" variant="outlined" disabled={locked} onClick={() => payOnline("Prepaid")} endIcon={<ChevronRightIcon />} sx={{ justifyContent: "space-between", borderRadius: "10px", borderColor: "#bfe5d2", color: "#087f55", fontWeight: 850, py: 1.25, px: 1.7, textTransform: "none", "&:hover": { borderColor: "#087f55", bgcolor: "#f3fcf7" } }}>
            Pay online &amp; save 5% · {fmt(link.totals?.fullOnlineTotal)}
          </Button>
        </>
      ) : link?.paymentMode === "Partial Paid" ? (
        <Button size="large" variant="contained" disabled={locked} onClick={() => payOnline("Partial Paid")} endIcon={<ChevronRightIcon />} sx={{ justifyContent: "space-between", borderRadius: "10px", bgcolor: "#087f55", fontWeight: 850, py: 1.25, px: 1.7, textTransform: "none", boxShadow: "0 8px 18px rgba(8,127,85,.16)", "&:hover": { bgcolor: "#056b47" } }}>
          Pay advance · {fmt(link.totals?.partialAdvance)}
        </Button>
      ) : (
        <Button size="large" variant="contained" disabled={locked} onClick={() => payOnline("Prepaid")} endIcon={<ChevronRightIcon />} sx={{ justifyContent: "space-between", borderRadius: "10px", bgcolor: "#087f55", fontWeight: 850, py: 1.25, px: 1.7, textTransform: "none", boxShadow: "0 8px 18px rgba(8,127,85,.16)", "&:hover": { bgcolor: "#056b47" } }}>
          Pay now · {fmt(link.totals?.payableTotal)}
        </Button>
      )}
    </Stack>
  ) : null;
  const paymentClarityBlock = paymentClarity ? (
    <Box sx={{ p: 1.25, border: "1px solid #d8efe4", borderRadius: "16px", background: "linear-gradient(135deg,#eaf8f1,#f8fffb)" }}>
      <Typography sx={{ color: ui.ink, fontSize: 13, fontWeight: 900, lineHeight: 1.25 }}>
        {paymentClarity.title}
      </Typography>
      <Typography sx={{ mt: 0.35, color: ui.muted, fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
        {paymentClarity.body}
      </Typography>
    </Box>
  ) : null;

  const paymentStatusBlock = (paymentMessage || link?.status === "payment_pending") ? (
    <Box sx={{ mt: 1, p: 1.25, borderRadius: "12px", border: `1px solid ${ui.line}`, bgcolor: ui.soft }}>
      <Typography sx={{ color: ui.muted, fontSize: 12, fontWeight: 750, lineHeight: 1.4 }}>
        {paymentMessage}
      </Typography>
      {paymentState === "verification_failed" && (
        <Button size="small" onClick={refreshPaymentStatus} sx={{ mt: 0.5, px: 0, textTransform: "none", fontWeight: 850 }}>
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
          sx={{
            mt: 1,
            minHeight: 44,
            borderRadius: "10px",
            borderColor: ui.brand,
            color: ui.brandDeep,
            bgcolor: ui.paper,
            textTransform: "none",
            fontWeight: 850,
            "&:hover": { borderColor: ui.brandDeep, bgcolor: ui.brandSoft },
            "&.Mui-focusVisible": { outline: `3px solid ${ui.brandSoft}`, outlineOffset: 2 },
          }}
        >
          {busy === "cancel-payment" ? "Cancelling payment..." : "Cancel payment and edit order"}
        </Button>
      )}
    </Box>
  ) : null;

  if (loading) {
    return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: ui.canvas }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Container sx={{ py: 6 }}><Typography variant="h5">{error}</Typography></Container>;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: ui.canvas, color: ui.ink, overflowX: "hidden", pb: { xs: isDone || isExpired ? 3 : 22, lg: 0 } }}>
      <Box sx={{ borderBottom: `1px solid ${ui.line}`, bgcolor: "rgba(255,255,255,0.94)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 20 }}>
        <Container maxWidth="lg" sx={{ py: { xs: 1, md: 1.35 }, px: { xs: 2, sm: 3 }, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Box
            component="a"
            href={MUDITAM_HOME}
            target="_blank"
            rel="noreferrer"
            sx={{ display: "grid", alignItems: "center", textDecoration: "none" }}
          >
            <Box component="img" src={LOGO} alt="Muditam" sx={{ width: { xs: 104, md: 124 }, height: 34, objectFit: "contain", objectPosition: "left center", display: "block" }} />
            <Typography
              component="span"
              sx={{
                color: "#7B727F",
                fontSize: { xs: 7.5, md: 8.5 },
                fontWeight: 750,
                letterSpacing: 0.7,
                lineHeight: 1,
                textTransform: "uppercase",
                textAlign: "left",
                whiteSpace: "nowrap",
              }}
            >
              The Plant Science
            </Typography>
          </Box>
          <Chip icon={<LockOutlinedIcon />} label="Secure checkout" sx={{ height: { xs: 30, md: 32 }, borderRadius: "999px", bgcolor: ui.greenSoft, color: ui.green, border: "1px solid #cce9d8", fontWeight: 800, fontSize: { xs: 10, md: 11 }, "& .MuiChip-label": { px: { xs: 0.7, md: 1.1 } }, "& .MuiChip-icon": { fontSize: 16, color: ui.green } }} />
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 1.5, md: 3 }, px: { xs: 1.5, sm: 3, md: 5 } }}>
        <Paper elevation={0} sx={{ mb: { xs: 1.25, md: 2 }, minHeight: { xs: 0, md: 132 }, p: { xs: 1.5, md: 2.5 }, borderRadius: { xs: "16px", md: "18px" }, border: "1px solid #dcefe5", background: "linear-gradient(105deg,#f3fbf6 0%,#fbfffd 48%,#eff8f2 100%)", position: "relative", overflow: "hidden", boxShadow: "0 18px 50px rgba(21,128,90,.07)" }}>
          <Box
            component="img"
            src={HERO_LEAVES_LEFT}
            alt=""
            aria-hidden="true"
            sx={{
              position: "absolute",
              left: { xs: -88, sm: -54, md: -18 },
              top: { xs: -28, md: -10 },
              width: { xs: 120, sm: 150, md: 184 },
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
          <Box
            component="img"
            src={HERO_LEAVES_RIGHT}
            alt=""
            aria-hidden="true"
            sx={{
              position: "absolute",
              right: { xs: -92, sm: -58, md: -45 },
              top: { xs: -12, md: -4 },
              bottom: "auto",
              width: { xs: 142, sm: 164, md: 230 },
              height: "auto",
              objectFit: "initial",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
          <Box sx={{ position: "relative", display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) auto" }, gap: { xs: 1, md: 3 }, alignItems: "center", pl: { xs: 2.5, sm: 5.5, md: 13.5 }, pr: { xs: 2.5, sm: 5.5, md: 13.5 } }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 24, sm: 34, md: 40 }, lineHeight: { xs: 1.12, md: 1.08 }, fontWeight: 950, letterSpacing: -0.8 }}>
                Your <Box component="span" sx={{ color: "#00794b" }}>personalised</Box> wellness plan is ready
              </Typography>
              <Typography sx={{ mt: { xs: 0.75, md: 1 }, color: "#3f4654", fontSize: { xs: 13, md: 18 }, lineHeight: 1.35, fontWeight: 650 }}>
                Complete your order below and take the next step towards a healthier you.
              </Typography>
            </Box>
            <Box sx={{ display: { xs: "none", md: "grid" }, gridTemplateColumns: "repeat(3, 120px)", gap: 1, alignItems: "center" }}>
              {[
                [<SpaIcon />, "Plant based", "solutions"],
                [<VerifiedIcon />, "Trusted by", "thousands"],
                [<GroupsIcon />, "Expert", "guidance"],
              ].map(([icon, line1, line2]) => (
                <Box key={line1} sx={{ textAlign: "center", borderLeft: "1px solid #d8e4dc", px: 2 }}>
                  <Box sx={{ color: line1 === "Expert" ? ui.brand : ui.green, mb: 0.5 }}>{icon}</Box>
                  <Typography sx={{ fontSize: 12, lineHeight: 1.15, fontWeight: 850 }}>{line1}<br />{line2}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>

        {isDone && (
          <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2, border: "1px solid #BBD7B3", bgcolor: "#F0F8EC" }}>
            <Typography sx={{ fontWeight: 900 }}>Order confirmed</Typography>
            <Typography>Shopify order: {link.shopifyOrder?.name}</Typography>
          </Paper>
        )}

        {isExpired && (
          <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2, border: "1px solid #E7B4A6", bgcolor: "#FFF1EC" }}>
            <Typography sx={{ fontWeight: 900 }}>This link has expired.</Typography>
          </Paper>
        )}

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 420px" }, gap: { xs: 1.25, md: 2 }, alignItems: "start", minWidth: 0 }}>
          <Stack spacing={{ xs: 1.25, md: 2 }} sx={{ minWidth: 0 }}>
            <Paper elevation={0} sx={{ ...panelSx, p: { xs: 1.15, sm: 1.7, md: 2 }, overflow: "hidden", display: "grid", gridTemplateColumns: { xs: "68px minmax(0,1fr)", md: "140px minmax(0,1fr) auto" }, gap: { xs: 1.15, md: 2 }, alignItems: "center" }}>
              <Box sx={{ position: "relative" }}>
                <Avatar src={expertImage} alt={expertName} sx={{ width: { xs: 64, md: 120 }, height: { xs: 64, md: 120 }, border: "1px solid #eadff3", boxShadow: "0 12px 32px rgba(91,53,139,.14)" }}>{expertInitials}</Avatar>
                <Box sx={{ position: "absolute", right: { xs: 3, md: 8 }, bottom: { xs: 3, md: 8 }, width: { xs: 15, md: 22 }, height: { xs: 15, md: 22 }, borderRadius: "50%", bgcolor: "#00a66a", border: "3px solid #fff" }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Chip label="Your assigned dietitian" size="small" sx={{ height: 22, borderRadius: "7px", bgcolor: ui.brandSoft, color: ui.brandDeep, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.7 }} />
                <Typography sx={{ mt: 0.55, fontSize: { xs: 18, md: 25 }, lineHeight: 1.12, fontWeight: 950, letterSpacing: -0.3 }}>{expertName}</Typography>
                <Typography sx={{ mt: 0.4, color: ui.muted, fontSize: { xs: 13, md: 15 }, fontWeight: 750 }}>{expertRole}</Typography>
                <Stack direction="row" spacing={0.55} useFlexGap flexWrap="wrap" sx={{ mt: { xs: 0.8, md: 1.2 } }}>
                  {expertBadges.map((badge, index) => {
                    const BadgeIcon = badge.iconType === "education" ? SchoolIcon : badge.iconType === "star" ? StarIcon : VerifiedIcon;
                    const isPrimary = index === 0;
                    return (
                      <Chip
                        key={`${badge.label}-${index}`}
                        icon={<BadgeIcon />}
                        label={badge.label}
                        size="small"
                          sx={{
                            height: { xs: 26, md: 32 },
                            "& .MuiChip-label": { px: { xs: 0.8, md: 1.2 }, fontSize: { xs: 11, md: 13 } },
                            "& .MuiChip-icon": { fontSize: { xs: 16, md: 20 } },
                          bgcolor: isPrimary ? ui.greenSoft : ui.soft,
                          color: isPrimary ? ui.green : ui.brandDeep,
                          fontWeight: isPrimary ? 850 : 800,
                          border: isPrimary ? "1px solid #cce9d8" : `1px solid ${ui.line}`,
                        }}
                      />
                    );
                  })}
                </Stack>
                <Typography sx={{ mt: { xs: 0.9, md: 1.25 }, color: "#424857", fontSize: { xs: 11.5, md: 13.5 }, lineHeight: 1.45, fontWeight: 650 }}>
                  {expertBio}
                </Typography>
              </Box>
              <Chip icon={<GroupsIcon />} label="Assigned to you" sx={{ display: { xs: "none", md: "inline-flex" }, alignSelf: "start", bgcolor: ui.greenSoft, color: ui.green, border: "1px solid #d5ece1", fontWeight: 900 }} />
            </Paper>

            <Paper elevation={0} sx={{ ...panelSx, p: { xs: 1.2, sm: 1.5, md: 2 }, overflow: "hidden" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: { xs: 1.1, md: 1.5 } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                  <ShoppingBagOutlinedIcon sx={{ fontSize: { xs: 18, md: 21 }, color: ui.brand }} />
                  <Typography sx={{ fontSize: { xs: 16, md: 20 }, fontWeight: 950, letterSpacing: -0.25 }}>Products in your plan</Typography>
                </Box>
                <Typography sx={{ color: ui.green, fontSize: 9, fontWeight: 850, textTransform: "uppercase", letterSpacing: 0.7 }}>
                  Expert recommended
                </Typography>
              </Box>

              <Stack spacing={{ xs: 0.85, md: 1 }}>
                {(link.cartItems || []).map((item) => (
                  <Box key={item.variantId} sx={{ display: "grid", gridTemplateColumns: { xs: "58px minmax(0, 1fr) auto", sm: "78px minmax(0, 1fr) auto" }, gap: { xs: 1, sm: 1.5 }, alignItems: "center", p: { xs: 0.9, md: 1.1 }, border: `1px solid ${ui.line}`, borderRadius: "14px", bgcolor: ui.paper }}>
                    <Avatar src={item.image} variant="rounded" sx={{ width: { xs: 58, sm: 78 }, height: { xs: 58, sm: 78 }, bgcolor: ui.soft, borderRadius: "12px", border: `1px solid ${ui.line}` }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 900, fontSize: { xs: 14, md: 16 }, lineHeight: 1.2 }}>{item.productTitle}</Typography>
                      <Typography noWrap sx={{ color: ui.muted, fontSize: { xs: 12, md: 13 }, mt: 0.35 }}>{item.variantTitle} · {fmt(item.unitPrice)}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.15, border: "1px solid #ded7e4", borderRadius: "12px", p: 0.3, justifySelf: "end", bgcolor: ui.soft }}>
                      <IconButton size="small" disabled={locked} onClick={() => changeQty(item.variantId, item.quantity - 1)} sx={{ width: { xs: 28, sm: 30 }, height: { xs: 28, sm: 30 }, borderRadius: "7px", color: ui.muted }}>
                        {item.quantity === 1 ? <DeleteOutlineIcon fontSize="small" /> : <RemoveIcon fontSize="small" />}
                      </IconButton>
                      <Typography sx={{ width: { xs: 18, sm: 22 }, textAlign: "center", fontWeight: 850, fontSize: { xs: 13, sm: 14 } }}>{item.quantity}</Typography>
                      <IconButton size="small" disabled={locked} onClick={() => changeQty(item.variantId, item.quantity + 1)} sx={{ width: { xs: 28, sm: 30 }, height: { xs: 28, sm: 30 }, borderRadius: "7px", color: ui.brand }}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Stack>

              <Box sx={{ mt: 1.2, p: 1.1, borderRadius: "12px", background: "linear-gradient(90deg,#e8f7ef,#f4fbf7)", color: "#006b43", display: "flex", gap: 1, alignItems: "center" }}>
                <SpaIcon sx={{ fontSize: 18 }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.35 }}>
                  This plan is recommended based on your health needs discussed with {expertName}.
                </Typography>
              </Box>

              {!locked && (
                <Box sx={{ mt: { xs: 1, md: 1.2 }, pt: { xs: 1, md: 1.2 }, borderTop: `1px solid ${ui.line}` }}>
                  <Typography sx={{ mb: 0.8, color: ui.muted, fontSize: 9, fontWeight: 850, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Add another product
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search products"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    sx={inputSx}
                  />
                  {productQuery.trim() && (
                    <Box sx={{ mt: 0.9 }}>
                      {productsLoading ? (
                        <Box sx={{ p: 1.15, border: `1px solid ${ui.line}`, borderRadius: "10px", bgcolor: ui.soft, display: "flex", alignItems: "center", gap: 1 }}>
                          <CircularProgress size={16} />
                          <Typography sx={{ color: ui.muted, fontSize: 12, fontWeight: 750 }}>Searching products...</Typography>
                        </Box>
                      ) : productsError ? (
                        <Typography sx={{ color: "#a34236", fontSize: 12, fontWeight: 750 }}>{productsError}</Typography>
                      ) : productMatches.length ? (
                        <Stack spacing={0.75}>
                          {productMatches.map((product) => (
                            <Box key={product.variantId} sx={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr) auto", alignItems: "center", gap: 1, p: 0.75, border: `1px solid ${ui.line}`, borderRadius: "10px", bgcolor: ui.soft }}>
                              <Avatar src={product.image} variant="rounded" sx={{ width: 44, height: 44, borderRadius: "8px", bgcolor: ui.paper, border: `1px solid ${ui.line}` }} />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 850, lineHeight: 1.2 }}>{product.productTitle}</Typography>
                                <Typography noWrap sx={{ mt: 0.25, color: ui.muted, fontSize: 11, fontWeight: 700 }}>{product.variantTitle} · {fmt(product.unitPrice)}</Typography>
                              </Box>
                              <Button
                                size="small"
                                disabled={!!busy}
                                onClick={() => addProductToCart(product)}
                                sx={{ minWidth: 0, px: 1.25, borderRadius: "8px", color: ui.green, fontWeight: 850, textTransform: "none" }}
                              >
                                Add
                              </Button>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Typography sx={{ color: ui.muted, fontSize: 12, fontWeight: 750 }}>
                          No matching products found.
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </Paper>

            <Paper elevation={0} sx={{ ...panelSx, p: { xs: 1.2, md: 2 }, display: { xs: "block", lg: "none" } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, minWidth: 0 }}>
                  <LocationOnIcon sx={{ color: ui.brand, fontSize: { xs: 25, md: 28 } }} />
                  <Typography sx={{ fontSize: { xs: 18, md: 20 }, lineHeight: 1.15, fontWeight: 950 }}>Delivery address</Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<EditIcon sx={{ fontSize: "18px !important" }} />}
                  onClick={() => setAddressOpen((value) => !value)}
                  sx={{ color: ui.brand, fontWeight: 900, textTransform: "none", whiteSpace: "nowrap", minWidth: "auto", borderRadius: "10px", px: { xs: 1, md: 1.1 }, py: 0.7, bgcolor: ui.brandSoft, "&:hover": { bgcolor: "#eadff3" } }}
                >
                  {addressOpen ? "Close" : "Change"}
                </Button>
              </Box>
              {!addressOpen && (
                <Box sx={{ mt: 1.1, width: "100%", p: { xs: 1.1, md: 1.15 }, borderRadius: "12px", bgcolor: ui.soft, border: `1px solid ${ui.line}` }}>
                  {addressSummary.length ? addressSummary.map((line, index) => (
                    <Typography key={line} noWrap sx={{ color: index === 0 ? ui.ink : ui.muted, fontSize: index === 0 ? 13.5 : 12.5, fontWeight: index === 0 ? 900 : 750, mt: index ? 0.25 : 0 }}>{line}</Typography>
                  )) : <Typography sx={{ color: ui.muted, fontSize: 12.5, fontWeight: 800 }}>No address added yet.</Typography>}
                </Box>
              )}
              {addressOpen && (
                <Box sx={{ mt: 1.4 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
                    {[["address1", "Address line 1"], ["address2", "Address line 2"], ["city", "City"], ["province", "State"], ["zip", "Pincode"], ["country", "Country"]].map(([key, label]) => (
                      <TextField key={key} size="small" label={label} value={address?.[key] || ""} disabled={locked} onChange={(e) => setAddress((p) => ({ ...p, [key]: e.target.value }))} sx={inputSx} />
                    ))}
                  </Box>
                  <Button sx={{ mt: 1.2, borderRadius: "10px", color: ui.green, borderColor: "#b8d9c7", fontWeight: 900, textTransform: "none" }} variant="outlined" disabled={locked || busy === "address"} onClick={saveAddress}>Save address</Button>
                </Box>
              )}
            </Paper>

            <Paper elevation={0} sx={{ ...panelSx, p: { xs: 1.1, md: 2 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={iconBubbleSx}><GroupsIcon fontSize="small" /></Box>
                  <Typography sx={{ fontSize: { xs: 16, md: 20 }, lineHeight: 1.2, fontWeight: 950 }}>What clients say about {expertName}</Typography>
                </Box>
                <Typography sx={{ display: { xs: "none", md: "block" }, color: ui.muted, fontSize: 12, fontWeight: 750 }}>Real customers · Real results</Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" }, gap: 1 }}>
                {testimonials.map((item) => (
                  <Box key={item.name} sx={{ p: { xs: 1, md: 1.2 }, border: `1px solid ${ui.line}`, borderRadius: "14px", bgcolor: ui.paper }}>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Avatar src={item.imageUrl || ""} sx={{ width: 42, height: 42, bgcolor: "#f2f4f7", color: ui.muted }}>
                        {!item.imageUrl && <PersonOutlineIcon fontSize="small" />}
                      </Avatar>
                      <Box>
                        <Box sx={{ color: "#f6b800", display: "flex" }}>{Array.from({ length: Math.max(1, Math.min(5, item.rating || 5)) }).map((_, i) => <StarIcon key={i} sx={{ fontSize: 14 }} />)}</Box>
                        <Typography sx={{ color: ui.muted, fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>"{item.quote}"</Typography>
                      </Box>
                    </Box>
                    {(item.hba1cFrom || item.hba1cTo) && <Typography sx={{ mt: 1, display: "inline-flex", px: 0.8, py: 0.35, borderRadius: "6px", bgcolor: ui.greenSoft, color: ui.green, fontSize: 11, fontWeight: 900 }}>HbA1c {item.hba1cFrom || "-"} → {item.hba1cTo || "-"}</Typography>}
                    <Typography sx={{ mt: 1, fontSize: 12, fontWeight: 900 }}>{item.name}</Typography>
                    <Typography sx={{ color: ui.muted, fontSize: 11, fontWeight: 700 }}>{item.city}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Stack>

          <Stack spacing={1.25} sx={{ display: { xs: "none", lg: "flex" }, position: { lg: "sticky" }, top: 88 }}>
            <Paper elevation={0} sx={{ ...panelSx, p: 1.8 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LocationOnIcon sx={{ color: ui.brand }} />
                  <Typography sx={{ fontSize: 20, fontWeight: 950 }}>Delivery address</Typography>
                </Box>
                <Button size="small" startIcon={<EditIcon />} onClick={() => setAddressOpen((value) => !value)} sx={{ bgcolor: ui.brandSoft, color: ui.brand, fontWeight: 900, borderRadius: "10px", textTransform: "none" }}>
                  Change
                </Button>
              </Box>
              {!addressOpen && (
                <Box sx={{ p: 1.4, borderRadius: "14px", bgcolor: ui.soft, border: `1px solid ${ui.line}` }}>
                  {addressSummary.length ? addressSummary.map((line, index) => (
                    <Typography key={line} noWrap sx={{ color: index === 0 ? ui.ink : ui.muted, fontSize: index === 0 ? 14 : 13, fontWeight: index === 0 ? 900 : 750, mt: index ? 0.25 : 0 }}>{line}</Typography>
                  )) : <Typography sx={{ color: ui.muted, fontSize: 13, fontWeight: 800 }}>No address added yet.</Typography>}
                </Box>
              )}
              {addressOpen && (
                <Box sx={{ mt: 1.3 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                    {[["address1", "Address line 1"], ["address2", "Address line 2"], ["city", "City"], ["province", "State"], ["zip", "Pincode"], ["country", "Country"]].map(([key, label]) => (
                      <TextField key={key} size="small" label={label} value={address?.[key] || ""} disabled={locked} onChange={(e) => setAddress((p) => ({ ...p, [key]: e.target.value }))} sx={inputSx} />
                    ))}
                  </Box>
                  <Button sx={{ mt: 1.2, borderRadius: "10px", color: ui.green, borderColor: "#b8d9c7", fontWeight: 900, textTransform: "none" }} variant="outlined" disabled={locked || busy === "address"} onClick={saveAddress}>Save address</Button>
                </Box>
              )}
            </Paper>

            <Paper elevation={0} sx={{ ...panelSx, p: 1.8 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <Box sx={iconBubbleSx}><DescriptionOutlinedIcon fontSize="small" /></Box>
                <Typography sx={{ fontSize: 20, fontWeight: 950 }}>Order summary</Typography>
              </Box>
              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between", color: ui.muted }}><Typography sx={{ fontSize: 13 }}>Subtotal</Typography><Typography sx={{ fontSize: 13, fontWeight: 850 }}>{fmt(link.totals?.subtotal)}</Typography></Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", color: ui.muted }}><Typography sx={{ fontSize: 13 }}>Agent discount</Typography><Typography sx={{ fontSize: 13, fontWeight: 850 }}>-{fmt(link.totals?.agentDiscount)}</Typography></Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", color: ui.muted }}><Typography sx={{ fontSize: 13 }}>Shipping</Typography><Typography sx={{ fontSize: 13, fontWeight: 850 }}>{fmt(link.totals?.shipping)}</Typography></Box>
                <Divider />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Typography sx={{ fontWeight: 950, fontSize: 16 }}>Total</Typography>
                  <Typography sx={{ fontSize: 30, fontWeight: 950, letterSpacing: -1 }}>{fmt(link.totals?.codTotal)}</Typography>
                </Box>
              </Stack>
              {!isDone && !isExpired && (
                <Stack spacing={1.2} sx={{ mt: 1.8 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 1, alignItems: "start" }}>
                    <Box sx={{ ...iconBubbleSx, bgcolor: ui.greenSoft, color: ui.green }}><CreditCardIcon fontSize="small" /></Box>
                    {paymentClarityBlock}
                  </Box>
                  {paymentActions}
                  {paymentStatusBlock}
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, pt: 1 }}>
                    {[[<ShieldOutlinedIcon />, "Secure payments"], [<LockOutlinedIcon />, "Private info"], [<LocalShippingOutlinedIcon />, "Reliable delivery"]].map(([icon, label]) => (
                      <Box key={label} sx={{ textAlign: "center", color: ui.muted, borderLeft: label !== "Secure payments" ? `1px solid ${ui.line}` : 0 }}>
                        <Box sx={{ color: ui.brand }}>{icon}</Box>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 750, lineHeight: 1.2 }}>{label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Stack>
              )}
            </Paper>
          </Stack>
        </Box>
      </Container>

      <Dialog open={codOtpOpen} onClose={() => !codOtpBusy && setCodOtpOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Verify COD confirmation</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 1.5 }}>
            We sent a one-time password to the mobile number on this order. Enter it to confirm Cash on Delivery.
          </Typography>
          <TextField autoFocus fullWidth label="Enter OTP" value={codOtp} onChange={(event) => setCodOtp(event.target.value.replace(/\D/g, "").slice(0, 8))} inputProps={{ inputMode: "numeric", maxLength: 8 }} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCodOtpOpen(false)} disabled={codOtpBusy} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" onClick={verifyCodOtp} disabled={codOtpBusy || codOtp.length < 4} sx={{ textTransform: "none" }}>
            {codOtpBusy ? "Verifying..." : "Verify and confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {!isDone && !isExpired && (
        <Box sx={{ display: { xs: "block", lg: "none" }, position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, px: 1.25, pt: 1, pb: "calc(10px + env(safe-area-inset-bottom))", bgcolor: "rgba(246,245,243,0.9)", borderTop: `1px solid ${ui.line}`, backdropFilter: "blur(14px)" }}>
          <Paper elevation={0} sx={{ borderRadius: "14px", p: 1.15, border: `1px solid ${ui.line}`, bgcolor: ui.paper, boxShadow: "0 -10px 30px rgba(28,20,34,.08)" }}>
            <Box
              component="button"
              type="button"
              onClick={() => setMobileBillingOpen((value) => !value)}
              sx={{
                width: "100%",
                border: 0,
                p: 0,
                m: 0,
                bgcolor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: mobileBillingOpen ? 1.2 : 1,
                gap: 1,
                cursor: "pointer",
                color: "inherit",
                font: "inherit",
                textAlign: "left",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                <Typography sx={{ color: ui.muted, fontSize: 12, fontWeight: 800 }}>Total</Typography>
                <KeyboardArrowDownIcon sx={{ fontSize: 19, color: ui.muted, transform: mobileBillingOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 160ms ease" }} />
              </Box>
              <Typography sx={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.45 }}>{fmt(link.totals?.codTotal)}</Typography>
            </Box>
            {mobileBillingOpen && (
              <Stack spacing={0.65} sx={{ mb: 1.2, pt: 0.2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", color: ui.muted }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Subtotal</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{fmt(link.totals?.subtotal)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", color: ui.muted }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Agent discount</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>-{fmt(link.totals?.agentDiscount)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", color: ui.muted }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Shipping</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{fmt(link.totals?.shipping)}</Typography>
                </Box>
                <Divider />
              </Stack>
            )}
            <Box sx={{ mb: 1 }}>{paymentClarityBlock}</Box>
            {paymentActions}
            {paymentStatusBlock}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
