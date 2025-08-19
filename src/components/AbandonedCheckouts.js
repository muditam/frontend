// src/pages/AbandonedCheckouts.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import dayjs from "dayjs";
import axios from "axios";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import SendIcon from "@mui/icons-material/Send";

const DATE_FILTERS = [
  "Custom range",
  "Today",
  "Yesterday",
  "Last 7 days",
  "Last 30 days",
  "Week to date",
  "Month to date",
  "Year to date",
  "Last 90 days",
  "Last 365 days",
  "Last month",
  "Last 12 months",
  "Last year",
  "Quarter to date",
];

const getDateRange = (label) => {
  const now = dayjs();
  let start = null;
  let end = null;

  switch (label) {
    case "Today":
      start = now.startOf("day");
      end = now.endOf("day");
      break;
    case "Yesterday":
      start = now.subtract(1, "day").startOf("day");
      end = now.subtract(1, "day").endOf("day");
      break;
    case "Last 7 days":
      start = now.subtract(6, "day").startOf("day");
      end = now.endOf("day");
      break;
    case "Last 30 days":
      start = now.subtract(29, "day").startOf("day");
      end = now.endOf("day");
      break;
    case "Week to date":
      start = now.startOf("week");
      end = now.endOf("day");
      break;
    case "Month to date":
      start = now.startOf("month");
      end = now.endOf("day");
      break;
    case "Quarter to date":
      start = now.startOf("quarter");
      end = now.endOf("day");
      break;
    case "Year to date":
      start = now.startOf("year");
      end = now.endOf("day");
      break;
    case "Last 90 days":
      start = now.subtract(89, "day").startOf("day");
      end = now.endOf("day");
      break;
    case "Last 365 days":
      start = now.subtract(364, "day").startOf("day");
      end = now.endOf("day");
      break;
    case "Last month":
      start = now.subtract(1, "month").startOf("month");
      end = now.subtract(1, "month").endOf("month");
      break;
    case "Last 12 months":
      start = now.subtract(11, "month").startOf("month");
      end = now.endOf("month");
      break;
    case "Last year":
      start = now.subtract(1, "year").startOf("year");
      end = now.subtract(1, "year").endOf("year");
      break;
    default:
      break;
  }
  return {
    start: start ? start.toISOString() : "",
    end: end ? end.toISOString() : "",
  };
};

// Heuristic money formatter that handles minor/major units gracefully
function formatMoney(value, currency = "INR") {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value !== "number") return String(value);

  // If integer and large, assume minor units (paise/cents)
  const useMinor = Number.isInteger(value) && Math.abs(value) >= 1000;
  const n = useMinor ? value / 100 : value;
  return `${currency} ${n.toFixed(2)}`;
}

export default function AbandonedCheckouts() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);

  const [quickRange, setQuickRange] = useState("Last 7 days");
  const quick = useMemo(() => getDateRange(quickRange), [quickRange]);

  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [itemDialog, setItemDialog] = useState({ open: false, row: null });

  const start = quickRange === "Custom range" ? customStart : quick.start;
  const end = quickRange === "Custom range" ? customEnd : quick.end;

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit,
      };
      if (query) params.query = query; // backend searches items & ids too
      if (start) params.start = start;
      if (end) params.end = end;

      const { data } = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/abandoned", { params });
      setRows(data.items || []);
      setCount(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [page, limit, quickRange]);

  const onSearch = () => {
    setPage(0);
    fetchData();
  };

  const onNotify = async (id) => {
    try {
      await axios.post(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/abandoned/${id}/notify`);
      setRows((prev) =>
        prev.map((r) => (r._id === id ? { ...r, notified: true, notifiedAt: new Date().toISOString() } : r))
      );
    } catch (e) {
      console.error(e);
      alert("Notify failed");
    }
  };

  const openItems = (row) => setItemDialog({ open: true, row });
  const closeItems = () => setItemDialog({ open: false, row: null });

  return (
    <Box p={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Abandoned Checkouts
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={fetchData} aria-label="Refresh">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
          <TextField
            label="Search (name/phone/email/order/checkout/product)"
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            sx={{ minWidth: 320 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Range</InputLabel>
            <Select label="Range" value={quickRange} onChange={(e) => setQuickRange(e.target.value)}>
              {DATE_FILTERS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {quickRange === "Custom range" && (
            <>
              <TextField
                label="Start (ISO)"
                size="small"
                placeholder="2025-08-01T00:00:00.000Z"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                sx={{ minWidth: 280 }}
              />
              <TextField
                label="End (ISO)"
                size="small"
                placeholder="2025-08-18T23:59:59.999Z"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                sx={{ minWidth: 280 }}
              />
            </>
          )}

          <Button
            variant="contained"
            onClick={onSearch}
            startIcon={<SearchIcon />}
            sx={{ bgcolor: "#000", ":hover": { bgcolor: "#111" } }}
          >
            Search
          </Button>
        </Stack>
      </Paper>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Products (Title / Variant / Qty / Final Line Price)</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>IDs</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No data
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const items = Array.isArray(r.items) ? r.items : [];
                  const currency = r.currency || "INR";
                  const preview = items.slice(0, 2);

                  // Use aliases from backend so IDs always render
                  const evtId = r.eventId || r.requestId || r.cId || r.token || "-";
                  const chkId = r.checkoutId || r.token || "-";

                  return (
                    <TableRow key={r._id} hover>
                      <TableCell>{r.eventAt ? dayjs(r.eventAt).format("DD MMM, HH:mm") : "-"}</TableCell>

                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography fontWeight={600}>{r.customer?.name || "-"}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {r.customer?.email || "-"}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell>{r.customer?.phone || "-"}</TableCell>

                      <TableCell>
                        <Stack spacing={0.5}>
                          {preview.map((it, idx) => (
                            <Typography key={idx} variant="body2">
                              <b>{it.title || "-"}</b>
                              {it.variantTitle ? ` — ${it.variantTitle}` : ""} • x{it.quantity ?? 1} •{" "}
                              {formatMoney(
                                it.finalLinePrice ?? (it.unitPrice || 0) * (it.quantity ?? 1),
                                currency
                              )}
                            </Typography>
                          ))}
                          {items.length > 2 && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => openItems(r)}
                              sx={{ px: 0, minWidth: 0, textTransform: "none" }}
                            >
                              View all ({items.length})
                            </Button>
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell>{formatMoney(r.total, currency)}</TableCell>

                      <TableCell>
                        <Typography variant="body2">Evt: {evtId}</Typography>
                        <Typography variant="body2">Chk: {chkId}</Typography>
                        {r.orderId && <Typography variant="body2">Ord: {r.orderId}</Typography>}
                        {r.abcUrl && (
                          <Button
                            size="small"
                            variant="text"
                            href={r.abcUrl}
                            target="_blank"
                            rel="noreferrer"
                            sx={{ px: 0, minWidth: 0, textTransform: "none" }}
                          >
                            Open cart
                          </Button>
                        )}
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" label={r.type || "abandoned_checkout"} variant="outlined" />
                          {r.notified ? (
                            <Chip size="small" color="success" label="Notified" />
                          ) : (
                            <Chip size="small" color="warning" label="Pending" />
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<SendIcon />}
                          disabled={!!r.notified}
                          onClick={() => onNotify(r._id)}
                          sx={{ bgcolor: "#000", ":hover": { bgcolor: "#111" } }}
                        >
                          Notify
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={count}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={limit}
          onRowsPerPageChange={(e) => {
            setLimit(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </Paper>

      {/* Items dialog */}
      <Dialog open={itemDialog.open} onClose={closeItems} maxWidth="md" fullWidth>
        <DialogTitle>Cart items</DialogTitle>
        <DialogContent dividers>
          {itemDialog.row && Array.isArray(itemDialog.row.items) && itemDialog.row.items.length > 0 ? (
            <Stack spacing={1}>
              {itemDialog.row.items.map((it, i) => (
                <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={600}>{it.title || "-"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {it.variantTitle ? `${it.variantTitle} • ` : ""}Qty: {it.quantity ?? 1}
                      {it.sku ? ` • SKU: ${it.sku}` : ""}
                    </Typography>
                  </Box>
                  <Typography>
                    {formatMoney(
                      (it.finalLinePrice ?? (it.unitPrice || 0) * (it.quantity ?? 1)) || 0,
                      itemDialog.row.currency || "INR"
                    )}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography>No items</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeItems}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
