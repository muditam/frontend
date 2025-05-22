import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Avatar,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Stack,
  Chip,
  TableRow,
  Table,
  TableBody,
  TableHead,
  Menu,
  TableCell,
  CircularProgress,
  Button,
  Snackbar,
} from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import axios from "axios";
import Details from "./Details";
import RetentionFollowUp from "./RetentionFollowUp";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import PhoneIcon from "@mui/icons-material/Phone";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";

import AddIcon from "@mui/icons-material/Add";
import HistoryIcon from "@mui/icons-material/History";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Badge from "@mui/material/Badge";

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Helper: Calculate days since lastOrderDate
const getDaysSince = (startDate, endDate = new Date()) => {
  if (!startDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : null;
};


// Map followup status to tag label + color
const followupTagMap = {
  "Follow-up Missed": { label: "Missed", color: "error" },
  Today: { label: "Today", color: "success" },
  Tomorrow: { label: "Tomorrow", color: "info" },
  Later: { label: "Later", color: "warning" },
  "": { label: "Not Set", color: "default" },
};

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
  padding: "4px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  textAlign: "center",
}));

const RetentionLeads = () => {
  const [allLeads, setAllLeads] = useState([]); // All leads fetched from server
  const [leads, setLeads] = useState([]); // Leads currently displayed
  const [loggedInUser, setLoggedInUser] = useState({});
  const [loading, setLoading] = useState(false);
  const [callingMessage, setCallingMessage] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState([]);
  const [modalIndex, setModalIndex] = useState(0);
  const [leadLoading, setLeadLoading] = useState(false);
  const [filteredAllLeads, setFilteredAllLeads] = useState([]);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [orderPlacedFilter, setOrderPlacedFilter] = useState("Order Placed"); // or "Order Not Placed"
  const [dateRangeFilter, setDateRangeFilter] = useState("");

  const [logPopupAnchor, setLogPopupAnchor] = useState(null);
  const [reachoutMethod, setReachoutMethod] = useState("");
  const [reachoutStatus, setReachoutStatus] = useState("");
  const [reachoutTimestamp, setReachoutTimestamp] = useState(null);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsData, setLogsData] = useState([]);



  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagDialogImageIndex, setTagDialogImageIndex] = useState(null);
  // const [subcellsPopup, setSubcellsPopup] = useState({ open: false, subcells: [] });
  const [tagDialogValue, setTagDialogValue] = useState("");

  const [copySuccess, setCopySuccess] = useState(false);

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
    rtFollowupReminder: null,
    rtFollowupStatus: "",
    lastOrderDateFrom: "",
    lastOrderDateTo: "",
    retentionStatus: "",
  });

  const leadsPerPage = 50;

  const containerRef = useRef(null);

  const [shopifyDatesMap, setShopifyDatesMap] = useState({});

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState([]);

  const [showOrders, setShowOrders] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
  };

  // Fetch user details helper
  const fetchUserDetails = async (user) => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees",
        { params: { fullName: user.fullName, email: user.email } }
      );
      if (!response.data || response.data.length === 0) {
        console.error("Employee not found");
        return { async: 1, agentNumber: "Unknown", callerId: "Unknown" };
      }
      const { async, agentNumber, callerId } = response.data[0];
      if (!agentNumber || !callerId) {
        console.error("Missing agentNumber or callerId");
        return { async: 1, agentNumber: "Unknown", callerId: "Unknown" };
      }
      return { async, agentNumber, callerId };
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      return { async: 1, agentNumber: "Unknown", callerId: "Unknown" };
    }
  };

  // Fetch retention leads
  const fetchRetentionLeads = async (user) => {
    setLoading(true);
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retentions",
        { params: { fullName: user.fullName, email: user.email } }
      );
      const { async, agentNumber, callerId } = await fetchUserDetails(user);

      const computeReminder = (followupDate) => {
        if (!followupDate) return "";
        const date = new Date(followupDate);
        const today = new Date();
        const diffInDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
        if (diffInDays < 0) return "Follow-up Missed";
        if (diffInDays === 0) return "Today";
        if (diffInDays === 1) return "Tomorrow";
        return "Later";
      };

      const leadsWithReminders = response.data.map((lead) => ({
        ...lead,
        rtFollowupReminder: lead.rtNextFollowupDate
          ? computeReminder(lead.rtNextFollowupDate)
          : "",
        async,
        agentNumber,
        callerId,
        rtSubcells: lead.rtSubcells || [],
      }));

      leadsWithReminders.sort((a, b) => {
        if (!a.lastOrderDate) return 1;
        if (!b.lastOrderDate) return -1;
        return new Date(b.lastOrderDate) - new Date(a.lastOrderDate);
      });

      setAllLeads(leadsWithReminders);
      setFilteredAllLeads(leadsWithReminders);
      setLeads(leadsWithReminders.slice(0, leadsPerPage));
      setHasMore(leadsWithReminders.length > leadsPerPage);
      setSelectedLeadIndex(null);
      setUploadedImages([]);
    } catch (error) {
      console.error("Failed to fetch retention leads:", error);
    } finally {
      setLoading(false);
    }
  };


  const fetchShopifyDates = async (phoneNumber) => {
    try {
      const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/orders-dates", {
        params: { phoneNumber },
      });
      setShopifyDatesMap((prev) => ({
        ...prev,
        [phoneNumber]: {
          firstOrderDate: res.data.firstOrderDate,
          lastOrderDate: res.data.lastOrderDate,
          totalSpend: res.data.totalSpend || 0,
          orders: res.data.orders || [],
        },
      }));
    } catch (err) {
      console.error("Failed to fetch Shopify dates", err);
      setShopifyDatesMap((prev) => ({
        ...prev,
        [phoneNumber]: {
          firstOrderDate: null,
          lastOrderDate: null,
          totalSpend: 0,
        },
      }));
    }
  };

  const fetchLogs = async (leadId) => {
    try {
      const res = await axios.get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${leadId}/reachout-logs`);
      setLogsData(res.data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  const handleLeadSelect = (idx) => {
    setSelectedLeadIndex(idx);
    fetchShopifyDates(leads[idx].contactNumber);
  };

  const handleInputChange = async (e, index, field) => {
    const value = e.target.value;
    const updatedLeads = [...leads];
    updatedLeads[index][field] = value;
    if (field === "rtNextFollowupDate") {
      const followupDate = new Date(value);
      const today = new Date();
      const diffInDays = Math.ceil((followupDate - today) / (1000 * 60 * 60 * 24));
      updatedLeads[index].rtFollowupReminder =
        diffInDays < 0 ? "Missed" : diffInDays === 0 ? "Today" : diffInDays === 1 ? "Tomorrow" : "Later";
    }
    setLeads(updatedLeads);
    try {
      await axios.put(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${updatedLeads[index]._id}`,
        { [field]: value }
      );
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  };


  useEffect(() => {
    if (selectedLeadIndex === null) {
      setUploadedImages([]);
      return;
    }
    const lead = leads[selectedLeadIndex];
    if (lead && lead.images && Array.isArray(lead.images)) {
      const imgs = lead.images.map((img, idx) => ({
        preview: img.url || img.preview, // img.url for server images, img.preview for newly added local images
        date: img.date ? new Date(img.date) : new Date(),
        tag: img.tag || "",
        index: idx,
      }));
      setUploadedImages(imgs);
    } else {
      setUploadedImages([]);
    }
  }, [selectedLeadIndex, leads]);



  // Load more leads on scroll near bottom
  const loadMoreLeads = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setLeads((prevLeads) => {
        const nextLeads = allLeads.slice(
          prevLeads.length,
          prevLeads.length + leadsPerPage
        );
        const updatedLeads = [...prevLeads, ...nextLeads];
        setHasMore(updatedLeads.length < allLeads.length);
        return updatedLeads;
      });
      setLoadingMore(false);
    }, 500);
  };

  // Scroll event handler
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadMoreLeads();
    }
  }, [loadMoreLeads]);

  const openModal = (dateGroupImages, clickedIndexInGroup) => {
    setModalImages(dateGroupImages);
    setModalIndex(clickedIndexInGroup);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const prevImage = () => {
    setModalIndex((i) => (i === 0 ? modalImages.length - 1 : i - 1));
  };

  const nextImage = () => {
    setModalIndex((i) => (i === modalImages.length - 1 ? 0 : i + 1));
  };

  const deleteModalImage = () => {
    const deletedImage = modalImages[modalIndex];
    setUploadedImages((prev) => prev.filter((_, i) => i !== deletedImage.index));
    closeModal();
  };

  const groupImagesByYearMonthDate = (images) => {
    const grouped = {};

    images.forEach((img, index) => {
      const d = img.date || new Date();
      const year = d.getFullYear();
      const month = d.toLocaleString("default", { month: "long" });
      const day = d.getDate();

      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = {};
      if (!grouped[year][month][day]) grouped[year][month][day] = [];

      grouped[year][month][day].push({ ...img, index });
    });

    return grouped;
  };

  const handleAddTag = (imageIndex, tag) => {
    setUploadedImages((prev) =>
      prev.map((img, i) =>
        i === imageIndex
          ? { ...img, tag }
          : img
      )
    );
  };


  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    const filtered = filteredLeadsByFilters(allLeads);
    setFilteredAllLeads(filtered);
    setLeads(filtered.slice(0, leadsPerPage));
    setHasMore(filtered.length > leadsPerPage);
    setSelectedLeadIndex(null);
    setUploadedImages([]);
  }, [filters, allLeads, orderPlacedFilter, dateRangeFilter]);


  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user && user.role === "Retention Agent") {
      setLoggedInUser(user);
      fetchRetentionLeads(user);
    }
  }, []);

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


  const updateLeadImagesOnServer = async (leadId, images) => {
    try {
      await axios.patch(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${leadId}/images`, { images });
    } catch (err) {
      console.error("Failed to update images on server", err);
    }
  };

  const handleImageChange = async (event) => {
    const files = Array.from(event.target.files);

    if (selectedLeadIndex === null) {
      alert("Select a lead first!");
      return;
    }

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("images", file);
      });

      const uploadResponse = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/upload-to-shopify",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const uploadedImagesFromServer = uploadResponse.data.map((img, idx) => ({
        url: img.url,
        date: img.date ? new Date(img.date) : new Date(),
        tag: "",
        index: idx,
        preview: img.url,
      }));

      setUploadedImages((prev) => [...prev, ...uploadedImagesFromServer]);

      setLeads((prevLeads) => {
        const newLeads = [...prevLeads];
        const lead = { ...newLeads[selectedLeadIndex] };
        lead.images = lead.images
          ? [...lead.images, ...uploadedImagesFromServer]
          : [...uploadedImagesFromServer];
        newLeads[selectedLeadIndex] = lead;

        updateLeadImagesOnServer(lead._id, lead.images);

        return newLeads;
      });
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Image upload failed. Please try again.");
    }
  };

  const filteredLeadsByFilters = (inputLeads) => {
    let filtered = inputLeads;

    // Apply search filter
    const search = filters.name.trim().toLowerCase();
    if (search) {
      filtered = filtered.filter((lead) => {
        const nameMatch = lead.name?.toLowerCase().includes(search);
        const numberMatch = lead.contactNumber?.includes(search);
        return nameMatch || numberMatch;
      });
    }

    if (filters.retentionStatus === "Active") {
      filtered = filtered.filter(
        (lead) =>
          !lead.retentionStatus || lead.retentionStatus.toLowerCase() !== "lost"
      );
    } else if (filters.retentionStatus === "Lost") {
      filtered = filtered.filter(
        (lead) => lead.retentionStatus?.toLowerCase() === "lost"
      );
    } else if (filters.retentionStatus === "All") {
      // No filtering, show all
    }

    if (orderPlacedFilter === "Order Placed") {
      filtered = filtered.filter((lead) => !!lead.lastOrderDate);
    } else if (orderPlacedFilter === "Order Not Placed") {
      filtered = filtered.filter((lead) => !lead.lastOrderDate);
    }

    if (dateRangeFilter) {
      const now = new Date();
      const isSameMonth = (d1, d2) =>
        d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

      filtered = filtered.filter((lead) => {
        const date = lead.lastOrderDate ? new Date(lead.lastOrderDate) : null;
        if (!date) return false;

        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        switch (dateRangeFilter) {
          case "Today":
            return diffDays === 0;
          case "Yesterday":
            return diffDays === 1;
          case "Last 7 Days":
            return diffDays <= 7;
          case "Last 10 Days":
            return diffDays <= 10;
          case "10–20 Days Ago":
            return diffDays >= 10 && diffDays <= 20;
          case "21–30 Days Ago":
            return diffDays >= 21 && diffDays <= 30;
          case "This Month (Month to Date)":
            return isSameMonth(date, now);
          case "Last Month": {
            const lastMonth = new Date();
            lastMonth.setMonth(now.getMonth() - 1);
            return (
              date.getMonth() === lastMonth.getMonth() &&
              date.getFullYear() === lastMonth.getFullYear()
            );
          }
          case "Last 30 Days":
            return diffDays <= 30;
          case "Last 90 Days":
            return diffDays <= 90;
          default:
            return true;
        }
      });
    }

    if (filters.rtFollowupReminder !== null) {
      filtered = filtered.filter(
        (lead) => lead.rtFollowupReminder === filters.rtFollowupReminder
      );
    }


    return filtered;
  };



  const handleRemoveImage = async (index) => {
    setUploadedImages((prev) => {
      URL.revokeObjectURL(prev[index].preview); // cleanup
      return prev.filter((_, i) => i !== index);
    });

    setLeads((prevLeads) => {
      if (selectedLeadIndex === null) return prevLeads;
      const newLeads = [...prevLeads];
      const lead = { ...newLeads[selectedLeadIndex] };
      if (lead.images && Array.isArray(lead.images)) {
        lead.images = lead.images.filter((_, i) => i !== index);
      }
      newLeads[selectedLeadIndex] = lead;

      // Update backend
      updateLeadImagesOnServer(lead._id, lead.images);

      return newLeads;
    });
  };

  const groupedImages = groupImagesByYearMonthDate(uploadedImages);

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        fontFamily: '"Segoe UI", sans-serif',
        backgroundColor: "background.default",
        color: "black",
        fontSize: "0.75rem",
      }}
    >
      {/* Left Sidebar 20% */}
      <Box
        sx={{
          width: "20%",
          borderRight: "1px solid #ddd",
          display: "flex",
          flexDirection: "column",
          p: 1,
          bgcolor: "background.paper",
          overflowY: "auto",
        }}
        ref={containerRef}
      >
        {/* Search + Filter + Sort + More icons */}
        <Stack direction="row" spacing={2}>
          {[
            { label: "All", value: "All", count: allLeads.length },
            {
              label: "Active",
              value: "Active",
              count: allLeads.filter(
                (lead) => !lead.retentionStatus || lead.retentionStatus.toLowerCase() !== "lost"
              ).length,
            },
            {
              label: "Lost",
              value: "Lost",
              count: allLeads.filter(
                (lead) => lead.retentionStatus?.toLowerCase() === "lost"
              ).length,
            },
          ].map(({ label, value, count }) => {
            const isSelected = filters.retentionStatus === value ||
              (label === "Active" && filters.retentionStatus === "" && value !== "All");

            return (
              <Button
                key={label}
                variant={isSelected ? "contained" : "outlined"}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    retentionStatus: value,
                  }))
                }
                size="small"
                sx={{
                  textTransform: "none",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: isSelected ? "#fff" : "black",
                  borderColor: "black",
                  backgroundColor: isSelected ? "black" : "transparent",
                  "&:hover": {
                    backgroundColor: isSelected ? "#222" : "#f5f5f5",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography>{label} </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontSize: "0.65rem", opacity: 0.7 }}
                  >
                    ({count})
                  </Typography>
                </Box>
              </Button>
            );
          })}
        </Stack>

        <Stack direction="row" spacing={1} mt={1}>
          {[
            { label: "Today", value: "Today" },
            { label: "Tomorrow", value: "Tomorrow" },
            { label: "Missed", value: "Follow-up Missed" },
            { label: "Later", value: "Later" },
            { label: "Not Set", value: "" }, // This is correct
          ].map(({ label, value }) => {
            const count = allLeads.filter((lead) => lead.rtFollowupReminder === value).length;
            const isSelected = filters.rtFollowupReminder === value;

            return (
              <Button
                key={label}
                variant={isSelected ? "contained" : "outlined"}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    rtFollowupReminder: isSelected ? null : value, // Use null to indicate "no filter"
                  }))
                }
                size="small"
                sx={{
                  textTransform: "none",
                  borderRadius: "4px",
                  minWidth: "auto",
                  px: 0.5,
                  py: 0.2,
                  fontSize: "0.65rem",
                  fontWeight: 400,
                  color: isSelected ? "#fff" : "black",
                  borderColor: "black",
                  backgroundColor: isSelected ? "black" : "transparent",
                  "&:hover": {
                    backgroundColor: isSelected ? "#222" : "#f5f5f5",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    lineHeight: 1.2,
                  }}
                >
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 500 }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.6rem", opacity: 0.7 }}>
                    ({count})
                  </Typography>
                </Box>
              </Button>
            );
          })}
        </Stack>



        <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1, mt: 1, }}>
          <TextField
            size="small"
            placeholder="Search leads..."
            variant="outlined"
            fullWidth
            value={filters.name}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, name: e.target.value }))
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Filter">
            <IconButton
              size="small"
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            >
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sort">
            <IconButton size="small" onClick={() => alert("Sort clicked")}>
              <SortIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="More options">
            <IconButton size="small" onClick={() => alert("More options clicked")}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={() => setFilterAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Left column - Order Type */}
            <Box>
              <Typography
                sx={{ fontSize: "0.75rem", fontWeight: "bold", px: 2, pt: 1, pb: 0.5, color: "text.disabled" }}
              >
                Order Type
              </Typography>
              {["Order Placed", "Order Not Placed"].map((type) => (
                <MenuItem
                  key={type}
                  selected={orderPlacedFilter === type}
                  onClick={() => {
                    setOrderPlacedFilter(type);
                    setDateRangeFilter("");
                  }}
                >
                  {type}
                </MenuItem>
              ))}
            </Box>

            {/* Right column - Date Range (only if OrderType selected) */}
            {orderPlacedFilter && (
              <Box sx={{ pl: 3 }}>
                <Typography
                  sx={{ fontSize: "0.75rem", fontWeight: "bold", px: 2, pt: 1, pb: 0.5, color: "text.disabled" }}
                >
                  Date Range
                </Typography>
                {[
                  "Today",
                  "Yesterday",
                  "Last 7 Days",
                  "Last 10 Days",
                  "10–20 Days Ago",
                  "21–30 Days Ago",
                  "This Month (Month to Date)",
                  "Last Month",
                  "Last 30 Days",
                  "Last 90 Days",
                ].map((label) => (
                  <MenuItem
                    key={label}
                    selected={dateRangeFilter === label}
                    onClick={() => {
                      setDateRangeFilter(label);
                      setFilterAnchorEl(null);
                    }}
                  >
                    {label}
                  </MenuItem>
                ))}
              </Box>
            )}
          </Box>
        </Menu>




        {/* Leads List */}
        <List disablePadding>
          {leads.map((lead, idx) => {
            const initials = lead.name
              ? lead.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
              : "?";

            const followup = lead.rtFollowupReminder || "";
            const tagInfo = followupTagMap[followup] || followupTagMap[""];

            const isSelected = selectedLeadIndex === idx;

            return (
              <ListItemButton
                key={lead._id || idx}
                sx={{
                  mb: 0.5,
                  borderRadius: 1,
                  backgroundColor: isSelected
                    ? "rgba(25, 118, 210, 0.15)"
                    : lead.rowColor || "inherit",
                }}
                onClick={() => {
                  setLeadLoading(true);
                  handleLeadSelect(idx);
                  setTimeout(() => setLeadLoading(false), 500);
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "black", fontSize: "0.8rem" }}>
                    {initials}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        noWrap
                        sx={{ maxWidth: "70%" }}
                      >
                        {lead.name}
                      </Typography>

                      <Chip
                        label={tagInfo.label}
                        color={tagInfo.color}
                        size="small"
                        sx={{ fontWeight: "bold" }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ fontSize: "0.7rem", opacity: 0.8 }}
                      >
                        {(() => {
                          const first = shopifyDatesMap[lead.contactNumber]?.firstOrderDate;
                          const last = shopifyDatesMap[lead.contactNumber]?.lastOrderDate;
                          const csDays = getDaysSince(first, last);
                          return csDays !== null ? `CS - ${csDays} days` : "CS - N/A";
                        })()}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: "normal", whiteSpace: "nowrap", fontSize: "0.7rem", opacity: 0.8 }}
                      >
                        {(() => {
                          const last = lead.lastOrderDate;
                          const daysSinceLast = getDaysSince(last);
                          return daysSinceLast !== null ? `${daysSinceLast} days` : "N/A";
                        })()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            );
          })}
        </List>

        {/* Loading spinner at bottom */}
        {loadingMore && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 1,
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Show message if no leads */}
        {!loading && leads.length === 0 && (
          <Typography variant="body2" align="center" color="text.secondary" mt={2}>
            No leads found.
          </Typography>
        )}

        {/* Show spinner while initial loading */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}
      </Box>

      {/* Right Content 80% - split lead details and images */}
      <Box
        sx={{
          width: "80%",
          p: 3,
          overflowY: "auto",
          display: "flex",
          gap: 2,
        }}
      >
        {selectedLeadIndex === null || leadLoading ? (
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {leadLoading ? (
              <CircularProgress />
            ) : (
              <Typography variant="h6" color="text.secondary" textAlign="center">
                Select a lead from the left to see details
              </Typography>
            )}
          </Box>
        ) : (
          <>
            {/* Lead details - 70% width */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Paper
                sx={{
                  mb: 3,
                  p: 2,
                  boxShadow: 2,
                  borderRadius: 2,
                  backgroundColor:
                    leads[selectedLeadIndex]?.rowColor || "background.paper",
                  fontSize: "0.85rem",
                }}
                elevation={3}
              >
                <Stack direction="row" spacing={3} flexWrap="wrap" alignItems="center">
                  <Box sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Contact Number
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2">
                        {leads[selectedLeadIndex].contactNumber}
                      </Typography>
                      <Tooltip title="Call">
                        <IconButton
                          color="primary"
                          onClick={() =>
                            handleCallIconClick(leads[selectedLeadIndex].contactNumber)
                          }
                        >
                          <PhoneIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Copy Number">
                        <IconButton
                          color="primary"
                          onClick={() => handleCopy(leads[selectedLeadIndex].contactNumber)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Log Reachout">
                        <IconButton onClick={(e) => {
                          setReachoutTimestamp(new Date());
                          setLogPopupAnchor(e.currentTarget);
                        }}>
                          <AddIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="View Logs">
                        <IconButton onClick={() => {
                          fetchLogs(leads[selectedLeadIndex]._id);
                          setLogsModalOpen(true);
                        }}>
                          <Badge badgeContent={leads[selectedLeadIndex]?.reachoutLogs?.length || 0} color="primary">
                            <HistoryIcon />
                          </Badge>
                        </IconButton>
                      </Tooltip>
                      {logPopupAnchor && (
                        <Menu
                          anchorEl={logPopupAnchor}
                          open={Boolean(logPopupAnchor)}
                          onClose={() => setLogPopupAnchor(null)}
                        >
                          <Box sx={{ px: 2, py: 1 }}>
                            <Typography variant="body2">Reachout Method</Typography>
                            <RadioGroup
                              value={reachoutMethod}
                              onChange={async (e) => {
                                const method = e.target.value;
                                setReachoutMethod(method);
                                await axios.post(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${leads[selectedLeadIndex]._id}/reachout-log`, {
                                  timestamp: reachoutTimestamp,
                                  method,
                                });
                              }}
                            >
                              {["WhatsApp", "Call", "Both"].map((opt) => (
                                <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
                              ))}
                            </RadioGroup>

                            {reachoutMethod && (
                              <>
                                <Typography variant="body2" mt={2}>Disposition</Typography>
                                <Select
                                  size="small"
                                  fullWidth
                                  value={reachoutStatus}
                                  onChange={async (e) => {
                                    const status = e.target.value;
                                    setReachoutStatus(status);
                                    await axios.post(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${leads[selectedLeadIndex]._id}/reachout-log`, {
                                      timestamp: reachoutTimestamp,
                                      method: reachoutMethod,
                                      status,
                                    });
                                    setLogPopupAnchor(null);
                                  }}
                                >
                                  {["CNP", "Followup Done", "Order Placed", "Call Back Later", "Busy", "Switch Off"].map(status => (
                                    <MenuItem key={status} value={status}>{status}</MenuItem>
                                  ))}
                                </Select>
                              </>
                            )}
                          </Box>
                        </Menu>
                      )}

                      {/* Logs Modal */}
                      <Dialog open={logsModalOpen} onClose={() => setLogsModalOpen(false)} maxWidth="sm" fullWidth>
                        <DialogTitle>Reachout Logs</DialogTitle>
                        <DialogContent>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                {["Date", "Time", "Method", "Disposition"].map((head) => (
                                  <TableCell key={head}>{head}</TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {logsData.map((log, idx) => {
                                const date = new Date(log.timestamp);
                                return (
                                  <TableRow key={idx}>
                                    <TableCell>{date.toLocaleDateString()}</TableCell>
                                    <TableCell>{date.toLocaleTimeString()}</TableCell>
                                    <TableCell>{log.method}</TableCell>
                                    <TableCell>{log.status}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </DialogContent>
                      </Dialog>
                    </Box>
                  </Box>

                  <Box sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Customer Name
                    </Typography>
                    <Typography variant="body2">
                      {leads[selectedLeadIndex].name || "N/A"}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Agent Assigned
                    </Typography>
                    <Typography variant="body2">
                      {leads[selectedLeadIndex].agentAssigned || "N/A"}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Next Followup Date
                    </Typography>
                    <TextField
                      type="date"
                      value={leads[selectedLeadIndex].rtNextFollowupDate || ""}
                      onChange={(e) => handleInputChange(e, selectedLeadIndex, "rtNextFollowupDate")}
                      size="small"
                      variant="outlined"
                      sx={{ minWidth: 140 }}
                    />
                  </Box>

                  <Box sx={{ minWidth: 130 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Followup Status
                    </Typography>
                    <Select
                      value={leads[selectedLeadIndex].rtFollowupStatus || ""}
                      onChange={(e) => handleInputChange(e, selectedLeadIndex, "rtFollowupStatus")}
                      size="small"
                      fullWidth
                    >
                      {[
                        "Good Results",
                        "No Result",
                        "Sales Done",
                        "Order Confirm",
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
                  </Box>



                  <Box sx={{ minWidth: 130 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Retention Status
                    </Typography>
                    <Select
                      value={leads[selectedLeadIndex].retentionStatus || ""}
                      onChange={(e) => handleInputChange(e, selectedLeadIndex, "retentionStatus")}
                      size="small"
                      fullWidth
                    >
                      {["Active", "Lost"].map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>

                  <Box sx={{ minWidth: 160 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                    Preferred Method
                    </Typography>
                    <Select
                      value={leads[selectedLeadIndex].communicationMethod || ""}
                      onChange={(e) => handleInputChange(e, selectedLeadIndex, "communicationMethod")}
                      size="small"
                      fullWidth
                    >
                      {["Call", "WhatsApp", "Both"].map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>

                  <Box sx={{ minWidth: 160 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Preferred Language
                    </Typography>
                    <Select
                      value={leads[selectedLeadIndex].preferredLanguage || ""}
                      onChange={(e) => handleInputChange(e, selectedLeadIndex, "preferredLanguage")}
                      size="small"
                      fullWidth
                    >
                      {["Hindi", "English", "Others"].map((lang) => (
                        <MenuItem key={lang} value={lang}>
                          {lang}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>

                  <Box sx={{ minWidth: 150 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      First Order Date
                    </Typography>
                    <Typography variant="body2">
                      {shopifyDatesMap[leads[selectedLeadIndex].contactNumber]?.firstOrderDate
                        ? new Date(shopifyDatesMap[leads[selectedLeadIndex].contactNumber].firstOrderDate).toLocaleDateString()
                        : "N/A"}
                    </Typography>
                  </Box>

                  {/* Shopify Last Order Date */}
                  <Box sx={{ minWidth: 150 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Last Order Date
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: "normal", whiteSpace: "nowrap" }}
                    >
                      {leads[selectedLeadIndex]?.lastOrderDate
                        ? new Date(leads[selectedLeadIndex].lastOrderDate).toLocaleDateString()
                        : "N/A"}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 150 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Total Spend
                    </Typography>
                    <Typography variant="body2">
                      ₹{shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber]?.totalSpend?.toFixed(2) || "0.00"}
                    </Typography>
                  </Box>
                </Stack>

                <Box sx={{ mt: 2 }}>
                  <Button
                    onClick={() => setShowOrders((prev) => !prev)}
                    endIcon={showOrders ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    sx={{
                      fontSize: "0.75rem",
                      textTransform: "none",
                      backgroundColor: "white",
                      color: "black",
                    }}
                  >
                    See More
                  </Button>

                  {showOrders && (
                    <Box sx={{ mt: 2 }}>
                      {/* Total Orders Count */}
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Total Orders: {shopifyDatesMap[leads[selectedLeadIndex].contactNumber]?.orders?.length || 0}
                      </Typography>

                      {/* Orders List */}
                      {(shopifyDatesMap[leads[selectedLeadIndex].contactNumber]?.orders || []).map((order, i) => (
                        <Box
                          key={order.id}
                          sx={{ border: "1px solid #ccc", borderRadius: 1, p: 1, mb: 1, fontSize: "0.75rem" }}
                        >
                          <Typography><b>Order ID:</b> {order.id}</Typography>
                          <Typography><b>Total Amount:</b> ₹{order.total_price}</Typography>
                          <Typography><b>Date:</b> {new Date(order.created_at).toLocaleString()}</Typography>
                          <Typography><b>Fulfillment Status:</b> {order.fulfillment_status || "Unfulfilled"}</Typography>
                          <Typography><b>Items:</b> {order.line_items.map(item => `${item.quantity} x ${item.name}`).join(", ")}</Typography>

                          <Box>
                            <Button
                              size="small"
                              sx={{
                                mt: 1,
                                backgroundColor: "white",
                                color: "black",
                                fontSize: "0.7rem",
                              }}
                              onClick={() => {
                                const updated = [...(shopifyDatesMap[leads[selectedLeadIndex].contactNumber].orders || [])];
                                updated[i].showAddress = !updated[i].showAddress;
                                setShopifyDatesMap(prev => ({
                                  ...prev,
                                  [leads[selectedLeadIndex].contactNumber]: {
                                    ...prev[leads[selectedLeadIndex].contactNumber],
                                    orders: updated,
                                  },
                                }));
                              }}
                            >
                              {order.showAddress ? "Hide Address" : "Show Address"}
                            </Button>
                            {order.showAddress && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                {order.shipping_address?.address1 || ""}, {order.shipping_address?.city || ""}, {order.shipping_address?.zip || ""}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Paper>
              <Details contactNumber={leads[selectedLeadIndex]?.contactNumber} />

              <RetentionFollowUp contactNumber={leads[selectedLeadIndex]?.contactNumber} />

            </Box>

            {/* Image Upload Section - 30% width */}
            <Paper
              sx={{
                width: "30%",
                p: 2,
                boxShadow: 2,
                borderRadius: 2,
                backgroundColor: "background.paper",
                fontSize: "0.85rem",
                display: "flex",
                flexDirection: "column",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
              elevation={3}
            >
              <Typography variant="h6" gutterBottom>
                Upload Images
              </Typography>

              <Button variant="outlined" component="label" sx={{ mb: 2 }}>
                Select Images
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
              </Button>

              {/* Render grouped images */}
              {Object.keys(groupedImages).sort((a, b) => b - a).map((year) => (
                <Box key={year} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                    {year}
                  </Typography>

                  {Object.keys(groupedImages[year]).map((month) => (
                    <Box key={month} sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {month}
                      </Typography>

                      {Object.keys(groupedImages[year][month])
                        .sort((a, b) => b - a)
                        .map((day) => {
                          const imagesOnDate = groupedImages[year][month][day];
                          return (
                            <Box key={day} sx={{ mb: 2 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "inline-block",
                                  backgroundColor: "grey.300",
                                  px: 1,
                                  py: 0.3,
                                  borderRadius: 1,
                                  mb: 1,
                                  fontWeight: "bold",
                                }}
                              >
                                {`${day} ${month} ${year}`}
                              </Typography>

                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 1,
                                }}
                              >
                                {imagesOnDate.map(({ preview, index, tag }, i) => (
                                  <Box
                                    key={index}
                                    sx={{
                                      position: "relative",
                                      cursor: "pointer",
                                      borderRadius: 1,
                                      border: "1px solid #ccc",
                                      overflow: "hidden",
                                      height: 100,
                                    }}
                                  >
                                    <img
                                      src={preview}
                                      alt={`img-${index}`}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                      onClick={() => openModal(imagesOnDate, i)}
                                    />

                                    {/* Delete icon */}
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveImage(index);
                                      }}
                                      sx={{
                                        position: "absolute",
                                        top: 2,
                                        right: 2,
                                        bgcolor: "rgba(255,255,255,0.7)",
                                      }}
                                    >
                                      ×
                                    </IconButton>

                                    {/* Add tag button */}
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        position: "absolute",
                                        bottom: 2,
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        bgcolor: "rgba(255,255,255,0.8)",
                                        fontSize: "0.7rem",
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTagDialogImageIndex(index);
                                        setTagDialogValue(tag || "");
                                        setTagDialogOpen(true);
                                      }}
                                    >
                                      {tag || "Add Tag"}
                                    </Button>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          );
                        })}
                    </Box>
                  ))}
                </Box>
              ))}

              <Dialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)}>
                <DialogTitle>Select Tag</DialogTitle>
                <DialogContent>
                  <Select
                    fullWidth
                    value={tagDialogValue}
                    onChange={(e) => setTagDialogValue(e.target.value)}
                    size="small"
                    sx={{ minWidth: 200 }}
                  >
                    <MenuItem value="Pre Meal">Pre Meal</MenuItem>
                    <MenuItem value="Post Meal">Post Meal</MenuItem>
                  </Select>
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => {
                      if (tagDialogImageIndex !== null) {
                        handleAddTag(tagDialogImageIndex, tagDialogValue);
                      }
                      setTagDialogOpen(false);
                    }}
                    variant="contained"
                  >
                    Save
                  </Button>
                  <Button onClick={() => setTagDialogOpen(false)}>Cancel</Button>
                </DialogActions>
              </Dialog>


              {/* Modal */}
              {modalOpen && (
                <Box
                  sx={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: "rgba(0,0,0,0.7)",
                    zIndex: 1300,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onClick={closeModal}
                >
                  <Box
                    sx={{
                      position: "relative",
                      bgcolor: "background.paper",
                      borderRadius: 2,
                      p: 2,
                      maxWidth: "90vw",
                      maxHeight: "90vh",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      userSelect: "none",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={modalImages[modalIndex].preview || modalImages[modalIndex].url || ""}
                      alt="modal-img"
                      style={{
                        maxWidth: "80vw",
                        maxHeight: "70vh",
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    />

                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <Button variant="outlined" onClick={prevImage}>
                        Prev
                      </Button>
                      <Button variant="outlined" onClick={nextImage}>
                        Next
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={deleteModalImage}
                      >
                        Delete
                      </Button>
                      <Button variant="text" onClick={closeModal}>
                        Close
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}
            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
};

export default RetentionLeads;
