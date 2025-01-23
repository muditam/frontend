import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination } from '@mui/material';

const OrdersTable = () => {
    const [orders, setOrders] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50); 

    useEffect(() => {
        const fetchShopifyOrders = async () => {
            try {
                const response = await axios.get('https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders'); 
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
    }, []);

    const handleChangePage = (event, newPage) => {
        setCurrentPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setCurrentPage(0);
    };

    return (
        <>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Order ID</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Contact Number</TableCell>
                            <TableCell>Amount</TableCell> 
                            <TableCell>Mode of Payment</TableCell>
                            <TableCell>Products Ordered</TableCell>
                            <TableCell>Channel Name</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage).map((order) => (
                            <TableRow key={order.id}>
                                <TableCell component="th" scope="row">{order.name}</TableCell>
                                <TableCell>{order.customer && order.customer.first_name} {order.customer && order.customer.last_name}</TableCell>
                                <TableCell>{order.customer && order.customer.default_address && order.customer.default_address.phone}</TableCell>
                                <TableCell>{order.total_price}</TableCell> 
                                <TableCell>{order.payment_gateway_names}</TableCell>
                                <TableCell>
                                    {order.line_items && order.line_items.map(item => `${item.title} (Qty: ${item.quantity})`).join(", ")}
                                </TableCell>
                                <TableCell>{order.channel_name}</TableCell>
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

