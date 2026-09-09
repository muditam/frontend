import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Alert, Box, Chip, CircularProgress, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography,
} from "@mui/material";

const API_BASE = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "http://localhost:5001"
  : String(process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");
const API = `${API_BASE}/api`;

function label(value) {
  return String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SupportTicketsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await axios.get(`${API}/ticketing-integration/tickets`, {
        withCredentials: true,
        params: { page: page + 1, limit: 25, status, type, search, dateFrom, dateTo },
      });
      setItems(response.data?.items || []);
      setPagination(response.data?.pagination || { page: 1, pageSize: 25, total: 0, totalPages: 1 });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not load support tickets");
    } finally { setLoading(false); }
  }, [dateFrom, dateTo, page, search, status, type]);

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);

  return <Box>
    <Paper elevation={0} sx={{ mb: 2, p: 2, border: "1px solid #dbe2ea", borderRadius: 2.5 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
        <TextField size="small" label="Search ticket, order or AWB" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} sx={{ minWidth: 260, flex: 1 }} />
        <TextField select size="small" label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} sx={{ minWidth: 150 }}><MenuItem value="">All</MenuItem><MenuItem value="open">Open</MenuItem><MenuItem value="closed">Closed</MenuItem></TextField>
        <TextField select size="small" label="Type" value={type} onChange={(event) => { setType(event.target.value); setPage(0); }} sx={{ minWidth: 170 }}><MenuItem value="">All</MenuItem><MenuItem value="confirmation">Confirmation</MenuItem><MenuItem value="pre">Pre-Delivery</MenuItem><MenuItem value="post">Post-Delivery</MenuItem></TextField>
        <TextField size="small" label="From" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
        <TextField size="small" label="To" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
      </Stack>
    </Paper>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dbe2ea", borderRadius: 2.5 }}>
      <Table size="small">
        <TableHead><TableRow><TableCell>Ticket</TableCell><TableCell>Order</TableCell><TableCell>Issue</TableCell><TableCell>Type</TableCell><TableCell>Priority</TableCell><TableCell>Assigned to</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell></TableRow></TableHead>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={8} align="center" sx={{ py: 7 }}><CircularProgress size={24} /></TableCell></TableRow> : items.length ? items.map((ticket) => <TableRow key={ticket.id} hover>
            <TableCell><Typography sx={{ fontSize: 13, fontWeight: 800 }}>{ticket.ticketNo}</Typography></TableCell>
            <TableCell>{ticket.references?.orderSourceId || "—"}</TableCell>
            <TableCell sx={{ maxWidth: 300 }}><Typography noWrap sx={{ fontSize: 13 }}>{ticket.reason?.summary || "—"}</Typography></TableCell>
            <TableCell>{label(ticket.type)}</TableCell>
            <TableCell><Chip size="small" label={label(ticket.priority)} /></TableCell>
            <TableCell>{ticket.assignee?.name || "Waiting for assignment"}</TableCell>
            <TableCell><Chip size="small" color={ticket.status === "closed" ? "success" : "warning"} label={label(ticket.status)} /></TableCell>
            <TableCell>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</TableCell>
          </TableRow>) : <TableRow><TableCell colSpan={8} align="center" sx={{ py: 7 }}><Typography sx={{ color: "#64748b" }}>No support tickets found</Typography></TableCell></TableRow>}
        </TableBody>
      </Table>
      <TablePagination component="div" count={pagination.total || 0} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, next) => setPage(next)} />
    </TableContainer>
  </Box>;
}
