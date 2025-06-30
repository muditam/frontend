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
import CreateOrderPopup from "./CreateOrderPopup";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FormatColorFillIcon from "@mui/icons-material/FormatColorFill";
import { Menu as MuiMenu } from "@mui/material";
import CommentIcon from '@mui/icons-material/Comment';
import PhoneIcon from "@mui/icons-material/Phone";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import AddIcon from "@mui/icons-material/Add";
import HistoryIcon from "@mui/icons-material/History";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Badge from "@mui/material/Badge";

import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [orderPlacedFilter, setOrderPlacedFilter] = useState("Order Placed"); // or "Order Not Placed"
  const [dateRangeFilter, setDateRangeFilter] = useState("");

  const [logPopupAnchor, setLogPopupAnchor] = useState(null);
  const [reachoutMethod, setReachoutMethod] = useState("");
  const [reachoutStatus, setReachoutStatus] = useState("");
  const [reachoutTimestamp, setReachoutTimestamp] = useState(null);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsData, setLogsData] = useState([]);
  const [moreOptionsAnchorEl, setMoreOptionsAnchorEl] = useState(null);
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState(null);


  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState(null);

  const [noteInputs, setNoteInputs] = useState({});
  const [savingNotes, setSavingNotes] = useState({});


  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagDialogImageIndex, setTagDialogImageIndex] = useState(null);
  // const [subcellsPopup, setSubcellsPopup] = useState({ open: false, subcells: [] });
  const [tagDialogValue, setTagDialogValue] = useState("");

  const [copySuccess, setCopySuccess] = useState(false);

  const [sortSubMenuAnchorEl, setSortSubMenuAnchorEl] = useState(null);
  const [activeSortType, setActiveSortType] = useState(null);

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const [rtSubcellsDialogOpen, setRtSubcellsDialogOpen] = useState(false);

  const [subcellsPopup, setSubcellsPopup] = useState({ open: false, subcells: [] });





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

  const [anchorElColor, setAnchorElColor] = useState(null);
  const [colorMenuIdx, setColorMenuIdx] = useState(null);

  const [shipmentStatusMap, setShipmentStatusMap] = useState({});

  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [consultationLoading, setConsultationLoading] = useState(false);

  const [orderPopupOpen, setOrderPopupOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);


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
        today.setHours(0, 0, 0, 0); // normalize to midnight
        date.setHours(0, 0, 0, 0); // normalize to midnight
        const diffInDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
        if (diffInDays < 0) return "Follow-up Missed";
        if (diffInDays === 0) return "Today";
        if (diffInDays === 1) return "Tomorrow";
        if (diffInDays >= 2) return "Later";
        return "";
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

  const saveSubcellsToBackend = async (leadId, subcells) => {
    try {
      await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${leadId}`, { rtSubcells: subcells });
    } catch (error) {
      console.error("Error saving subcells:", error);
    }
  };


  const handleAddSubcell = (leadIndex) => {
    const updatedLeads = [...leads];
    const lead = updatedLeads[leadIndex];
    lead.rtSubcells = lead.rtSubcells || [];
    lead.rtSubcells.push({ date: new Date().toLocaleDateString(), value: "" });
    setLeads(updatedLeads);
    saveSubcellsToBackend(lead._id, lead.rtSubcells);  // save to backend
  };

  const handleSubcellChange = (leadIndex, subcellIndex, e) => {
    const updatedLeads = [...leads];
    updatedLeads[leadIndex].rtSubcells[subcellIndex].value = e.target.value;
    setLeads(updatedLeads);
    saveSubcellsToBackend(updatedLeads[leadIndex]._id, updatedLeads[leadIndex].rtSubcells); // save updated subcells
  };


  const fetchShopifyDates = async (phoneNumber) => {
    try {
      const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/orders-dates", {
        params: { phoneNumber },
      });

      // Store order data as before
      setShopifyDatesMap((prev) => ({
        ...prev,
        [phoneNumber]: {
          firstOrderDate: res.data.firstOrderDate,
          lastOrderDate: res.data.lastOrderDate,
          totalSpend: res.data.totalSpend || 0,
          orders: res.data.orders || [],
        },
      }));

      // Get all order IDs from Shopify orders
      const orderIds = (res.data.orders || []).map(order => order.name.replace(/^#/, ''));

      if (orderIds.length > 0) {
        // Fetch shipment statuses for all these order IDs in one backend call
        // Backend API should accept ?order_ids=1001,1002,1003 etc and return { order_id: shipment_status }
        const response = await axios.get(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders/by-order-ids`,
          {
            params: { order_ids: orderIds.join(',') }
          }
        );
        // Example response: [{order_id: '1001', shipment_status: 'Delivered'}, ...]
        const statusMap = {};
        response.data.forEach((order) => {
          statusMap[order.order_id] = order.shipment_status;
        });
        setShipmentStatusMap(statusMap);
      } else {
        setShipmentStatusMap({});
      }
    } catch (err) {
      console.error("Failed to fetch Shopify dates or shipment statuses", err);
      setShopifyDatesMap((prev) => ({
        ...prev,
        [phoneNumber]: {
          firstOrderDate: null,
          lastOrderDate: null,
          totalSpend: 0,
        },
      }));
      setShipmentStatusMap({});
    }
  };

  const getReachoutTimestamp = (lead, mode = "latest") => {
    if (!lead.reachoutLogs || lead.reachoutLogs.length === 0) return null;
    const timestamps = lead.reachoutLogs
      .map((log) => new Date(log.timestamp).getTime())
      .filter(Boolean);
    if (timestamps.length === 0) return null;
    return mode === "latest"
      ? Math.max(...timestamps)
      : Math.min(...timestamps);
  };

  const groupLogsByDate = (logs) => {
    const grouped = {};

    logs.forEach((log) => {
      const dateStr = new Date(log.timestamp).toLocaleDateString(); // e.g. '26/05/2025'
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(log);
    });

    return grouped;
  };

  const groupedLogs = groupLogsByDate(logsData);

  // Get all dates sorted descending so last date is first
  const sortedDates = Object.keys(groupedLogs).sort(
    (a, b) => new Date(b) - new Date(a)
  );

  const [expandedDate, setExpandedDate] = React.useState(sortedDates[0] || null);

  const handleAccordionChange = (date) => (event, isExpanded) => {
    setExpandedDate(isExpanded ? date : null);
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
        preview: img.url || img.preview,
        date: img.date ? new Date(img.date) : new Date(),
        tag: img.tag || "",
        index: idx,
      }));
      setUploadedImages(imgs);
    } else {
      setUploadedImages([]);
    }
  }, [selectedLeadIndex, leads]);

  const getDetailsCompletionPercent = (details) => {
    if (!details) return 0;
    const totalFields = Object.keys(details).length;
    if (totalFields === 0) return 0;
    const filledFields = Object.values(details).filter(val => {
      if (Array.isArray(val)) return val.length > 0;
      return val !== null && val !== undefined && val !== "";
    }).length;
    return Math.round((filledFields / totalFields) * 100);
  };


  // Load more leads on scroll near bottom
  const loadMoreLeads = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      const filtered = filteredLeadsByFilters(allLeads);
      const nextBatch = filtered.slice(currentIndex, currentIndex + leadsPerPage);
      setLeads((prev) => [...prev, ...nextBatch]);
      setCurrentIndex((prev) => prev + leadsPerPage);
      setHasMore(currentIndex + leadsPerPage < filteredAllLeads.length);
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

  const handleColorSelect = async (color, index) => {
    const updatedLeads = [...leads];
    updatedLeads[index].rowColor = color;
    setLeads(updatedLeads);
    setAnchorElColor(null);
    setColorMenuIdx(null);

    try {
      await axios.put(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${updatedLeads[index]._id}`,
        { rowColor: color }
      );
    } catch (error) {
      console.error("Error updating row color:", error);
    }
  };


  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  const applyFilters = useCallback(() => {
    const filtered = filteredLeadsByFilters([...allLeads]);
    setFilteredAllLeads(filtered);
    setLeads(filtered.slice(0, leadsPerPage));
    setCurrentIndex(leadsPerPage);
    setHasMore(filtered.length > leadsPerPage);
  }, [allLeads, filters, orderPlacedFilter, dateRangeFilter]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);



  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user && user.role === "Retention Agent") {
      setLoggedInUser(user);
      fetchRetentionLeads(user);
    }
  }, []);

  useEffect(() => {
    setReachoutMethod("");
    setReachoutStatus("");
    setLogPopupAnchor(null);
    setReachoutTimestamp(null);
  }, [selectedLeadIndex]);

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

  const handleCreateOrderClick = (lead) => {
    setSelectedLead(lead); // where lead = { name, phone }
    setOrderPopupOpen(true);
  };


  const filterLeadsByShipmentStatus = async (status) => {
    try {
      setLoading(true);
      setShipmentStatusFilter(status);

      const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders/by-shipment-status", {
        params: { shipment_status: status },
      });

      const orders = res.data;

      const contactNumbersWithStatus = new Set(
        orders.map(order => order.contact_number)
      );

      const filteredLeads = allLeads.filter(lead =>
        contactNumbersWithStatus.has(lead.contactNumber)
      );

      setFilteredAllLeads(filteredLeads);
      setLeads(filteredLeads.slice(0, leadsPerPage));
      setHasMore(filteredLeads.length > leadsPerPage);
      setSelectedLeadIndex(null);
    } catch (error) {
      console.error("Error filtering by shipment status:", error);
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

  const updateLeadDetails = (contactNumber, newDetails) => {
    setLeads((prevLeads) => {
      return prevLeads.map((lead) =>
        lead.contactNumber === contactNumber ? { ...lead, details: newDetails } : lead
      );
    });
  };

  const filteredLeadsByFilters = (inputLeads) => {
    let filtered = inputLeads;

    // Search filter (name/contact)
    const search = filters.name.trim().toLowerCase();
    if (search) {
      filtered = filtered.filter((lead) => {
        const nameMatch = lead.name?.toLowerCase().includes(search);
        const numberMatch = lead.contactNumber?.includes(search);
        return nameMatch || numberMatch;
      });
    }

    // Retention Status filter
    if (filters.retentionStatus && filters.retentionStatus !== "All") {
      const statusFilter = filters.retentionStatus.toLowerCase();
      filtered = filtered.filter((lead) => {
        const leadStatus = (lead.retentionStatus || "").toLowerCase();
        if (statusFilter === "active") {
          return leadStatus === "active" || leadStatus === "";
        } else if (statusFilter === "lost") {
          return leadStatus === "lost";
        }
        return true;
      });
    }

    // If Acquired By → filter by selected month + year like "March 2025"
    if (
      dateRangeFilter &&
      dateRangeFilter.includes(" ") &&
      [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ].some((month) => dateRangeFilter.startsWith(month))
    ) {
      const [monthName, year] = dateRangeFilter.split(" ");
      filtered = filtered.filter((lead) => {
        if (!lead.lastOrderDate) return false;
        const orderDate = new Date(lead.lastOrderDate);
        const monthMatch = orderDate.toLocaleString("default", { month: "long" }) === monthName;
        const yearMatch = orderDate.getFullYear().toString() === year;
        return monthMatch && yearMatch;
      });

      // Sort by year newest first (if needed)
      filtered.sort((a, b) => {
        const yearA = new Date(a.lastOrderDate).getFullYear();
        const yearB = new Date(b.lastOrderDate).getFullYear();
        return yearB - yearA;
      });
    }

    // Follow-up Reminder filter
    if (filters.rtFollowupReminder !== null) {
      const reminderFilter = filters.rtFollowupReminder;
      filtered = filtered.filter((lead) => {
        const reminder = lead.rtFollowupReminder || "";
        if (reminderFilter === "") {
          return reminder === "";
        } else {
          return reminder === reminderFilter;
        }
      });
    }

    // Order Placed filter
    if (orderPlacedFilter === "Order Placed") {
      filtered = filtered.filter((lead) => !!lead.lastOrderDate);
    } else if (orderPlacedFilter === "Order Not Placed") {
      filtered = filtered.filter((lead) => !lead.lastOrderDate);
    }

    // Date range filters (like Today, Last 7 Days)
    if (dateRangeFilter && !dateRangeFilter.includes(" ")) {
      const now = new Date();
      const isSameMonth = (d1, d2) =>
        d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

      filtered = filtered.filter((lead) => {
        if (!lead.lastOrderDate) return false;
        const date = new Date(lead.lastOrderDate);
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

    // Final sort: leads with lastOrderDate first (descending)
    filtered.sort((a, b) => {
      if (!a.lastOrderDate && !b.lastOrderDate) return 0;
      if (!a.lastOrderDate) return 1;
      if (!b.lastOrderDate) return -1;
      return new Date(b.lastOrderDate) - new Date(a.lastOrderDate);
    });

    return filtered;
  };


  const handleSortMenuClick = (event, type) => {
    setActiveSortType(type);
    setSortSubMenuAnchorEl(event.currentTarget);
  };

  // Handle sort by color option click
  const handleSortByColor = (color) => {
    // Filter leads by color or clear filter
    const filtered = color
      ? allLeads.filter((lead) => (lead.rowColor || "") === color)
      : allLeads;

    setFilteredAllLeads(filtered);
    setLeads(filtered.slice(0, leadsPerPage));
    setHasMore(filtered.length > leadsPerPage);
    setSelectedLeadIndex(null);

    setSortMenuAnchorEl(null);
    setSortSubMenuAnchorEl(null);
    setActiveSortType(null);
  };

  // Handle sort by reachout date
  const handleSortByReachoutDate = (option) => {
    let sorted = [...allLeads];

    if (option === "Recently Contacted") {
      sorted.sort((a, b) => {
        const aLatest = getReachoutTimestamp(a, "latest") || 0;
        const bLatest = getReachoutTimestamp(b, "latest") || 0;
        return bLatest - aLatest; // Descending - recent first
      });
    } else if (option === "Long Ago") {
      sorted.sort((a, b) => {
        const aOldest = getReachoutTimestamp(a, "oldest") || 0;
        const bOldest = getReachoutTimestamp(b, "oldest") || 0;
        return aOldest - bOldest; // Ascending - oldest first
      });
    }

    setFilteredAllLeads(sorted);
    setLeads(sorted.slice(0, leadsPerPage));
    setHasMore(sorted.length > leadsPerPage);
    setSelectedLeadIndex(null);

    setSortMenuAnchorEl(null);
    setSortSubMenuAnchorEl(null);
    setActiveSortType(null);
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
          pt: 0,
          px: 1,
          pb: 1,
          bgcolor: "background.paper",
          overflowY: "auto",
        }}
        ref={containerRef}
      >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: "background.paper",
            mt: 0,
            pt: 1,
            pb: 1,
            borderBottom: "1px solid #ddd",
          }}
        >
          {/* Search + Filter + Sort + More icons */}
          <Stack direction="row" spacing={2}>
            {[
              {
                label: "All",
                value: "All",
                count: allLeads.length,
              },
              {
                label: "Active",
                value: "Active",
                count: allLeads.filter(
                  (lead) =>
                    !lead.retentionStatus || lead.retentionStatus.toLowerCase() === "active"
                ).length,
              },
              {
                label: "Lost",
                value: "Lost",
                count: allLeads.filter(
                  (lead) =>
                    lead.retentionStatus &&
                    lead.retentionStatus.toLowerCase() === "lost"
                ).length,
              },
            ].map(({ label, value, count }) => {
              const isSelected = filters.retentionStatus === value;

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
                    <Typography>{label}</Typography>
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
              { label: "Not Set", value: "" },
            ].map(({ label, value }) => {
              const isSelected = filters.rtFollowupReminder === value;
              return (
                <Button
                  key={label}
                  variant={isSelected ? "contained" : "outlined"}
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      rtFollowupReminder: isSelected ? null : value,
                      // Do NOT reset retentionStatus here; keep it as-is to combine filters
                    }));
                  }}
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
                    <Typography
                      variant="caption"
                      sx={{ fontSize: "0.6rem", opacity: 0.7 }}
                    >
                      {
                        allLeads.filter((lead) => {
                          const retentionOk =
                            filters.retentionStatus === "All"
                              ? true
                              : filters.retentionStatus === "Active"
                                ? !lead.retentionStatus || lead.retentionStatus?.toLowerCase() === "active"
                                : filters.retentionStatus === "Lost"
                                  ? lead.retentionStatus?.toLowerCase() === "lost"
                                  : true;
                          return retentionOk && (lead.rtFollowupReminder || "") === value;
                        }).length
                      }
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
              <Badge
                color="primary"
                badgeContent={
                  // Show count only if "Acquired In" filter active and dateRangeFilter set
                  orderPlacedFilter === "Acquired In" && dateRangeFilter
                    ? filteredAllLeads.length
                    : 0
                }
                max={9999}
                invisible={
                  !(orderPlacedFilter === "Acquired In" && dateRangeFilter && filteredAllLeads.length > 0)
                }
                overlap="circular"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <IconButton
                  size="small"
                  onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                  aria-label={`Filter leads${orderPlacedFilter === "Acquired In" && dateRangeFilter ? `: ${dateRangeFilter}` : ''}`}
                >
                  <FilterListIcon />
                </IconButton>
              </Badge>
            </Tooltip>
            <Tooltip title="Sort">
              <IconButton size="small" onClick={(e) => setSortMenuAnchorEl(e.currentTarget)}>
                <SortIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="More options">
              <IconButton
                size="small"
                onClick={(e) => setMoreOptionsAnchorEl(e.currentTarget)}
              >
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Menu
          anchorEl={moreOptionsAnchorEl}
          open={Boolean(moreOptionsAnchorEl)}
          onClose={() => setMoreOptionsAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
          {["Delivered", "Out For Delivery", "In Transit", "RTO Delivered"].map((status) => (
            <MenuItem
              key={status}
              onClick={async () => {
                setMoreOptionsAnchorEl(null);
                await filterLeadsByShipmentStatus(status);
              }}
            >
              {status}
            </MenuItem>
          ))}
        </Menu>



        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={() => {
            setFilterAnchorEl(null);
            setSelectedYear(null); // reset year on close
            setSelectedMonth(null); // reset month on close
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Left column - Order Type + Acquired By */}
            <Box>
              <Typography
                sx={{ fontSize: "0.75rem", fontWeight: "bold", px: 2, pt: 1, pb: 0.5, color: "text.disabled" }}
              >
                Filter Type
              </Typography>
              {["Order Placed", "Order Not Placed", "Acquired In"].map((type) => (
                <MenuItem
                  key={type}
                  selected={orderPlacedFilter === type}
                  onClick={() => {
                    setOrderPlacedFilter(type);
                    setDateRangeFilter("");
                    setSelectedYear(null); // reset on type change
                    setSelectedMonth(null);
                  }}
                >
                  {type}
                </MenuItem>
              ))}
            </Box>

            {/* Right column */}
            {orderPlacedFilter && (
              <Box sx={{ pl: 3 }}>
                <Typography
                  sx={{ fontSize: "0.75rem", fontWeight: "bold", px: 2, pt: 1, pb: 0.5, color: "text.disabled" }}
                >
                  {orderPlacedFilter === "Acquired In"
                    ? selectedYear
                      ? "Select Month"
                      : "Select Year"
                    : "Date Range"}
                </Typography>

                {orderPlacedFilter === "Acquired In" ? (
                  !selectedYear ? (
                    [2023, 2024, 2025].map((year) => (
                      <MenuItem
                        key={year}
                        selected={selectedYear === year}
                        onClick={() => setSelectedYear(year)}
                      >
                        {year}
                      </MenuItem>
                    ))
                  ) : (
                    [
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December"
                    ].map((month) => (
                      <MenuItem
                        key={month}
                        selected={selectedMonth === month}
                        onClick={() => {
                          const combined = `${month} ${selectedYear}`;
                          setSelectedMonth(month);
                          setDateRangeFilter(combined);
                          setFilterAnchorEl(null);
                        }}
                      >
                        {month}
                      </MenuItem>
                    ))
                  )
                ) : (
                  [
                    "Today",
                    "Yesterday",
                    "Last 7 Days",
                    "Last 10 Days",
                    "10–20 Days Ago",
                    "21–30 Days Ago",
                    "This Month (Month to Date)",
                    "Last Month",
                    "Last 30 Days",
                    "Last 90 Days"
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
                  ))
                )}
              </Box>
            )}
          </Box>
        </Menu>

        <Menu
          anchorEl={sortMenuAnchorEl}
          open={Boolean(sortMenuAnchorEl)}
          onClose={() => {
            setSortMenuAnchorEl(null);
            setSortSubMenuAnchorEl(null);
            setActiveSortType(null);
          }}
        >
          <MenuItem
            onClick={(e) => handleSortMenuClick(e, "color")}
            aria-haspopup="true"
            aria-controls="color-submenu"
          >
            Sort By Color
          </MenuItem>

          <MenuItem
            onClick={(e) => handleSortMenuClick(e, "reachout")}
            aria-haspopup="true"
            aria-controls="reachout-submenu"
          >
            Sort By Reached Out Date
          </MenuItem>
        </Menu>

        {/* Submenu - shows options based on activeSortType */}
        <Menu
          id={activeSortType === "color" ? "color-submenu" : "reachout-submenu"}
          anchorEl={sortSubMenuAnchorEl}
          open={Boolean(sortSubMenuAnchorEl)}
          onClose={() => {
            setSortSubMenuAnchorEl(null);
            setActiveSortType(null);
            setSortMenuAnchorEl(null);
          }}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          MenuListProps={{ dense: true }}
        >
          {activeSortType === "color" &&
            [
              { label: "Good", color: "#ffdbbb" },
              { label: "Very Good", color: "#baddff" },
              { label: "Excellent", color: "#bafff5" },
              { label: "No Color", color: "" },
            ].map(({ label, color }) => (
              <MenuItem
                key={label}
                onClick={() => handleSortByColor(color)}
              >
                <Box
                  sx={{
                    backgroundColor: color || "#f0f0f0",
                    width: 16,
                    height: 16,
                    borderRadius: 0.5,
                    border: "1px solid #ccc",
                    mr: 1,
                  }}
                />
                {label}
              </MenuItem>
            ))}

          {activeSortType === "reachout" &&
            ["Recently Contacted", "Long Ago"].map((option) => (
              <MenuItem
                key={option}
                onClick={() => handleSortByReachoutDate(option)}
              >
                {option}
              </MenuItem>
            ))}
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
                  backgroundColor: lead.rowColor
                    ? lead.rowColor
                    : isSelected
                      ? "rgba(25, 118, 210, 0.15)"
                      : "inherit",
                  position: "relative",
                }}
                onClick={() => {
                  setLeadLoading(true);
                  handleLeadSelect(idx);
                  setTimeout(() => setLeadLoading(false), 500);
                }}
              >
                <ListItemAvatar sx={{ position: "relative" }}>
                  <Avatar sx={{ bgcolor: "black", fontSize: "0.8rem" }}>
                    {initials}
                  </Avatar>
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      top: -6,
                      left: -6,
                      bgcolor: "white",
                      width: 20,
                      height: 20,
                      p: 0.3,
                      boxShadow: 1,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorMenuIdx(idx);
                      setAnchorElColor(e.currentTarget);
                    }}
                  >
                    <FormatColorFillIcon fontSize="inherit" style={{ fontSize: "0.75rem" }} />
                  </IconButton>
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

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>


                          <Menu
                            anchorEl={anchorElColor}
                            open={colorMenuIdx === idx}
                            onClose={() => {
                              setAnchorElColor(null);
                              setColorMenuIdx(null);
                            }}
                          >
                            <MenuItem onClick={() => handleColorSelect("#ffdbbb", idx)}>Good</MenuItem>
                            <MenuItem onClick={() => handleColorSelect("#baddff", idx)}>Very Good</MenuItem>
                            <MenuItem onClick={() => handleColorSelect("#bafff5", idx)}>Excellent</MenuItem>
                            <MenuItem onClick={() => handleColorSelect("", idx)}>Remove Color</MenuItem>
                          </Menu>


                          <Chip
                            label={tagInfo.label}
                            color={tagInfo.color}
                            size="small"
                            sx={{ fontWeight: "bold" }}
                          />
                        </Box>
                      </Box>

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
                <Typography
                  variant="caption"
                  sx={{
                    position: "absolute",
                    right: 5,
                    top: "15%",
                    transform: "translateY(-50%)",
                    fontWeight: "bold",
                    fontSize: "0.7rem",
                    color: "text.secondary",
                    whiteSpace: "nowrap",
                  }}
                  title="Details completion %"
                >
                  {getDetailsCompletionPercent(lead.details)}%
                </Typography>
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
                  backgroundColor: "background.paper",
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
                        {leads[selectedLeadIndex]?.contactNumber || "N/A"}
                      </Typography>
                      <Tooltip title="Call">
                        <IconButton
                          color="default"
                          sx={{ color: "black" }}
                          onClick={() =>
                            handleCallIconClick(leads[selectedLeadIndex]?.contactNumber)
                          }
                        >
                          <PhoneIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Copy Number">
                        <IconButton
                          color="default"
                          sx={{ color: "black" }}
                          onClick={() => handleCopy(leads[selectedLeadIndex]?.contactNumber)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Log Reachout">
                        <IconButton
                          sx={{ color: "black" }}
                          onClick={(e) => {
                            setReachoutTimestamp(new Date());
                            setReachoutMethod("");
                            setReachoutStatus("");
                            setLogPopupAnchor(e.currentTarget);
                          }}
                        >
                          <AddIcon />
                        </IconButton>
                      </Tooltip>


                      <Tooltip title="View Logs">
                        <IconButton
                          sx={{ color: "black" }}
                          onClick={() => {
                            fetchLogs(leads[selectedLeadIndex]._id);
                            setLogsModalOpen(true);
                          }}
                        >
                          <Badge
                            badgeContent={Object.keys(
                              groupLogsByDate(leads[selectedLeadIndex]?.reachoutLogs || [])
                            ).length}
                            sx={{
                              "& .MuiBadge-badge": {
                                backgroundColor: "black",
                                color: "white",
                                boxShadow: '0 0 0 2px white',
                              },
                            }}
                          >
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
                                  {["OC", "CNP", "Followup Done", "Order Placed", "Call Back Later", "Busy", "Switch Off", "Drop On Intro"].map(status => (
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
                          {sortedDates.map((date) => (
                            <Accordion
                              key={date}
                              expanded={expandedDate === date}
                              onChange={handleAccordionChange(date)}
                            >
                              <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                              >
                                <Typography sx={{ fontWeight: "bold" }}>{date}</Typography>
                                <Box sx={{ minWidth: 120, textAlign: "right" }}>
                                  <Typography sx={{ fontSize: "1rem", color: "text.secondary", whiteSpace: "nowrap", fontWeight: "bold" }}>
                                    {groupedLogs[date]?.length > 0
                                      ? groupedLogs[date][groupedLogs[date].length - 1].status
                                      : ""}
                                  </Typography>
                                </Box>
                              </AccordionSummary>
                              <AccordionDetails>
                                {groupedLogs[date].map((log, idx) => {
                                  const time = new Date(log.timestamp).toLocaleTimeString();
                                  return (
                                    <Box
                                      key={idx}
                                      sx={{
                                        display: "flex",
                                        gap: 2,
                                        fontSize: "0.85rem",
                                        px: 1,
                                        mb: 0.3,
                                      }}
                                    >
                                      <Box sx={{ width: 100 }}>{time}</Box>
                                      <Box sx={{ width: 100 }}>{log.method}</Box>
                                      <Box sx={{ flexGrow: 1 }}>{log.status}</Box>
                                    </Box>
                                  );
                                })}
                              </AccordionDetails>
                            </Accordion>
                          ))}
                        </DialogContent>
                      </Dialog>

                    </Box>
                  </Box>

                  <Box sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Customer Name
                    </Typography>
                    <Typography variant="body2">
                      {leads[selectedLeadIndex]?.name || "N/A"}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Agent Assigned
                    </Typography>
                    <Typography variant="body2">
                      {leads[selectedLeadIndex]?.agentAssigned || "N/A"}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Next Followup Date
                    </Typography>
                    <TextField
                      type="date"
                      value={leads[selectedLeadIndex]?.rtNextFollowupDate || ""}
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
                      value={leads[selectedLeadIndex]?.rtFollowupStatus || ""}
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
                      value={leads[selectedLeadIndex]?.retentionStatus || ""}
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

                  <Box sx={{ minWidth: 150 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Preferred Method
                    </Typography>
                    <Select
                      value={leads[selectedLeadIndex]?.communicationMethod || ""}
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

                  <Box sx={{ minWidth: 150 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                      Preferred Language
                    </Typography>
                    <Select
                      value={leads[selectedLeadIndex]?.preferredLanguage || ""}
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

                  <Box sx={{ minWidth: 150, display: 'flex', flexDirection: 'column', mt: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={1}>
                      Remark
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        label={
                          leads[selectedLeadIndex]?.rtSubcells?.length > 0
                            ? leads[selectedLeadIndex]?.rtSubcells[leads[selectedLeadIndex].rtSubcells.length - 1].date
                            : "Remark"
                        }
                        value={
                          leads[selectedLeadIndex]?.rtSubcells?.length > 0
                            ? leads[selectedLeadIndex]?.rtSubcells[leads[selectedLeadIndex].rtSubcells.length - 1].value
                            : leads[selectedLeadIndex]?.rtRemark || ""
                        }
                        onChange={(e) => {
                          if (leads[selectedLeadIndex]?.rtSubcells?.length > 0) {
                            handleSubcellChange(
                              selectedLeadIndex,
                              leads[selectedLeadIndex].rtSubcells.length - 1,
                              e
                            );
                          } else {
                            handleInputChange(e, selectedLeadIndex, "rtRemark");
                          }
                        }}
                        size="small"
                        fullWidth
                        variant="outlined"
                      />
                      <Tooltip title="Add Remark Entry">
                        <IconButton
                          size="small"
                          sx={{ color: "black" }}
                          onClick={() => handleAddSubcell(selectedLeadIndex)}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Remark History">
                        <IconButton
                          size="small"
                          sx={{ color: "black" }}
                          onClick={() =>
                            setSubcellsPopup({
                              open: true,
                              subcells: leads[selectedLeadIndex]?.rtSubcells || [],
                            })
                          }
                        >
                          <AccessTimeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>


                  <Dialog
                    open={subcellsPopup.open}
                    onClose={() => setSubcellsPopup({ open: false, subcells: [] })}
                    maxWidth="sm"
                    fullWidth
                  >
                    <DialogTitle sx={{ fontWeight: 600, textAlign: "center" }}>
                      Remark History
                    </DialogTitle>
                    <DialogContent>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <HeaderTableCell>Date</HeaderTableCell>
                            <HeaderTableCell>Remark</HeaderTableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {subcellsPopup.subcells.map((subcell, idx) => (
                            <StyledTableRow key={idx}>
                              <BodyTableCell>{subcell.date || "N/A"}</BodyTableCell>
                              <BodyTableCell>{subcell.value || "No Remark"}</BodyTableCell>
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
                    See Order History
                  </Button>

                  <Button
                    onClick={async () => {
                      setConsultationDialogOpen(true);
                      setConsultationLoading(true);
                      try {
                        const contactNumber = leads[selectedLeadIndex]?.contactNumber;
                        const res = await axios.get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-history?contactNumber=${contactNumber}`);
                        setConsultationHistory(res.data.consultations || []);
                      } catch (err) {
                        setConsultationHistory([]);
                      }
                      setConsultationLoading(false);
                    }}
                    sx={{
                      fontSize: "0.75rem",
                      textTransform: "none",
                      backgroundColor: "white",
                      color: "black",
                    }}
                  >
                    Consultation History
                  </Button>

                  <DialogActions>
                    <Button
                      onClick={() => setOrderPopupOpen(true)}
                      sx={{ color: "black" }}
                    >
                      Create Order 
                    </Button>
                  </DialogActions>
                  <CreateOrderPopup
                    open={orderPopupOpen}
                    onClose={() => setOrderPopupOpen(false)}
                    prefillCustomer={{
                      name: leads[selectedLeadIndex]?.name || "",
                      phone: leads[selectedLeadIndex]?.contactNumber || "",
                    }}
                  />
                  {showOrders && (
                    <Box sx={{ mt: 2 }}>
                      {/* Total Orders Count */}
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Total Orders: {shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber]?.orders?.length || 0}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 2 }}>
                        <Box sx={{ minWidth: 150 }}>
                          <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                            First Order Date
                          </Typography>
                          <Typography variant="body2">
                            {shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber]?.firstOrderDate
                              ? new Date(shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber].firstOrderDate).toLocaleDateString()
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
                      </Box>
                      {/* Orders List */}
                      {(shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber]?.orders || []).map((order, i) => {
                        const noteInput = noteInputs[order.id] || "";
                        const savingNote = savingNotes[order.id] || false;
                        const cleanOrderId = order.name.replace(/^#/, '').trim();
                        const shipmentStatus = shipmentStatusMap[cleanOrderId] || "N/A";

                        const handleNoteChange = (val) => {
                          setNoteInputs((prev) => ({ ...prev, [order.id]: val }));
                        };

                        const handleSaveNote = async () => {
                          if (!noteInput.trim()) {
                            alert("Note cannot be empty");
                            return;
                          }
                          setSavingNotes((prev) => ({ ...prev, [order.id]: true }));
                          try {
                            await axios.put(
                              `https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/orders/${order.id}/note`,
                              { note: noteInput }
                            );
                            setShopifyDatesMap((prev) => {
                              const updatedOrders = prev[leads[selectedLeadIndex]?.contactNumber].orders.map((o) =>
                                o.id === order.id ? { ...o, note: noteInput } : o
                              );
                              return {
                                ...prev,
                                [leads[selectedLeadIndex]?.contactNumber]: {
                                  ...prev[leads[selectedLeadIndex]?.contactNumber],
                                  orders: updatedOrders,
                                },
                              };
                            });
                            setNoteInputs((prev) => ({ ...prev, [order.id]: "" }));
                          } catch (error) {
                            console.error("Failed to save note", error.response?.data || error.message);
                            alert("Failed to save note");
                          } finally {
                            setSavingNotes((prev) => ({ ...prev, [order.id]: false }));
                          }
                        };

                        return (
                          <Box
                            key={order.id}
                            sx={{ border: "1px solid #ccc", borderRadius: 1, p: 1, mb: 1, fontSize: "0.75rem" }}
                          >
                            {/* First line: Order ID, Total Amount, Date, Fulfillment Status */}
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 2,
                                mb: 1,
                                fontWeight: "bold",
                                fontSize: "0.8rem",
                              }}
                            >
                              <Box>Order ID: {order.name}
                                <span style={{
                                  marginLeft: 12,
                                  fontWeight: "normal",
                                  color: "#222",
                                  background: "#f1f1f1",
                                  padding: "1px 6px",
                                  borderRadius: "6px",
                                  fontSize: "0.75em",
                                  marginRight: 8
                                }}>
                                  Delivery Status: <b>{shipmentStatus}</b>
                                </span>
                              </Box>
                              <Box>Total Amount: ₹{order.total_price}</Box>
                              <Box>Date: {new Date(order.created_at).toLocaleString()}</Box>
                              <Box>Fulfillment Status: {order.fulfillment_status || "Unfulfilled"}</Box>
                            </Box>

                            {/* Second line: Items on left, Notes on right */}
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 2,
                                mb: 1,
                              }}
                            >
                              {/* Items */}
                              <Box sx={{ flex: 1, minWidth: 0, fontSize: "0.75rem" }}>
                                <b>Items:</b> {order.line_items.map(item => `${item.quantity} x ${item.name}`).join(", ")}
                              </Box>

                              {/* Notes */}
                              <Box sx={{ minWidth: 200, maxWidth: 300 }}>
                                {order.note ? (
                                  <Typography sx={{ fontSize: "0.75rem", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                                    <b>Note:</b> {order.note}
                                  </Typography>
                                ) : (
                                  <Box sx={{ display: "flex", gap: 1 }}>
                                    <TextField
                                      size="small"
                                      variant="outlined"
                                      placeholder="Add note"
                                      value={noteInput}
                                      onChange={(e) => handleNoteChange(e.target.value)}
                                      disabled={savingNote}
                                      fullWidth
                                    />
                                    <Button
                                      variant="contained"
                                      size="small"
                                      onClick={handleSaveNote}
                                      disabled={savingNote}
                                    >
                                      {savingNote ? "Saving..." : "Save"}
                                    </Button>
                                  </Box>
                                )}
                              </Box>
                            </Box>

                            {/* Address toggle button and address */}
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
                                  const updated = [...(shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber].orders || [])];
                                  updated[i].showAddress = !updated[i].showAddress;
                                  setShopifyDatesMap(prev => ({
                                    ...prev,
                                    [leads[selectedLeadIndex]?.contactNumber]: {
                                      ...prev[leads[selectedLeadIndex]?.contactNumber],
                                      orders: updated,
                                    },
                                  }));
                                }}
                              >
                                {order.showAddress ? "Hide Address" : "Show Address"}
                              </Button>
                              {order.showAddress && (
                                <Typography variant="body2" sx={{ mt: 1, fontSize: "0.75rem" }}>
                                  {order.shipping_address?.address1 || ""}, {order.shipping_address?.city || ""}, {order.shipping_address?.zip || ""}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}

                  <Dialog open={consultationDialogOpen} onClose={() => setConsultationDialogOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ fontWeight: 600, textAlign: "center" }}>
                      Consultation History
                    </DialogTitle>
                    <DialogContent>
                      {consultationLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : consultationHistory.length === 0 ? (
                        <Typography align="center" color="text.secondary" sx={{ my: 3 }}>No consultation history found.</Typography>
                      ) : (
                        consultationHistory.map((cons, idx) => (
                          <Paper key={idx} sx={{ p: 2, mb: 2, borderRadius: 2, boxShadow: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                              Consultation #{consultationHistory.length - idx}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                              {/* Presales */}
                              <Box>
                                <Typography variant="body2" fontWeight={600}>HBA1c</Typography>
                                <Typography variant="body2">{cons.presales?.hba1c || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Last Test Done</Typography>
                                <Typography variant="body2">{cons.presales?.lastTestDone || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Fasting Sugar</Typography>
                                <Typography variant="body2">{cons.presales?.fastingSugar || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>PP Sugar</Typography>
                                <Typography variant="body2">{cons.presales?.ppSugar || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Duration of Diabetes</Typography>
                                <Typography variant="body2">{cons.presales?.durationOfDiabetes || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Gender</Typography>
                                <Typography variant="body2">{cons.presales?.gender || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Diet Type</Typography>
                                <Typography variant="body2">{cons.presales?.dietType || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Weight</Typography>
                                <Typography variant="body2">{cons.presales?.weight ?? '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Sitting Time</Typography>
                                <Typography variant="body2">{cons.presales?.sittingTime || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Exercise Routine</Typography>
                                <Typography variant="body2">{cons.presales?.exerciseRoutine || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Outside Meals</Typography>
                                <Typography variant="body2">{cons.presales?.outsideMeals || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Time Of Sleep</Typography>
                                <Typography variant="body2">{cons.presales?.timeOfSleep || '—'}</Typography>
                              </Box>

                              {/* Consultation */}
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Current Medications</Typography>
                                <Typography variant="body2">{(cons.consultation?.currentMedications || []).join(", ") || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Side Effects</Typography>
                                <Typography variant="body2">{cons.consultation?.sideEffects || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Sudden Sugar Fluctuations</Typography>
                                <Typography variant="body2">{cons.consultation?.suddenSugarFluctuations || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Symptoms</Typography>
                                <Typography variant="body2">{(cons.consultation?.symptoms || []).join(", ") || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Family History</Typography>
                                <Typography variant="body2">{cons.consultation?.familyHistory || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Other Conditions</Typography>
                                <Typography variant="body2">{(cons.consultation?.otherConditions || []).join(", ") || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Stress Level</Typography>
                                <Typography variant="body2">{cons.consultation?.stressLevel || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Monitor Blood Sugar</Typography>
                                <Typography variant="body2">{cons.consultation?.monitorBloodSugar || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Pain In Liver</Typography>
                                <Typography variant="body2">{cons.consultation?.painInLiver || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Gut Issues</Typography>
                                <Typography variant="body2">{cons.consultation?.gutIssues || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Energy Levels</Typography>
                                <Typography variant="body2">{cons.consultation?.energyLevels || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Sleep Quality</Typography>
                                <Typography variant="body2">{cons.consultation?.sleepQuality || '—'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Sugar Cravings</Typography>
                                <Typography variant="body2">{cons.consultation?.sugarCravings || '—'}</Typography>
                              </Box>
                            </Box>
                          </Paper>
                        ))
                      )}
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setConsultationDialogOpen(false)} sx={{ color: "black" }}>
                        Close
                      </Button>
                    </DialogActions>
                  </Dialog>


                </Box>
              </Paper>
              <Details contactNumber={leads[selectedLeadIndex]?.contactNumber} onDetailsUpdate={updateLeadDetails} />

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
                overflowY: "auto",
                color: "black", // Primary text color black
              }}
              elevation={3}
            >
              <Typography variant="h6" gutterBottom sx={{ color: "black" }}>
                Upload Images
              </Typography>

              <Button
                variant="outlined"
                component="label"
                sx={{ mb: 2, color: "black", borderColor: "black", "&:hover": { borderColor: "black" } }}
              >
                Select Images
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files);
                    if (!files.length || selectedLeadIndex === null) return;

                    const formData = new FormData();
                    files.forEach((file) => formData.append("images", file));

                    try {
                      const res = await axios.post(
                        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/upload-to-wasabi",
                        formData
                      );

                      const uploaded = res.data.uploadedFiles.map((img) => ({
                        url: img.url,
                        date: new Date(),
                        tag: "",
                      }));

                      const updatedImages = [...(leads[selectedLeadIndex].images || []), ...uploaded];

                      await axios.patch(
                        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${leads[selectedLeadIndex]._id}/images`,
                        { images: updatedImages }
                      );

                      const newLeads = [...leads];
                      newLeads[selectedLeadIndex].images = updatedImages;
                      setLeads(newLeads);

                      const imgsForDisplay = uploaded.map((img, i) => ({
                        preview: img.url,
                        date: new Date(),
                        tag: "",
                        index: uploadedImages.length + i,
                      }));
                      setUploadedImages((prev) => [...prev, ...imgsForDisplay]);
                    } catch (err) {
                      console.error("Failed to upload image:", err);
                      alert("Upload failed.");
                    }
                  }}
                />
              </Button>

              {/* Render grouped images */}
              {Object.keys(groupedImages)
                .sort((a, b) => b - a)
                .map((year) => (
                  <Box key={year} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: "black" }}>
                      {year}
                    </Typography>

                    {Object.keys(groupedImages[year]).map((month) => (
                      <Box key={month} sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: "black" }}>
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
                                    color: "black",
                                  }}
                                >
                                  {`${day} ${month} ${year}`}
                                </Typography>

                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "row",
                                    gap: 1,
                                    overflowX: "hidden", // Hide horizontal scroll
                                    pb: 1,
                                  }}
                                >
                                  {imagesOnDate.map(({ preview, index, tag, date }, i) => {
                                    const timeStr = new Date(date).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    });

                                    return (
                                      <Box
                                        key={index}
                                        sx={{
                                          position: "relative",
                                          cursor: "pointer",
                                          borderRadius: 1,
                                          border: "1px solid #ccc",
                                          overflow: "hidden",
                                          width: i === 0 || i === imagesOnDate.length - 1 ? 80 : 100, // smaller width on left and right edges
                                          height: 100,
                                          flex: "0 0 auto",
                                          boxShadow: 1,
                                          transition: "transform 0.2s",
                                          "&:hover": {
                                            transform: "scale(1.1)",
                                            zIndex: 5,
                                          },
                                        }}
                                        onClick={() => openModal(imagesOnDate, i)}
                                      >
                                        <img
                                          src={preview}
                                          alt={`img-${index}`}
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                          }}
                                        />

                                        {/* Tag badge if exists */}
                                        {tag && (
                                          <Box
                                            sx={{
                                              position: "absolute",
                                              top: 4,
                                              left: 4,
                                              backgroundColor: "black",
                                              color: "white",
                                              fontSize: "0.6rem",
                                              px: 0.5,
                                              py: 0.2,
                                              borderRadius: 0.5,
                                              zIndex: 2,
                                            }}
                                          >
                                            {tag}
                                          </Box>
                                        )}

                                        {/* Delete icon (dustbin) */}
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
                                            backgroundColor: "rgba(255,255,255,0.8)",
                                            zIndex: 2,
                                          }}
                                        >
                                          <DeleteIcon sx={{ fontSize: "1rem", color: "black" }} />
                                        </IconButton>

                                        {/* Add Tag button if no tag */}
                                        {!tag && (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                              position: "absolute",
                                              top: 4,
                                              left: 4,
                                              backgroundColor: "rgba(0,0,0,0.7)",
                                              color: "white",
                                              fontSize: "0.6rem",
                                              px: 0.5,
                                              py: 0.2,
                                              zIndex: 2,
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setTagDialogImageIndex(index);
                                              setTagDialogValue("");
                                              setTagDialogOpen(true);
                                            }}
                                          >
                                            Add Tag
                                          </Button>
                                        )}

                                        {/* Time at bottom */}
                                        <Box
                                          sx={{
                                            position: "absolute",
                                            bottom: 2,
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            backgroundColor: "rgba(0,0,0,0.7)",
                                            color: "white",
                                            fontSize: "0.6rem",
                                            px: 1,
                                            py: 0.2,
                                            borderRadius: 1,
                                            zIndex: 2,
                                          }}
                                        >
                                          {timeStr}
                                        </Box>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </Box>
                            );
                          })}
                      </Box>
                    ))}
                  </Box>
                ))}
              <Dialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)}>
                <DialogTitle sx={{ color: "black" }}>Select Tag</DialogTitle>
                <DialogContent>
                  <Select
                    fullWidth
                    value={tagDialogValue}
                    onChange={(e) => setTagDialogValue(e.target.value)}
                    size="small"
                    sx={{ minWidth: 200, color: "black" }}
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
                    sx={{ backgroundColor: "black", "&:hover": { backgroundColor: "#222" } }}
                  >
                    Save
                  </Button>
                  <Button onClick={() => setTagDialogOpen(false)} sx={{ color: "black" }}>
                    Cancel
                  </Button>
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
                      <Button variant="outlined" onClick={prevImage} sx={{ color: "black", borderColor: "black" }}>
                        Prev
                      </Button>
                      <Button variant="outlined" onClick={nextImage} sx={{ color: "black", borderColor: "black" }}>
                        Next
                      </Button>
                      <Button variant="outlined" color="error" onClick={deleteModalImage}>
                        Delete
                      </Button>
                      <Button variant="text" onClick={closeModal} sx={{ color: "black" }}>
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
