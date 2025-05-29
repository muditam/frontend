import React, { useState, useEffect, useMemo, useRef } from "react";
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
  FormControlLabel,
} from "@mui/material";
import { Search as SearchIcon, FilterList, Sort } from "@mui/icons-material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import Menu from "@mui/material/Menu";
import Checkbox from "@mui/material/Checkbox";
import DownloadIcon from "@mui/icons-material/Download";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { CircularProgress } from "@mui/material";
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

  // in LeadList:
  const [yesterdayChecked, setYesterdayChecked] = useState(false);
  const [dayBeforeChecked, setDayBeforeChecked] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20; // Number of leads per page 

  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const filterOptions = [
    "Missed",
    "Today",
    "Tomorrow",
    "CONS Scheduled",
    "CONS Done",
    "Sales Done",
    "CNP",
    "On Follow Up",
    "New Lead",
  ];

  const handleFilterClick = (e) => setFilterMenuAnchorEl(e.currentTarget);
  const handleFilterClose = () => setFilterMenuAnchorEl(null);
  const handleFilterToggle = (opt) => {
    setSelectedFilters((prev) =>
      prev.includes(opt) ? prev.filter((f) => f !== opt) : [...prev, opt]
    );
  };

  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState(null);
  const [sortOrder, setSortOrder] = useState(null); // 'asc' | 'desc'
  const handleSortClick = (e) => setSortMenuAnchorEl(e.currentTarget);
  const handleSortClose = () => setSortMenuAnchorEl(null);
  const handleSortSelect = (order) => {
    setSortOrder(order);
    setSortMenuAnchorEl(null);
  };

  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef(null);

  const [moreAnchorEl, setMoreAnchorEl] = useState(null);
  const isMoreMenuOpen = Boolean(moreAnchorEl);

  const [filterAgent, setFilterAgent] = useState([]);
  const [filterDate, setFilterDate] = useState("");

  const [openCount, setOpenCount] = useState(0);
  const [wonCount, setWonCount] = useState(0);
  const [lostCount, setLostCount] = useState(0);


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

   // 1. Add this utility function INSIDE LeadList component (or import if you prefer)
const calculateCompletionPercent = (customer) => {
  // Define required fields from each section for completeness check
  const presalesFields = [
    "leadStatus", "hba1c", "lastTestDone", "fastingSugar", "ppSugar",
    "durationOfDiabetes", "gender", "dietType", "weight", "sittingTime",
    "exerciseRoutine", "outsideMeals", "timeOfSleep", "assignExpert", "doctorCons",
  ];
  const consultationFields = [
    "currentMedications", "sideEffects", "suddenSugarFluctuations", "symptoms",
    "familyHistory", "otherConditions", "stressLevel", "monitorBloodSugar",
    "painInLiver", "gutIssues", "energyLevels", "sleepQuality", "sugarCravings",
  ];
  const closingFields = [
    "expectedResult", "preferredDiet", "courseDuration", "freebie", "bloodTest"
  ];

  // Helper: count how many fields are filled (non-empty, non-null)
  const countFilledFields = (obj, fields) => {
    if (!obj) return 0;
    let filled = 0;
    fields.forEach((field) => {
      const val = obj[field];
      if (Array.isArray(val)) {
        if (val.length > 0) filled++;
      } else if (val !== null && val !== undefined && val !== "") {
        filled++;
      }
    });
    return filled;
  };

  const presales = customer.presales || {};
  const consultation = customer.consultation || {};
  const closing = customer.closing || {};

  const presalesFilled = countFilledFields(presales, presalesFields);
  const consultationFilled = countFilledFields(consultation, consultationFields);
  const closingFilled = countFilledFields(closing, closingFields);

  const totalFields = presalesFields.length + consultationFields.length + closingFields.length;
  const filledFields = presalesFilled + consultationFilled + closingFilled;

  return Math.round((filledFields / totalFields) * 100);
};

  const fetchCounts = async () => {
    try {
      if (!loggedInUser) return;
  
      const params = {
        role: loggedInUser.role,
      };
  
      if (loggedInUser.role === "Sales Agent") {
        params.userName = loggedInUser.fullName;
      } else if (loggedInUser.role === "Retention Agent") {
        params.userId = loggedInUser.id || loggedInUser._id;
        params.userName = loggedInUser.fullName;
      }
  
      const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/customers/counts", { params });
      setOpenCount(res.data.openCount || 0);
      setWonCount(res.data.wonCount || 0);
      setLostCount(res.data.lostCount || 0);
    } catch (error) {
      console.error("Error fetching lead counts:", error);
    }
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
      let ld = new Date();
      if (yesterdayChecked) {
        ld.setDate(ld.getDate() - 1);
      } else if (dayBeforeChecked) {
        ld.setDate(ld.getDate() - 2);
      }
      const payload = {
        ...leadData,
        leadDate: ld.toISOString(),
      };

      await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/customers", payload);
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
    const filters = searchValue
      ? JSON.stringify({ search: searchValue })
      : "{}";

    const params = {
      page,
      limit,
      filters,
      status: filterStatus,
      tags: JSON.stringify(selectedFilters),
      sortBy: sortOrder,
      userRole: loggedInUser?.role,
      userId: loggedInUser?.id || loggedInUser?._id,
      userName: loggedInUser?.fullName,
    };

    if (filterAgent.length > 0) {
      params.assignedTo = filterAgent.join(",");
    }

    if (filterDate) {
      params.createdAt = filterDate;
    }

    const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/customers", {
      params,
    });

    if (page === 1 || reset) {
      setCustomers(response.data.customers);
    } else {
      setCustomers(prev => [...prev, ...response.data.customers]);
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
    fetchCounts();
  }, [searchQuery, filterStatus, selectedFilters, sortOrder, filterDate, filterAgent]);

  const handleScroll = () => {
    const container = listRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 50 && !loadingMore && currentPage < totalPages) {
      setLoadingMore(true);
      fetchCustomers(currentPage + 1, false, searchQuery)
        .finally(() => setLoadingMore(false));
    }
  };

  const handleDownloadCSV = () => {
    try {
      const params = new URLSearchParams();
  
      if (searchQuery) params.append("filters", JSON.stringify({ search: searchQuery }));
      if (filterStatus) params.append("status", filterStatus);
      if (selectedFilters.length > 0) params.append("tags", JSON.stringify(selectedFilters));
      if (filterAgent.length > 0) params.append("assignedTo", filterAgent.join(","));
      if (filterDate) params.append("createdAt", filterDate);
  
      const url = `https://muditamleads-14f32a10d7f7.herokuapp.com/api/customers/export-csv?${params.toString()}`;
  
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "customers.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error triggering CSV download:", error);
      alert("Failed to download CSV.");
    }
  };  
   

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


  const handleMoreClick = (event) => {
    setMoreAnchorEl(event.currentTarget);
  };


  const handleMoreClose = () => {
    setMoreAnchorEl(null);
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
          Open ({openCount})
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
          Won ({wonCount})
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
          Lost ({lostCount})
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
          <IconButton
            size="small"
            sx={{ color: "black" }}
            onClick={handleFilterClick}
          >
            <FilterList fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={filterMenuAnchorEl}
            open={Boolean(filterMenuAnchorEl)}
            onClose={handleFilterClose}
          >
            {filterOptions.map((opt) => (
              <MenuItem key={opt} onClick={() => handleFilterToggle(opt)}>
                <Checkbox checked={selectedFilters.includes(opt)} />
                {opt}
              </MenuItem>
            ))}
          </Menu>

          <IconButton
            size="small"
            sx={{ color: "black" }}
            onClick={handleSortClick}
          >
            <Sort fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={sortMenuAnchorEl}
            open={Boolean(sortMenuAnchorEl)}
            onClose={handleSortClose}
          >
            <MenuItem onClick={() => handleSortSelect("asc")}>
              Sort A to Z
            </MenuItem>
            <MenuItem onClick={() => handleSortSelect("desc")}>
              Sort Z to A
            </MenuItem>
            <MenuItem onClick={() => handleSortSelect("newest")}>
              Newest First
            </MenuItem>
            <MenuItem onClick={() => handleSortSelect("oldest")}>
              Oldest First
            </MenuItem>
          </Menu>

          {loggedInUser.role === "Manager" && (
            <IconButton
              size="small"
              sx={{ color: "black", ml: 1 }}
              onClick={handleMoreClick}
              title="More Options"
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
          <Menu
            anchorEl={moreAnchorEl}
            open={isMoreMenuOpen}
            onClose={handleMoreClose}
            PaperProps={{
              sx: {
                bgcolor: "white",
                boxShadow: 5,
                color: "black",
                minWidth: 180,
                padding: "5px",
                borderRadius: 1,
                "& .MuiMenuItem-root": {
                  fontSize: "0.8rem",
                  "&:hover": {
                    bgcolor: "white",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "black",
                },
                "& .MuiOutlinedInput-root": {
                  color: "black",
                  "& fieldset": {
                    borderColor: "black",
                  },
                  "&:hover fieldset": {
                    borderColor: "#ccc",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#ccc",
                  },
                },
                "& .MuiSvgIcon-root": {
                  color: "black",
                },
                "& .MuiCheckbox-root": {
                  color: "black",
                },
              },
            }}
          >
            <MenuItem
              onClick={() => {
                handleMoreClose();
                handleDownloadCSV();
              }}
            >
              Download CSV
              <DownloadIcon fontSize="small" style={{ marginLeft: 8 }} />
            </MenuItem>


            <MenuItem disableGutters>
              <Box width={180}>
                {" "}
                {/* Apply same width here */}
                <FormControl size="small" fullWidth>
                  <InputLabel>Agents</InputLabel>
                  <Select
                    label="Agents"
                    multiple
                    value={filterAgent}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilterAgent(
                        typeof value === "string" ? value.split(",") : value
                      );
                    }}
                    renderValue={(selected) => selected.join(", ")}
                  >
                    {employees.map((emp) => (
                      <MenuItem key={emp._id} value={emp.fullName}>
                        <Checkbox
                          checked={filterAgent.includes(emp.fullName)}
                        />
                        {emp.fullName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </MenuItem>


            <MenuItem disableGutters>
              <Box width={180}>
                {" "}
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                  }}
                />
              </Box>
            </MenuItem>
          </Menu>

        </Box>
      </Box>

      {/* Lead List Section */}
      <Box
        ref={listRef}
        onScroll={handleScroll}
        sx={{ flex: 1, overflowY: "auto" }}>
        {customers.map((customer) => (
          <Box
            key={customer._id}
            onClick={() => onSelectCustomer(customer._id)}
            sx={{
              position: "relative",
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
                {!["Switch Off", "General Query", "Fake Lead", "Invalid Number", "Not Interested"].includes(customer.presales?.leadStatus) && (
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
                )}
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mt: 0.5,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: "gray", fontSize: "0.7rem" }}
                >
                  {customer.location || "Unknown"}
                </Typography>

                {/* Scheduled / Done chips, with a left margin */}
                {customer.presales?.leadStatus === "CONS Scheduled" && (
                  <Chip
                    label="Scheduled"
                    size="small"
                    sx={{
                      ml: 1,
                      fontSize: "0.7rem",
                      backgroundColor: "#64b5f6",
                      color: "white",
                    }}
                  />
                )}
                {customer.presales?.leadStatus === "CONS Done" && (
                  <Chip
                    label="Done"
                    size="small"
                    sx={{
                      ml: 1,
                      fontSize: "0.7rem",
                      backgroundColor: "#81c784",
                      color: "white",
                    }}
                  />
                )}
                {customer.presales?.leadStatus === "Sales Done" && (
                  <Chip
                    label="WON"
                    size="small"
                    sx={{
                      ml: 1,
                      fontSize: "0.7rem",
                      backgroundColor: "#d3ac2f",
                      color: "white",
                    }}
                  />
                )}
              </Box>
            </Box>
            <Box
  sx={{
    position: "absolute",
    bottom: 4,
    right: 8,
    bgcolor: "#1976d2",
    color: "white",
    px: 0.7,
    py: 0.3,
    borderRadius: "4px",
    fontSize: "0.65rem",
    fontWeight: "bold",
    userSelect: "none",
  }}
>
  {calculateCompletionPercent(customer)}%
</Box>
          </Box>
        ))}
        {loadingMore && (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>

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
            <Grid item xs={12} sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={yesterdayChecked}
                    onChange={(e) => {
                      setYesterdayChecked(e.target.checked);
                      if (e.target.checked) setDayBeforeChecked(false);
                    }}
                  />
                }
                label="Yesterday"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={dayBeforeChecked}
                    onChange={(e) => {
                      setDayBeforeChecked(e.target.checked);
                      if (e.target.checked) setYesterdayChecked(false);
                    }}
                  />
                }
                label="Day Before Yesterday"
              />
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
