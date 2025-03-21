import React, { useState, useEffect } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  Button,
  Typography,
  FormControl,
  Checkbox,
  ListItemText,
  Drawer,
  Divider,
  TablePagination,
  InputLabel,
  IconButton,
} from "@mui/material";
import { Delete, AddCircle } from "@mui/icons-material";
import axios from "axios";

const RetentionSales = () => {
  const [sales, setSales] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [editedSales, setEditedSales] = useState({});
  const [savingStatus, setSavingStatus] = useState({});
  const productOptions = [
    "KJF",
    "SDP",
    "VKR",
    "L-Fx",
    "S&S",
    "CPV",
    "HDP",
    "PF",
    "PGut",
    "Shilajit",
    "Kit",
    "Blood Test",
  ];
  const dosageOptions = ["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"];
  const paymentModes = [
    "Partial Paid",
    "Razorpay",
    "COD",
    "UPI",
    "Bank Transfer",
  ];
  const deliveryStatuses = ["Delivered", "RTO", "Undelivered"];

  const loggedInUser = JSON.parse(sessionStorage.getItem("user"));

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    name: "",
    contactNumber: "",
    productsOrdered: "",
    dosageOrdered: "",
    amountPaidFrom: "",
    amountPaidTo: "",
    modeOfPayment: "",
    deliveryStatus: "",
  });
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (loggedInUser) {
      fetchSales(loggedInUser.fullName);
    }
  }, [loggedInUser]);

  const fetchSales = async (orderCreatedBy) => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales", {
        params: { orderCreatedBy },
      });
      setSales(response.data);
    } catch (error) {
      console.error("Error fetching retention sales:", error);
    }
  };

  const handleInputChange = (e, id, field) => {
    setEditedSales((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: e.target.value,
      },
    }));
  };

  const handleSave = async (id) => {
    if (editedSales[id]) {
      setSavingStatus((prev) => ({ ...prev, [id]: "Saving..." }));
      try {
        // Save the changes
        await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/${id}`, editedSales[id]);
        setSales((prev) =>
          prev.map((sale) => (sale._id === id ? { ...sale, ...editedSales[id] } : sale))
        );
        // Trigger heavy matching logic immediately after saving
        await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/update-matching");
        // Update button text to "Saved"
        setSavingStatus((prev) => ({ ...prev, [id]: "Saved" }));
        setEditedSales((prev) => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        // Optionally, clear the status after 3 seconds
        setTimeout(() => {
          setSavingStatus((prev) => ({ ...prev, [id]: undefined }));
        }, 3000);
      } catch (error) {
        console.error("Error saving sale:", error);
        setSavingStatus((prev) => ({ ...prev, [id]: "Error" }));
      }
    }
  };

  const handleAddSale = async () => {
    const newSale = {
      date: new Date().toISOString().split("T")[0],
      name: "",
      contactNumber: "",
      productsOrdered: [],
      dosageOrdered: "",
      amountPaid: 0,
      modeOfPayment: "",
      orderCreatedBy: loggedInUser.fullName,
    };

    try {
      const response = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales", newSale);
      setSales([response.data, ...sales]);
    } catch (error) {
      console.error("Error adding new sale:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/${id}`);
      setSales(sales.filter((sale) => sale._id !== id));
    } catch (error) {
      console.error("Error deleting sale:", error);
    }
  };

  const applyFilters = () => {
    const filteredSales = sales.filter((sale) => {
      return (
        (!filters.dateFrom || new Date(sale.date) >= new Date(filters.dateFrom)) &&
        (!filters.dateTo || new Date(sale.date) <= new Date(filters.dateTo)) &&
        (!filters.name || sale.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.contactNumber || sale.contactNumber.includes(filters.contactNumber)) &&
        (!filters.productsOrdered.length ||
          filters.productsOrdered.every((p) => sale.productsOrdered.includes(p))) &&
        (!filters.dosageOrdered || sale.dosageOrdered === filters.dosageOrdered) &&
        (!filters.amountPaidFrom || sale.amountPaid >= filters.amountPaidFrom) &&
        (!filters.amountPaidTo || sale.amountPaid <= filters.amountPaidTo) &&
        (!filters.modeOfPayment || sale.modeOfPayment === filters.modeOfPayment) &&
        (!filters.deliveryStatus || sale.deliveryStatus === filters.deliveryStatus)
      );
    });
    setSales(filteredSales);
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      name: "",
      contactNumber: "",
      productsOrdered: "",
      dosageOrdered: "",
      amountPaidFrom: "",
      amountPaidTo: "",
      modeOfPayment: "",
      deliveryStatus: "",
    });
    fetchSales(loggedInUser.fullName);
  };

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const currentLeads = sales.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h5" gutterBottom>
        Retention Sales
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddCircle />}
        sx={{ marginBottom: 2 }}
        onClick={handleAddSale}
      >
        Add New Sale
      </Button>
      <Button variant="contained" sx={{ mb: 2, ml: 2 }} onClick={() => setFilterOpen(true)}>
        Filter
      </Button>

      <Drawer anchor="right" open={filterOpen} onClose={() => setFilterOpen(false)}>
        <Box sx={{ width: 300, padding: 2 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <TextField
            label="Date From"
            type="date"
            fullWidth
            value={filters.dateFrom}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Date To"
            type="date"
            fullWidth
            value={filters.dateTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Name"
            fullWidth
            value={filters.name}
            onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Contact No"
            fullWidth
            value={filters.contactNumber}
            onChange={(e) => setFilters((prev) => ({ ...prev, contactNumber: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="products-ordered-label">Products Ordered</InputLabel>
            <Select
              multiple
              value={filters.productsOrdered || []}
              onChange={(e) => setFilters((prev) => ({ ...prev, productsOrdered: e.target.value }))}
              renderValue={(selected) => selected.join(", ")}
            >
              {productOptions.map((product) => (
                <MenuItem key={product} value={product}>
                  <Checkbox checked={filters.productsOrdered.includes(product)} />
                  <ListItemText primary={product} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="dosage-ordered-label">Dosage Ordered</InputLabel>
            <Select
              value={filters.dosageOrdered}
              onChange={(e) => setFilters((prev) => ({ ...prev, dosageOrdered: e.target.value }))}
            >
              {dosageOptions.map((dosage) => (
                <MenuItem key={dosage} value={dosage}>
                  {dosage}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Amount Paid From"
            type="number"
            fullWidth
            value={filters.amountPaidFrom}
            onChange={(e) => setFilters((prev) => ({ ...prev, amountPaidFrom: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Amount Paid To"
            type="number"
            fullWidth
            value={filters.amountPaidTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, amountPaidTo: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="mode-of-payment-label">Mode of Payment</InputLabel>
            <Select
              value={filters.modeOfPayment}
              onChange={(e) => setFilters((prev) => ({ ...prev, modeOfPayment: e.target.value }))}
            >
              {paymentModes.map((mode) => (
                <MenuItem key={mode} value={mode}>
                  {mode}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="delivery-status-label">Delivery Status</InputLabel>
            <Select
              value={filters.deliveryStatus}
              onChange={(e) => setFilters((prev) => ({ ...prev, deliveryStatus: e.target.value }))}
            >
              {deliveryStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Divider sx={{ mb: 2 }} />
          <Button variant="contained" fullWidth onClick={applyFilters}>
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
              <TableCell>Date</TableCell>
              <TableCell>Name *</TableCell>
              <TableCell>Contact No *</TableCell>
              <TableCell>Products Ordered *</TableCell>
              <TableCell>Dosage Ordered *</TableCell>
              <TableCell>Amount Paid *</TableCell>
              <TableCell>Mode of Payment *</TableCell>
              <TableCell>Shopify Amount</TableCell>
              <TableCell>Order ID</TableCell>
              <TableCell>Shipment Status</TableCell>
              <TableCell>Order Created By *</TableCell>
              <TableCell>Remarks</TableCell>
              <TableCell>Actions *</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentLeads.map((sale) => (
              <TableRow key={sale._id}>
                <TableCell>
                  <TextField
                    type="date"
                    value={editedSales[sale._id]?.date || sale.date || ""}
                    onChange={(e) => handleInputChange(e, sale._id, "date")}
                    fullWidth
                  />
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "240px" }}>
                  <TextField
                    value={editedSales[sale._id]?.name || sale.name || ""}
                    onChange={(e) => handleInputChange(e, sale._id, "name")}
                    fullWidth
                  />
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "200px" }}>
                  <TextField
                    type="number"
                    value={editedSales[sale._id]?.contactNumber || sale.contactNumber || ""}
                    onChange={(e) => handleInputChange(e, sale._id, "contactNumber")}
                    fullWidth
                    sx={{
                      flexGrow: 1,
                      "& input[type=number]": { MozAppearance: "textfield" },
                      "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": {
                        WebkitAppearance: "none",
                        margin: 0,
                      },
                    }}
                  />
                </TableCell>
                <TableCell>
                  <FormControl fullWidth>
                    <Select
                      multiple
                      value={editedSales[sale._id]?.productsOrdered || sale.productsOrdered || []}
                      onChange={(e) => handleInputChange(e, sale._id, "productsOrdered")}
                      renderValue={(selected) => selected.join(", ")}
                    >
                      {productOptions.map((product) => (
                        <MenuItem key={product} value={product}>
                          <Checkbox checked={(editedSales[sale._id]?.productsOrdered || sale.productsOrdered || []).includes(product)} />
                          <ListItemText primary={product} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Select
                    value={editedSales[sale._id]?.dosageOrdered || sale.dosageOrdered || ""}
                    onChange={(e) => handleInputChange(e, sale._id, "dosageOrdered")}
                    fullWidth
                  >
                    {dosageOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "240px" }}>
                  <TextField
                    type="number"
                    value={editedSales[sale._id]?.amountPaid || sale.amountPaid || ""}
                    onChange={(e) => handleInputChange(e, sale._id, "amountPaid")}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={editedSales[sale._id]?.modeOfPayment || sale.modeOfPayment || ""}
                    onChange={(e) => handleInputChange(e, sale._id, "modeOfPayment")}
                    fullWidth
                  >
                    {paymentModes.map((mode) => (
                      <MenuItem key={mode} value={mode}>
                        {mode}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>{sale.shopify_amount}</TableCell>
                <TableCell>{sale.orderId || ""}</TableCell>
                <TableCell>{sale.shipway_status}</TableCell>
                <TableCell>{sale.orderCreatedBy}</TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "240px" }}>
                  <TextField
                    value={editedSales[sale._id]?.remarks || sale.remarks || ""}
                    onChange={(e) => handleInputChange(e, sale._id, "remarks")}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <Button variant="contained" color="primary" onClick={() => handleSave(sale._id)}>
                    {savingStatus[sale._id] ? savingStatus[sale._id] : "Save"}
                  </Button>
                  <IconButton color="error" onClick={() => handleDelete(sale._id)}>
                    <Delete />
                  </IconButton>

                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={sales.length}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default RetentionSales;
