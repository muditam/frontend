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
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Button,
  Drawer,
  Divider,
  TablePagination, 
  InputLabel,
} from "@mui/material";
import axios from "axios";

const RetentionLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loggedInUser, setLoggedInUser] = useState({});
  const [currentPage, setCurrentPage] = useState(0); 
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [filters, setFilters] = useState({
    name: "",
    contactNumber: "",
    salesAgentAssigned: "",
    productPitched: "", 
    productsOrdered: "",
    dosageOrdered: "",
    modeOfPayment: "",
    deliveryStatus: "",
    dosageExpiringFrom: "",
    dosageExpiringTo: "",
    rtNextFollowupDate: "",
    rtFollowupReminder: "",
    rtFollowupStatus: "",
    lastOrderDateFrom: "",
    lastOrderDateTo: "",
    retentionStatus: "",
  });
  const [filterOpen, setFilterOpen] = useState(false); 


  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user && user.role === "Retention Agent") { 
      setLoggedInUser(user);
      fetchRetentionLeads(user);
    } 
  }, []);

  const computeReminder = (followupDate) => {
    const date = new Date(followupDate);
    const today = new Date();
    const diffInDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  
    if (diffInDays < 0) return "Follow-up Missed";
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Tomorrow";
    return "Later";
  };
  

  const fetchRetentionLeads = async (user) => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retentions", {
        params: {
          fullName: user.fullName,
          email: user.email, 
        },
      });
      const leadsWithReminders = response.data.map(lead => ({
      ...lead,
      rtFollowupReminder: lead.rtNextFollowupDate ? computeReminder(lead.rtNextFollowupDate) : ''
    }));
    setLeads(leadsWithReminders.reverse());
    } catch (error) {
      console.error("Failed to fetch retention leads", error);
    }
  };

  const handleInputChange = async (e, index, field) => {
    const globalIndex = currentPage * rowsPerPage + index;  
    const value = e.target.value;
    const updatedLeads = [...leads];
    updatedLeads[globalIndex][field] = value; 
  
    if (field === "rtNextFollowupDate") {
      const followupDate = new Date(value);
      const today = new Date();
      const diffInDays = Math.ceil((followupDate - today) / (1000 * 60 * 60 * 24)); 
  
      updatedLeads[globalIndex].rtFollowupReminder =
        diffInDays < 0
          ? "Missed"
          : diffInDays === 0
            ? "Today"
            : diffInDays === 1
              ? "Tomorrow"
              : "Later";
    }
  
    setLeads(updatedLeads);
  
    try {
      await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${updatedLeads[globalIndex]._id}`, {
        [field]: value,
      });
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  };
  

  const applyFilters = () => {
    const filteredLeads = leads.filter((lead) => {
      return (
        (!filters.name || lead.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.contactNumber || lead.contactNumber.includes(filters.contactNumber)) &&
        (!filters.salesAgentAssigned || lead.agentAssigned === filters.salesAgentAssigned) &&
        (!filters.productPitched || lead.productPitched.includes(filters.productPitched)) &&
        (!filters.productsOrdered || lead.productsOrdered.includes(filters.productsOrdered)) &&
        (!filters.dosageOrdered || lead.dosageOrdered === filters.dosageOrdered) &&
        (!filters.modeOfPayment || lead.modeOfPayment === filters.modeOfPayment) &&
        (!filters.deliveryStatus || lead.deliveryStatus === filters.deliveryStatus) &&
        (!filters.dosageExpiringFrom || new Date(lead.dosageExpiring) >= new Date(filters.dosageExpiringFrom)) &&
        (!filters.dosageExpiringTo || new Date(lead.dosageExpiring) <= new Date(filters.dosageExpiringTo)) &&
        (!filters.rtNextFollowupDate || lead.rtNextFollowupDate === filters.rtNextFollowupDate) &&
        (!filters.rtFollowupReminder || lead.rtFollowupReminder === filters.rtFollowupReminder) &&
        (!filters.rtFollowupStatus || lead.rtFollowupStatus === filters.rtFollowupStatus) &&
        (!filters.lastOrderDateFrom || new Date(lead.lastOrderDate) >= new Date(filters.lastOrderDateFrom)) &&
        (!filters.lastOrderDateTo || new Date(lead.lastOrderDate) <= new Date(filters.lastOrderDateTo)) &&
        (!filters.retentionStatus || lead.retentionStatus === filters.retentionStatus)
      );
    });
    setLeads(filteredLeads);
  };

  const resetFilters = () => {
    setFilters({
      name: "",
      contactNumber: "",
      salesAgentAssigned: "",
      productPitched: "",
      productsOrdered: "",
      dosageOrdered: "",
      modeOfPayment: "",
      deliveryStatus: "",
      dosageExpiringFrom: "",
      dosageExpiringTo: "",
      rtNextFollowupDate: "",
      rtFollowupReminder: "",
      rtFollowupStatus: "",
      lastOrderDateFrom: "",
      lastOrderDateTo: "",
      retentionStatus: "",
    });
    fetchRetentionLeads(loggedInUser);
  };

 

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
};

const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);  
};

const currentLeads = leads.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);


  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h5" gutterBottom>
        Retention Leads
      </Typography>

      <Button variant="contained" sx={{ mb: 2 }} onClick={() => setFilterOpen(true)}>
        Filter
      </Button>

      <Drawer anchor="right" open={filterOpen} onClose={() => setFilterOpen(false)}>
        <Box sx={{ width: 300, padding: 2 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {[
            { label: "Name", key: "name", type: "text" },
            { label: "Contact No", key: "contactNumber", type: "text" },
            { label: "Sales Agent Assigned", key: "salesAgentAssigned", type: "text" },
            { label: "Product Pitched", key: "productPitched", type: "text" },
            { label: "Products Ordered", key: "productsOrdered", type: "text" },
            { label: "Dosage Ordered", key: "dosageOrdered", type: "dropdown", options: ["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"] },
            { label: "Mode of Payment", key: "modeOfPayment", type: "dropdown", options: ["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"] },
            { label: "Delivery Status", key: "deliveryStatus", type: "dropdown", options: ["Delivered", "RTO", "Undelivered"] },
            { label: "Dosage Expiring From", key: "dosageExpiringFrom", type: "date" },
            { label: "Dosage Expiring To", key: "dosageExpiringTo", type: "date" },
            { label: "RT Next Followup Date", key: "rtNextFollowupDate", type: "date" },
            { label: "RT Followup Reminder", key: "rtFollowupReminder", type: "dropdown", options: ["Today", "Tomorrow", "Follow-up Missed", "Later"] },
            { label: "RT Followup Status", key: "rtFollowupStatus", type: "dropdown", options: ["Good Results", "No Result", "Sales Done", "Do Not Want to Continue", "Call Not Picked", "Blood Test Suggested", "Product Issue", "Order from Other Source", "Upsell", "Follow Up Again", "Call Back", "Others"] },
            { label: "Last Order Date From", key: "lastOrderDateFrom", type: "date" },
            { label: "Last Order Date To", key: "lastOrderDateTo", type: "date" },
            { label: "Retention Status", key: "retentionStatus", type: "dropdown", options: ["Active", "Lost"] },
          ].map(({ label, key, type, options }) => (
            type === "dropdown" ? (
              <FormControl key={key} fullWidth sx={{ mb: 2 }}>
                <InputLabel id={`${key}-label`}>{label}</InputLabel>
                <Select
                  value={filters[key] || ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                >
                  {options.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                key={key}
                label={label}
                type={type}
                fullWidth
                value={filters[key] || ""}
                onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
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
            )
          ))}
          <Divider sx={{ mb: 2 }} />
          <Button variant="contained" fullWidth onClick={() => applyFilters()}>
            Apply Filters
          </Button>
          <Button variant="outlined" fullWidth onClick={() => resetFilters()}>
            Reset Filters
          </Button>
        </Box>
      </Drawer>

      <TableContainer component={Paper} sx={{ maxHeight: 1000 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Contact No</TableCell>
              <TableCell>Sales Agent Assigned</TableCell>
              <TableCell>Product Pitched</TableCell>
              <TableCell>Products Ordered</TableCell>
              <TableCell>Dosage Ordered</TableCell>
              <TableCell>Mode of Payment</TableCell>
              <TableCell>Delivery Status</TableCell>
              <TableCell>Health Expert Assigned</TableCell>
              <TableCell>Dosage Expiring</TableCell>
              <TableCell>RT Next Followup Date *</TableCell>
              <TableCell>RT Followup Reminder</TableCell>
              <TableCell>RT Followup Status *</TableCell>
              <TableCell>Last Order Date *</TableCell>
              <TableCell>Repeat Dosage Ordered *</TableCell>
              <TableCell>Retention Status *</TableCell>
              <TableCell>RT Remark *</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentLeads.map((lead, index) => (
              <TableRow key={lead._id}>
                <TableCell>{lead.name}</TableCell>
                <TableCell>{lead.contactNumber}</TableCell>
                <TableCell>{lead.agentAssigned}</TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "150px" }}>{lead.productPitched?.join(", ")}</TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "150px" }}>{lead.productsOrdered?.join(", ")}</TableCell>
                <TableCell>{lead.dosageOrdered}</TableCell>
                <TableCell>{lead.modeOfPayment}</TableCell>
                <TableCell>{lead.deliveryStatus}</TableCell>
                <TableCell>{lead.healthExpertAssigned}</TableCell>
                <TableCell>{lead.dosageExpiring}</TableCell>
                <TableCell>
                  <TextField
                    type="date"
                    value={lead.rtNextFollowupDate || ""}
                    onChange={(e) => handleInputChange(e, index, "rtNextFollowupDate")}
                  />
                </TableCell>
                <TableCell>{lead.rtFollowupReminder}</TableCell>
                <TableCell>
                  <Select
                    value={lead.rtFollowupStatus || ""}
                    onChange={(e) => handleInputChange(e, index, "rtFollowupStatus")}
                    fullWidth
                  >
                    {[
                      "Good Results",
                      "No Result",
                      "Sales Done",
                      "Do Not Want to Continue",
                      "Call Not Picked",
                      "Blood Test Suggested",
                      "Product Issue",
                      "Order from Other Source",
                      "Upsell",
                      "Follow Up Again",
                      "Call Back",
                      "Others",
                    ].map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell> 
                <TableCell>
                  <TextField
                    type="date"
                    value={lead.lastOrderDate || ""}
                    onChange={(e) => handleInputChange(e, index, "lastOrderDate")}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={lead.repeatDosageOrdered || ""}
                    onChange={(e) => handleInputChange(e, index, "repeatDosageOrdered")}
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
                    value={lead.retentionStatus || ""}
                    onChange={(e) => handleInputChange(e, index, "retentionStatus")}
                    fullWidth
                  >
                    {["Active", "Lost"].map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "200px" }}>
                  <TextField
                    value={lead.rtRemark || ""}
                    onChange={(e) => handleInputChange(e, index, "rtRemark")}
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
                count={leads.length}
                rowsPerPage={rowsPerPage}
                page={currentPage}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
    </Box>
  );
};

export default RetentionLeads;