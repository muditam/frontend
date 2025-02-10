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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import axios from "axios";
import PhoneIcon from "@mui/icons-material/Phone";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AddIcon from "@mui/icons-material/Add";

// Animation keyframes for a subtle fade-in effect
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Styled components for rows and header/body cells
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  transition: "background-color 0.3s ease",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    cursor: "pointer",
  },
}));

const HeaderTableCell = styled(TableCell)(({ theme }) => ({
  fontSize: "0.9rem",
  padding: "12px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: "black",
  color: "#fff",
  textAlign: "center",
}));

const BodyTableCell = styled(TableCell)(({ theme }) => ({
  fontSize: "0.9rem",
  padding: "4px 16px", // Reduced vertical padding for a compact look
  borderBottom: `1px solid ${theme.palette.divider}`,
  textAlign: "center",
}));

const RetentionLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loggedInUser, setLoggedInUser] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [callingMessage, setCallingMessage] = useState("");
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
  const [subcellsPopup, setSubcellsPopup] = useState({ open: false, subcells: [] });

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

  const fetchUserDetails = async (user) => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees",
        {
          params: { fullName: user.fullName, email: user.email },
        }
      );
      console.log("Employee API Response:", response.data);
      if (!response.data || response.data.length === 0) {
        console.error("Error: Employee not found in database.");
        return { async: 1, agentNumber: "Unknown", callerId: "Unknown" };
      }
      const { async, agentNumber, callerId } = response.data[0];
      if (!agentNumber || !callerId) {
        console.error("Error: Missing agentNumber or callerId", { agentNumber, callerId });
        return { async: 1, agentNumber: "Unknown", callerId: "Unknown" };
      }
      return { async, agentNumber, callerId };
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      return { async: 1, agentNumber: "Unknown", callerId: "Unknown" };
    }
  };

  const fetchRetentionLeads = async (user) => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retentions", 
        {
          params: { fullName: user.fullName, email: user.email },
        }
      );
      const { async, agentNumber, callerId } = await fetchUserDetails(user);
      const leadsWithReminders = response.data.map((lead) => ({
        ...lead,
        rtFollowupReminder: lead.rtNextFollowupDate ? computeReminder(lead.rtNextFollowupDate) : "",
        async,
        agentNumber,
        callerId,
        rtSubcells: lead.rtSubcells || [],
      }));
      // Reverse the array to show latest leads on top
      setAllLeads(leadsWithReminders.reverse());
      setLeads(leadsWithReminders.reverse());
    } catch (error) {
      console.error("Failed to fetch retention leads", error);
    }
  };

  const handleCallIconClick = async (contactNumber) => {
    setLoading(true);
    setCallingMessage(`Calling ${contactNumber}...`);
    try {
      const { async, agentNumber, callerId } = await fetchUserDetails(loggedInUser);
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
      console.log("Sending API Request to Backend:", requestBody);
      const response = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/click_to_call",
        requestBody
      );
      console.log("Backend Response:", response.data);
      if (response.data.status === "success") {
        setCallingMessage(`Successfully called ${contactNumber}`);
      } else {
        setCallingMessage("Failed to place the call. Please try again.");
        console.error("Backend Error Response:", response.data);
      }
    } catch (error) {
      console.error("Error placing the call", error.response?.data || error);
      setCallingMessage("There was an error placing the call.");
    } finally {
      setLoading(false);
    }
  };

  // Persist the updated rtSubcells field to the backend after adding a subcell.
  const handleAddSubcell = async (leadGlobalIndex) => {
    const updatedLeads = [...leads];
    const lead = updatedLeads[leadGlobalIndex];
    if (!lead.rtSubcells) {
      lead.rtSubcells = [];
    }
    const todayDate = new Date().toISOString().substring(0, 10);
    lead.rtSubcells.push({ date: todayDate, value: "" });
    setLeads(updatedLeads);
    try {
      await axios.put(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${lead._id}`,
        { rtSubcells: lead.rtSubcells }
      );
    } catch (error) {
      console.error("Error updating rtSubcells after add:", error);
    }
  };

  // Persist the updated subcell value to the backend after change.
  const handleSubcellChange = async (leadGlobalIndex, subcellIndex, e) => {
    const updatedLeads = [...leads];
    const lead = updatedLeads[leadGlobalIndex];
    if (lead.rtSubcells && lead.rtSubcells[subcellIndex]) {
      lead.rtSubcells[subcellIndex].value = e.target.value;
      setLeads(updatedLeads);
      try {
        await axios.put(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${lead._id}`,
          { rtSubcells: lead.rtSubcells }
        );
      } catch (error) {
        console.error("Error updating rtSubcells after change:", error);
      }
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
        diffInDays < 0 ? "Missed" : diffInDays === 0 ? "Today" : diffInDays === 1 ? "Tomorrow" : "Later";
    }
    setLeads(updatedLeads);
    try {
      await axios.put(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${updatedLeads[globalIndex]._id}`,
        { [field]: value }
      );
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  };

  const handleOpenSubcellsPopup = (lead) => {
    let subcells = [];
    if (lead.rtRemark) {
      subcells.push({ date: "Default", value: lead.rtRemark });
    }
    if (lead.rtSubcells && lead.rtSubcells.length > 0) {
      subcells = subcells.concat(lead.rtSubcells);
    }
    setSubcellsPopup({ open: true, subcells });
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
    setCurrentPage(0);
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
    setLeads(allLeads);
    setCurrentPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const currentLeads = leads.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage
  );

  return (
    <Box
      sx={{
        padding: { xs: 1, sm: 2, md: 3 },
        fontFamily: '"Segoe UI", sans-serif',
        backgroundColor: "background.default",
        minHeight: "100vh",
      }}
    >
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2, textAlign: "left" }}>
        Retention Leads
      </Typography>
      <Button
        variant="contained"
        sx={{ mb: 2, textTransform: "none", boxShadow: 2, display: "block"  }}
        onClick={() => setFilterOpen(true)}
      >
        Filter
      </Button>
      <Drawer
        anchor="right"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        PaperProps={{
          sx: { width: 300, padding: 2 },
        }}
      >
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
          {
            label: "Dosage Ordered",
            key: "dosageOrdered",
            type: "dropdown",
            options: ["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"],
          },
          {
            label: "Mode of Payment",
            key: "modeOfPayment",
            type: "dropdown",
            options: ["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"],
          },
          {
            label: "Delivery Status",
            key: "deliveryStatus",
            type: "dropdown",
            options: ["Delivered", "RTO", "Undelivered"],
          },
          { label: "Dosage Expiring From", key: "dosageExpiringFrom", type: "date" },
          { label: "Dosage Expiring To", key: "dosageExpiringTo", type: "date" },
          { label: "RT Next Followup Date", key: "rtNextFollowupDate", type: "date" },
          {
            label: "RT Followup Reminder",
            key: "rtFollowupReminder",
            type: "dropdown",
            options: ["Today", "Tomorrow", "Follow-up Missed", "Later"],
          },
          {
            label: "RT Followup Status",
            key: "rtFollowupStatus",
            type: "dropdown",
            options: [
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
            ],
          },
          { label: "Last Order Date From", key: "lastOrderDateFrom", type: "date" },
          { label: "Last Order Date To", key: "lastOrderDateTo", type: "date" },
          {
            label: "Retention Status",
            key: "retentionStatus",
            type: "dropdown",
            options: ["Active", "Lost"],
          },
        ].map(({ label, key, type, options }) =>
          type === "dropdown" ? (
            <FormControl key={key} fullWidth sx={{ mb: 2 }}>
              <InputLabel id={`${key}-label`}>{label}</InputLabel>
              <Select
                labelId={`${key}-label`}
                value={filters[key] || ""}
                label={label}
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
                "& .MuiInputBase-input": { padding: "10px 12px" },
                "& .MuiOutlinedInput-root": {
                  borderColor: "#0073e6",
                  "&:hover fieldset": { borderColor: "#005bb5" },
                },
              }}
              InputLabelProps={{ shrink: true }}
            />
          )
        )}
        <Divider sx={{ mb: 2 }} />
        <Button
          variant="contained"
          fullWidth
          sx={{ mb: 1, textTransform: "none" }}
          onClick={applyFilters}
        >
          Apply Filters
        </Button>
        <Button variant="outlined" fullWidth sx={{ textTransform: "none" }} onClick={resetFilters}>
          Reset Filters
        </Button>
      </Drawer>
      <Paper
        sx={{
          mb: 2,
          borderRadius: 2,
          overflowX: "auto",
          boxShadow: 3,
          whiteSpace: "nowrap",
        }}
      >
        {/* Table container with a light fade-in animation */}
        <TableContainer sx={{ animation: `${fadeIn} 0.5s ease-in` }}>
          <Table stickyHeader aria-label="retention leads table">
            <TableHead>
              <TableRow>
                <HeaderTableCell>Name</HeaderTableCell>
                <HeaderTableCell>Contact No</HeaderTableCell>
                {/* Increased width for RT Remark column */}
                <HeaderTableCell sx={{ minWidth: "300px" }}>RT Remark *</HeaderTableCell>
                <HeaderTableCell>Actions</HeaderTableCell>
                <HeaderTableCell>RT Next Followup Date *</HeaderTableCell>
                <HeaderTableCell>RT Followup Reminder</HeaderTableCell>
                <HeaderTableCell>RT Followup Status *</HeaderTableCell>
                <HeaderTableCell>Last Order Date *</HeaderTableCell>
                <HeaderTableCell>Repeat Dosage Ordered *</HeaderTableCell>
                <HeaderTableCell>Retention Status *</HeaderTableCell>
                <HeaderTableCell>Dosage Expiring</HeaderTableCell>
                <HeaderTableCell>Product Pitched</HeaderTableCell>
                <HeaderTableCell>Products Ordered</HeaderTableCell>
                <HeaderTableCell>Dosage Ordered</HeaderTableCell>
                <HeaderTableCell>Mode of Payment</HeaderTableCell>
                <HeaderTableCell>Delivery Status</HeaderTableCell>
                <HeaderTableCell>Health Expert Assigned</HeaderTableCell>
                <HeaderTableCell>Sales Agent Assigned</HeaderTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentLeads.map((lead, index) => {
                const globalIndex = currentPage * rowsPerPage + index;
                // Prepare the RT Remark content
                const rtRemarkValue =
                  lead.rtSubcells && lead.rtSubcells.length > 0
                    ? lead.rtSubcells[lead.rtSubcells.length - 1].value
                    : lead.rtRemark || "";
                return (
                  <StyledTableRow key={lead._id}>
                    <BodyTableCell>{lead.name}</BodyTableCell>
                    <BodyTableCell>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {lead.contactNumber}
                        <Tooltip title="Call">
                          <IconButton
                            color="primary"
                            onClick={() => handleCallIconClick(lead.contactNumber)}
                            sx={{ ml: 1 }}
                          >
                            <PhoneIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </BodyTableCell>
                    {/* RT Remark cell with increased width and tooltip on hover */}
                    <BodyTableCell sx={{ minWidth: "300px" }}>
                      <Tooltip title={rtRemarkValue} arrow>
                        <span>
                          {lead.rtSubcells && lead.rtSubcells.length > 0 ? (
                            <TextField
                              label={lead.rtSubcells[lead.rtSubcells.length - 1].date}
                              value={rtRemarkValue}
                              onChange={(e) =>
                                handleSubcellChange(globalIndex, lead.rtSubcells.length - 1, e)
                              }
                              fullWidth
                              variant="standard"
                            />
                          ) : (
                            <TextField
                              value={rtRemarkValue}
                              onChange={(e) => handleInputChange(e, index, "rtRemark")}
                              fullWidth
                              variant="standard"
                            />
                          )}
                        </span>
                      </Tooltip>
                    </BodyTableCell>
                    <BodyTableCell align="center">
                      <Tooltip title="Add Subcell">
                        <IconButton size="small" onClick={() => handleAddSubcell(globalIndex)}>
                          <AddIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Subcells">
                        <IconButton size="small" onClick={() => handleOpenSubcellsPopup(lead)}>
                          <AccessTimeIcon />
                        </IconButton>
                      </Tooltip>
                    </BodyTableCell>
                    <BodyTableCell>
                      <TextField
                        type="date"
                        value={lead.rtNextFollowupDate || ""}
                        onChange={(e) => handleInputChange(e, index, "rtNextFollowupDate")}
                        InputProps={{ sx: { fontSize: "0.85rem" } }}
                        variant="standard"
                      />
                    </BodyTableCell>
                    <BodyTableCell
                      sx={{
                        color:
                          lead.rtFollowupReminder === "Today"
                            ? "green"
                            : lead.rtFollowupReminder === "Tomorrow"
                            ? "blue"
                            : lead.rtFollowupReminder === "Follow-up Missed"
                            ? "red"
                            : "inherit",
                      }}
                    >
                      {lead.rtFollowupReminder}
                    </BodyTableCell>
                    <BodyTableCell>
                      <Select
                        value={lead.rtFollowupStatus || ""}
                        onChange={(e) => handleInputChange(e, index, "rtFollowupStatus")}
                        fullWidth
                        variant="standard"
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
                    </BodyTableCell>
                    <BodyTableCell>
                      <TextField
                        type="date"
                        value={lead.lastOrderDate || ""}
                        onChange={(e) => handleInputChange(e, index, "lastOrderDate")}
                        InputProps={{ sx: { fontSize: "0.85rem" } }}
                        variant="standard"
                      />
                    </BodyTableCell>
                    <BodyTableCell>
                      <Select
                        value={lead.repeatDosageOrdered || ""}
                        onChange={(e) => handleInputChange(e, index, "repeatDosageOrdered")}
                        fullWidth
                        variant="standard"
                      >
                        {["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"].map((dosage) => (
                          <MenuItem key={dosage} value={dosage}>
                            {dosage}
                          </MenuItem>
                        ))}
                      </Select>
                    </BodyTableCell>
                    <BodyTableCell>
                      <Select
                        value={lead.retentionStatus || ""}
                        onChange={(e) => handleInputChange(e, index, "retentionStatus")}
                        fullWidth
                        variant="standard"
                      >
                        {["Active", "Lost"].map((status) => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        ))}
                      </Select>
                    </BodyTableCell>
                    <BodyTableCell>{lead.dosageExpiring}</BodyTableCell>
                    <BodyTableCell sx={{ whiteSpace: "nowrap" }}>
                      {lead.productPitched?.join(", ")}
                    </BodyTableCell>
                    <BodyTableCell sx={{ whiteSpace: "nowrap" }}>
                      {lead.productsOrdered?.join(", ")}
                    </BodyTableCell>
                    <BodyTableCell>{lead.dosageOrdered}</BodyTableCell>
                    <BodyTableCell>{lead.modeOfPayment}</BodyTableCell>
                    <BodyTableCell>{lead.deliveryStatus}</BodyTableCell>
                    <BodyTableCell>{lead.healthExpertAssigned}</BodyTableCell>
                    <BodyTableCell>{lead.agentAssigned}</BodyTableCell>
                  </StyledTableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={leads.length}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          "& .MuiTablePagination-select": { fontSize: "0.9rem" },
          "& .MuiTablePagination-displayedRows": { fontSize: "0.9rem" },
        }}
      />
      <Dialog
        open={subcellsPopup.open}
        onClose={() => setSubcellsPopup({ open: false, subcells: [] })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, textAlign: "center" }}>
          Subcells Details
        </DialogTitle>
        <DialogContent>
          <Table>
            <TableHead>
              <TableRow>
                <HeaderTableCell>Date</HeaderTableCell>
                <HeaderTableCell>Followup Remark</HeaderTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subcellsPopup.subcells.map((subcell, idx) => (
                <StyledTableRow key={idx}>
                  <BodyTableCell>{subcell.date}</BodyTableCell>
                  <BodyTableCell>{subcell.value}</BodyTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubcellsPopup({ open: false, subcells: [] })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RetentionLeads;
