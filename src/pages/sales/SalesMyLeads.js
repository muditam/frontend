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
  Typography,
  FormControl,
  ListItemText,
  Checkbox,
  Button,
  Drawer,
  Divider,
  InputLabel,
  TablePagination,
  IconButton,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import PhoneIcon from "@mui/icons-material/Phone";
import TuneIcon from "@mui/icons-material/Tune";
import { requestZoomDial } from "../../calling/dialer";
 
const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const SalesMyLeads = () => {
  const [leads, setLeads] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [callingMessage, setCallingMessage] = useState("");
  const [newLead, setNewLead] = useState({
    date: "",
    time: "",
    name: "",
    contactNumber: "",
    leadSource: "",
    enquiryFor: "",
    customerType: "",
    agentAssigned: "",
    productPitched: [],
    leadStatus: "",
    salesStatus: "",
    nextFollowup: "",
    calculateReminder: "",
    agentsRemarks: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agentName, setAgentName] = useState("");
  const [totalLeads, setTotalLeads] = useState(0);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    name: "",
    contactNumber: "",
    leadSource: "",
    enquiryFor: "",
    customerType: "",
    productPitched: [],
    leadStatus: "",
    salesStatus: "",
    nextFollowup: "",
    followupReminder: "",
  });
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("user"));

    if (user && !agentName) {
      setAgentName(user.fullName);
    }

    if (agentName) {
      fetchLeads(agentName);
    }
  }, [agentName, currentPage, rowsPerPage]);


  const fetchLeads = async (agentAssigned) => {
    setLoading(true);
    try {
      const response = await api.get("/api/leads", {
  params: {
    agentAssignedName: agentAssigned,
    page: currentPage + 1,
    limit: rowsPerPage,
    filters: JSON.stringify(filters),
  },
});
      const { leads, totalLeads } = response.data;
      setLeads(leads || []); // Update leads state with fetched data
      setTotalLeads(totalLeads || 0); // Update the total leads count
    } catch (error) {
      console.error("Failed to fetch leads", error);
      setError("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    tableCell: {
      backgroundColor: "white",
      padding: "1px 25px",
      paddingBottom: "1px",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      overflow: "hidden",
      maxWidth: "150px",
      fontSize: "0.65rem",
      textAlign: "center",
      borderBottom: "1px solid gray",
      height: "45px",
    },
    tableHead: {
      backgroundColor: "black",
      color: "white",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      textAlign: "center",
      lineHeight: "10px",
      minHeight: "45px",
    },
    tableRow: {
      backgroundColor: "#1a1a1a",
      height: "10px",
      "&:hover": {
        backgroundColor: "#2a2a2a",
      },
    },
  };

  const handleInputChange = async (e, index, field) => {
    const updatedLeads = [...leads];

    updatedLeads[index][field] = e.target.value;
    setLeads(updatedLeads);

    if (field === "contactNumber") {
      const enteredNumber = e.target.value;
      try {
        const response = await api.get("/api/leads/check-duplicate", {
  params: { contactNumber: enteredNumber },
});

        if (response.data.exists) {
          setValidationErrors((prev) => ({
            ...prev,
            [index]: "This number is already registered",
          }));
          return;
        } else {
          setValidationErrors((prev) => ({
            ...prev,
            [index]: null,
          }));
        }
      } catch (error) {
        console.error("Error checking duplicate number:", error);
      }
    }

    const leadId = updatedLeads[index]._id;
    try {
      await api.put(`/api/leads/${leadId}`, {
  [field]: e.target.value,
});
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  };

  const handleAddLead = async () => {
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split("T")[0];
    const formattedTime = currentDate.toLocaleTimeString();

    const leadToAdd = {
      ...newLead,
      date: formattedDate,
      time: formattedTime,
      agentAssigned: agentName,
    };

    if (Object.values(validationErrors).some((error) => error)) {
      console.error("Fix validation errors before adding the lead.");
      return;
    }

    try {
      const response = await api.post("/api/leads", leadToAdd);
      if (response.status === 201) {
        setLeads((prevLeads) => [response.data.lead, ...prevLeads]);
        setNewLead({
          date: "",
          time: "",
          name: "",
          contactNumber: "",
          leadSource: "",
          enquiryFor: "",
          customerType: "",
          agentAssigned: "",
          productPitched: [],
          leadStatus: "",
          salesStatus: "",
          nextFollowup: "",
          calculateReminder: "",
          agentsRemarks: "",
        });
      }
    } catch (error) {
      console.error("Error adding lead:", error);
    }
  };

  const calculateReminder = (nextFollowup) => {
    if (!nextFollowup) return "";
    const followupDate = new Date(nextFollowup);
    const today = new Date();
    const diffInDays = Math.ceil((followupDate - today) / (1000 * 60 * 60 * 24));
    if (diffInDays < 0) return "Follow-up Missed";
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Tomorrow";
    return diffInDays > 1 ? "Later" : "";
  };

  const applyFilters = async () => {
    setLoading(true);
    setCurrentPage(0);
    try {
      const response = await api.get("/api/leads", {
        params: {
          agentAssignedName: agentName,
          page: 1,
          limit: rowsPerPage,
          filters: JSON.stringify(filters),
        },
      });
      const { leads, totalLeads } = response.data;
      setLeads(leads || []);
      setTotalLeads(totalLeads || 0);
    } catch (error) {
      console.error("Error applying filters:", error);
      setError("Failed to apply filters");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = async () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      name: "",
      contactNumber: "",
      leadSource: "",
      enquiryFor: "",
      customerType: "",
      productPitched: [],
      leadStatus: "",
      salesStatus: "",
      nextFollowup: "",
      followupReminder: "",
    });
    setCurrentPage(0);
    await fetchLeads(agentName);
  };
  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };


  const fetchUserDetails = async (user) => {
    try {
      const response = await api.get("/api/employees", {
        params: { fullName: user.fullName, email: user.email }
      });
      if (response.data.length > 0) {
        return response.data[0]; // Returns { async, agentNumber, callerId }
      } else {
        console.error("User details not found");
        return {};
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      return {};
    }
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(0);
  };

  const handleCallIconClick = async (contactNumber) => {
    setLoading(true);
    const ok = requestZoomDial(contactNumber, { source: "sales_my_leads" });
    setCallingMessage(ok ? `Opening Calling Center for ${contactNumber}...` : "Invalid contact number");
    setLoading(false);
  };

  const textFieldSx = {
    mb: 2,
    "& .MuiInputLabel-root": {
      top: "50%",
      transform: "translateY(-50%)",
      transition: "all 0.2s ease-in-out",
      fontSize: "0.85rem",
      paddingLeft: "8px",
    },
    "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled":
    {
      top: 0,
      color: "gray",
      transform: "translateY(-50%) translateX(8px)",
      paddingLeft: "8px",
      fontSize: "0.65rem",
    },
    "& .MuiOutlinedInput-root": {
      "& input": {
        padding: "4px !important",
      },
      "&.Mui-focused fieldset": { borderColor: "black" },
      "&:hover fieldset": { borderColor: "black" },
    },
  };

  const formControlSx = {
    mb: 2,
    "& .MuiInputLabel-root": {
      fontSize: "0.85rem",
      paddingLeft: "8px",
      top: "50%",
      transition: "all 0.2s ease-in-out",
      transform: "translateY(-50%)",
    },
    "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled": {
      top: 0,
      transform: "translateY(-50%) translateX(8px)",
      fontSize: "0.75rem",
      color: "gray",
    },
    "& .MuiOutlinedInput-root": {
      "& input": { padding: "4px !important" },
      "& .MuiSelect-select": { padding: "4px" },
      "&.Mui-focused fieldset": { borderColor: "black" },
      "&:hover fieldset": { borderColor: "black" },
    },
  };


  return (
    <Box sx={{ padding: 2 }}>
      <Typography gutterBottom
        variant="h4"
        sx={{
          fontWeight: "bold",
          textAlign: "center",
          letterSpacing: "1px",
          color: "black",
          marginBottom: 2,
        }}>
        My Leads
      </Typography>
      <Button
        variant="contained"
        sx={{ mb: 2, backgroundColor: "black" }}
        onClick={handleAddLead}
      >
        Add Lead
      </Button>

      <Button variant="contained"
        sx={{ mb: 2, ml: 2, backgroundColor: "black" }}
        startIcon={<TuneIcon />} onClick={() => setFilterOpen(true)}>
        Filter
      </Button>

      <Drawer
        anchor="right"
        sx={{
          transition: "all 0.5s ease-in-out",
          "& .MuiDrawer-paper": {
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
            borderRadius: "10px 0 0 10px",
          },
        }}
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
      >
        <Box sx={{ width: 250, padding: 2 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              mb: 1,
              position: "sticky",
              top: 0,
              fontWeight: "bold",
              textAlign: "center",
              color: "#333",
              background: "white",
              zIndex: 10,
            }}
          >
            Filters
          </Typography>
          <Box
            sx={{
              height: "2px",
              backgroundColor: "#FFC107",
              width: "100%",
              borderRadius: "2px",
              mb: 2,
            }}
          />
          <TextField
            label="Date From"
            type="date"
            fullWidth
            value={filters.dateFrom}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            sx={{
              marginBottom: 2,
              "& .MuiInputBase-input": {
                padding: "10px 12px",
              },
              "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled":
              {
                top: 0,
                color: "gray",
                transform: "translateY(-50%) translateX(8px)",
                paddingLeft: "8px",
                fontSize: "0.65rem",
              },
              "& .MuiOutlinedInput-root": {
                "& input": {
                  padding: "8px !important",
                },
                "&.Mui-focused fieldset": { borderColor: "black" },
                "&:hover fieldset": { borderColor: "black" },
              },
            }}
            InputLabelProps={{
              shrink: true,
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
                padding: "10px 12px",
              },
              "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled":
              {
                top: 0,
                color: "gray",
                transform: "translateY(-50%) translateX(8px)",
                paddingLeft: "8px",
                fontSize: "0.65rem",
              },
              "& .MuiOutlinedInput-root": {
                "& input": {
                  padding: "8px !important",
                },
                "&.Mui-focused fieldset": { borderColor: "black" },
                "&:hover fieldset": { borderColor: "black" },
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
            sx={textFieldSx}
          />
          <TextField
            label="Contact No"
            fullWidth
            value={filters.contactNumber}
            onChange={(e) => setFilters((prev) => ({ ...prev, contactNumber: e.target.value }))}
            sx={textFieldSx}
          />

          {[
            { key: "leadSource", label: "Lead Source", options: ["Abandoned Cart", "BiteSpeed", "Business on Bot", "Facebook Lead", "Google Lead", "Incoming Call", "Lead Form", "Online Store", "Others", "Rampwin", "Reference", "Whatsapp", "Degpeg"] },
            { key: "enquiryFor", label: "Enquiry For", options: ["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"] },
            { key: "customerType", label: "Customer Type", options: ["Fresh", "Renewal", "Online Order"] },
            { key: "productPitched", label: "Product Pitched", options: ["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"], multiple: true },
            { key: "leadStatus", label: "Lead Status", options: ["Sales Done", "CNP - Call Not Picked", "Not Interested", "Product Issue", "Order from Other Source", "Upsell", "Fake Lead", "Follow Up", "Call Back", "New", "General Query", "Invalid Number"] },
            { key: "salesStatus", label: "Sales Status", options: ["Sales Done", "Lost", "On Follow Up"] },
          ].map(({ key, label, options, multiple }) => (
            <FormControl fullWidth key={key} variant="outlined" sx={formControlSx}>
              <InputLabel
                id={`${key}-label`}
              >
                {label}
              </InputLabel>
              <Select
                labelId={`${key}-label`}
                multiple={multiple}
                value={filters[key] || (multiple ? [] : "")}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }))
                }
                label={label}
                renderValue={(selected) =>
                  Array.isArray(selected) ? selected.join(", ") : selected
                }
              >
                {options.map((option) => (
                  <MenuItem key={option} value={option}>
                    {multiple && (
                      <Checkbox
                        checked={filters[key]?.includes(option)}
                        sx={{ mr: 1, p: 0.5 }}
                      />
                    )}
                    <ListItemText primary={option} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
          <TextField
            label="Next Followup"
            type="date"
            fullWidth
            value={filters.nextFollowup}
            onChange={(e) => setFilters((prev) => ({ ...prev, nextFollowup: e.target.value }))}
            sx={{
              marginBottom: 2,
              "& .MuiInputBase-input": {
                padding: "10px 12px",
              },
              "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled":
              {
                top: 0,
                color: "gray",
                transform: "translateY(-50%) translateX(8px)",
                paddingLeft: "8px",
                fontSize: "0.65rem",
              },
              "& .MuiOutlinedInput-root": {
                "& input": {
                  padding: "8px !important",
                },
                "&.Mui-focused fieldset": { borderColor: "black" },
                "&:hover fieldset": { borderColor: "black" },
              },
            }}
            InputLabelProps={{
              shrink: true,
            }}
          />
          <FormControl fullWidth variant="outlined"
            sx={formControlSx}
          >
            <InputLabel>Reminder</InputLabel>
            <Select
              label="Reminder"
              value={filters.reminder || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, reminder: e.target.value }))}
            >
              {["Follow-up Missed", "Today", "Tomorrow", "Later"].map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            fullWidth
            onClick={() => applyFilters()}
            sx={{
              marginBottom: 1,
              backgroundColor: "black",
              transition: "background-color 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: "#333",
              },
            }}
          >
            Apply Filters
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => resetFilters()}
            sx={{
              marginBottom: 1,
              color: "black",
              borderColor: "black",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderColor: "#333",
                color: "#333",
              },
            }}
          >
            Reset Filters
          </Button>
        </Box>
      </Drawer>

      <TableContainer component={Paper} sx={{ maxHeight: 1200 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {[
                "Date",
                "Time",
                "Name",
                "Contact No",
                "Lead Source",
                "Enquiry For",
                "Customer Type",
                "Agent Assigned",
                "Product Pitched",
                "Lead Status",
                "Sales Status",
                "Next Followup",
                "Followup Reminder",
                "Agents Remarks",
              ].map((heading) => (
                <TableCell key={heading} sx={styles.tableHead}>
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={14} align="center">
                  <Box sx={{ py: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Please Wait...
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead, index) => (
                <TableRow key={lead._id} sx={styles.tableRow}>
                  <TableCell sx={styles.tableCell}>
                    <TextField
                      type="date"
                      value={lead.date || ""}
                      disabled
                      fullWidth
                      sx={{
                        height: "45px",
                        "& .MuiInputBase-input": { color: "#000", },
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ccc" },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ ...styles.tableCell, whiteSpace: "nowrap", minWidth: 150 }}>
                    <TextField
                      value={lead.time || ""}
                      disabled
                      fullWidth
                      sx={{
                        height: "45px",
                        "& .MuiInputBase-input": { color: "#000", },
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ccc" },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ ...styles.tableCell, whiteSpace: "nowrap", minWidth: 240 }}>
                    <TextField
                      value={lead.name || ""}
                      onChange={(e) => handleInputChange(e, index, "name")}
                      fullWidth
                      sx={{
                        height: "45px",
                        "& .MuiInputBase-input": { color: "#000", },
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ccc" },
                      }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      // ...styles.tableCell,
                      whiteSpace: "nowrap",
                      minWidth: 240,
                      background: "white",
                      borderBottom: "1px solid gray",
                      display: "flex",
                      alignItems: "center",
                      height: "48px"
                    }}
                  >
                    <TextField
                      type="number"
                      value={lead.contactNumber || ""}
                      onChange={(e) => handleInputChange(e, index, "contactNumber")}
                      error={Boolean(validationErrors[index])}
                      helperText={validationErrors[index]}
                      fullWidth
                      sx={{
                        flexGrow: 1,
                        height: "45px",
                        "& .MuiInputBase-input": { color: "#000", },
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ccc" },
                      }}
                    />
                    <IconButton
                      color="primary"
                      onClick={() => handleCallIconClick(lead.contactNumber)}
                      sx={{ ml: 1 }}
                    >
                      <PhoneIcon />
                    </IconButton>
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    <FormControl fullWidth variant="standard">
                      <Select
                        value={lead.leadSource || ""}
                        onChange={(e) => handleInputChange(e, index, "leadSource")}
                      >
                        {[
                          "Abandoned Cart",
                          "BiteSpeed",
                          "Business on Bot",
                          "Facebook Lead",
                          "Google Lead",
                          "Incoming Call",
                          "Lead Form",
                          "Online Store",
                          "Others",
                          "Rampwin",
                          "Reference",
                          "Whatsapp",
                          "Degpeg",
                        ].map((src) => (
                          <MenuItem key={src} value={src}>
                            {src}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>

                  {/* Repeat same pattern for the remaining cells: */}
                  <TableCell sx={styles.tableCell}>
                    <FormControl fullWidth variant="standard">
                      <Select
                        value={lead.enquiryFor || ""}
                        onChange={(e) => handleInputChange(e, index, "enquiryFor")}
                      >
                        {[
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
                        ].map((item) => (
                          <MenuItem key={item} value={item}>
                            {item}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    <FormControl fullWidth variant="standard">
                      <Select
                        value={lead.customerType || ""}
                        onChange={(e) =>
                          handleInputChange(e, index, "customerType")
                        }
                      >
                        {["Fresh", "Renewal", "Online Order"].map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ ...styles.tableCell, whiteSpace: "nowrap", minWidth: 140 }}>
                    <TextField
                      value={lead.agentAssigned || ""}
                      disabled
                      fullWidth
                      sx={{
                        height: "45px",
                        "& .MuiInputBase-input": { color: "#000", },
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ccc" },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    <FormControl fullWidth variant="standard">
                      <Select
                        multiple
                        value={lead.productPitched || []}
                        onChange={(e) =>
                          handleInputChange(e, index, "productPitched")
                        }
                        renderValue={(selected) =>
                          selected.join(", ")
                        }
                      >
                        {[
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
                        ].map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            <Checkbox
                              checked={lead.productPitched?.includes(opt)}
                            />
                            <ListItemText primary={opt} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    <FormControl fullWidth variant="standard">
                      <Select
                        value={lead.leadStatus || ""}
                        onChange={(e) =>
                          handleInputChange(e, index, "leadStatus")
                        }
                      >
                        {[
                          "Sales Done",
                          "CNP - Call Not Picked",
                          "Not Interested",
                          "Product Issue",
                          "Order from Other Source",
                          "Upsell",
                          "Fake Lead",
                          "Follow Up",
                          "Call Back",
                          "New",
                          "General Query",
                          "Invalid Number",
                        ].map((st) => (
                          <MenuItem key={st} value={st}>
                            {st}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    <FormControl fullWidth variant="standard">
                      <Select
                        value={lead.salesStatus || ""}
                        onChange={(e) =>
                          handleInputChange(e, index, "salesStatus")
                        }
                      >
                        {["Sales Done", "On Follow Up", "Lost"].map((st) => (
                          <MenuItem key={st} value={st}>
                            {st}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    {lead.salesStatus === "On Follow Up" ? (
                      <TextField
                        type="date"
                        value={lead.nextFollowup || ""}
                        onChange={(e) =>
                          handleInputChange(e, index, "nextFollowup")
                        }
                        fullWidth
                        sx={{
                          "& .MuiInputBase-input": { color: "#000", },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#ccc",
                          },
                        }}
                      />
                    ) : (
                      <TextField
                        value={lead.salesStatus}
                        disabled
                        fullWidth
                        sx={{
                          "& .MuiInputBase-input": { color: "#000", },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#ccc",
                          },
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...styles.tableCell,
                      fontSize: "0.85rem",
                      color:
                        calculateReminder(lead.nextFollowup) === "Today"
                          ? "green"
                          : calculateReminder(lead.nextFollowup) === "Tomorrow"
                            ? "blue"
                            : calculateReminder(lead.nextFollowup) ===
                              "Follow-up Missed"
                              ? "red"
                              : "inherit",
                    }}
                  >
                    {lead.salesStatus === "On Follow Up"
                      ? calculateReminder(lead.nextFollowup)
                      : lead.salesStatus}
                  </TableCell>

                  <TableCell sx={styles.tableCell} style={{ whiteSpace: "nowrap", minWidth: "250px" }}>
                    <TextField
                      value={lead.agentsRemarks || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "agentsRemarks")
                      }
                      fullWidth
                      sx={{
                        "& .MuiInputBase-input": { color: "#000", },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#ccc",
                        },
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={totalLeads}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};


export default SalesMyLeads;
