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
  TablePagination,
} from "@mui/material";
import axios from "axios";

const dropdownOptions = {
  productsOrdered: ["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit"],
  dosageOrdered: ["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"],
  modeOfPayment: ["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"],
  deliveryStatus: ["Delivered", "RTO", "Undelivered"],
};

const RetentionOrders = () => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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

  const [dynamicOrderCreatedBy, setDynamicOrderCreatedBy] = useState([]);

  useEffect(() => {
    fetchRetentionOrders();
  }, []);

  const fetchRetentionOrders = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-orders");
      const sortedOrders = response.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setOrders(sortedOrders);

      const uniqueEmployees = [...new Set(sortedOrders.map((order) => order.orderCreatedBy))];
      setDynamicOrderCreatedBy(uniqueEmployees);
    } catch (error) {
      console.error("Error fetching retention orders:", error);
    }
  };

  const handleDeliveryStatusChange = async (e, index) => {
    const updatedOrders = [...orders];
    updatedOrders[index].deliveryStatus = e.target.value;
    setOrders(updatedOrders);

    try {
      await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/${updatedOrders[index]._id}`, {
        deliveryStatus: e.target.value,
      });
    } catch (error) {
      console.error("Error updating delivery status:", error);
    }
  };


  const applyFilters = () => {
    const filteredOrders = orders.filter((order) => {
      return (
        (!filters.dateFrom || new Date(order.date) >= new Date(filters.dateFrom)) &&
        (!filters.dateTo || new Date(order.date) <= new Date(filters.dateTo)) &&
        (!filters.name || order.name?.toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.contactNumber || order.contactNumber?.includes(filters.contactNumber)) &&
        (!filters.productsOrdered.length ||
          filters.productsOrdered.some((item) =>
            order.productsOrdered?.includes(item)
          )) &&
        // Case-insensitive partial matching for text inputs
        (!filters.dosageOrdered ||
          order.dosageOrdered?.toLowerCase().includes(filters.dosageOrdered.toLowerCase())) &&
        (!filters.modeOfPayment ||
          order.modeOfPayment?.toLowerCase().includes(filters.modeOfPayment.toLowerCase())) &&
        (!filters.deliveryStatus ||
          order.deliveryStatus?.toLowerCase().includes(filters.deliveryStatus.toLowerCase())) &&
        (!filters.amountFrom || parseFloat(order.amountPaid) >= parseFloat(filters.amountFrom)) &&
        (!filters.amountTo || parseFloat(order.amountPaid) <= parseFloat(filters.amountTo)) &&
        (!filters.orderCreatedBy.length ||
          filters.orderCreatedBy.some((creator) =>
            creator.toLowerCase() === order.orderCreatedBy?.toLowerCase()
          ))
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

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const currentLeads = orders.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);

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
              sx={{
                marginBottom: 2,
                "& .MuiInputBase-input": {
                  padding: "10px 12px", // Adjust padding for a more "focused" look
                },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6", // Active border color
                  "&:hover fieldset": {
                    borderColor: "#005bb5", // Darker hover effect
                  },
                },
              }}
              InputLabelProps={{
                shrink: true, // Always show the label
              }}
            />
            <TextField
              label="Date To"
              type="date"
              fullWidth
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              sx={{
                marginBottom: 2,
                "& .MuiInputBase-input": {
                  padding: "10px 12px", // Adjust padding for a more "focused" look
                },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6", // Active border color
                  "&:hover fieldset": {
                    borderColor: "#005bb5", // Darker hover effect
                  },
                },
              }}
              InputLabelProps={{
                shrink: true, // Always show the label
              }}
            />
            <TextField
              label="Name"
              fullWidth
              value={filters.name}
              onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))}
              sx={{
                marginBottom: 2,
                "& .MuiInputBase-input": {
                  padding: "10px 12px", // Adjust padding for a more "focused" look
                },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6", // Active border color
                  "&:hover fieldset": {
                    borderColor: "#005bb5", // Darker hover effect
                  },
                },
              }}
              InputLabelProps={{
                shrink: true, // Always show the label
              }}
            />
            <TextField
              label="Contact No"
              fullWidth
              value={filters.contactNumber}
              onChange={(e) => setFilters((prev) => ({ ...prev, contactNumber: e.target.value }))}
              sx={{
                marginBottom: 2,
                "& .MuiInputBase-input": {
                  padding: "10px 12px", // Adjust padding for a more "focused" look
                },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6", // Active border color
                  "&:hover fieldset": {
                    borderColor: "#005bb5", // Darker hover effect
                  },
                },
              }}
              InputLabelProps={{
                shrink: true, // Always show the label
              }}
            />
            <Box sx={{ marginBottom: 2 }}>
              <TextField
                label="Dosage Ordered"
                fullWidth
                value={filters.dosageOrdered}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dosageOrdered: e.target.value }))
                }
                sx={{
                  marginBottom: 2,
                  "& .MuiInputBase-input": {
                    padding: "10px 12px",
                  },
                  "& .MuiOutlinedInput-root": {
                    borderColor: "#0073e6",
                    "&:hover fieldset": {
                      borderColor: "#005bb5",
                    },
                  },
                }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <TextField
                label="Mode of Payment"
                fullWidth
                value={filters.modeOfPayment}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, modeOfPayment: e.target.value }))
                }
                sx={{
                  marginBottom: 2,
                  "& .MuiInputBase-input": {
                    padding: "10px 12px",
                  },
                  "& .MuiOutlinedInput-root": {
                    borderColor: "#0073e6",
                    "&:hover fieldset": {
                      borderColor: "#005bb5",
                    },
                  },
                }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <TextField
                label="Delivery Status"
                fullWidth
                value={filters.deliveryStatus}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, deliveryStatus: e.target.value }))
                }
                sx={{
                  marginBottom: 0,
                  "& .MuiInputBase-input": {
                    padding: "10px 12px",
                  },
                  "& .MuiOutlinedInput-root": {
                    borderColor: "#0073e6",
                    "&:hover fieldset": {
                      borderColor: "#005bb5",
                    },
                  },
                }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>


            {/* Dynamic Order Created By */}
            <FormControl fullWidth sx={{ marginBottom: 2 }}>
              <InputLabel>Order Created By</InputLabel>
              <Select
                multiple
                value={filters.orderCreatedBy || []}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    orderCreatedBy: e.target.value,
                  }))
                }
                renderValue={(selected) => selected.join(", ")}
              >
                {dynamicOrderCreatedBy.map((employee) => (
                  <MenuItem key={employee} value={employee}>
                    <Checkbox
                      checked={filters.orderCreatedBy?.includes(employee)}
                    />
                    <ListItemText primary={employee} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Amount From"
              fullWidth
              type="number"
              value={filters.amountFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, amountFrom: e.target.value }))}
              sx={{
                marginBottom: 2,
                "& .MuiInputBase-input": {
                  padding: "10px 12px", // Adjust padding for a more "focused" look
                },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6", // Active border color
                  "&:hover fieldset": {
                    borderColor: "#005bb5", // Darker hover effect
                  },
                },
              }}
              InputLabelProps={{
                shrink: true, // Always show the label
              }}
            />
            <TextField
              label="Amount To"
              fullWidth
              type="number"
              value={filters.amountTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, amountTo: e.target.value }))}
              sx={{
                marginBottom: 0,
                "& .MuiInputBase-input": {
                  padding: "10px 12px", // Adjust padding for a more "focused" look
                },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6", // Active border color
                  "&:hover fieldset": {
                    borderColor: "#005bb5", // Darker hover effect
                  },
                },
              }}
              InputLabelProps={{
                shrink: true, // Always show the label
              }}
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
              <TableCell style={styles.tableCell}>Delivery Status *</TableCell> 
              <TableCell style={styles.tableCell}>Order Created By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentLeads.map((order, index) => (
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
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={orders.length}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default RetentionOrders;
