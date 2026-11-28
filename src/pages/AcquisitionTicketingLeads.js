import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const api = axios.create({ baseURL: (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, ""), withCredentials: true });
const editableStatuses = ["pending_lms", "active", "contacted", "converted", "not_interested", "no_response", "closed"];

function currentUser() { return JSON.parse(sessionStorage.getItem("user") || "{}"); }
function role() { return String(currentUser()?.role || "").trim().toLowerCase(); }
function hasAcquisitionLeadsPermission() {
  const user = currentUser();
  return user?.permissions?.menubar?.acquisitionLeads === true || user?.permissions?.navbar?.acquisitionLeads === true;
}
// Mirrors the backend: assigning stays with administrators and managers, while
// access comes from the acquisitionLeads permission rather than a job title.
function isAdmin() { return ["admin", "super admin", "superadmin", "manager"].includes(role()); }
function canAccess() { return isAdmin() || hasAcquisitionLeadsPermission(); }

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
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/ticketing-integration/acquisition-leads");
      setItems(response.data?.items || []);
      setError(response.data?.warning || "");
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
      // Assigning an expert activates the lead, whatever it was before.
      await api.patch(`/api/ticketing-integration/acquisition-leads/${lead.id}`, {
        assignedTo,
        status: "active",
      });
      await load();
    } catch (requestError) {
      setItems(previous);
      setError(requestError.response?.data?.error || "Could not assign lead.");
    } finally {
      setSavingRow(null);
    }
  };

  const counts = useMemo(() => ({
    all: items.length,
    widget: items.filter((lead) => lead.source === "widget").length,
    ticketing: items.filter((lead) => lead.source !== "widget").length,
  }), [items]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return items.filter((lead) => {
      const isWidget = lead.source === "widget";
      if (sourceFilter === "widget" && !isWidget) return false;
      if (sourceFilter === "ticketing" && isWidget) return false;
      if (statusFilter !== "all" && (lead.status || "pending_lms") !== statusFilter) return false;
      if (!term) return true;
      const name = String(lead.customer?.name || "").toLowerCase();
      const phone = String(lead.customer?.phone || "").replace(/\D/g, "");
      const order = String(lead.order?.name || "").toLowerCase();
      return name.includes(term) || order.includes(term) || (digits.length >= 4 && phone.includes(digits));
    });
  }, [items, sourceFilter, statusFilter, search]);

  // A filter change can leave the viewer past the end of the shorter list.
  useEffect(() => { setPage(0); }, [sourceFilter, statusFilter, search]);

  const pagedItems = useMemo(
    () => filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredItems, page, rowsPerPage]
  );

  if (!canAccess()) {
    return <Box p={3}><Alert severity="error">You do not have permission to access Acquisition Leads.</Alert></Box>;
  }

  return (
    <Box p={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Acquisition Leads</Typography>
          <Typography variant="body2" color="text.secondary">Unconfirmed orders transferred after 10 days and website widget leads.</Typography>
        </Box>
        <IconButton onClick={load} aria-label="Refresh" disabled={loading}><RefreshIcon /></IconButton>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} mb={2} alignItems={{ md: "center" }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Source</InputLabel>
          <Select label="Source" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <MenuItem value="all">All sources ({counts.all})</MenuItem>
            <MenuItem value="widget">Chatbot ({counts.widget})</MenuItem>
            <MenuItem value="ticketing">Ticketing ({counts.ticketing})</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <MenuItem value="all">All statuses</MenuItem>
            {editableStatuses.map((status) => (
              <MenuItem key={status} value={status}>{status.replaceAll("_", " ")}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Search name, phone or order"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: 260 }}
        />

        {(sourceFilter !== "all" || statusFilter !== "all" || search) && (
          <Button size="small" onClick={() => { setSourceFilter("all"); setStatusFilter("all"); setSearch(""); }}>
            Clear
          </Button>
        )}

        <Box flexGrow={1} />
        <Typography variant="body2" color="text.secondary">
          Showing {filteredItems.length} of {counts.all}
        </Typography>
      </Stack>

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
              ) : filteredItems.length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin() ? 9 : 7} align="center" sx={{ py: 4 }}>
                  {items.length === 0 ? "No data" : "No leads match these filters"}
                </TableCell></TableRow>
              ) : (
                pagedItems.map((lead) => {
                  const products = Array.isArray(lead.order?.products) ? lead.order.products : [];
                  const preview = products.slice(0, 2);
                  const selectedAgent = assignments[lead.id] || lead.assignedTo?.id || "";
                  // Already owned in Consultation or in Leads: show that expert
                  // rather than offering to assign the lead again.
                  const existingExpert = lead.existingExpert?.name || "";
                  const currency = lead.order?.currency || "INR";

                  return (
                    <TableRow key={lead.id} hover>
                      <TableCell>{lead.escalationAt ? dayjs(lead.escalationAt).format("DD MMM, hh:mm a") : "-"}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography fontWeight={600}>{lead.customer?.name || "-"}</Typography>
                          <Typography variant="body2" color="text.secondary">{lead.customer?.email || "-"}</Typography>
                          <Typography variant="caption" color="text.secondary">{lead.source === "widget" ? "Website widget" : lead.order?.orderName || lead.references?.orderSourceId || "-"}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{lead.customer?.phone || "-"}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          {lead.source === "widget" ? <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{lead.context || "-"}</Typography> : preview.length ? preview.map((product, index) => (
                            <Typography key={`${product.title}-${index}`} variant="body2">
                              <b>{product.title || "-"}</b>{product.sku ? ` - ${product.sku}` : ""} • x{product.quantity || 1} • {formatMoney(product.price || 0, currency)}
                            </Typography>
                          )) : <Typography variant="body2">-</Typography>}
                          {products.length > preview.length && <Typography variant="caption" color="text.secondary">+{products.length - preview.length} more</Typography>}
                        </Stack>
                      </TableCell>
                      <TableCell>{lead.source === "widget" ? "" : formatMoney(lead.order?.totalAmount, currency)}</TableCell>
                      <TableCell>{lead.source === "widget" ? "" : addressState(lead.order?.address)}</TableCell>
                      {isAdmin() && (
                        <TableCell>
                          {existingExpert ? (
                            <Stack spacing={0.25}>
                              <Typography variant="body2" fontWeight={600}>{existingExpert}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {lead.existingExpert?.from === "customer" ? "Already in Consultation" : "Already assigned in Leads"}
                              </Typography>
                            </Stack>
                          ) : (
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
                          )}
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
                            disabled={Boolean(existingExpert) || !selectedAgent || savingRow === lead.id}
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
        <TablePagination
          component="div"
          count={filteredItems.length}
          page={page}
          onPageChange={(_event, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Box>
  );
}
