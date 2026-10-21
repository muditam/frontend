import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddLinkIcon from "@mui/icons-material/AddLink";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import axios from "axios";
import { getPublicOrderLinkUrl } from "../../utils/orderLinkUrl";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

const normalizePhone = (phone = "") => {
  const clean = String(phone).replace(/\D/g, "");
  return clean.length <= 10 ? `+91${clean.slice(-10)}` : `+${clean}`;
};

const fmt = (n) => `Rs ${Number(n || 0).toFixed(2)}`;

export default function OrderLinkManager({ lead }) {
  const [open, setOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [links, setLinks] = useState([]);
  const [selected, setSelected] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [discountType, setDiscountType] = useState("amount");
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMode, setPaymentMode] = useState("COD");
  const [partialType, setPartialType] = useState("percentage");
  const [partialValue, setPartialValue] = useState(10);
  const [addresses, setAddresses] = useState([]);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [busy, setBusy] = useState(false);
  const [createdUrl, setCreatedUrl] = useState("");

  const customer = useMemo(() => ({
    name: lead?.name || "",
    phone: lead?.contactNumber || "",
  }), [lead]);

  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
  const discountAmount = discountType === "percentage" ? subtotal * Number(discountValue || 0) / 100 : Number(discountValue || 0);
  const total = Math.max(0, subtotal - discountAmount + Number(shippingCharge || 0));
  const createDisabledReason = useMemo(() => {
    if (busy) return "Creating link...";
    if (!customer.name) return "Customer name is required.";
    if (!customer.phone) return "Customer phone is required.";
    if (cartItems.length === 0) return "Select products and add them to cart first.";
    if (subtotal < 350) return "Minimum product subtotal is Rs 350.";
    if (total < 1) return "Final order total must be at least Rs 1.";
    return "";
  }, [busy, cartItems.length, customer.name, customer.phone, total]);

  const loadProducts = async () => {
    const { data } = await api.get("/api/shopify/active-products");
    const sorted = (data || []).slice().sort((a, b) => String(a.title).localeCompare(String(b.title)));
    setProducts(sorted);
  };

  const loadAddresses = useCallback(async () => {
    if (!customer.phone) return;
    const { data } = await api.get(`/api/shopify/customers?phone=${encodeURIComponent(normalizePhone(customer.phone))}`);
    const list = data?.addresses || [];
    setAddresses(list);
    setShippingAddress(list[0] || null);
  }, [customer.phone]);

  const loadLinks = async () => {
    const { data } = await api.get("/api/order-links");
    setLinks(data?.orderLinks || []);
  };

  useEffect(() => {
    if (!open) return;
    loadProducts().catch(() => {});
    loadAddresses().catch(() => {});
  }, [open, loadAddresses]);

  useEffect(() => {
    if (linksOpen) loadLinks().catch(() => {});
  }, [linksOpen]);

  const addSelectedToCart = () => {
    const items = [];
    products.forEach((product) => {
      (product.variants || []).forEach((variant) => {
        if (selected[variant.id]) {
          items.push({
            variantId: String(variant.id),
            productTitle: product.title,
            variantTitle: variant.title,
            image: product.image,
            unitPrice: Number(variant.price || 0),
            quantity: 1,
          });
        }
      });
    });
    setCartItems(items);
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const createLink = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/api/order-links", {
        leadId: lead?._id,
        customer,
        shippingAddress,
        cartItems,
        shippingCharge,
        discountType,
        discountValue,
        paymentMode,
        partialPayment: { type: partialType, value: partialValue },
      });
      setCreatedUrl(data.url || "");
      await loadLinks();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to create order link.");
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async (id) => {
    const { data } = await api.post(`/api/order-links/${id}/regenerate`);
    await copy(data.url);
    await loadLinks();
  };

  const selfConfirm = async (id) => {
    if (!window.confirm("Create Shopify COD order on behalf of customer?")) return;
    await api.post(`/api/order-links/${id}/self-confirm-cod`, { reason: "Confirmed by LMS team" });
    await loadLinks();
  };

  return (
    <>
      <Tooltip title="Create Order Link">
        <IconButton size="small" onClick={() => setOpen(true)} sx={{ border: "1px solid #D1DDEB", bgcolor: "#fff", color: "#7C2D12" }}>
          <AddLinkIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Button size="small" variant="outlined" onClick={() => setLinksOpen(true)} sx={{ ml: 1, borderRadius: "10px", textTransform: "none" }}>
        My Order Links
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Order Link</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 700 }}>{customer.name || "Customer"}</Typography>
              <Typography variant="body2" color="text.secondary">{customer.phone || "No phone"}</Typography>
            </Paper>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
              {products.map((product) => (
                <Paper key={product.id} variant="outlined" sx={{ p: 1.25, maxHeight: 230, overflow: "auto" }}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                    {product.image && <Avatar src={product.image} variant="square" />}
                    <Typography sx={{ fontWeight: 700 }}>{product.title}</Typography>
                  </Box>
                  {(product.variants || []).map((variant) => (
                    <FormControlLabel
                      key={variant.id}
                      control={<Radio checked={!!selected[variant.id]} onClick={() => setSelected((p) => ({ ...p, [variant.id]: !p[variant.id] }))} />}
                      label={`${variant.title} - ${fmt(variant.price)}`}
                    />
                  ))}
                </Paper>
              ))}
            </Box>

            <Button variant="outlined" onClick={addSelectedToCart}>Add Selected Products To Cart</Button>

            {cartItems.map((item) => (
              <Paper key={item.variantId} variant="outlined" sx={{ p: 1, display: "flex", alignItems: "center", gap: 1 }}>
                {item.image && <Avatar src={item.image} variant="square" />}
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{item.productTitle}</Typography>
                  <Typography variant="caption">{item.variantTitle} - {fmt(item.unitPrice)}</Typography>
                </Box>
                <TextField size="small" type="number" label="Qty" value={item.quantity} onChange={(e) => setCartItems((prev) => prev.map((x) => x.variantId === item.variantId ? { ...x, quantity: Math.max(1, Number(e.target.value || 1)) } : x))} sx={{ width: 90 }} />
                <IconButton onClick={() => setCartItems((prev) => prev.filter((x) => x.variantId !== item.variantId))}><DeleteIcon /></IconButton>
              </Paper>
            ))}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1 }}>
              <TextField size="small" type="number" label="Shipping" value={shippingCharge} onChange={(e) => setShippingCharge(Number(e.target.value || 0))} />
              <TextField select size="small" label="Discount Type" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                <MenuItem value="amount">Amount</MenuItem>
                <MenuItem value="percentage">Percentage</MenuItem>
              </TextField>
              <TextField size="small" type="number" label="Discount" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value || 0))} />
            </Box>

            <TextField select size="small" label="Address" value={shippingAddress?.id || ""} onChange={(e) => setShippingAddress(addresses.find((a) => String(a.id) === String(e.target.value)) || null)}>
              {addresses.map((addr) => <MenuItem key={addr.id} value={addr.id}>{addr.formatted}</MenuItem>)}
            </TextField>

            <RadioGroup row value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              <FormControlLabel value="COD" control={<Radio />} label="COD" />
              <FormControlLabel value="Prepaid" control={<Radio />} label="Prepaid" />
              <FormControlLabel value="Partial Paid" control={<Radio />} label="Partial Paid" />
            </RadioGroup>

            {paymentMode === "Partial Paid" && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField select size="small" label="Partial Type" value={partialType} onChange={(e) => setPartialType(e.target.value)} sx={{ width: 180 }}>
                  <MenuItem value="percentage">Percentage</MenuItem>
                  <MenuItem value="amount">Amount</MenuItem>
                </TextField>
                <TextField size="small" type="number" label="Partial Value" value={partialValue} onChange={(e) => setPartialValue(Number(e.target.value || 0))} />
              </Box>
            )}

            <Divider />
            <Typography sx={{ fontWeight: 800 }}>Total: {fmt(total)}</Typography>
            {createDisabledReason && (
              <Typography variant="body2" color="error">
                {createDisabledReason}
              </Typography>
            )}
            {createdUrl && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption">Link created</Typography>
                <Typography sx={{ wordBreak: "break-all" }}>{createdUrl}</Typography>
                <Button startIcon={<ContentCopyIcon />} onClick={() => copy(createdUrl)}>Copy</Button>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          <Button variant="contained" disabled={!!createDisabledReason} onClick={createLink}>
            Generate 48-hour Link
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={linksOpen} onClose={() => setLinksOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>My Order Links</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {links.map((link) => (
              <Paper key={link.id} variant="outlined" sx={{ p: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 800, flex: 1 }}>{link.customer?.name} - {fmt(link.totals?.codTotal)}</Typography>
                  <Chip size="small" label={link.status} />
                  <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copy(getPublicOrderLinkUrl(link))}>Copy</Button>
                  {link.status === "expired" && <Button size="small" startIcon={<RestartAltIcon />} onClick={() => regenerate(link.id)}>Regenerate</Button>}
                  {link.paymentMode === "COD" && !["order_created", "expired"].includes(link.status) && <Button size="small" color="warning" onClick={() => selfConfirm(link.id)}>Self Confirm</Button>}
                </Box>
                <Typography variant="caption" color="text.secondary">Expires: {new Date(link.expiresAt).toLocaleString()}</Typography>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
