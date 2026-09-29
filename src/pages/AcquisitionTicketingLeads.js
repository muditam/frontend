import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const api = axios.create({ baseURL: (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, ""), withCredentials: true });
const editableStatuses = ["pending_lms", "active", "contacted", "converted", "not_interested", "no_response", "closed"];

function currentUser() { return JSON.parse(sessionStorage.getItem("user") || "{}"); }
function role() { return String(currentUser()?.role || "").trim().toLowerCase(); }
function isAdmin() { return ["admin", "super admin", "superadmin", "manager"].includes(role()); }
function canAccess() { return isAdmin() || ["manager", "sales agent"].includes(role()); }

function formatMoney(value, currency = "INR") {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "-";
  return `${currency} ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function addressState(address = {}) {
  return address.province || address.state || address.city || "-";
}

export default function AcquisitionTicketingLeads() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [savingRow, setSavingRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/ticketing-integration/acquisition-leads");
      setItems(response.data?.items || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not load Acquisition leads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isAdmin()) return;
    api.get("/api/ticketing-integration/acquisition-leads/agents")
      .then((response) => setAgents(response.data?.items || []))
      .catch(() => setError("Could not load Sales Agents."));
  }, []);

  const updateStatus = async (lead, status) => {
    const previous = items;
    setItems((rows) => rows.map((row) => row.id === lead.id ? { ...row, status } : row));
    try {
      await api.patch(`/api/ticketing-integration/acquisition-leads/${lead.id}`, { status });
    } catch (requestError) {
      setItems(previous);
      setError(requestError.response?.data?.error || "Could not update lead status.");
    }
  };

  const updateAssignee = async (lead) => {
    const assignedTo = assignments[lead.id] || lead.assignedTo?.id || "";
    if (!assignedTo) return;
    const previous = items;
    const agent = agents.find((item) => item.id === assignedTo);
    setSavingRow(lead.id);
    setItems((rows) => rows.map((row) => row.id === lead.id ? { ...row, assignedTo: agent ? { id: agent.id, name: agent.name } : null } : row));
    try {
      await api.patch(`/api/ticketing-integration/acquisition-leads/${lead.id}`, {
        assignedTo,
        ...(lead.status === "pending_lms" && assignedTo ? { status: "active" } : {}),
      });
      await load();
    } catch (requestError) {
      setItems(previous);
      setError(requestError.response?.data?.error || "Could not assign lead.");
    } finally {
      setSavingRow(null);
    }
  };

  if (!canAccess()) {
    return <Box p={3}><Alert severity="error">This tab is available only to Sales Agents, Managers, and administrators.</Alert></Box>;
  }

  return (
    <Box p={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Acquisition Leads</Typography>
          <Typography variant="body2" color="text.secondary">Unconfirmed orders transferred after 10 days.</Typography>
        </Box>
        <IconButton onClick={load} aria-label="Refresh" disabled={loading}><RefreshIcon /></IconButton>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Products (Title / SKU / Qty / Price)</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>State</TableCell>
                {isAdmin() && <TableCell>Assign Expert</TableCell>}
                <TableCell>Status</TableCell>
                {isAdmin() && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={isAdmin() ? 9 : 7} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin() ? 9 : 7} align="center" sx={{ py: 4 }}>No data</TableCell></TableRow>
              ) : (
                items.map((lead) => {
                  const products = Array.isArray(lead.order?.products) ? lead.order.products : [];
                  const preview = products.slice(0, 2);
                  const selectedAgent = assignments[lead.id] || lead.assignedTo?.id || "";
                  const currency = lead.order?.currency || "INR";

                  return (
                    <TableRow key={lead.id} hover>
                      <TableCell>{lead.escalationAt ? dayjs(lead.escalationAt).format("DD MMM, hh:mm a") : "-"}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography fontWeight={600}>{lead.customer?.name || "-"}</Typography>
                          <Typography variant="body2" color="text.secondary">{lead.customer?.email || "-"}</Typography>
                          <Typography variant="caption" color="text.secondary">{lead.order?.orderName || lead.references?.orderSourceId || "-"}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{lead.customer?.phone || "-"}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          {preview.length ? preview.map((product, index) => (
                            <Typography key={`${product.title}-${index}`} variant="body2">
                              <b>{product.title || "-"}</b>{product.sku ? ` - ${product.sku}` : ""} • x{product.quantity || 1} • {formatMoney(product.price || 0, currency)}
                            </Typography>
                          )) : <Typography variant="body2">-</Typography>}
                          {products.length > preview.length && <Typography variant="caption" color="text.secondary">+{products.length - preview.length} more</Typography>}
                        </Stack>
                      </TableCell>
                      <TableCell>{formatMoney(lead.order?.totalAmount, currency)}</TableCell>
                      <TableCell>{addressState(lead.order?.address)}</TableCell>
                      {isAdmin() && (
                        <TableCell>
                          <FormControl size="small" fullWidth sx={{ minWidth: 220 }}>
                            <InputLabel>Expert</InputLabel>
                            <Select
                              label="Expert"
                              value={selectedAgent}
                              onChange={(event) => setAssignments((current) => ({ ...current, [lead.id]: event.target.value }))}
                            >
                              {agents.map((agent) => <MenuItem key={agent.id} value={agent.id}>{agent.name}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </TableCell>
                      )}
                      <TableCell>
                        <Select size="small" value={lead.status || "pending_lms"} onChange={(event) => updateStatus(lead, event.target.value)}>
                          {editableStatuses.map((status) => <MenuItem key={status} value={status}><Chip size="small" label={status.replaceAll("_", " ")} /></MenuItem>)}
                        </Select>
                      </TableCell>
                      {isAdmin() && (
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => updateAssignee(lead)}
                            disabled={!selectedAgent || savingRow === lead.id}
                            sx={{ bgcolor: "#000", ":hover": { bgcolor: "#111" } }}
                          >
                            {savingRow === lead.id ? "Saving..." : "Save"}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
