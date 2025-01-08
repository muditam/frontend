import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  CircularProgress,
  Typography,
} from "@mui/material";
import axios from "axios";

const AllShopifyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [sinceId, setSinceId] = useState(null);  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get("http://localhost:5000/api/shopify/orders", {
        params: { limit: rowsPerPage, since_id: sinceId },
      });
      setOrders(response.data.orders || []);
      setSinceId(response.data.nextSinceId || null);
    } catch (err) {
      console.error("Error fetching orders:", err.message);
      setError("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [rowsPerPage]);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
  };

  return (
    <TableContainer component={Paper}>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Payment Status</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell>Fulfillment Status</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Delivery Status</TableCell>
                <TableCell>Delivery Method</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.name}</TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {order.customer?.first_name} {order.customer?.last_name}
                  </TableCell>
                  <TableCell>{order.source_name}</TableCell>
                  <TableCell>{order.total_price}</TableCell>
                  <TableCell>{order.financial_status}</TableCell>
                  <TableCell>{order.shipping_address?.city}</TableCell>
                  <TableCell>{order.fulfillment_status || "Pending"}</TableCell>
                  <TableCell>{order.line_items?.length}</TableCell>
                  <TableCell>{order.delivery_status || "N/A"}</TableCell>
                  <TableCell>
                    {order.shipping_lines?.map((line) => line.title).join(", ") || "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={-1} 
            rowsPerPage={rowsPerPage}
            page={sinceId ? 1 : 0}  
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </TableContainer>
  );
};

export default AllShopifyOrders;
