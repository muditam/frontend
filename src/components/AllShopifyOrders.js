import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const OrdersTable = () => {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const fetchShopifyOrders = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/orders');
                console.log(response.data);  
                if (response.data && response.data.orders) {
                    setOrders(response.data.orders);
                } else {
                    throw new Error("Invalid response structure");
                }
            } catch (error) {
                console.error('Error fetching orders:', error);
                setOrders([]);
            }
        };
        fetchShopifyOrders();
    }, []);

    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
                <TableHead>
                    <TableRow>
                        <TableCell>Order ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Contact Number</TableCell>
                        <TableCell>Amount</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {orders ? orders.map((order) => (
                        <TableRow key={order.id}>
                            <TableCell component="th" scope="row">{order.id}</TableCell>
                            <TableCell>{order.customer && order.customer.first_name} {order.customer && order.customer.last_name}</TableCell>
                            <TableCell>{order.customer && order.customer.phone}</TableCell>
                            <TableCell>{order.total_price}</TableCell>
                        </TableRow>
                    )) : <TableRow><TableCell colSpan={4} align="center">Loading orders...</TableCell></TableRow>}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default OrdersTable;
