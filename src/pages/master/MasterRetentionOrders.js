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
  Pagination,
  Button,
  Drawer,
  TextField,
  FormControl,
  InputLabel,
  Divider,
  Checkbox,
  ListItemText,
} from "@mui/material";
import axios from "axios";

const ITEMS_PER_PAGE = 50;

const dropdownOptions = {
  productsOrdered: ["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit"],
  dosageOrdered: ["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"],
  modeOfPayment: ["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"],
  deliveryStatus: ["Delivered", "RTO", "Undelivered"],
  orderCreatedBy: ["Agent A", "Agent B", "Agent C"],
};

const RetentionOrders = () => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    name: "",
    contactNumber: "",
    productsOrdered: [],
    dosageOrdered: "",
    amountFrom: "",
    amountTo: "",
    modeOfPayment: "",
    deliveryStatus: "",
    orderCreatedBy: "",
  });

  useEffect(() => {
    fetchRetentionOrders();
  }, []);

  const fetchRetentionOrders = async () => {
    try {
      const response = await axios.get("https://www.60brands.com/api/retention-orders");
      setOrders(response.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error("Error fetching retention orders:", error);
    }
  };

  const handleDeliveryStatusChange = async (e, index) => {
    const updatedOrders = [...orders];
    updatedOrders[index].deliveryStatus = e.target.value;
    setOrders(updatedOrders);

    try {
      await axios.put(`https://www.60brands.com/api/retention-sales/${updatedOrders[index]._id}`, {
        deliveryStatus: e.target.value,
      });
    } catch (error) {
      console.error("Error updating delivery status:", error);
    }
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const applyFilters = () => {
    const filteredOrders = orders.filter((order) => {
      return (
        (!filters.dateFrom || new Date(order.date) >= new Date(filters.dateFrom)) &&
        (!filters.dateTo || new Date(order.date) <= new Date(filters.dateTo)) &&
        (!filters.name || order.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.contactNumber || order.contactNumber.includes(filters.contactNumber)) &&
        (!filters.productsOrdered.length || filters.productsOrdered.some((item) => order.productsOrdered?.includes(item))) &&
        (!filters.dosageOrdered || order.dosageOrdered === filters.dosageOrdered) &&
        (!filters.amountFrom || parseFloat(order.amountPaid) >= parseFloat(filters.amountFrom)) &&
        (!filters.amountTo || parseFloat(order.amountPaid) <= parseFloat(filters.amountTo)) &&
        (!filters.modeOfPayment || order.modeOfPayment === filters.modeOfPayment) &&
        (!filters.deliveryStatus || order.deliveryStatus === filters.deliveryStatus) &&
        (!filters.orderCreatedBy || order.orderCreatedBy === filters.orderCreatedBy)
      );
    });
    setOrders(filteredOrders);
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      name: "",
      contactNumber: "",
      productsOrdered: [],
      dosageOrdered: "",
      amountFrom: "",
      amountTo: "",
      modeOfPayment: "",
      deliveryStatus: "",
      orderCreatedBy: "",
    });
    fetchRetentionOrders();
  };

  const paginatedOrders = orders.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const styles = {
    container: {
      fontFamily: "Inter, sans-serif",
      fontWeight: 450,
      fontSize: "13px",
      lineHeight: "20px",
    },
    header: {
      color: "rgb(74, 74, 74)",
    },
    table: {
      minWidth: 650,
    },
    tableCell: {
      height: "35px",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      overflow: "hidden",
      maxWidth: "200px",
      padding: "0px 16px",
    },
    card: {
      borderRadius: "8px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    button: {
      borderRadius: "8px",
      textTransform: "none",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
  };

  return (
    <Box sx={{ padding: 2, backgroundColor: "#f9f9f9" }} style={styles.container}>
      <Typography variant="h5" gutterBottom style={styles.header}>
        Master Data - Retention Orders
      </Typography>
      <Button
        variant="contained"
        onClick={() => setFilterOpen(true)}
        sx={{ mb: 2, backgroundColor: "#0073e6", ...styles.button }}
      >
        Filter
      </Button>

      <Drawer
        anchor="right"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        sx={{ ...styles.card }}
      >
        <Box sx={{ width: 300, padding: 2 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Divider />
          <Box sx={{ marginBottom: 2 }}>
            <TextField
              label="Date From"
              type="date"
              fullWidth
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              sx={{ marginBottom: 2 }}
            />
            <TextField
              label="Date To"
              type="date"
              fullWidth
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              sx={{ marginBottom: 2 }}
            />
            <TextField
              label="Name"
              fullWidth
              value={filters.name}
              onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))}
              sx={{ marginBottom: 2 }}
            />
            <TextField
              label="Contact No"
              fullWidth
              value={filters.contactNumber}
              onChange={(e) => setFilters((prev) => ({ ...prev, contactNumber: e.target.value }))}
              sx={{ marginBottom: 2 }}
            />
            {Object.keys(dropdownOptions).map((key) => (
              <FormControl fullWidth sx={{ marginBottom: 2 }} key={key}>
                <InputLabel>{key.replace(/([A-Z])/g, " $1")}</InputLabel>
                <Select
                  multiple={Array.isArray(dropdownOptions[key])}
                  value={filters[key] || (Array.isArray(dropdownOptions[key]) ? [] : "")}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                  renderValue={(selected) => (Array.isArray(selected) ? selected.join(", ") : selected)}
                >
                  {dropdownOptions[key].map((option) => (
                    <MenuItem key={option} value={option}>
                      {Array.isArray(dropdownOptions[key]) && <Checkbox checked={filters[key]?.includes(option)} />}
                      <ListItemText primary={option} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
            <TextField
              label="Amount From"
              fullWidth
              type="number"
              value={filters.amountFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, amountFrom: e.target.value }))}
              sx={{ marginBottom: 2 }}
            />
            <TextField
              label="Amount To"
              fullWidth
              type="number"
              value={filters.amountTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, amountTo: e.target.value }))}
              sx={{ marginBottom: 2 }}
            />
          </Box>
          <Divider />
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              applyFilters();
              setFilterOpen(false);
            }}
            sx={{ marginBottom: 1, backgroundColor: "#0073e6", ...styles.button }}
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

      <TableContainer component={Paper} style={styles.card}>
        <Table style={styles.table}>
          <TableHead>
            <TableRow>
              <TableCell style={styles.tableCell}>Date</TableCell>
              <TableCell style={styles.tableCell}>Name</TableCell>
              <TableCell style={styles.tableCell}>Contact No</TableCell>
              <TableCell style={styles.tableCell}>Products Ordered</TableCell>
              <TableCell style={styles.tableCell}>Dosage Ordered</TableCell>
              <TableCell style={styles.tableCell}>Amount Paid</TableCell>
              <TableCell style={styles.tableCell}>Mode of Payment</TableCell>
              <TableCell style={styles.tableCell}>Delivery Status</TableCell>
              <TableCell style={styles.tableCell}>Order Created By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedOrders.map((order, index) => (
              <TableRow
                key={order._id}
                sx={{
                  '&:hover': {
                    backgroundColor: '#f2f2f2',
                  },
                }}
              >
                <TableCell style={styles.tableCell}>{order.date || "N/A"}</TableCell>
                <TableCell style={styles.tableCell}>{order.name || "N/A"}</TableCell>
                <TableCell style={styles.tableCell}>{order.contactNumber || "N/A"}</TableCell>
                <TableCell style={styles.tableCell}>{order.productsOrdered?.join(", ") || "N/A"}</TableCell>
                <TableCell style={styles.tableCell}>{order.dosageOrdered || "N/A"}</TableCell>
                <TableCell style={styles.tableCell}>{order.amountPaid || "N/A"}</TableCell>
                <TableCell style={styles.tableCell}>{order.modeOfPayment || "N/A"}</TableCell>
                <TableCell style={styles.tableCell}>
                  <Select
                    value={order.deliveryStatus || ""}
                    onChange={(e) => handleDeliveryStatusChange(e, index)}
                    fullWidth
                  >
                    {dropdownOptions.deliveryStatus.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell style={styles.tableCell}>{order.orderCreatedBy || "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ marginTop: 2, display: "flex", justifyContent: "center" }}>
        <Pagination
          count={Math.ceil(orders.length / ITEMS_PER_PAGE)}
          page={page}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>
    </Box>
  );
};

export default RetentionOrders;
