// components/RtoDeliveredOrders.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Typography, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, CircularProgress, TablePagination,
} from "@mui/material";

const RtoDeliveredOrders = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);     // zero-based for MUI
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [loading, setLoading] = useState(true);

  // Read login user fullName from sessionStorage
  const user = JSON.parse(sessionStorage.getItem("user") || "null");
  const agentName = user?.fullName || "";

  const fetchData = async (p = page, limit = rowsPerPage) => {
    if (!agentName) return;
    setLoading(true);
    try {
      const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/rto-delivered", {
        headers: { "x-agent-name": agentName },
        params: { page: p + 1, limit }, // backend is 1-based
      });
      setRows(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Failed to load RTO Delivered orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentName]);

  const handleChangePage = (_e, newPage) => {
    setPage(newPage);
    fetchData(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setRowsPerPage(newSize);
    setPage(0);
    fetchData(0, newSize);
  };

  if (!agentName) {
    return <Typography sx={{ p: 3 }}>No logged-in user found.</Typography>;
  }

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>
        RTO Delivered Orders — {agentName}
      </Typography>

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
                  <TableCell>{r.orderId}</TableCell> {/* already with '#' */}
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
