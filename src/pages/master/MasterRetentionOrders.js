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
  Divider,
  Checkbox,
  ListItemText,
  TablePagination,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

const dropdownOptions = {
  productsOrdered: [
    "KJF", "SDP", "VKR", "L-Fx", "S&S",
    "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"
  ],
  dosageOrdered: ["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"],
  modeOfPayment: ["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"],
  deliveryStatus: ["Delivered", "RTO", "Undelivered"],
};

const RetentionOrders = () => {
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rawOrders, setRawOrders] = useState([]); 

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
  // This state will contain the full names of active retention agents fetched from the employees endpoint.
  const [retentionAgents, setRetentionAgents] = useState([]);

  // On mount, fetch the list of retention employees
  useEffect(() => {
    fetchRetentionEmployees();
  }, []);

  // When the retention agent list is fetched, then fetch the retention orders data.
  useEffect(() => {
    if (retentionAgents.length > 0) {
      fetchRetentionOrders();
    }
  }, [retentionAgents]);

  // Fetch active retention agents from employees endpoint
  const fetchRetentionEmployees = async () => {
    try {
      const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees", {
        params: { role: "Retention Agent" }
      });
      // Filter for active employees and extract their full names.
      const activeAgents = res.data
        .filter((emp) => emp.status === "active")
        .map((emp) => emp.fullName);
      setRetentionAgents(activeAgents);
    } catch (error) {
      console.error("Error fetching retention employees:", error);
    }
  };

  // Fetch combined data using the orderCreatedBy query parameter.
  // const fetchRetentionOrders = async () => {
  //   try {
  //     setLoading(true); 
  //     const response = await axios.get(
  //       "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/allapi",
  //       { params: { orderCreatedBy: retentionAgents } } // Pass array of retention agent names 
  //     );
  //     // Sort orders by descending date.
  //     const sortedOrders = response.data.sort((a, b) => new Date(b.date) - new Date(a.date));
  //     setOrders(sortedOrders);
  //   } catch (error) {
  //     console.error("Error fetching retention orders:", error);
  //   } finally {
  //     setLoading(false); // End loading
  //   }
  // };

  const fetchRetentionOrders = async () => {
  try {
    setLoading(true);
    const response = await axios.get(
      "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/allapi",
      {
        params: { orderCreatedBy: retentionAgents }, // array OK
        // ensure orderCreatedBy=A&orderCreatedBy=B (no indexes)
        paramsSerializer: { indexes: false },
      }
    );
    const data = response.data; // already sorted desc by date
    setRawOrders(data);
    setOrders(data);
    setCurrentPage(0);
  } catch (error) {
    console.error("Error fetching retention orders:", error);
  } finally {
    setLoading(false);
  }
};

  const applyFilters = () => {
  const filteredOrders = rawOrders.filter((order) => {
    return (
      (!filters.dateFrom || new Date(order.date) >= new Date(filters.dateFrom)) &&
      (!filters.dateTo || new Date(order.date) <= new Date(filters.dateTo)) &&
      (!filters.name || order.name?.toLowerCase().includes(filters.name.toLowerCase())) &&
      (!filters.contactNumber || order.contactNumber?.includes(filters.contactNumber)) &&
      (!filters.productsOrdered.length ||
        filters.productsOrdered.some((item) =>
          Array.isArray(order.productsOrdered)
            ? order.productsOrdered.includes(item)
            : typeof order.productsOrdered === "string"
              ? order.productsOrdered.toLowerCase().includes(item.toLowerCase())
              : false
        )) &&
      (!filters.dosageOrdered ||
        order.dosageOrdered?.toLowerCase().includes(filters.dosageOrdered.toLowerCase())) &&
      (!filters.modeOfPayment ||
        order.modeOfPayment?.toLowerCase().includes(filters.modeOfPayment.toLowerCase())) &&
      (!filters.amountFrom || parseFloat(order.amountPaid) >= parseFloat(filters.amountFrom)) &&
      (!filters.amountTo || parseFloat(order.amountPaid) <= parseFloat(filters.amountTo)) &&
      (!filters.orderCreatedBy.length ||
        filters.orderCreatedBy.some((creator) =>
          creator.toLowerCase() === order.orderCreatedBy?.toLowerCase()
        ))
    );
  });

  setOrders(filteredOrders);
  setCurrentPage(0);
  setFilterOpen(false);
};


  const resetFilters = () => {
  setFilters({
    dateFrom: "", dateTo: "", name: "", contactNumber: "",
    productsOrdered: [], dosageOrdered: "", amountFrom: "", amountTo: "",
    modeOfPayment: "", deliveryStatus: "", orderCreatedBy: "",
  });
  setOrders(rawOrders);   // restore from master
  setCurrentPage(0);
};

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const currentLeads = orders.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage
  );

  // Export to CSV without "Shopify Amount"
  const exportToCSV = () => {
  if (orders.length === 0) return;
  const headers = [
    "Date","Name","Contact No","Products Ordered","Dosage Ordered",
    "Amount Paid","Mode of Payment","Order ID","Shipment Status","Order Created By",
  ];
  const csvRows = [
    headers.join(","),
    ...orders.map((order) => {
      const row = [
        order.date || "",
        order.name || "",
        order.contactNumber || "",
        Array.isArray(order.productsOrdered)
          ? order.productsOrdered.join(" | ")
          : order.productsOrdered || "",
        order.dosageOrdered || "",
        order.amountPaid || "",
        order.modeOfPayment || "",
        order.orderId || "",
        order.shipway_status || "",
        order.orderCreatedBy || "",
      ];
      return row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",");
    }),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "retention_orders.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};


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
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Button
          variant="contained"
          onClick={() => setFilterOpen(true)}
          sx={{ backgroundColor: "#0073e6", ...styles.button }}
        >
          Filter
        </Button>
        <Button
          variant="contained"
          onClick={exportToCSV}
          sx={{ backgroundColor: "#0073e6", ...styles.button }}
        >
          Export to CSV
        </Button>
      </Box>

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
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
              }
              sx={{
                marginBottom: 2,
                "& .MuiInputBase-input": { padding: "10px 12px" },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6",
                  "&:hover fieldset": { borderColor: "#005bb5" },
                },
              }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Date To"
              type="date"
              fullWidth
              value={filters.dateTo}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
              }
              sx={{
                marginBottom: 2,
                "& .MuiInputBase-input": { padding: "10px 12px" },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6",
                  "&:hover fieldset": { borderColor: "#005bb5" },
                },
              }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Name"
              fullWidth
              value={filters.name}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, name: e.target.value }))
              }
              sx={{
                marginBottom: 2,
                "& .MuiInputBase-input": { padding: "10px 12px" },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6",
                  "&:hover fieldset": { borderColor: "#005bb5" },
                },
              }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Contact No"
              fullWidth
              value={filters.contactNumber}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, contactNumber: e.target.value }))
              }
              sx={{
                marginBottom: 2,
                "& .MuiInputBase-input": { padding: "10px 12px" },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6",
                  "&:hover fieldset": { borderColor: "#005bb5" },
                },
              }}
              InputLabelProps={{ shrink: true }}
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
                  "& .MuiInputBase-input": { padding: "10px 12px" },
                  "& .MuiOutlinedInput-root": {
                    borderColor: "#0073e6",
                    "&:hover fieldset": { borderColor: "#005bb5" },
                  },
                }}
                InputLabelProps={{ shrink: true }}
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
                  "& .MuiInputBase-input": { padding: "10px 12px" },
                  "& .MuiOutlinedInput-root": {
                    borderColor: "#0073e6",
                    "&:hover fieldset": { borderColor: "#005bb5" },
                  },
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <FormControl fullWidth sx={{ marginBottom: 2 }}>
              <InputLabel>Order Created By</InputLabel>
              <Select
                multiple
                value={filters.orderCreatedBy || []}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, orderCreatedBy: e.target.value }))
                }
                renderValue={(selected) => selected.join(", ")}
              >
                {retentionAgents.map((employee) => (
                  <MenuItem key={employee} value={employee}>
                    <Checkbox checked={filters.orderCreatedBy?.includes(employee)} />
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
                "& .MuiInputBase-input": { padding: "10px 12px" },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6",
                  "&:hover fieldset": { borderColor: "#005bb5" },
                },
              }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Amount To"
              fullWidth
              type="number"
              value={filters.amountTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, amountTo: e.target.value }))}
              sx={{
                marginBottom: 0,
                "& .MuiInputBase-input": { padding: "10px 12px" },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6",
                  "&:hover fieldset": { borderColor: "#005bb5" },
                },
              }}
              InputLabelProps={{ shrink: true }}
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
          <Button variant="outlined" fullWidth onClick={resetFilters}>
            Reset Filters
          </Button>
        </Box>
      </Drawer>

          <TableContainer component={Paper} style={styles.card} sx={{ maxHeight: 1000 }}>
            <Table style={styles.table} stickyHeader aria-label="sticky table">
              <TableHead>
                <TableRow>
                  <TableCell style={styles.tableCell}>Date</TableCell>
                  <TableCell style={styles.tableCell}>Name</TableCell>
                  <TableCell style={styles.tableCell}>Contact No</TableCell>
                  <TableCell style={styles.tableCell}>Products Ordered</TableCell>
                  <TableCell style={styles.tableCell}>Dosage Ordered</TableCell>
                  <TableCell style={styles.tableCell}>Amount Paid</TableCell>
                  <TableCell style={styles.tableCell}>Mode of Payment</TableCell>
                  <TableCell style={styles.tableCell}>Order ID</TableCell>
                  <TableCell style={styles.tableCell}>Shipment Status</TableCell>
                  <TableCell style={styles.tableCell}>Order Created By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>

                {loading ? (
        <TableRow>
          <TableCell colSpan={10} align="center">
            <CircularProgress sx={{ my: 3 }} />
          </TableCell>
        </TableRow>
      ) : (
                currentLeads.map((order) => (
                  <TableRow
                    key={order._id}
                    sx={{ "&:hover": { backgroundColor: "#f2f2f2" } }}
                  >
                    <TableCell style={styles.tableCell}>{order.date || "N/A"}</TableCell>
                    <TableCell style={styles.tableCell}>{order.name || "N/A"}</TableCell>
                    <TableCell style={styles.tableCell}>{order.contactNumber || "N/A"}</TableCell>
                    <TableCell style={styles.tableCell}>
                      {Array.isArray(order.productsOrdered)
                        ? order.productsOrdered.join(", ")
                        : order.productsOrdered || "N/A"}
                    </TableCell>
                    <TableCell style={styles.tableCell}>{order.dosageOrdered || "N/A"}</TableCell>
                    <TableCell style={styles.tableCell}>{order.amountPaid || "N/A"}</TableCell>
                    <TableCell style={styles.tableCell}>{order.modeOfPayment || "N/A"}</TableCell>
                    <TableCell style={styles.tableCell}>{order.orderId || "N/A"}</TableCell>
                    <TableCell style={styles.tableCell}>{order.shipway_status || "N/A"}</TableCell>
                    <TableCell style={styles.tableCell}>{order.orderCreatedBy || "N/A"}</TableCell>
                  </TableRow>
                ))
              )}
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
