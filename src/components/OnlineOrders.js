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
  TablePagination,
  Select,
  MenuItem,
  Typography
} from '@mui/material';

const OnlineOrders = () => {
    const [orders, setOrders] = useState([]);
    const [retentionAgents, setRetentionAgents] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    const productAbbreviations = {
        'Karela Jamun Fizz': 'KJF',
        'Sugar Defend Pro': 'SDP',
        'Vasant Kusmakar Ras': 'VKR',
        'Liver Fix': 'L-Fx',
        'Stress & Sleep': 'S&S',
        'Chandraprabha Vati': 'CPV',
        'Heart Defend Pro': 'HDP',
        'Performance Forever': 'PF',
        'Power Gut': 'PGut',
        'Shilajit with Gold': 'Shilajit',
        'Diabetes Management Kit': 'Kit'
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const ordersResponse = await axios.get('http://localhost:5000/api/orders');
                const leadsResponse = await axios.get('http://localhost:5000/api/leads');
                const agentsResponse = await axios.get('http://localhost:5000/api/employees?role=Retention%20Agent');

                if (ordersResponse.data && Array.isArray(ordersResponse.data)) {
                    const webOrders = ordersResponse.data.filter(order => order.channel_name === "web");
                    setOrders(matchLeads(webOrders, leadsResponse.data));
                }

                if (agentsResponse.data) {
                    setRetentionAgents(agentsResponse.data);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    const matchLeads = (orders, leads) => {
        return orders.map(order => {
            const normalizedOrderPhone = order.customer && order.customer.default_address && order.customer.default_address.phone.replace(/[^\d]/g, '').slice(-10);
            const matchingLead = leads.find(lead => lead.contactNumber.endsWith(normalizedOrderPhone));
            return {
                ...order,
                healthExpertAssigned: matchingLead ? matchingLead.healthExpertAssigned : null,
                leadExists: !!matchingLead
            };
        });
    };

    
    

    const handleChangePage = (event, newPage) => {
        setCurrentPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setCurrentPage(0);
    };

    const handleSelectHealthExpert = async (orderIndex, expertId) => {
        const order = orders[orderIndex];
        const expert = retentionAgents.find(agent => agent._id === expertId);
    
        const leadData = {
            orderId: `${order.name}`,  
            name: `${order.customer.first_name} ${order.customer.last_name}`,
            contactNumber: order.customer.default_address.phone,
            date: new Date(order.created_at).toISOString().split('T')[0],
            amount: order.total_price,
            modeOfPayment: order.payment_gateway_names.join(", "),
            productsOrdered: order.line_items.map(
                item => productAbbreviations[item.title] || item.title // Use abbreviation or fallback to title
            ),
            agentAssigned: 'Online Order',
            healthExpertAssigned: expert.fullName,
            leadStatus: 'Sales Done',
            salesStatus: 'Sales Done',
        };
    
        try {
            // Check if the lead already exists
            const existingLeadResponse = await axios.get(
                `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/check-duplicate?contactNumber=${leadData.contactNumber}`
            );
    
            if (existingLeadResponse.data.exists) {
                // Update the existing lead
                await axios.put(
                    `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${existingLeadResponse.data.leadId}`,
                    leadData
                );
            } else {
                // Create a new lead
                await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads", leadData);
            }
    
            // Fetch updated orders to reflect changes in UI
            const updatedOrdersResponse = await axios.get('http://localhost:5000/api/orders');
            const webOrders = updatedOrdersResponse.data.filter(order => order.channel_name === "web");
            setOrders(webOrders);
    
            console.log(`Health Expert updated successfully for Order ID: ${order.name}`);
        } catch (error) {
            console.error('Failed to create or update lead:', error);
        }
    };    

    const filterAndAbbreviateItems = (items) => {
        return items
            .filter(item => productAbbreviations[item.title])
            .map(item => productAbbreviations[item.title])
            .join(", ");
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
                            <TableCell>Order Date</TableCell>
                            <TableCell>Amount</TableCell> 
                            <TableCell>Mode of Payment</TableCell>
                            <TableCell>Products Ordered</TableCell>
                            <TableCell>Agent Assigned</TableCell>
                            <TableCell>Channel Name</TableCell>
                            <TableCell>Health Expert Assigned</TableCell>
                            <TableCell>Lead Status</TableCell>
                            <TableCell>Sales Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage).map((order, index) => (
                            <TableRow key={order.id}>
                                <TableCell component="th" scope="row">{order.name}</TableCell>
                                <TableCell>{order.customer && order.customer.first_name} {order.customer && order.customer.last_name}</TableCell>
                                <TableCell>{order.customer && order.customer.default_address && order.customer.default_address.phone}</TableCell>
                                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>{order.total_price}</TableCell> 
                                <TableCell>{order.payment_gateway_names}</TableCell>
                                <TableCell>
                                    {filterAndAbbreviateItems(order.line_items)}
                                </TableCell>
                                <TableCell>Online Order</TableCell>
                                <TableCell>{order.channel_name}</TableCell>
                                <TableCell>
                                    {order.healthExpertAssigned ? (
                                        <span>{order.healthExpertAssigned}</span>
                                    ) : (
                                        <Select
                                            value={order.healthExpertAssigned || ""}
                                            onChange={(e) => handleSelectHealthExpert(index, e.target.value)}
                                            fullWidth
                                        >
                                            {retentionAgents.map((agent) => (
                                                <MenuItem key={agent._id} value={agent.fullName}>{agent.fullName}</MenuItem>
                                            ))}
                                        </Select>
                                    )}
                                </TableCell>
                                <TableCell>Sales Done</TableCell>
                                <TableCell>Sales Done</TableCell>
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

export default OnlineOrders;

 