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
  Typography,
  Select,
  MenuItem,
  Checkbox,
  FormControl,
  ListItemText,
  Button,
  Drawer,
  Divider,
  TablePagination,
  InputLabel,
} from "@mui/material";
import axios from "axios";

const SalesMySales = () => {
  const [sales, setSales] = useState([]);
  const [agentAssignedName, setAgentAssignedName] = useState(""); 
  const [currentPage, setCurrentPage] = useState(0); 
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    name: "",
    contactNumber: "",
    productsOrdered: [],
    dosageOrdered: "",
    salesStatus: "",
    amountFrom: "",
    amountTo: "",
    modeOfPayment: "",
    deliveryStatus: "",
  });
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => { 
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user) {
      setAgentAssignedName(user.fullName);  
      fetchSales(user.fullName);  
    }
  }, []);

  const fetchSales = async (agentAssignedName) => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads", {
        params: { agentAssignedName, salesStatus: "Sales Done" }, 
      });
      setSales(response.data.reverse());
    } catch (error) {
      console.error("Failed to fetch sales", error);
    }
  };
 
  const dropdownOptions = [
    { key: 'salesStatus', label: 'Sales Status', options: ['Sales Done', 'On Follow Up', 'Lost'] },
    { key: 'modeOfPayment', label: 'Mode of Payment', options: ['Partial Paid', 'Razorpay', 'COD', 'UPI', 'Bank Transfer'] },
    { key: 'deliveryStatus', label: 'Delivery Status', options: ['Delivered', 'RTO', 'Undelivered'] },
    { key: 'dosageOrdered', label: 'Dosage Ordered', options: ['10-Days', '20-Days', '30-Days', '60-Days', '90-Days'] },
    { key: 'productsOrdered', label: 'Products Ordered', options: ['KJF', 'SDP', 'VKR', 'L-Fx', 'S&S', 'CPV', 'HDP', 'PF', 'PGut', 'Shilajit', 'Kit', 'Blood Test'], multiple: true },
  ];

  const calculateDosageExpiring = (days) => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + days);
    return currentDate.toISOString().split("T")[0];
  };

  const handleInputChange = async (e, index, field) => {
    const updatedSales = [...sales];
    updatedSales[index][field] = e.target.value;

    if (field === "dosageOrdered") {
      const days = parseInt(e.target.value.split("-")[0], 10);
      updatedSales[index].dosageExpiring = calculateDosageExpiring(days);
  
      // Update the Dosage Expiring field in the database
      try {
        await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${updatedSales[index]._id}`, {
          dosageOrdered: e.target.value,
          dosageExpiring: updatedSales[index].dosageExpiring,
        });
      } catch (error) {
        console.error("Error updating dosageOrdered and dosageExpiring:", error);
      }
    }
    
    setSales(updatedSales);
 
    const saleId = updatedSales[index]._id;
    try {
      await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${saleId}`, {
        [field]: e.target.value, 
      });
    } catch (error) {
      console.error("Error updating sale:", error);
    }
  };

  const applyFilters = () => {
    const filteredSales = sales.filter((sale) => {
      return (
        (!filters.dateFrom || new Date(sale.lastOrderDate) >= new Date(filters.dateFrom)) &&
        (!filters.dateTo || new Date(sale.lastOrderDate) <= new Date(filters.dateTo)) &&
        (!filters.name || sale.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.contactNumber || sale.contactNumber.includes(filters.contactNumber)) &&
        (!filters.productsOrdered.length || filters.productsOrdered.every((item) => sale.productsOrdered.includes(item))) &&
        (!filters.dosageOrdered || sale.dosageOrdered === filters.dosageOrdered) &&
        (!filters.salesStatus || sale.salesStatus === filters.salesStatus) &&
        (!filters.amountFrom || parseFloat(sale.amountPaid) >= parseFloat(filters.amountFrom)) &&
        (!filters.amountTo || parseFloat(sale.amountPaid) <= parseFloat(filters.amountTo)) &&
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
      productsOrdered: [],
      dosageOrdered: "",
      salesStatus: "",
      amountFrom: "",
      amountTo: "",
      modeOfPayment: "",
      deliveryStatus: "",
    });
    fetchSales(agentAssignedName);
  };

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
};

const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);  
};

const renderDropdown = (key, multiple = false) => {
  return dropdownOptions.find(option => option.key === key);
};

const currentLeads = sales.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h5" gutterBottom>
        My Sales
      </Typography>

      <Button variant="contained" sx={{ mb: 2 }} onClick={() => setFilterOpen(true)}>
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
    <Divider sx={{ mb: 2 }} />
    <TextField
      label="First Order Date From"
      type="date"
      fullWidth
      value={filters.dateFrom}
      onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
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
      label="First Order Date To"
      type="date"
      fullWidth
      value={filters.dateTo}
      onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
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
    {dropdownOptions.map(({ key, label, options, multiple }) => (
  <FormControl fullWidth sx={{ mb: 2 }} key={key}>
    <InputLabel>{label}</InputLabel>
    <Select
      multiple={multiple}
      value={filters[key] || (multiple ? [] : '')}
      onChange={(e) => {
        const value = multiple ? e.target.value : e.target.value;
        setFilters(prev => ({ ...prev, [key]: value }));
      }}
      renderValue={(selected) => multiple ? selected.join(', ') : selected}
    >
      {options.map(option => (
        <MenuItem key={option} value={option}>
          {multiple && <Checkbox checked={filters[key].includes(option)} />}
          <ListItemText primary={option} />
        </MenuItem>
      ))}
    </Select>
  </FormControl>
))}

    <TextField
      label="Amount From"
      type="number"
      fullWidth
      value={filters.amountFrom}
      onChange={(e) => setFilters((prev) => ({ ...prev, amountFrom: e.target.value }))}
      sx={{ mb: 2 }}
    />
    <TextField
      label="Amount To"
      type="number"
      fullWidth
      value={filters.amountTo}
      onChange={(e) => setFilters((prev) => ({ ...prev, amountTo: e.target.value }))}
      sx={{ mb: 2 }}
    />
    <Divider sx={{ mb: 2 }} />
    <Button
      variant="contained"
      fullWidth
      onClick={() => {
        applyFilters();
        setFilterOpen(false);
      }}
      sx={{ mb: 1 }}
    >
      Apply Filters
    </Button>
    <Button
      variant="outlined"
      fullWidth
      onClick={() => {
        resetFilters();
        setFilterOpen(false);
      }}
    >
      Reset Filters
    </Button>
  </Box>
</Drawer>

      <TableContainer component={Paper} sx={{ maxHeight: 1000 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell>First Order Date *</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Contact No</TableCell>
              <TableCell>Agent Assigned</TableCell>
              <TableCell>Products Ordered *</TableCell> 
              <TableCell>Dosage Ordered *</TableCell>
              <TableCell>Sales Status</TableCell>
              <TableCell>Amount Paid *</TableCell>
              <TableCell>Mode of Payment *</TableCell>
              <TableCell>Delivery Status</TableCell>
              <TableCell>Agents Remarks *</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentLeads.map((sale, index) => (
              <TableRow key={sale._id}>
                <TableCell>
                  <TextField
                    type="date"
                    value={sale.lastOrderDate || ""}
                    onChange={(e) => handleInputChange(e, index, "lastOrderDate")}  
                    fullWidth
                  />
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "250px" }}>
                  <TextField
                    value={sale.name || ""}
                    onChange={(e) => handleInputChange(e, index, "name")}
                    fullWidth
                  />
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "200px" }}>
                  <TextField
                    type="number"
                    value={sale.contactNumber || ""}
                    onChange={(e) => handleInputChange(e, index, "contactNumber")}
                    fullWidth
                  />
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "140px" }}>
                  <TextField
                    value={sale.agentAssigned || ""}
                    disabled // Agent assigned is not editable
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <FormControl fullWidth>
                    <Select
                      multiple
                      value={sale.productsOrdered || []}
                      onChange={(e) => handleInputChange(e, index, "productsOrdered")}
                      renderValue={(selected) => selected.join(", ")}
                    >
                      {["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"].map((product) => (
                        <MenuItem key={product} value={product}>
                          <Checkbox checked={sale.productsOrdered?.includes(product)} />
                          <ListItemText primary={product} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Select
                    value={sale.dosageOrdered || ""}
                    onChange={(e) => handleInputChange(e, index, "dosageOrdered")}
                    fullWidth
                  >
                    {["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"].map((dosage) => (
                      <MenuItem key={dosage} value={dosage}>
                        {dosage}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={sale.salesStatus || ""}
                    onChange={(e) => handleInputChange(e, index, "salesStatus")}
                    fullWidth
                  >
                    {["Sales Done", "On Follow Up", "Lost"].map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "150px" }}>
                  <TextField
                    type="number"
                    value={sale.amountPaid || ""}
                    onChange={(e) => handleInputChange(e, index, "amountPaid")}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={sale.modeOfPayment || ""}
                    onChange={(e) => handleInputChange(e, index, "modeOfPayment")}
                    fullWidth
                  >
                    {["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"].map((mode) => (
                      <MenuItem key={mode} value={mode}>
                        {mode}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={sale.deliveryStatus || ""}
                    onChange={(e) => handleInputChange(e, index, "deliveryStatus")}
                    fullWidth
                  >
                    {["Delivered", "RTO", "Undelivered"].map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "250px" }}>
                  <TextField
                    value={sale.agentsRemarks || ""}
                    onChange={(e) => handleInputChange(e, index, "agentsRemarks")}
                    fullWidth
                  />
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

export default SalesMySales;
