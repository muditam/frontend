// src/components/OrderConfirmations/ConfirmedOrder.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  Button,
  ButtonGroup,
  CircularProgress,
} from "@mui/material";
import axios from "axios";


const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const ENDPOINT = "/api/order-confirmations/confirmed-order";


// Map UI -> backend expected values (adjust if your backend accepts 'week'/'month' directly)
const RANGE_OPTIONS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];


const RANGE_MAP = {
  all: "all",
  today: "today",
  yesterday: "yesterday",
  week: "week",       // change to 'thisWeek' if backend expects that
  month: "month",     // change to 'thisMonth' if backend expects that
};


const ConfirmedOrder = () => {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0); // 0-based for MUI
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState("all");


  const normalizeDate = (value) => {
    if (!value) return null;
    // numbers: seconds or ms
    if (typeof value === "number") {
      const ms = value < 1e12 ? value * 1000 : value;
      const d = new Date(ms);
      return isNaN(d) ? null : d;
    }
    // strings: ISO or parseable formats
    if (typeof value === "string") {
      const d = new Date(value);
      if (!isNaN(d)) return d;
      const parsed = Date.parse(value);
      return isNaN(parsed) ? null : new Date(parsed);
    }
    // Date object
    if (value instanceof Date) return isNaN(value) ? null : value;
    return null;
  };


  const formatDateTime = (value) => {
    const d = normalizeDate(value);
    if (!d) return "-";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };


  const formatProducts = (items) => {
    if (!items) return "-";
    if (Array.isArray(items)) {
      return items
        .map((p) => {
          if (typeof p === "string") return p;
          if (p && typeof p === "object") {
            const title = p.title || p.name || "";
            const qty = p.quantity ?? p.qty ?? 0;
            return `${title} x${qty}`;
          }
          return "";
        })
        .filter(Boolean)
        .join(", ");
    }
    if (typeof items === "string") return items;
    return "-";
  };


  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE_URL}${ENDPOINT}`, {
        params: {
          page: page + 1,              // backend 1-based
          limit: rowsPerPage,
          range: RANGE_MAP[range],     // normalized range
        },
      });


      setRows(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(
        "Failed to load confirmed orders:",
        err.response?.status,
        err.response?.data || err.message
      );
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, range]);


  useEffect(() => {
    loadData();
  }, [loadData]);


  const handleChangePage = (_e, newPage) => {
    setPage(newPage);
  };


  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };


  const handleRangeChange = (newRange) => {
    if (newRange === range) return;
    setRange(newRange);
    setPage(0); // reset to first page when filter changes
  };


  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Confirmed Orders
      </Typography>


      {/* Filters */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Showing orders with status <strong>ORDER CONFIRMED</strong>
        </Typography>


        <ButtonGroup size="small" variant="outlined">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              onClick={() => handleRangeChange(opt.key)}
              variant={range === opt.key ? "contained" : "outlined"}
            >
              {opt.label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>


      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 540 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  '& th': {
                      backgroundColor: "#f8fafc",
              bgcolor: "#f8fafc",
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
              backgroundImage: "none",


              color: "#0f172a",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              fontSize: 12,
              borderBottom: "2px solid #93c5fd",
                  },
                }}
              >
                <TableCell sx={{ width: 72 }}>S.No.</TableCell>
                <TableCell>Date &amp; Time</TableCell>
                <TableCell>OC Date &amp; Time</TableCell>
                <TableCell>Order Name</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Products Ordered</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>Amount</TableCell>
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
                    <Typography variant="body2" color="text.secondary">
                      No confirmed orders found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => {
                  const formatDateTime = (val) => {
                    if (!val) return "-";
                    const d = new Date(val);
                    return isNaN(d)
                      ? "-"
                      : d.toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        });
                  };


                  const productsText = Array.isArray(row.products)
                    ? row.products
                        .map((p) => {
                          if (typeof p === "string") return p;
                          const title = p.title || p.name || "";
                          const qty = p.quantity ?? p.qty ?? "";
                          return title ? `${title}${qty ? ` x${qty}` : ""}` : "";
                        })
                        .filter(Boolean)
                        .join(", ")
                    : "-";


                  return (
                    <TableRow key={row.id || idx} hover>
                      <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                      <TableCell>{formatDateTime(row.orderDateTime)}</TableCell>
                      <TableCell>{formatDateTime(row.ocDateTime)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={row.orderName || "-"} />
                      </TableCell>
                      <TableCell>{row.mobile || "-"}</TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="body2" noWrap>
                          {productsText || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.channel || "-"}</TableCell>
                      <TableCell align="right">
                        {row.amount != null
                          ? `${row.amount} ${row.currency || ""}`
                          : "-"}
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
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </Paper>
    </Box>
  );
};


export default ConfirmedOrder;



