// components/RtoDeliveredOrders.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Typography, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, CircularProgress, TablePagination, Stack, Select, MenuItem, FormControl, InputLabel
} from "@mui/material";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const readJsonStorage = (storage, key, fallback = null) => {
  try {
    const raw = storage?.getItem?.(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const getSessionUserHeaders = () => {
  return {};
};

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const RtoDeliveredOrders = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [loading, setLoading] = useState(true);

  // NEW: status group filter
  const [statusGroup, setStatusGroup] = useState("all"); 
  // Optional: if you ever want explicit statuses instead of groups:
  // const [statusesCsv, setStatusesCsv] = useState("");

  const user = JSON.parse(sessionStorage.getItem("user") || "null");
  const agentName = user?.fullName || "";

  const fetchData = async (p = page, limit = rowsPerPage, group = statusGroup /*, statuses = statusesCsv */) => {
    if (!agentName) return;
    setLoading(true);
    try {
      const res = await api.get("/api/rto-delivered", {
        headers: {
          ...getSessionUserHeaders(),
          "x-agent-name": agentName,
        },
        params: {
          page: p + 1,
          limit,
          statusGroup: group, // 'all' | 'delivered' | 'non_delivered'
          agentName,
          // statuses: statuses, // if you want to target exact statuses via CSV
        },
      });
      setRows(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Failed to load RTO orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0, rowsPerPage, statusGroup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentName, statusGroup]);

  const handleChangePage = (_e, newPage) => {
    setPage(newPage);
    fetchData(newPage, rowsPerPage, statusGroup);
  };

  const handleChangeRowsPerPage = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setRowsPerPage(newSize);
    setPage(0);
    fetchData(0, newSize, statusGroup);
  };

  if (!agentName) {
    return <Typography sx={{ p: 3 }}>No logged-in user found.</Typography>;
  }

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">
          RTO Orders — {agentName}
        </Typography>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="rto-status-group-label">Filter</InputLabel>
          <Select
            labelId="rto-status-group-label"
            label="Filter"
            value={statusGroup}
            onChange={(e) => {
              setPage(0);
              setStatusGroup(e.target.value);
            }}
          >
            <MenuItem value="all">All RTO (incl. Delivered)</MenuItem>
            <MenuItem value="delivered">RTO Delivered only</MenuItem>
            <MenuItem value="non_delivered">RTO (Non-Delivered)</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell># Order ID</TableCell>
                <TableCell>Shipment Status</TableCell>
                <TableCell>Order Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Payment Status</TableCell>
                <TableCell>Total Price</TableCell>
                <TableCell>Tracking No.</TableCell>
                <TableCell>Carrier</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.order_id}-${i}`}>
                  <TableCell>{r.orderId}</TableCell>
                  <TableCell>{r.shipment_status}</TableCell>
                  <TableCell>
                    {r.order_date ? new Date(r.order_date).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>{r.customerName || "—"}</TableCell>
                  <TableCell>{r.phone || "—"}</TableCell>
                  <TableCell>{r.productOrdered || "—"}</TableCell>
                  <TableCell>{r.paymentStatus || "—"}</TableCell>
                  <TableCell>{r.totalPrice != null ? `₹${r.totalPrice}` : "—"}</TableCell>
                  <TableCell>{r.tracking_number || "—"}</TableCell>
                  <TableCell>{r.carrier_title || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </Paper>
      )}
    </Box>
  );
};

export default RtoDeliveredOrders;
