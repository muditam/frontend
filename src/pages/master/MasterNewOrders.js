import React, { useState, useEffect } from "react";
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
  Select,
  MenuItem,
  Button,
  Drawer,
  TextField,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  TablePagination,
  Divider,
} from "@mui/material";
import axios from "axios";


const NewOrders = () => {
  const [newOrders, setNewOrders] = useState([]);
  const [retentionAgents, setRetentionAgents] = useState([]);
  const [uniqueAgents, setUniqueAgents] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    orderDate: "",
    name: "",
    contactNumber: "",
    agentName: [],
    productsOrdered: [],
    healthExpertAssigned: "",
    modeOfPayment: [],
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);


  const dropdownOptions = {
    modeOfPayment: ["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"],
    productsOrdered: [
      "KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV",
      "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"
    ],
  };


  useEffect(() => {
    fetchNewOrders();
    fetchRetentionAgents();
  }, [page, rowsPerPage, filters]);


  // Fetch combined orders from the new combined orders endpoint
  const fetchNewOrders = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders/combined", {
        params: {
          page: page + 1, // converting to 1-indexed for backend
          limit: rowsPerPage,
          ...filters,
        },
      });
      const orders = response.data.orders;
      setTotalOrders(response.data.total);
      setNewOrders(orders); 
      setAllOrders(orders);


      // Get unique agent names from combined data for filtering
      const uniqueAgentNames = [
        ...new Set(orders.map(order => order.agentName).filter(Boolean))
      ];
      setUniqueAgents(uniqueAgentNames);
    } catch (error) {
      console.error("Error fetching combined orders:", error);
    }
  };
 
  const fetchRetentionAgents = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees?role=Retention%20Agent");
      setRetentionAgents(response.data);
      // console.log(response.data);
    } catch (error) {
      console.error("Error fetching retention agents:", error);
    }
  };
 
  // Updated Health Expert change handler:
  // Now it uses the updated endpoint URL so that it doesn't conflict with /api/leads/:id
  const handleHealthExpertChange = async (e, index) => {
    const updatedOrders = [...newOrders];
    const selectedAgent = e.target.value;
    updatedOrders[index].healthExpertAssigned = selectedAgent;
    setNewOrders(updatedOrders);


    const contactNumber = updatedOrders[index].contactNumber;
    try {
      // Use the endpoint mounted at /api/orders/combined/update-by-contact
      await axios.put("https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders/combined/update-by-contact", {
        contactNumber,
        healthExpertAssigned: selectedAgent,
      });
    } catch (error) {
      console.error("Error updating health expert assigned:", error);
    }
  };


  const applyFilters = () => {
    setPage(0);
    fetchNewOrders();
  };


  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      orderDate: "",
      name: "",
      contactNumber: "",
      agentName: [],
      productsOrdered: [],
      healthExpertAssigned: "",
      modeOfPayment: [],
    });
    setPage(0);
    fetchNewOrders();
  };


  // Export only the required fields to CSV
  const exportToCSV = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders/combined", {
        params: {
          page: 1,
          limit: totalOrders || 10000,
          ...filters,
        },
      });
      const orders = response.data.orders;
 

      const headers = [
        "Order Date",
        "Name",
        "Contact No",
        "Agent Name",
        "Products Ordered",
        "Dosage Ordered",
        "Health Expert Assigned",
        "Remark for HE",
        "Amount Paid",
        "Mode of Payment"
      ]; 


      const rows = orders.map(order => [
        order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A",
        order.name || "N/A",
        order.contactNumber || "N/A",
        order.agentName || "N/A",
        Array.isArray(order.productsOrdered)
          ? order.productsOrdered.join(" | ")
          : order.productsOrdered || "N/A",
        order.dosageOrdered || "N/A",
        order.healthExpertAssigned || "N/A",
        order.remarkForHE || "N/A",
        order.amountPaid || "N/A",
        order.modeOfPayment || "N/A"
      ]);


      let csvContent = "";
      csvContent += headers.join(",") + "\n";
      rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(",") + "\n";
      });


      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "combined_orders.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
    }
  };


  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };


  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };


  return (
    <Box sx={{ padding: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Master Data - Combined Orders</Typography>
        <Box>
          <Button variant="contained" onClick={() => setFilterOpen(true)} sx={{ mr: 1 }}>
            Filter
          </Button>
          <Button variant="contained" onClick={exportToCSV}>
            Export to CSV
          </Button>
        </Box>
      </Box>


      <Drawer anchor="right" open={filterOpen} onClose={() => setFilterOpen(false)}>
        <Box sx={{ width: 300, padding: 2 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Divider />
          <Box sx={{ marginBottom: 2 }}>
            <FormControl fullWidth sx={{ marginBottom: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </FormControl>
            <FormControl fullWidth sx={{ marginBottom: 2 }}>
              <TextField
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </FormControl>
            <FormControl fullWidth sx={{ marginBottom: 2 }}>
              <TextField
                label="Order Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.orderDate}
                onChange={(e) => setFilters(prev => ({ ...prev, orderDate: e.target.value }))}
              />
            </FormControl>
            {Object.keys(filters).map((key) => {
              if (["startDate", "endDate", "orderDate"].includes(key)) return null;
              if (key === "agentName") {
                return (
                  <FormControl key={key} fullWidth sx={{ marginBottom: 2 }}>
                    <InputLabel>Agent Name</InputLabel>
                    <Select
                      multiple
                      value={filters.agentName}
                      onChange={(e) => setFilters(prev => ({ ...prev, agentName: e.target.value }))}
                      renderValue={(selected) => selected.join(", ")}
                    >
                      {uniqueAgents.map((agent) => (
                        <MenuItem key={agent} value={agent}>
                          <Checkbox checked={filters.agentName.includes(agent)} />
                          <ListItemText primary={agent} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              }
              if (key === "healthExpertAssigned") {
                return (
                  <FormControl key={key} fullWidth sx={{ marginBottom: 2 }}>
                    <InputLabel>Health Expert Assigned</InputLabel>
                    <Select
                      value={filters[key] || ""}
                      onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                    >
                      <MenuItem value="blank">
                        <em>Blank</em>
                      </MenuItem>
                      {retentionAgents.map((agent) => (
                        <MenuItem key={agent._id} value={agent.fullName}>
                          {agent.fullName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              }
              return (
                <FormControl key={key} fullWidth sx={{ marginBottom: 2 }}>
                  {Array.isArray(dropdownOptions[key]) ? (
                    <>
                      <InputLabel>{key.replace(/([A-Z])/g, " $1")}</InputLabel>
                      <Select
                        multiple
                        value={filters[key] || []}
                        onChange={(e) =>
                          setFilters(prev => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        renderValue={(selected) => selected.join(", ")}
                      >
                        {dropdownOptions[key].map((option) => (
                          <MenuItem key={option} value={option}>
                            <Checkbox checked={(filters[key] || []).includes(option)} />
                            <ListItemText primary={option} />
                          </MenuItem>
                        ))}
                      </Select>
                    </>
                  ) : (
                    <TextField
                      label={key.replace(/([A-Z])/g, " $1")}
                      value={filters[key]}
                      onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  )}
                </FormControl>
              );
            })}
          </Box>
          <Divider />
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              applyFilters();
              setFilterOpen(false);
            }}
            sx={{ marginBottom: 1 }}
          >
            Apply Filters
          </Button>
          <Button variant="outlined" fullWidth onClick={resetFilters}>
            Reset Filters
          </Button>
        </Box>
      </Drawer>


      <TableContainer component={Paper} sx={{ maxHeight: 1000 }}>
        <Table stickyHeader aria-label="combined orders table">
          <TableHead>
            <TableRow>
              <TableCell>Order Date</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Contact No</TableCell>
              <TableCell>Agent Name</TableCell>
              <TableCell>Products Ordered</TableCell>
              <TableCell>Dosage Ordered</TableCell>
              <TableCell>Health Expert Assigned *</TableCell>
              <TableCell>Shipment Status</TableCell>
              <TableCell>Remark for HE</TableCell>
              <TableCell>Amount Paid</TableCell>
              <TableCell>Mode of Payment</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {newOrders.map((order, index) => (
              <TableRow key={order._id || index}>
                <TableCell>
                  {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A"}
                </TableCell>
                <TableCell>{order.name || "N/A"}</TableCell>
                <TableCell>{order.contactNumber || "N/A"}</TableCell>
                <TableCell>{order.agentName || "N/A"}</TableCell>
                <TableCell>
                  {Array.isArray(order.productsOrdered)
                    ? order.productsOrdered.join(", ")
                    : order.productsOrdered || "N/A"}
                </TableCell>
                <TableCell>{order.dosageOrdered || "N/A"}</TableCell>
                <TableCell> 
                  <Select
                    value={order.healthExpertAssigned || ""}
                    onChange={(e) => handleHealthExpertChange(e, index)}
                    fullWidth
                  >
                    {retentionAgents.map((expert) => (
                      <MenuItem key={expert._id} value={expert.fullName}>
                        {expert.fullName}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>{order.shipment_status || "N/A"}</TableCell>
                <TableCell>{order.remarkForHE || "N/A"}</TableCell>
                <TableCell>{order.amountPaid || "N/A"}</TableCell>
                <TableCell>{order.modeOfPayment || "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={totalOrders}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};


export default NewOrders;
