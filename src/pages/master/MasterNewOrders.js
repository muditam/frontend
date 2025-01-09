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
  const [filters, setFilters] = useState({
    orderDate: "",
    name: "",
    contactNumber: "",
    agentName: "",
    productsOrdered: [],
    dosageOrdered: "",
    healthExpertAssigned: "",
    remarkForHE: "",
    amountPaid: "",
    modeOfPayment: [],
    deliveryStatus: [],
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const dropdownOptions = {
    modeOfPayment: ["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"],
    deliveryStatus: ["Delivered", "RTO", "Undelivered"],
    productsOrdered: ["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit"],
  };

  useEffect(() => {
    fetchNewOrders();
    fetchRetentionAgents();
  }, []);

  const fetchNewOrders = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/new-orders");
      const filteredOrders = response.data
            .filter(order => order.agentAssigned !== 'Admin')   
            .sort((a, b) => new Date(b.date) - new Date(a.date));   
        setNewOrders(filteredOrders);
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
    const realIndex = page * rowsPerPage + index;
    const updatedOrders = [...newOrders];
    updatedOrders[realIndex].healthExpertAssigned = e.target.value;
    setNewOrders(updatedOrders);

    const orderId = updatedOrders[realIndex]._id;
    try {
      await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${orderId}`, {
        healthExpertAssigned: e.target.value,
      });
    } catch (error) {
      console.error("Error updating health expert assigned:", error);
    }
};

const handleDeliveryStatusChange = async (e, index) => { 
    const realIndex = page * rowsPerPage + index;
    const updatedOrders = [...newOrders];
    updatedOrders[realIndex].deliveryStatus = e.target.value;
    setNewOrders(updatedOrders);

    const orderId = updatedOrders[realIndex]._id;
    try {
      await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${orderId}`, {
        deliveryStatus: e.target.value,
      });
    } catch (error) {
      console.error("Error updating delivery status:", error);
    }
};

  const applyFilters = () => {
    const filtered = newOrders.filter((order) => {
      return Object.keys(filters).every((key) => {
        if (!filters[key]) return true;
        if (Array.isArray(filters[key])) {
          return filters[key].every((item) => order[key]?.includes(item));
        }
        return String(order[key] || "").toLowerCase().includes(filters[key].toLowerCase());
      });
    });
    setNewOrders(filtered);
  };

  const resetFilters = () => {
    setFilters({
      orderDate: "",
      name: "",
      contactNumber: "",
      agentName: "",
      productsOrdered: [],
      dosageOrdered: "",
      healthExpertAssigned: "",
      remarkForHE: "",
      amountPaid: "",
      modeOfPayment: [],
      deliveryStatus: [],
    });
    fetchNewOrders();
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
      <Typography variant="h5" gutterBottom>
        Master Data - New Orders
      </Typography>

      <Button
        variant="contained"
        onClick={() => setFilterOpen(true)}
        sx={{ mb: 2 }}
      >
        Filter
      </Button>

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
            {Object.keys(filters).map((key) => (
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
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                )}
              </FormControl>
            ))}
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
          <Button
            variant="outlined"
            fullWidth
            onClick={resetFilters}
          >
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
            {newOrders
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) 
              .map((order, index) => (
                <TableRow key={order._id}>
                  <TableCell>{order.date || "N/A"}</TableCell>
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
        count={newOrders.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default NewOrders;
