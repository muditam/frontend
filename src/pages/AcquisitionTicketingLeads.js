import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

const api = axios.create({ baseURL: (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, ""), withCredentials: true });
const editableStatuses = ["pending_lms", "active", "contacted", "converted", "not_interested", "no_response", "closed"];

function currentUser() { return JSON.parse(sessionStorage.getItem("user") || "{}"); }
function isAdmin() { return ["admin", "super admin", "superadmin"].includes(String(currentUser()?.role || "").trim().toLowerCase()); }
function canAccess() { return isAdmin() || String(currentUser()?.role || "").trim().toLowerCase() === "sales agent"; }

export default function AcquisitionTicketingLeads() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems((await api.get("/api/ticketing-integration/acquisition-leads")).data?.items || []); }
    catch (requestError) { setError(requestError.response?.data?.error || "Could not load Acquisition leads."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isAdmin()) api.get("/api/ticketing-integration/acquisition-leads/agents").then((response) => setAgents(response.data?.items || [])).catch(() => setError("Could not load Sales Agents.")); }, []);
  const updateStatus = async (lead, status) => {
    const previous = items;
    setItems((rows) => rows.map((row) => row.id === lead.id ? { ...row, status } : row));
    try { await api.patch(`/api/ticketing-integration/acquisition-leads/${lead.id}`, { status }); }
    catch (requestError) { setItems(previous); setError(requestError.response?.data?.error || "Could not update lead status."); }
  };
  const updateAssignee = async (lead, assignedTo) => {
    const previous = items;
    const agent = agents.find((item) => item.id === assignedTo);
    setItems((rows) => rows.map((row) => row.id === lead.id ? { ...row, assignedTo: agent ? { id: agent.id, name: agent.name } : null } : row));
    try { await api.patch(`/api/ticketing-integration/acquisition-leads/${lead.id}`, { assignedTo: assignedTo || null, ...(lead.status === "pending_lms" && assignedTo ? { status: "active" } : {}) }); await load(); }
    catch (requestError) { setItems(previous); setError(requestError.response?.data?.error || "Could not assign lead."); }
  };

  if (!canAccess()) return <Box p={3}><Alert severity="error">This tab is available only to Sales Agents and administrators.</Alert></Box>;
  return <Box sx={{ width: "100%", maxWidth: "none", p: { xs: 1.5, sm: 2, md: 3 }, minHeight: "calc(100vh - 64px)", bgcolor: "#f8fafc", boxSizing: "border-box" }}>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} mb={2}>
      <Box><Typography variant="h5" fontWeight={700}>Acquisition Leads</Typography><Typography color="text.secondary">Unconfirmed confirmation tickets transferred after 10 days.</Typography></Box>
      <Button variant="outlined" onClick={load} disabled={loading} sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}>Refresh</Button>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Paper variant="outlined" sx={{ width: "100%", overflowX: "auto" }}>
      {loading ? <Box p={5} textAlign="center"><CircularProgress /></Box> : <Table size="small">
        <TableHead><TableRow><TableCell>Ticket</TableCell><TableCell>Customer</TableCell><TableCell>Phone</TableCell><TableCell>Order</TableCell><TableCell>Transferred</TableCell>{isAdmin() && <TableCell>Assigned to</TableCell>}<TableCell>Status</TableCell></TableRow></TableHead>
        <TableBody>{items.length ? items.map((lead) => <TableRow key={lead.id} hover onClick={() => setSelectedLead(lead)} sx={{ cursor: "pointer" }}>
          <TableCell><Typography fontWeight={700}>{lead.ticketNo}</Typography><Typography variant="caption" display="block" color="text.secondary">{lead.noAnswerAttempts || 0} call attempts</Typography></TableCell>
          <TableCell>{lead.customer?.name || "—"}</TableCell><TableCell>{lead.customer?.phone || "—"}</TableCell>
          <TableCell><Typography fontWeight={600}>{lead.order?.orderName || lead.references?.orderSourceId || "—"}</Typography><Typography variant="caption">₹{Number(lead.order?.totalAmount || 0).toLocaleString("en-IN")}</Typography></TableCell>
          <TableCell>{lead.escalationAt ? new Date(lead.escalationAt).toLocaleDateString("en-IN") : "—"}</TableCell>
          {isAdmin() && <TableCell onClick={(event) => event.stopPropagation()}><Select size="small" displayEmpty value={lead.assignedTo?.id || ""} onChange={(event) => updateAssignee(lead, event.target.value)}><MenuItem value=""><em>Unassigned</em></MenuItem>{agents.map((agent) => <MenuItem key={agent.id} value={agent.id}>{agent.name}</MenuItem>)}</Select></TableCell>}
          <TableCell onClick={(event) => event.stopPropagation()}><Select size="small" value={lead.status || "pending_lms"} onChange={(event) => updateStatus(lead, event.target.value)}>{editableStatuses.map((status) => <MenuItem key={status} value={status}><Chip size="small" label={status.replaceAll("_", " ")} /></MenuItem>)}</Select></TableCell>
        </TableRow>) : <TableRow><TableCell colSpan={isAdmin() ? 7 : 6} align="center" sx={{ py: 5, color: "text.secondary" }}>No Acquisition leads yet.</TableCell></TableRow>}</TableBody>
      </Table>}
    </Paper>
    <Dialog open={Boolean(selectedLead)} onClose={() => setSelectedLead(null)} fullWidth maxWidth="sm">
      <DialogTitle>Customer and order details</DialogTitle>
      <DialogContent dividers>{selectedLead && <Stack spacing={2}>
        <Box><Typography variant="overline" color="text.secondary">Ticket</Typography><Typography fontWeight={700}>{selectedLead.ticketNo}</Typography><Typography variant="body2">Transferred on {selectedLead.escalationAt ? new Date(selectedLead.escalationAt).toLocaleString("en-IN") : "—"} · {selectedLead.noAnswerAttempts || 0} confirmation call attempts</Typography></Box>
        <Divider />
        <Box><Typography variant="overline" color="text.secondary">Customer</Typography><Typography fontWeight={700}>{selectedLead.customer?.name || "—"}</Typography><Typography variant="body2">{selectedLead.customer?.phone || "No phone"}</Typography><Typography variant="body2">{selectedLead.customer?.email || "No email"}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Delivery address</Typography><Typography variant="body2">{[selectedLead.order?.address?.address1, selectedLead.order?.address?.address2, selectedLead.order?.address?.city, selectedLead.order?.address?.province, selectedLead.order?.address?.postalCode, selectedLead.order?.address?.countryCode].filter(Boolean).join(", ") || "Address unavailable"}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Order</Typography><Typography fontWeight={700}>{selectedLead.order?.orderName || selectedLead.references?.orderSourceId || "—"}</Typography><Typography variant="body2">₹{Number(selectedLead.order?.totalAmount || 0).toLocaleString("en-IN")} · {selectedLead.order?.paymentCategory || "Payment unavailable"} · {selectedLead.order?.operationalStatus || "Status unavailable"}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Products</Typography>{(selectedLead.order?.products || []).length ? selectedLead.order.products.map((product, index) => <Typography variant="body2" key={`${product.title}-${index}`}>{product.title} × {product.quantity || 1}{product.sku ? ` · ${product.sku}` : ""}</Typography>) : <Typography variant="body2">Product details unavailable</Typography>}</Box>
        {selectedLead.assignedTo?.name && <Box><Typography variant="overline" color="text.secondary">Assigned to</Typography><Typography>{selectedLead.assignedTo.name}</Typography></Box>}
      </Stack>}</DialogContent>
      <DialogActions><Button onClick={() => setSelectedLead(null)}>Close</Button></DialogActions>
    </Dialog>
  </Box>;
}
