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
    deliveryStatus: [],
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);

  const dropdownOptions = {
    modeOfPayment: ["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"],
    deliveryStatus: ["Delivered", "RTO", "Undelivered"],
    productsOrdered: ["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"],
  };

  useEffect(() => {
    fetchNewOrders();
    fetchRetentionAgents();
  }, [page, rowsPerPage, filters]);
 
  const fetchNewOrders = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/new-orders", {
        params: {
          page: page + 1, // convert to 1-indexed for backend
          limit: rowsPerPage,
          ...filters
        },
      });
  
      // The API now returns an object like { leads, total, page, limit, totalPages }
      const orders = response.data.leads;
      setTotalOrders(response.data.total);
      setNewOrders(orders);
      setAllOrders(orders);
  
      // If you need unique agent names from the returned orders:
      const uniqueAgentNames = [...new Set(orders.map(order => order.agentAssigned).filter(Boolean))];
      setUniqueAgents(uniqueAgentNames);
    } catch (error) {
      console.error("Error fetching new orders:", error);
    }
  };
  
  const fetchRetentionAgents = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees?role=Retention%20Agent");
      setRetentionAgents(response.data);
    } catch (error) {
      console.error("Error fetching retention agents:", error);
    }
  };

  const handleHealthExpertChange = async (e, index) => { 
    // Use index directly because newOrders already contains the current page's orders
    const updatedOrders = [...newOrders];
    updatedOrders[index].healthExpertAssigned = e.target.value;
    setNewOrders(updatedOrders);
  
    const orderId = updatedOrders[index]._id;
    try {
      await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${orderId}`, {
        healthExpertAssigned: e.target.value,
      });
    } catch (error) {
      console.error("Error updating health expert assigned:", error);
    }
  };
  
  const handleDeliveryStatusChange = async (e, index) => { 
    // Use index directly here as well
    const updatedOrders = [...newOrders];
    updatedOrders[index].deliveryStatus = e.target.value;
    setNewOrders(updatedOrders);
  
    const orderId = updatedOrders[index]._id;
    try {
      await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${orderId}`, {
        deliveryStatus: e.target.value,
      });
    } catch (error) {
      console.error("Error updating delivery status:", error);
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
      deliveryStatus: [],
    });
    setPage(0);
    fetchNewOrders();
  };

  // This function fetches all orders (ignoring pagination) with the current filters,
  // converts the data into CSV format, and triggers a download.
  const exportToCSV = async () => {
    try {
      // Fetch all orders using a high limit to bypass pagination
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/new-orders", {
        params: {
          page: 1,
          limit: totalOrders || 10000, // Use totalOrders if available, else fallback to a high number
          ...filters,
        },
      });
      const orders = response.data.leads;

      // Convert orders data to CSV format.
      // Create header row
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
        "Mode of Payment",
        "Delivery Status"
      ];
      
      // Map order values (ensure arrays are joined as a string)
      const rows = orders.map(order => [
        order.lastOrderDate || "N/A",
        order.name || "N/A",
        order.contactNumber || "N/A",
        order.agentAssigned || "N/A",
        order.productsOrdered ? order.productsOrdered.join(" | ") : "N/A",
        order.dosageOrdered || "N/A",
        order.healthExpertAssigned || "N/A",
        order.agentsRemarks || "N/A",
        order.amountPaid || "N/A",
        order.modeOfPayment || "N/A",
        order.deliveryStatus || "N/A"
      ]);

      // Build CSV string
      let csvContent = "";
      csvContent += headers.join(",") + "\n";
      rows.forEach(row => {
        // Ensure each cell is wrapped in quotes to handle commas
        csvContent += row.map(cell => `"${cell}"`).join(",") + "\n";
      });

      // Create a Blob from the CSV data and trigger a download.
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "new_orders.csv");
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
        <Typography variant="h5"> 
          Master Data - New Orders
        </Typography>
        <Box>
          <Button 
            variant="contained"
            onClick={() => setFilterOpen(true)}
            sx={{ mr: 1 }}
          >
            Filter
          </Button>
          <Button 
            variant="contained"
            onClick={exportToCSV}
          >
            Export to CSV
          </Button>
        </Box>
      </Box>

      <Drawer
        anchor="right"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
      >
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
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </FormControl>
            <FormControl fullWidth sx={{ marginBottom: 2 }}>
              <TextField
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </FormControl>

            <FormControl fullWidth sx={{ marginBottom: 2 }}>
              <TextField
                label="Order Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.orderDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, orderDate: e.target.value }))
                }
              />
            </FormControl>

            {Object.keys(filters).map((key) => {
              if (key === "startDate" || key === "endDate") return null; 
              if (key === "orderDate") return null;
           
              if (key === "agentName") {
                return (
                  <FormControl key={key} fullWidth sx={{ marginBottom: 2 }}>
                    <InputLabel>Agent Name</InputLabel>
                    <Select
                      multiple
                      value={filters.agentName}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, agentName: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, [key]: e.target.value }))
                      }
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
                          setFilters((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        renderValue={(selected) => selected.join(", ")}
                      >
                        {dropdownOptions[key].map((option) => (
                          <MenuItem key={option} value={option}>
                            <Checkbox
                              checked={(filters[key] || []).includes(option)}
                            />
                            <ListItemText primary={option} />
                          </MenuItem>
                        ))}
                      </Select>
                    </>
                  ) : (
                    <TextField
                      label={key.replace(/([A-Z])/g, " $1")}
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, [key]: e.target.value }))
                      }
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
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell>Order Date</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Contact No</TableCell>
              <TableCell>Agent Name</TableCell>
              <TableCell>Products Ordered</TableCell>
              <TableCell>Dosage Ordered</TableCell>
              <TableCell>Health Expert Assigned *</TableCell>
              <TableCell>Remark for HE</TableCell>
              <TableCell>Amount Paid</TableCell>
              <TableCell>Mode of Payment</TableCell>
              <TableCell>Delivery Status *</TableCell> 
            </TableRow>
          </TableHead>
          <TableBody>
            {newOrders.map((order, index) => (
              <TableRow key={order._id}>
                <TableCell>{order.lastOrderDate || "N/A"}</TableCell>
                <TableCell>{order.name || "N/A"}</TableCell>
                <TableCell>{order.contactNumber || "N/A"}</TableCell>
                <TableCell>{order.agentAssigned || "N/A"}</TableCell>
                <TableCell>{order.productsOrdered?.join(", ") || "N/A"}</TableCell>
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
                <TableCell>{order.agentsRemarks || "N/A"}</TableCell>
                <TableCell>{order.amountPaid || "N/A"}</TableCell>
                <TableCell>{order.modeOfPayment || "N/A"}</TableCell>
                <TableCell>
                  <Select
                    value={order.deliveryStatus || ""}
                    onChange={(e) => handleDeliveryStatusChange(e, index)}
                    fullWidth
                  >
                    {["Delivered", "RTO", "Undelivered"].map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
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
