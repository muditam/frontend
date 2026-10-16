import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddLinkIcon from "@mui/icons-material/AddLink";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LaunchIcon from "@mui/icons-material/Launch";
import LinkIcon from "@mui/icons-material/Link";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

const money = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const dateTime = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";

const statusMeta = {
  created: ["Created", "default"],
  viewed: ["Viewed", "info"],
  cart_updated: ["Cart updated", "info"],
  payment_pending: ["Payment pending", "warning"],
  paid: ["Paid", "success"],
  cod_confirmed: ["COD confirmed", "success"],
  order_created: ["Purchased", "success"],
  expired: ["Expired", "default"],
  failed: ["Failed", "error"],
};

function StatusChip({ status }) {
  const [label, color] = statusMeta[status] || [status || "Unknown", "default"];
  return <Chip size="small" label={label} color={color} sx={{ fontWeight: 700 }} />;
}

export default function OrderLinksPage() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentMode, setPaymentMode] = useState("all");
  const [selected, setSelected] = useState(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/order-links");
      setLinks(data?.orderLinks || []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load order links.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  const filteredLinks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return links.filter((link) => {
      const matchesQuery = !needle || [link.customer?.name, link.customer?.phone, link.shopifyOrder?.name, link.agentName]
        .some((value) => String(value || "").toLowerCase().includes(needle));
      return matchesQuery && (status === "all" || link.status === status) && (paymentMode === "all" || link.paymentMode === paymentMode);
    });
  }, [links, paymentMode, query, status]);

  const stats = useMemo(() => ({
    total: links.length,
    purchased: links.filter((link) => link.status === "order_created").length,
    pending: links.filter((link) => !["order_created", "expired", "failed"].includes(link.status)).length,
    expired: links.filter((link) => link.status === "expired").length,
  }), [links]);

  const copyLink = async (link) => {
    await navigator.clipboard.writeText(`${window.location.origin}/order-link/${link.token}`);
  };

  const regenerate = async (link) => {
    await api.post(`/api/order-links/${link.id}/regenerate`);
    await loadLinks();
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "#f6f8fb", p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 1320, mx: "auto" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} mb={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#172033" }}>Order links</Typography>
            <Typography color="text.secondary">Track every link and see whether the customer completed the purchase.</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddLinkIcon />} href="/retention/leads" sx={{ textTransform: "none", borderRadius: 2 }}>
            Create from a lead
          </Button>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.5, mb: 2.5 }}>
          {[["Total links", stats.total, "#172033"], ["Purchased", stats.purchased, "#13795b"], ["In progress", stats.pending, "#a16207"], ["Expired", stats.expired, "#64748b"]].map(([label, value, color]) => (
            <Paper key={label} sx={{ p: 2, border: "1px solid #e4e9f0", boxShadow: "none", borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color }}>{value}</Typography>
            </Paper>
          ))}
        </Box>

        <Paper sx={{ p: 1.5, mb: 2, border: "1px solid #e4e9f0", boxShadow: "none", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField fullWidth size="small" placeholder="Search customer, phone, order or agent" value={query} onChange={(e) => setQuery(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
            <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 170 }}>
              <MenuItem value="all">All statuses</MenuItem>
              {Object.entries(statusMeta).map(([value, [label]]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Payment" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} sx={{ minWidth: 170 }}>
              <MenuItem value="all">All payment modes</MenuItem>
              <MenuItem value="COD">COD</MenuItem>
              <MenuItem value="Partial Paid">Partial paid</MenuItem>
              <MenuItem value="Prepaid">Prepaid</MenuItem>
            </TextField>
          </Stack>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box> : (
          <Paper sx={{ border: "1px solid #e4e9f0", boxShadow: "none", borderRadius: 2, overflow: "hidden" }}>
            {filteredLinks.length ? <TableContainer sx={{ overflowX: "auto" }}>
              <Table sx={{ minWidth: 980 }} size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    {['Customer', 'Created', 'Expires', 'Payment', 'Amount', 'Status', 'Actions'].map((heading) => <TableCell key={heading} sx={{ fontWeight: 800, color: "#475569", whiteSpace: "nowrap" }}>{heading}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLinks.map((link) => {
                    const purchased = link.status === "order_created";
                    return <TableRow key={link.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 800 }}>{link.customer?.name || "Unnamed customer"}</Typography>
                        <Typography variant="caption" color="text.secondary">{link.customer?.phone || "-"}{link.agentName ? ` · ${link.agentName}` : ""}</Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{dateTime(link.createdAt)}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{dateTime(link.expiresAt)}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{link.paymentMode || "-"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 700 }}>{money(link.totals?.payableTotal || link.totals?.codTotal)}</TableCell>
                      <TableCell><Stack direction="row" spacing={0.5} alignItems="center"><StatusChip status={link.status} />{purchased && <CheckCircleOutlineIcon color="success" fontSize="small" />}</Stack></TableCell>
                      <TableCell><Stack direction="row" spacing={0.25} alignItems="center"><Button size="small" startIcon={<VisibilityIcon />} onClick={() => setSelected(link)} sx={{ textTransform: "none" }}>Details</Button><IconButton size="small" title="Copy link" onClick={() => copyLink(link)}><ContentCopyIcon fontSize="small" /></IconButton><IconButton size="small" title="Open link" component="a" href={`${window.location.origin}/order-link/${link.token}`} target="_blank" rel="noreferrer"><LaunchIcon fontSize="small" /></IconButton>{link.status === "expired" && <IconButton size="small" title="Regenerate" onClick={() => regenerate(link)}><RestartAltIcon fontSize="small" /></IconButton>}</Stack></TableCell>
                    </TableRow>;
                  })}
                </TableBody>
              </Table>
            </TableContainer> : <Box sx={{ p: 6, textAlign: "center" }}><LinkIcon sx={{ color: "#94a3b8", fontSize: 40 }} /><Typography sx={{ mt: 1, fontWeight: 700 }}>No order links found</Typography><Typography color="text.secondary">Try changing the filters or create a link from a lead.</Typography></Box>}
          </Paper>
        )}
      </Box>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        {selected && <>
          <DialogTitle sx={{ fontWeight: 800 }}>Order link details</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <Box><Typography variant="h6" sx={{ fontWeight: 800 }}>{selected.customer?.name}</Typography><Typography color="text.secondary">{selected.customer?.phone}</Typography></Box>
              <Stack direction="row" spacing={1} flexWrap="wrap"><StatusChip status={selected.status} /><Chip size="small" label={selected.paymentMode} variant="outlined" />{selected.shopifyOrder?.name && <Chip size="small" label={`Shopify ${selected.shopifyOrder.name}`} color="success" variant="outlined" />}</Stack>
              <Divider />
              <Typography><b>Total:</b> {money(selected.totals?.codTotal)}</Typography>
              <Typography><b>Items:</b> {selected.cartItems?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0}</Typography>
              <Typography><b>Created:</b> {dateTime(selected.createdAt)}</Typography>
              <Typography><b>Expires:</b> {dateTime(selected.expiresAt)}</Typography>
              <Divider />
              <Typography sx={{ fontWeight: 800 }}>Timeline</Typography>
              {(selected.timeline || []).slice().reverse().map((event, index) => <Box key={`${event.at}-${index}`} sx={{ pl: 1.5, borderLeft: "2px solid #dbe3ef" }}><Typography variant="body2">{event.message}</Typography><Typography variant="caption" color="text.secondary">{dateTime(event.at)}</Typography></Box>)}
            </Stack>
          </DialogContent>
        </>}
      </Dialog>
    </Box>
  );
}
