import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import {
  Alert, Box, Button, Chip, CircularProgress, Drawer, Paper, Stack, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, Tabs, TextField, Typography, MenuItem,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import RepunchCheckout from "./RepunchCheckout";

const API_BASE = (process.env.REACT_APP_API_BASE_URL ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5001" : "https://muditamleads-14f32a10d7f7.herokuapp.com")).replace(/\/+$/, "");
const api = axios.create({ baseURL: API_BASE, withCredentials: true });
const money = (value) => value == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value));
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }) : "—";
const time = (value) => value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—";
const productsLabel = (items = []) => items.map((item) => `${item.title} × ${item.quantity}`).join(", ");
const blocked = (status) => ["creating", "completed", "review_required"].includes(status);
const stateLabel = (status) => ({ creating: "Verification pending", completed: "Repunched", review_required: "Needs verification", failed: "Failed — retry available" }[status] || "Not repunched");

export default function RepunchOrdersPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("rto");
  const [filters, setFilters] = useState({ search: searchParams.get("search") || "", dateFrom: "", dateTo: "", dateField: "order" });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [rows, setRows] = useState([]);
  const [rowsTab, setRowsTab] = useState("rto");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState(null);
  const [trackingWarning, setTrackingWarning] = useState("");
  const [notice, setNotice] = useState("");
  const [source, setSource] = useState(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(filters); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.get("/api/repunch-orders", { params: { ...query, tab, page: page + 1, limit }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) { setCheckedAt(data.checkedAt || null); setTrackingWarning(data.trackingWarning || ""); setRowsTab(tab); setRows(data.data || []); setTotal(data.total || 0); } })
      .catch((err) => {
        if (!controller.signal.aborted) { setRowsTab(tab); setRows([]); setTotal(0); setError(err.response?.data?.message || "Unable to load orders. Please retry."); }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, tab, page, limit, revision]);

  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden && !source) setRevision((value) => value + 1); }, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [source]);

  const refresh = () => setRevision((value) => value + 1);
  const updateFilter = (key) => (event) => setFilters((value) => ({ ...value, [key]: event.target.value }));
  const closeCheckout = () => { if (!busy) setSource(null); };
  const history = tab === "repunched";
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "calc(100vh - 64px)" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h5" fontWeight={800}>Repunch Order</Typography>
        <Button startIcon={<RefreshIcon />} onClick={refresh} disabled={loading}>Refresh</Button>
      </Stack>
      <Typography color="text.secondary" mb={2}>Place a replacement using the existing checkout and keep it linked to its original RTO order.</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>Tracking source: Shiptrack · {checkedAt ? `Checked ${time(checkedAt)} IST` : "Loading current tracking"} · Loads on page open. Refresh manually or automatically every 10 minutes while this page is visible.</Typography>
      {trackingWarning && <Alert severity="warning" sx={{ mb: 2 }}>{trackingWarning}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice("")} sx={{ mb: 2 }}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={refresh}>Retry</Button>}>{error}</Alert>}
      <Tabs value={tab} onChange={(_, value) => { setTab(value); setPage(0); }} sx={{ mb: 2 }}>
        <Tab value="rto" label="RTO Orders" />
        <Tab value="repunched" label="Repunched Orders" />
      </Tabs>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField size="small" label="Search orders or customers" placeholder={history ? "Original / new order, customer, phone, agent" : "Order, customer, phone, AWB"} value={filters.search} onChange={updateFilter("search")} sx={{ flex: 1 }} />
          {!history && <TextField select size="small" label="Date filter" value={filters.dateField} onChange={updateFilter("dateField")} sx={{ minWidth: 180 }}><MenuItem value="order">Order placed</MenuItem><MenuItem value="rto">RTO tracking updated</MenuItem></TextField>}
          <TextField size="small" label={history ? "Repunched from" : filters.dateField === "rto" ? "Tracking updated from" : "Order date from"} type="date" value={filters.dateFrom} onChange={updateFilter("dateFrom")} InputLabelProps={{ shrink: true }} />
          <TextField size="small" label="To" type="date" value={filters.dateTo} onChange={updateFilter("dateTo")} InputLabelProps={{ shrink: true }} />
          <Button onClick={() => setFilters({ search: "", dateFrom: "", dateTo: "", dateField: "order" })}>Clear filters</Button>
        </Stack>
      </Paper>
      {history && <Typography variant="body2" color="text.secondary" mb={2}>Shows orders linked through Repunch Order. Older manually placed replacements are not automatically linked. Pending checks are included to prevent duplicate orders.</Typography>}
      <Paper variant="outlined">
        <TableContainer>
          <Table aria-label={history ? "Repunched orders" : "RTO orders"}>
            <TableHead><TableRow>
              {(history ? ["Original RTO order", "Repunched order", "Customer / products", "Amount / payment", "Date / placed by", "Status"] : ["RTO order / date", "Customer / products", "Courier / AWB", "Amount", "Status / linked order", "Action"]).map((label) => <TableCell key={label} sx={{ fontWeight: 700, bgcolor: "#f1f5f9" }}>{label}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {loading || rowsTab !== tab ? <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={28} aria-label="Loading orders" /></TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}>{error ? "Orders could not be loaded." : history ? "No repunched orders match these filters." : "No RTO orders match these filters."}</TableCell></TableRow> : rows.map((row) => history ? (
                <TableRow key={row._id}>
                  <TableCell><Typography fontWeight={700}>{row.originalOrder.orderName}</Typography><Typography variant="caption">{date(row.originalOrder.orderDate)} · {row.originalOrder.status}</Typography></TableCell>
                  <TableCell><Typography fontWeight={700}>{row.replacementOrder?.name || "Awaiting verification"}</Typography><Typography variant="caption">For {row.originalOrder.orderName}</Typography></TableCell>
                  <TableCell><Typography>{row.replacementOrder?.customerName || row.originalOrder.customerName || "—"}</Typography><Typography variant="body2">{row.replacementOrder?.contactNumber || row.originalOrder.contactNumber || "—"}</Typography><Typography variant="caption" color="text.secondary">{productsLabel(row.replacementOrder?.products || row.originalOrder.products)}</Typography></TableCell>
                  <TableCell>{money(row.replacementOrder?.amount)}<Typography variant="caption" display="block">{row.replacementOrder?.paymentMode || "—"}</Typography><Typography variant="caption" color="text.secondary">Original: {money(row.originalOrder.amount)}</Typography></TableCell>
                  <TableCell>{date(row.displayDate)}<Typography variant="body2">{row.createdBy?.name || row.createdBy?.id || "—"}</Typography></TableCell>
                  <TableCell><Chip size="small" label={stateLabel(row.status)} color={row.status === "completed" ? "success" : "warning"} /><Typography variant="body2" mt={1}>{row.shipment?.[0]?.shipment_status || (row.status === "completed" ? "Shipment status pending" : "Check Shopify before any further action.")}</Typography>{row.shipment?.[0]?.tracking_number && <Typography variant="caption">{row.shipment[0].tracking_number}</Typography>}{row.lastError && <Typography variant="caption" color="error" display="block">{row.lastError}</Typography>}</TableCell>
                </TableRow>
              ) : (
                <TableRow key={row._id}>
                  <TableCell><Typography fontWeight={700}>{row.orderName}</Typography><Typography variant="body2" color="text.secondary">{date(row.displayDate)}</Typography></TableCell>
                  <TableCell><Typography>{row.customerName || "—"}</Typography><Typography variant="body2">{row.contactNumber || "—"}</Typography><Typography variant="caption" color="text.secondary">{productsLabel(row.products)}</Typography></TableCell>
                  <TableCell>{row.courier || "—"}<Typography variant="body2">{row.trackingNumber || "—"}</Typography></TableCell>
                  <TableCell>{money(row.amount)}</TableCell>
                  <TableCell><Chip size="small" label={row.status} /><Typography variant="body2">{row.courierStatus}</Typography><Typography variant="caption" display="block">Tracking update: {time(row.statusUpdatedAt)} IST</Typography><Typography variant="body2" mt={1}>{row.repunch?.replacementOrder?.name ? `Repunched as ${row.repunch.replacementOrder.name}` : stateLabel(row.repunch?.status)}</Typography>{row.repunch?.lastError && <Typography variant="caption" color="error">{row.repunch.lastError}</Typography>}</TableCell>
                  <TableCell><Button variant="contained" disabled={blocked(row.repunch?.status)} onClick={() => setSource(row)} sx={{ whiteSpace: "nowrap", bgcolor: "#111827" }}>Repunch Order</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={total} page={page} rowsPerPage={limit} rowsPerPageOptions={[20, 50, 100]} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={(event) => { setLimit(Number(event.target.value)); setPage(0); }} />
      </Paper>
      <Drawer anchor="right" open={Boolean(source)} onClose={closeCheckout} PaperProps={{ sx: { maxWidth: "100vw" } }}>
        {source && <RepunchCheckout key={source._id} source={source} closeDrawer={closeCheckout} onBusyChange={setBusy} onRepunchError={refresh} onOrderCreated={(order) => {
          setSource(null); setBusy(false); setNotice(`${order.name || order.id} was repunched for RTO order ${source.orderName}.`);
          setTab("repunched"); setPage(0); setFilters({ search: "", dateFrom: "", dateTo: "", dateField: "order" }); refresh();
        }} />}
      </Drawer>
    </Box>
  );
}
