import React, { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Paper,
} from "@mui/material";
import axios from "axios";
import dayjs from "dayjs";

const UndeliveredOrdersTabs = () => {
  const [tab, setTab] = useState("High");
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ High: 0, Medium: 0, Low: 0 });

  useEffect(() => {
    fetchOrders(tab, page + 1, rowsPerPage);
  }, [tab, page, rowsPerPage]);

  const fetchOrders = async (priority, page, limit) => {
    try {
      const res = await axios.get(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders/undelivered?priority=${priority}&page=${page}&limit=${limit}` 
      );
      setOrders(res.data.data || []);
      setTotal(res.data.total || 0);
      setCounts(res.data.counts || { High: 0, Medium: 0, Low: 0 });
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  return (
    <Box p={2}>
      {/* Tabs with counts */}
      <Tabs value={tab} onChange={(e, v) => setTab(v)}>
        <Tab value="High" label={`High (${counts.High})`} />
        <Tab value="Medium" label={`Medium (${counts.Medium})`} />
        <Tab value="Low" label={`Low (${counts.Low})`} />
      </Tabs>

      {/* Orders Table */}
      <Paper sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><b>Order ID</b></TableCell>
              <TableCell><b>Status</b></TableCell>
              <TableCell><b>Order Date</b></TableCell>
              <TableCell><b>Tracking No.</b></TableCell>
              <TableCell><b>Carrier</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>{order.order_id || "-"}</TableCell>
                  <TableCell>{order.shipment_status || "-"}</TableCell>
                  <TableCell>
                    {order.order_date
                      ? dayjs(order.order_date).format("DD/MM/YYYY")
                      : "-"}
                  </TableCell>
                  <TableCell>{order.tracking_number || "-"}</TableCell>
                  <TableCell>{order.carrier_title || "-"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No orders found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Box>
  );
};

export default UndeliveredOrdersTabs;
