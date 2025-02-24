import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination
} from '@mui/material';

const OrdersTable = () => {
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Retrieve persisted dates from localStorage or use defaults.
  const storedStartDate = localStorage.getItem('startDate');
  const storedEndDate = localStorage.getItem('endDate');
  const defaultStart = storedStartDate || "2025-02-01";
  const today = new Date().toISOString().split("T")[0];
  const defaultEnd = storedEndDate || today;

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Persist date changes to localStorage.
  useEffect(() => {
    localStorage.setItem('startDate', startDate);
    localStorage.setItem('endDate', endDate);
  }, [startDate, endDate]);

  // Fetch orders whenever startDate or endDate changes.
  useEffect(() => {
    const fetchShopifyOrders = async () => {
      try {
        const response = await axios.get('https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders', {
          params: { startDate, endDate }
        });
        if (response.data && Array.isArray(response.data)) {
          setOrders(response.data);
        } else {
          throw new Error("Invalid response structure: expected an array");
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        console.error('Detailed error:', error.response || error.message || error);
        setOrders([]);
      }
    };

    fetchShopifyOrders();
  }, [startDate, endDate]);

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  // Paginate orders returned by the API.
  const paginatedOrders = orders.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);

  return (
    <>
      {/* Date filters */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "16px", alignItems: "center", marginTop: "16px", marginLeft: "16px" }}>
        <label>
          Start from:&nbsp;
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
        </label> |
        <label>
          End to:&nbsp;
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
        </label>
      </div>
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="orders table">
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Contact Number</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Mode of Payment</TableCell>
              <TableCell>Products Ordered</TableCell>
              <TableCell>Channel Name</TableCell>
              <TableCell>Delivery Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedOrders.map((order) => (
              <TableRow key={order.order_id}>
                <TableCell>{order.order_id}</TableCell>
                <TableCell>{order.name}</TableCell>
                <TableCell>{order.contact_number}</TableCell>
                <TableCell>{order.total_price}</TableCell>
                <TableCell>
                  {Array.isArray(order.payment_gateway_names)
                    ? order.payment_gateway_names.join(", ")
                    : order.payment_gateway_names}
                </TableCell>
                <TableCell>
                  {order.line_items
                    ? order.line_items.map(item => item.title).join(", ")
                    : ""}
                </TableCell>
                <TableCell>{order.channel_name}</TableCell>
                <TableCell>{order.delivery_status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={orders.length}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </>
  );
};

export default OrdersTable;
