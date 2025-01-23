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
    Button
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
        fetchData();
    }, []);

    const fetchAllLeads = async () => {
        try {
            const limit = 100;  
            let page = 1;
            let allLeads = [];
            let totalPages = 1;  
    
            do {
                const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads", {
                    params: {
                        page,
                        limit,
                        filters: JSON.stringify({}),  
                    },
                });
    
                allLeads = allLeads.concat(response.data.leads);
                totalPages = response.data.totalPages;
                page++;
            } while (page <= totalPages);
    
            return allLeads;
        } catch (error) {
            console.error("Error fetching all leads:", error);
            return [];
        }
    };

    
    const fetchData = async () => {
        try {
            const [ordersResponse, agentsResponse] = await Promise.all([
                axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders"),
                axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees?role=Retention%20Agent"),
            ]);
    
            const leads = await fetchAllLeads();  
    
            const webOrders = ordersResponse.data.filter(order => order.channel_name === "web");
    
            const ordersWithHealthExperts = webOrders.map(order => {
                const normalizedOrderPhone = order.customer?.default_address?.phone?.replace(/[^\d]/g, "");
                const matchingLead = leads.find(lead =>
                    lead.contactNumber.replace(/[^\d]/g, "") === normalizedOrderPhone
                );
    
                return {
                    ...order,
                    healthExpertAssigned: matchingLead?.healthExpertAssigned || "Not Assigned",
                    leadExists: !!matchingLead,
                };
            });
    
            setOrders(ordersWithHealthExperts);
            setRetentionAgents(agentsResponse.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };
    

    const handleSaveHealthExpert = async (orderIndex) => { 
        const globalIndex = currentPage * rowsPerPage + orderIndex;

        const order = orders[globalIndex];  
        if (!order.healthExpertAssigned) return;

        const leadData = {
            orderId: order.name,
            name: `${order.customer.first_name} ${order.customer.last_name}`,
            contactNumber: order.customer.default_address.phone,
            date: new Date(order.created_at).toISOString().split('T')[0],
            amount: order.total_price,
            modeOfPayment: order.payment_gateway_names.join(", "),
            productsOrdered: order.line_items.map(item => productAbbreviations[item.title] || item.title).join(", "),
            agentAssigned: 'Online Order',
            healthExpertAssigned: order.healthExpertAssigned,
            leadStatus: 'Sales Done',
            salesStatus: 'Sales Done',
        };

        try {
            const existingLeadResponse = await axios.get(
                `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/check-duplicate?contactNumber=${leadData.contactNumber}`
            );
            if (existingLeadResponse.data.exists) {
                await axios.put(
                    `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${existingLeadResponse.data.leadId}`,
                    leadData
                );
            } else {
                await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads", leadData);
            }
        } catch (error) {
            console.error('Failed to update lead:', error);
        }
    };

    const handleChangeHealthExpert = (orderIndex, expertName) => {
        const globalIndex = currentPage * rowsPerPage + orderIndex;

        const updatedOrders = [...orders];
        updatedOrders[globalIndex].healthExpertAssigned = expertName;
        setOrders(updatedOrders);
    };

    const handleChangePage = (event, newPage) => {
        setCurrentPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setCurrentPage(0);
    };

    return (
        <>
            <TableContainer component={Paper} sx={{ minWidth: 650 }}>
                <Table stickyHeader aria-label="sticky table">
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
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders
                            .slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage)
                            .map((order, index) => (
                                <TableRow key={order.id}>
                                    <TableCell component="th" scope="row">{order.name}</TableCell>
                                    <TableCell>{order.customer?.first_name} {order.customer?.last_name}</TableCell>
                                    <TableCell>{order.customer?.default_address?.phone}</TableCell>
                                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>{order.total_price}</TableCell>
                                    <TableCell>{order.payment_gateway_names}</TableCell>
                                    <TableCell>{order.line_items.map(item => productAbbreviations[item.title] || item.title).join(", ")}</TableCell>
                                    <TableCell>Online Order</TableCell>
                                    <TableCell>{order.channel_name}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={order.healthExpertAssigned || ""}
                                            onChange={(e) => handleChangeHealthExpert(index, e.target.value)}  
                                            displayEmpty
                                            fullWidth
                                        >
                                            <MenuItem value="">
                                            </MenuItem>
                                            {retentionAgents.map((agent) => (
                                                <MenuItem key={agent._id} value={agent.fullName}>{agent.fullName}</MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={() => handleSaveHealthExpert(index)}
                                        >
                                            Save
                                        </Button>
                                    </TableCell>
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