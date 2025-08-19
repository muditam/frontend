import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TablePagination,
    CircularProgress,
    Chip,
    Stack,
    TextField,
    MenuItem,
    Button,
    IconButton,
    Tooltip,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import axios from "axios";
import dayjs from "dayjs";

const UndeliveredOrders = () => {
    const [orders, setOrders] = useState([]);
    const [statusCounts, setStatusCounts] = useState([]);
    const [carriers, setCarriers] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [selectedCarrier, setSelectedCarrier] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [callingMessage, setCallingMessage] = useState("");

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/operations/undelivered-orders", {
                params: {
                    page: page + 1,
                    limit,
                    status: selectedStatus || undefined,
                    carrier: selectedCarrier || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                },
            });
            setOrders(res.data.orders);
            setTotalCount(res.data.totalCount);
            setStatusCounts(res.data.statusCounts);
            setCarriers(res.data.carriers);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCallIconClick = async (contactNumber) => {
        setLoading(true);
        setCallingMessage(`Calling ${contactNumber}...`);

        try {
            const loggedInUser = JSON.parse(sessionStorage.getItem("user"));
            if (!loggedInUser) {
                setCallingMessage("Error: User not logged in.");
                setLoading(false);
                return;
            }

            const agentNumber = loggedInUser.phone || loggedInUser.agentNumber || "";
            const callerId = process.env.REACT_APP_CALLER_ID || ""; // or hardcode if needed 

            if (!contactNumber || !agentNumber || !callerId) { 
                setCallingMessage("Error: Missing call parameters");
                console.error("Missing parameters:", { contactNumber, agentNumber, callerId });
                setLoading(false);
                return;
            }

            const requestBody = {
                destination_number: contactNumber,
                async: 1,
                agent_number: agentNumber.toString().trim(),
                caller_id: callerId.toString().trim(),
            };

            const response = await axios.post(
                "https://muditamleads-14f32a10d7f7.herokuapp.com/api/click_to_call",
                requestBody
            );

            console.log("Backend Response:", response.data);

            if (response.data.status === "success") {
                setCallingMessage(`Successfully called ${contactNumber}`);
            } else {
                setCallingMessage("Failed to place the call. Please try again.");
            }
        } catch (error) {
            console.error("Error placing the call", error.response?.data || error);
            setCallingMessage("There was an error placing the call.");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchOrders();
    }, [page, limit, selectedStatus, selectedCarrier, startDate, endDate]);

    return (
        <Box p={3}>
            <Typography variant="h5" gutterBottom>
                Undelivered Orders
            </Typography>

            {/* FILTERS */}
            <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
                <TextField
                    label="Start Date"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
                <TextField
                    label="End Date"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
                <TextField
                    select
                    label="Carrier"
                    size="small"
                    value={selectedCarrier}
                    onChange={(e) => setSelectedCarrier(e.target.value)}
                    sx={{ minWidth: 150 }}
                >
                    <MenuItem value="">All Carriers</MenuItem>
                    {carriers.map((carrier) => (
                        <MenuItem key={carrier} value={carrier}>
                            {carrier}
                        </MenuItem>
                    ))}
                </TextField>
                <Button
                    onClick={() => {
                        setSelectedCarrier("");
                        setSelectedStatus("");
                        setStartDate("");
                        setEndDate("");
                        setPage(0);
                    }}
                >
                    Clear Filters
                </Button>
            </Stack>

            {/* STATUS FILTER CHIPS */}
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                <Chip
                    label={`All (${statusCounts.reduce((acc, s) => acc + s.count, 0)})`}
                    onClick={() => setSelectedStatus("")}
                    color={!selectedStatus ? "primary" : "default"}
                    sx={{ bgcolor: "black", color: "white" }}
                />
                {statusCounts.map((status) => (
                    <Chip
                        key={status.shipment_status}
                        label={`${status.shipment_status} (${status.count})`}
                        onClick={() => {
                            setSelectedStatus(status.shipment_status);
                            setPage(0);
                        }}
                        color={selectedStatus === status.shipment_status ? "primary" : "default"}
                        sx={{
                            bgcolor: selectedStatus === status.shipment_status ? "black" : undefined,
                            color: selectedStatus === status.shipment_status ? "white" : undefined,
                        }}
                    />
                ))}
            </Stack>

            {/* ORDERS TABLE */}
            <Paper>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Order ID</TableCell>
                                <TableCell>Full Name</TableCell>
                                <TableCell>Contact</TableCell>
                                <TableCell>Tracking #</TableCell>
                                <TableCell>Carrier</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Order Date</TableCell>
                                <TableCell>Last Updated</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : orders.length > 0 ? (
                                orders.map((order) => (
                                    <TableRow key={order.order_id}>
                                        <TableCell>{order.order_id}</TableCell>
                                        <TableCell>{order.full_name}</TableCell>
                                        <TableCell>
                                            {order.contact_number || "-"}
                                            {order.contact_number && (
                                                <Tooltip title="Click to Call">
                                                    <IconButton
                                                        onClick={() => handleCallIconClick(order.contact_number)}
                                                        size="small"
                                                        sx={{ ml: 1 }}
                                                    >
                                                        <PhoneIcon fontSize="small" sx={{ color: "black" }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            {order.tracking_number ? (
                                                <a
                                                    href={`https://track.shipway.com/t/${order.tracking_number}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: "black", textDecoration: "underline" }}
                                                >
                                                    {order.tracking_number}
                                                </a>
                                            ) : (
                                                "-"
                                            )}
                                        </TableCell>
                                        <TableCell>{order.carrier_title || "-"}</TableCell>
                                        <TableCell>{order.shipment_status}</TableCell>
                                        <TableCell>
                                            {order.order_date
                                                ? dayjs(order.order_date).format("DD/MM/YYYY")
                                                : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {order.last_updated_at
                                                ? dayjs(order.last_updated_at).format("DD/MM/YYYY")
                                                : "-"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        No orders found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={limit}
                    onRowsPerPageChange={(e) => {
                        setLimit(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[25, 50, 100]}
                />
            </Paper>
        </Box>
    );
};

export default UndeliveredOrders;
