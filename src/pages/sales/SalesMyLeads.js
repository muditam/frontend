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
} from "@mui/material";
import axios from "axios";

const SalesMyLeads = () => {
  const [leads, setLeads] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(0); 
  const [rowsPerPage, setRowsPerPage] = useState(50);
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
    if (user) {
      setAgentName(user.fullName);
      fetchLeads(user.fullName); 
    }
  }, []);

  const fetchLeads = async (agentAssigned) => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads", {
        params: { agentAssignedName: agentAssigned, page: currentPage + 1, limit: rowsPerPage },
      });
   
      const fetchedLeads = response.data.leads || []; 
      setLeads(fetchedLeads);  
    } catch (error) {
      console.error("Failed to fetch leads", error);
      setError("Failed to fetch leads");
    }  
  };
  
  const handleInputChange = async (e, index, field) => {
    const globalIndex = currentPage * rowsPerPage + index;  
    const value = e.target.value;  
    const updatedLeads = [...leads];
    updatedLeads[globalIndex][field] = value;  
  
    setLeads(updatedLeads);  
   
    if (field === "contactNumber") {
      const enteredNumber = value;
  
      try {
        const response = await axios.get(
          "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/check-duplicate",
          {
            params: { contactNumber: enteredNumber },
          }
        );
  
        if (response.data.exists) {
          // If duplicate found, set validation error
          setValidationErrors((prev) => ({
            ...prev,
            [globalIndex]: "This number is already registered",
          }));
          return; // Exit to prevent unnecessary updates
        } else {
          // Clear validation error if no duplicate
          setValidationErrors((prev) => ({
            ...prev,
            [globalIndex]: null,
          }));
        }
      } catch (error) {
        console.error("Error checking duplicate number:", error);
      }
    }
  
    // Update the lead in the database
    const leadId = updatedLeads[globalIndex]._id;
    try {
      await axios.put(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${leadId}`,
        {
          [field]: value,
        }
      );
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  };
  

  //   const leadId = updatedLeads[index]._id;
  //   try {
  //     await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${leadId}`, {
  //       [field]: e.target.value,
  //     });
  //   } catch (error) {
  //     console.error("Error updating lead:", error);
  //   }
  // };

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
      const response = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads", leadToAdd);
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

  const applyFilters = () => {
    const filteredLeads = leads.filter((lead) => {
      return (
        (!filters.dateFrom || new Date(lead.date) >= new Date(filters.dateFrom)) &&
        (!filters.dateTo || new Date(lead.date) <= new Date(filters.dateTo)) &&
        (!filters.name || lead.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.contactNumber || lead.contactNumber.includes(filters.contactNumber)) &&
        (!filters.leadSource || lead.leadSource === filters.leadSource) &&
        (!filters.enquiryFor || lead.enquiryFor === filters.enquiryFor) &&
        (!filters.customerType || lead.customerType === filters.customerType) &&
        (!filters.productPitched.length || filters.productPitched.every((item) => lead.productPitched.includes(item))) &&
        (!filters.leadStatus || lead.leadStatus === filters.leadStatus) &&
        (!filters.salesStatus || lead.salesStatus === filters.salesStatus) &&
        (!filters.nextFollowup || lead.nextFollowup === filters.nextFollowup) &&
        (!filters.followupReminder || calculateReminder(lead.nextFollowup) === filters.followupReminder)
      );
    });
    setLeads(filteredLeads);
  };

  const resetFilters = () => {
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
    fetchLeads(agentName);
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
        My Leads
      </Typography>
      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={handleAddLead}
      >
        Add Lead
      </Button>

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
          {[
            { key: "leadSource", label: "Lead Source", options: ["Abandoned Cart", "BiteSpeed", "Business on Bot", "Facebook Lead", "Google Lead", "Incoming Call", "Lead Form", "Online Store", "Others", "Rampwin", "Reference", "Whatsapp", "Degpeg"] },
            { key: "enquiryFor", label: "Enquiry For", options: ["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"] },
            { key: "customerType", label: "Customer Type", options: ["Fresh", "Renewal", "Online Order"] },
            { key: "productPitched", label: "Product Pitched", options: ["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"], multiple: true },
            { key: "leadStatus", label: "Lead Status", options: ["Sales Done", "CNP - Call Not Picked", "Not Interested", "Product Issue", "Order from Other Source", "Upsell", "Fake Lead", "Follow Up", "Call Back", "New"] },
            { key: "salesStatus", label: "Sales Status", options: ["Sales Done", "Lost", "On Follow Up"] },
          ].map(({ key, label, options, multiple }) => (
            <FormControl fullWidth sx={{ mb: 2 }} key={key}>
              <InputLabel id={`${key}-label`}>{label}</InputLabel>
              <Select
                multiple={multiple}
                value={filters[key] || (multiple ? [] : "")}
                onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                renderValue={(selected) => (Array.isArray(selected) ? selected.join(", ") : selected)}
              >
                {options.map((option) => (
                  <MenuItem key={option} value={option}>
                    {multiple && <Checkbox checked={filters[key]?.includes(option)} />}
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
          <FormControl fullWidth sx={{ mb: 2 }}>
            <Select
              value={filters.followupReminder}
              onChange={(e) => setFilters((prev) => ({ ...prev, followupReminder: e.target.value }))}
              displayEmpty
            >
              <MenuItem value="">None</MenuItem>
              {["Today", "Tomorrow", "Followup Missed", "Later"].map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Name *</TableCell>
              <TableCell>Contact No *</TableCell>
              <TableCell>Lead Source *</TableCell>
              <TableCell>Enquiry For *</TableCell>
              <TableCell>Customer Type *</TableCell>
              <TableCell>Agent Assigned</TableCell>
              <TableCell>Product Pitched *</TableCell>
              <TableCell>Lead Status *</TableCell>
              <TableCell>Sales Status *</TableCell>
              <TableCell>Next Followup *</TableCell>
              <TableCell>Followup Reminder</TableCell>
              <TableCell>Agents Remarks *</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentLeads.map((lead, index) => (
              <TableRow key={lead._id}>
                <TableCell>
                  <TextField
                    type="date"
                    value={lead.date || ""}
                    disabled // Date is not editable
                    fullWidth
                  />
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "150px" }}>
                  <TextField
                    value={lead.time || ""}
                    disabled
                    fullWidth
                  />
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "240px" }}>
                  <TextField
                    value={lead.name || ""}
                    onChange={(e) => handleInputChange(e, index, "name")}
                    fullWidth
                  />
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "200px" }}>
                  <TextField
                    type="number"
                    value={lead.contactNumber || ""}
                    onChange={(e) => handleInputChange(e, index, "contactNumber")}
                    error={Boolean(validationErrors[index])}
                    helperText={validationErrors[index]}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={lead.leadSource || ""}
                    onChange={(e) => handleInputChange(e, index, "leadSource")}
                    fullWidth
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
                    ].map((source) => (
                      <MenuItem key={source} value={source}>
                        {source}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={lead.enquiryFor || ""}
                    onChange={(e) => handleInputChange(e, index, "enquiryFor")}
                    fullWidth
                  >
                    {["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"].map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={lead.customerType || ""}
                    onChange={(e) => handleInputChange(e, index, "customerType")}
                    fullWidth
                  >
                    {["Fresh", "Renewal", "Online Order"].map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "140px" }}>
                  <TextField
                    value={lead.agentAssigned || ""}
                    disabled
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <FormControl fullWidth>
                    <Select
                      multiple
                      value={lead.productPitched || []}
                      onChange={(e) =>
                        handleInputChange(e, index, "productPitched")
                      }
                      renderValue={(selected) => selected.join(", ")}
                    >
                      {["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"].map(
                        (option) => (
                          <MenuItem key={option} value={option}>
                            <Checkbox checked={lead.productPitched?.includes(option)} />
                            <ListItemText primary={option} />
                          </MenuItem>
                        )
                      )}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Select
                    value={lead.leadStatus || ""}
                    onChange={(e) => handleInputChange(e, index, "leadStatus")}
                    fullWidth
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
                    ].map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={lead.salesStatus || ""}
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
                <TableCell>
                  {lead.salesStatus === "On Follow Up" ? (
                    <TextField
                      type="date"
                      value={lead.nextFollowup || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "nextFollowup")
                      }
                      fullWidth
                    />
                  ) : (
                    <TextField
                      value={lead.salesStatus}
                      disabled
                      fullWidth
                    />
                  )}
                </TableCell>
                <TableCell
                  sx={{
                    color:
                      calculateReminder(lead.nextFollowup) === "Today"
                        ? "green"
                        : calculateReminder(lead.nextFollowup) === "Tomorrow"
                          ? "yellow"
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
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "240px" }}>
                  <TextField
                    value={lead.agentsRemarks || ""}
                    onChange={(e) =>
                      handleInputChange(e, index, "agentsRemarks")
                    }
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
                count={leads.length}
                rowsPerPage={rowsPerPage}
                page={currentPage}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage} 
            />
    </Box>
  );
};

export default SalesMyLeads;
