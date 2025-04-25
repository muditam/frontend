import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  TextField,
  IconButton,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Chip,
  Grid,
  Autocomplete,
} from "@mui/material";
import { Search as SearchIcon, FilterList, Sort } from "@mui/icons-material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import axios from "axios";

/**
 * Returns a label based on the createdAt date:
 * - "Today" if created today
 * - "Yesterday" if created yesterday
 * - For 2-7 days ago, returns the weekday name (e.g., "Monday")
 * - If older than 7 days, returns full date as dd/MM/yyyy
 */
const getCreatedAtLabel = (createdAt) => {
  if (!createdAt) return "";
  const now = new Date();
  const created = new Date(createdAt);
  now.setHours(0, 0, 0, 0);
  created.setHours(0, 0, 0, 0);
  const diffTime = now.getTime() - created.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays >= 2 && diffDays <= 7) {
    return created.toLocaleDateString("en-US", { weekday: "long" });
  }
  const day = created.getDate().toString().padStart(2, "0");
  const month = (created.getMonth() + 1).toString().padStart(2, "0");
  const year = created.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Computes the follow-up tag based on the lead's followUpDate:
 * - "Missed" if date is in the past
 * - "Today" if the date is today
 * - "Tomorrow" if the date is tomorrow
 * - "Later" if the date is further in the future
 */
const getFollowUpTag = (followUpDate) => {
  if (!followUpDate) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(followUpDate);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date - today) / (1000 * 3600 * 24));
  if (diffDays < 0) return "Missed";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return "Later";
};

/**
 * Extracts initials from a full name.
 * Uses the first letter of the first word and the first letter of the last word.
 */
const getInitials = (name) => {
  if (!name) return "NA";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase();
};

const leadSourceOptions = [
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
];

const LeadList = ({ employees, setLocation, onSelectCustomer, selectedCustomerId }) => {
  const [leadData, setLeadData] = useState({
    name: "",
    phone: "",
    age: "",
    location: "",
    lookingFor: "",
    assignedTo: "",
    followUpDate: new Date().toISOString().split("T")[0],
    leadSource: "",
  });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locations, setLocations] = useState([]);
  // Filter status: "", "Open", "Won", or "Lost"
  const [filterStatus, setFilterStatus] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20; // Number of leads per page

  // Memoize loggedInUser to prevent re-renders from recreating the object
  const loggedInUser = useMemo(() => {
    return JSON.parse(sessionStorage.getItem("user"));
  }, []);

  // Fetch locations from public API
  useEffect(() => {
    async function fetchLocations() {
      try {
        const citiesRes = await axios.post("https://countriesnow.space/api/v0.1/countries/cities", { country: "India" });
        const statesRes = await axios.post("https://countriesnow.space/api/v0.1/countries/states", { country: "India" });
        const cities = citiesRes.data.data;
        const states = statesRes.data.data.states.map((s) => s.name);
        const combined = Array.from(new Set([...cities, ...states]));
        setLocations(combined);
      } catch (e) {
        console.error("Error fetching locations", e);
      }
    }
    fetchLocations();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLeadData({ ...leadData, [name]: value });
  };

  // When adding a new lead, check for duplicate phone then post the data.
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!leadData.name || !leadData.phone || !leadData.age || !leadData.leadSource) {
        setError("All fields are required.");
        return;
      }
      // Duplicate check: if phone number already exists, show error
      const duplicateCheck = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/check-duplicate", {
        params: { contactNumber: leadData.phone },
      });
      if (duplicateCheck.data.exists) {
        setError("Phone number already exists.");
        return;
      }
      await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/customers", leadData);
      setError("");
      setOpen(false);
      // Reload the first page after a new lead is added (with search filter if any)
      fetchCustomers(1, true, searchQuery);
    } catch (err) {
      setError("Error saving customer data.");
    }
  };

  // Fetch customers based on role, page, and search value
  const fetchCustomers = async (page = 1, reset = false, searchValue = "") => {
    try {
      let response;
      const filters = searchValue ? JSON.stringify({ name: searchValue }) : "{}";
      if (loggedInUser && loggedInUser.role === "Sales Agent") {
        response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/customers", {
          params: { page, limit, filters, assignedTo: loggedInUser.fullName },
        });
      } else if (loggedInUser && loggedInUser.role === "Retention Agent") {
        const consultationRes = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-details");
        const filteredConsultations = consultationRes.data.filter(
          (consultation) =>
            consultation.presales &&
            consultation.presales.assignExpert &&
            consultation.presales.assignExpert.toString() === loggedInUser.id
        );
        const customerIds = filteredConsultations.map((c) => c.customerId.toString());
        response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/customers", { params: { page, limit: 1000, filters } });
        const filteredCustomers = response.data.customers.filter(
          (customer) => customer._id && customerIds.includes(customer._id)
        );
        // For simplicity, treat all filtered customers as one page of data
        response.data.customers = filteredCustomers;
      } else {
        response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/customers", { params: { page, limit, filters } });
      }
      
      // If reset flag is true, replace customers; otherwise append new customers
      if (page === 1 || reset) {
        setCustomers(response.data.customers);
      } else {
        setCustomers((prev) => [...prev, ...response.data.customers]);
      }
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage);
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  };

  // Load first page on component mount or when loggedInUser changes
  useEffect(() => {
    fetchCustomers(1, true, searchQuery);
    // loggedInUser is memoized, so this runs only once on mount
  }, [loggedInUser]);

  // When searchQuery changes, reset pagination and fetch matching customers
  useEffect(() => {
    fetchCustomers(1, true, searchQuery);
  }, [searchQuery]);

  // First apply client-side filtering (for additional criteria like filterStatus)
  const baseFilteredCustomers = customers.filter((customer) => {
    // Client-side search can be used as additional filter if needed.
    // Since search is now done server side, this could be used for phone filtering or extra criteria.
    return (
      (customer.name && customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (customer.phone && customer.phone.includes(searchQuery))
    );
  });

  // Define filter arrays based on the lead status dropdown value in presales
  const openStatuses = [
    "New Lead",
    "CONS Scheduled",
    "CONS Done",
    "Call Back Later",
    "On Follow Up",
    "CNP",
    "Switch Off",
  ];
  const lostStatuses = [
    "General Query",
    "Fake Lead",
    "Invalid Number",
    "Not Interested",
    "Ordered from Other Sources",
    "Budget issue",
  ];

  // Apply additional filtering based on the selected filterStatus
  let filteredCustomersFinal = baseFilteredCustomers;
  if (filterStatus) {
    if (filterStatus === "Open") {
      filteredCustomersFinal = filteredCustomersFinal.filter(
        (customer) =>
          customer.presales &&
          openStatuses.includes(customer.presales.leadStatus)
      );
    } else if (filterStatus === "Lost") {
      filteredCustomersFinal = filteredCustomersFinal.filter(
        (customer) =>
          customer.presales &&
          lostStatuses.includes(customer.presales.leadStatus)
      );
    } else if (filterStatus === "Won") {
      filteredCustomersFinal = filteredCustomersFinal.filter(
        (customer) =>
          customer.presales && customer.presales.leadStatus === "Sales Done"
      );
    }
  }

  // Default sort by createdAt (new customers on top)
  filteredCustomersFinal.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Function to load more leads (next page)
  const loadMore = () => {
    if (currentPage < totalPages) {
      fetchCustomers(currentPage + 1, false, searchQuery);
    }
  };

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Top Bar with Add Lead & Filter Buttons */}
      <Box
        sx={{
          backgroundColor: "black",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          p: 0.5,
        }}
      >
        <Button
          startIcon={<PersonAddIcon />}
          variant="contained"
          size="small"
          sx={{
            minWidth: 40,
            padding: "4px",
            textTransform: "none",
            fontSize: "0.6rem",
            backgroundColor: "black",
          }}
          onClick={() => setOpen(true)}
        />
        <Button
          startIcon={<FolderOpenIcon />}
          variant={filterStatus === "Open" ? "contained" : "outlined"}
          size="small"
          sx={{
            textTransform: "none",
            fontSize: "0.6rem",
            borderColor: "white",
            color: "white",
            padding: "4px 8px",
          }}
          onClick={() => setFilterStatus(filterStatus === "Open" ? "" : "Open")}
        >
          Open
        </Button>
        <Button
          startIcon={<CheckCircleIcon />}
          variant={filterStatus === "Won" ? "contained" : "outlined"}
          size="small"
          sx={{
            textTransform: "none",
            fontSize: "0.6rem",
            borderColor: "white",
            color: "white",
            padding: "4px 8px",
          }}
          onClick={() => setFilterStatus(filterStatus === "Won" ? "" : "Won")}
        >
          Won
        </Button>
        <Button
          startIcon={<CancelIcon />}
          variant={filterStatus === "Lost" ? "contained" : "outlined"}
          size="small"
          sx={{
            textTransform: "none",
            fontSize: "0.6rem",
            borderColor: "white",
            color: "white",
            padding: "4px 8px",
          }}
          onClick={() => setFilterStatus(filterStatus === "Lost" ? "" : "Lost")}
        >
          Lost
        </Button>
      </Box>

      {/* Search Bar */}
      <Box sx={{ p: 1, display: "flex", alignItems: "center" }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search leads..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "black", fontSize: "1rem" }} />
              </InputAdornment>
            ),
          }}
          sx={{ fontSize: "0.8rem" }}
        />
        <Box sx={{ display: "flex", ml: 1 }}>
          <IconButton size="small" sx={{ color: "black" }}>
            <FilterList fontSize="small" />
          </IconButton>
          <IconButton size="small" sx={{ color: "black" }}>
            <Sort fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Lead List Section */}
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {filteredCustomersFinal.map((customer) => (
          <Box
            key={customer._id}
            onClick={() => onSelectCustomer(customer._id)}
            sx={{
              display: "flex",
              alignItems: "center",
              px: 1,
              py: 0.5,
              borderBottom: "1px solid #e0e0e0",
              cursor: "pointer",
              backgroundColor: customer._id === selectedCustomerId ? "#e0f7fa" : "inherit",
              ":hover": {
                backgroundColor: customer._id === selectedCustomerId ? "#e0f7fa" : "#f9f9f9",
              },
            }}
          >
            <Avatar
              sx={{
                bgcolor: "black",
                color: "white",
                mr: 1,
                width: 30,
                height: 30,
                fontSize: "0.8rem",
              }}
            >
              {getInitials(customer.name)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" sx={{ fontWeight: "bold", fontSize: "0.8rem" }}>
                  {`${customer.name} - ${customer.age}`}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.7rem", color: "gray" }}>
                  {getCreatedAtLabel(customer.createdAt)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: "0.7rem", color: "gray" }}>
                  {customer.lookingFor ? customer.lookingFor : "No Condition"} • {customer.assignedTo ? customer.assignedTo : "Unassigned"}
                </Typography>
                <Chip
                  label={getFollowUpTag(customer.followUpDate)}
                  size="small"
                  sx={{
                    fontSize: "0.7rem",
                    backgroundColor:
                      getFollowUpTag(customer.followUpDate) === "Missed"
                        ? "#e57373"
                        : getFollowUpTag(customer.followUpDate) === "Today"
                        ? "#81c784"
                        : getFollowUpTag(customer.followUpDate) === "Tomorrow"
                        ? "#64b5f6"
                        : "#ffb74d",
                    color: "white",
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: "gray", fontSize: "0.7rem", mt: 0.5 }}>
                {customer.location ? customer.location : "Unknown"}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Load More Button */}
      {currentPage < totalPages && (
        <Box sx={{ p: 1, textAlign: "center" }}>
          <Button
            onClick={loadMore}
            variant="contained"
            size="small"
            sx={{
              backgroundColor: "white",
              border: "1px solid black",
              color: "black",
              textTransform: "none",
            }}
          >
            Load More
          </Button>
        </Box>
      )}

      {/* Dialog for Adding a New Lead */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", fontSize: "0.9rem" }}>
            Add New Lead
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={4}>
              <TextField
                label="Name"
                name="name"
                value={leadData.name}
                onChange={handleChange}
                fullWidth
                required
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Phone"
                name="phone"
                value={leadData.phone}
                onChange={handleChange}
                fullWidth
                required
                type="tel"
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">+91</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Age"
                name="age"
                value={leadData.age}
                onChange={handleChange}
                fullWidth
                required
                type="number"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required size="small">
                <InputLabel>Looking For</InputLabel>
                <Select name="lookingFor" value={leadData.lookingFor} onChange={handleChange} label="Looking For">
                  <MenuItem value="Diabetes">Diabetes</MenuItem>
                  <MenuItem value="Fatty Liver">Fatty Liver</MenuItem>
                  <MenuItem value="Cholesterol">Cholesterol</MenuItem>
                  <MenuItem value="Others">Others</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <Autocomplete
                options={locations}
                value={leadData.location}
                onChange={(event, newValue) => setLeadData({ ...leadData, location: newValue })}
                renderInput={(params) => (
                  <TextField {...params} label="Location" variant="outlined" size="small" required />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required size="small">
                <InputLabel>Assigned To</InputLabel>
                <Select name="assignedTo" value={leadData.assignedTo} onChange={handleChange} label="Assigned To">
                  <MenuItem value="">Unassigned</MenuItem>
                  {employees.map((employee) => {
                    const displayName =
                      employee.fullName ||
                      employee.agentName ||
                      (employee.firstName && employee.lastName
                        ? `${employee.firstName} ${employee.lastName}`
                        : employee.name) ||
                      "No Name Provided";
                    return (
                      <MenuItem key={employee._id} value={displayName}>
                        {displayName}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required size="small">
                <InputLabel>Lead Source</InputLabel>
                <Select
                  name="leadSource"
                  value={leadData.leadSource}
                  onChange={handleChange}
                  label="Lead Source"
                >
                  {leadSourceOptions.map((source) => (
                    <MenuItem key={source} value={source}>
                      {source}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          {error && (
            <Typography color="error" sx={{ mt: 1, fontSize: "0.7rem" }}>
              {error}
            </Typography>
          )}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
            <Button onClick={() => setLeadData({})} variant="outlined" size="small">
              Reset
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              variant="contained"
              sx={{ background: "black", color: "#fff", fontSize: "0.8rem" }}
              size="small"
            >
              Save
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="secondary" size="small">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeadList;
 