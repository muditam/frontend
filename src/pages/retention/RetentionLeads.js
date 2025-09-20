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
  Menu,
  TableCell,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  SvgIcon,
} from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import axios from "axios";
import Details from "./Details";
import RetentionFollowUp from "./RetentionFollowUp";
import CreateOrderPopup from "./CreateOrderPopup";
import CohortDataCustomer from "./CohortDataCustomer";

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

import LanguageIcon from "@mui/icons-material/Language";
import PlaceIcon from "@mui/icons-material/Place";

import CreateDietPlanPopup from "./CreateDietPlanPopup";

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

const IST_TZ = 'Asia/Kolkata';
const MONTHS_3_UPPER = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'];

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

/** Parse:
 *  - Date instance
 *  - number (ms) or numeric string "1693248000000"
 *  - ISO "2025-09-03T10:15:00.000Z"
 *  - "YYYY-MM-DD"
 *  - "DD/MM/YYYY" or "DD-MM-YYYY"  (interpreted as DD/MM, Indian style)
 */
const toDateSafe = (raw) => {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === 'number') return new Date(raw);

  const s = String(raw).trim();

  // numeric string (epoch ms)
  if (/^\d+$/.test(s)) {
    const ms = parseInt(s, 10);
    const d = new Date(ms);
    return isValidDate(d) ? d : null;
  }

  // ISO or YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(s)) {
    const d = new Date(s);
    return isValidDate(d) ? d : null;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    let [, dd, mm, yyyy] = m;
    if (yyyy.length === 2) yyyy = '20' + yyyy;
    // create at IST midnight
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00+05:30`);
    return isValidDate(d) ? d : null;
  }

  const d = new Date(s);
  return isValidDate(d) ? d : null;
};

// "YYYY-MM-DD" key in IST (stable for grouping)
const getISTDayKey = (raw) => {
  const d = toDateSafe(raw);
  if (!isValidDate(d)) return null;
  // Use .format (not formatToParts) to avoid RangeError in edge cases
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d); // e.g., "2025-09-03"
  return formatted;
};

// "DD SEPT YYYY"
const formatDayHeaderIST = (dayKeyOrRaw) => {
  // If it's already a dayKey "YYYY-MM-DD", split; else parse and make a key
  let dayKey = /^\d{4}-\d{2}-\d{2}$/.test(String(dayKeyOrRaw))
    ? String(dayKeyOrRaw)
    : getISTDayKey(dayKeyOrRaw);

  if (!dayKey) return '—';

  const [yyyy, mm, dd] = dayKey.split('-');
  const monthIdx = parseInt(mm, 10) - 1;
  return `${dd} ${MONTHS_3_UPPER[monthIdx]} ${yyyy}`;
};

// "05:19 AM"
const formatTimeIST = (raw) => {
  const d = toDateSafe(raw);
  if (!isValidDate(d)) return '—';
  // Use US locale for 12h format with AM/PM
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TZ,
    hour: '2-digit', minute: '2-digit', hour12: true
  }).formatToParts(d);

  const hh = (parts.find(p => p.type === 'hour')?.value ?? '00').padStart(2, '0');
  const mm = (parts.find(p => p.type === 'minute')?.value ?? '00').padStart(2, '0');
  const ap = (parts.find(p => p.type === 'dayPeriod')?.value ?? 'AM').toUpperCase();

  return `${hh}:${mm} ${ap}`;
};

const RetentionLeads = () => {
  const [allLeads, setAllLeads] = useState([]); // All leads fetched from server
  const [leads, setLeads] = useState([]); // Leads currently displayed
  const [loggedInUser, setLoggedInUser] = useState({});
  const [loading, setLoading] = useState(false);
  const [callingMessage, setCallingMessage] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // const [selectedLeadIndex, setSelectedLeadIndex] = useState(null);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
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

  const [notReachedLeadsCount, setNotReachedLeadsCount] = useState(0);
  const [showingNotReached, setShowingNotReached] = useState(false);
  const [showingReached, setShowingReached] = useState(false);
  const [reachedLeadsCount, setReachedLeadsCount] = useState(0);

  const [ordersLoading, setOrdersLoading] = useState(false);

  const [dietPlanOpen, setDietPlanOpen] = useState(false);

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

  const [showOrders, setShowOrders] = useState(false);

  const [anchorElColor, setAnchorElColor] = useState(null);
  const [colorMenuIdx, setColorMenuIdx] = useState(null);

  const [shipmentStatusMap, setShipmentStatusMap] = useState({});

  const [orderPopupOpen, setOrderPopupOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // --- Remarks height/overflow control ---
  const remarksBodyRef = useRef(null);
  const [showRemarksMore, setShowRemarksMore] = useState(false);
  const [remarksExpanded, setRemarksExpanded] = useState(false);


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
      // setSelectedLeadIndex(null); 
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


  const handleAddSubcell = (leadIdx) => {
    setLeads(prev => {
      const list = [...prev];
      const lead = { ...list[leadIdx] };

      // Pull the text from the input that you're currently editing
      const draft =
        lead.rtSubcells?.length > 0
          ? lead.rtSubcells[lead.rtSubcells.length - 1].value
          : lead.rtRemark;

      const newEntry = {
        date: new Date().toISOString(),  // ISO (works with your parser)
        value: (draft || '').trim(),
        by: currentUserName,
      };

      lead.rtSubcells = [...(lead.rtSubcells || []), newEntry];
      lead.rtRemark = ''; // optional: clear initial remark
      list[leadIdx] = lead;
      return list;
    });
  };

  const handleSubcellChange = (leadIndex, subcellIndex, e) => {
    const value = e.target.value;
    setLeads(prev => {
      const next = [...prev];
      const lead = { ...next[leadIndex] };
      const arr = [...(lead.rtSubcells || [])];
      arr[subcellIndex] = { ...arr[subcellIndex], value };
      lead.rtSubcells = arr;
      next[leadIndex] = lead;
      saveSubcellsToBackend(lead._id, arr);
      return next;
    });
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

      const orderIds = (res.data.orders || []).map(order => order.name.replace(/^#/, ''));

      if (orderIds.length > 0) {
        const response = await axios.get(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders/by-order-ids`,
          {
            params: { order_ids: orderIds.join(',') }
          }
        );
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

  const handleCreateDietPlanClick = (lead) => {
    setSelectedLead(lead);
    setDietPlanOpen(true);
  };

  // Only for retentionStatus Active or not set
  const getNotReachedLeads = (leads, days = 7) => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return leads.filter(lead => {
      // Only consider Active or not set
      const status = (lead.retentionStatus || "").toLowerCase();
      if (status && status !== "active") return false;

      // If no logs, considered not reached
      if (!lead.reachoutLogs || lead.reachoutLogs.length === 0) return true;

      // Find latest log timestamp
      const latestLog = lead.reachoutLogs.reduce((latest, log) => {
        const ts = new Date(log.timestamp);
        return (!latest || ts > latest) ? ts : latest;
      }, null);

      // No valid timestamp? Not reached.
      if (!latestLog) return true;
      // If latest reachout log is before the cutoff, considered not reached.
      return latestLog < cutoff;
    });
  };

  // Leads with at least one reachout log in last 7 days, retentionStatus Active or not set
  const getReachedLeads = (leads, days = 7) => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return leads.filter(lead => {
      const status = (lead.retentionStatus || "").toLowerCase();
      if (status && status !== "active") return false;
      if (!lead.reachoutLogs || lead.reachoutLogs.length === 0) return false;

      // Any log in last X days?
      return lead.reachoutLogs.some(log => {
        const ts = new Date(log.timestamp);
        return ts >= cutoff;
      });
    });
  };


  useEffect(() => {
    // Calculate both counts from current filtered base (or allLeads)
    setNotReachedLeadsCount(getNotReachedLeads(filteredAllLeads).length);
    setReachedLeadsCount(getReachedLeads(filteredAllLeads).length);
  }, [filteredAllLeads, allLeads]);

  const handleLeadSelect = (idx, id) => {
    setSelectedLeadId(id);
    setSelectedLeadIndex(idx);
  }

  useEffect(() => {
    if (!selectedLeadId) return;
    const i = leads.findIndex(l => l._id === selectedLeadId);
    setSelectedLeadIndex(i === -1 ? null : i);
  }, [leads, selectedLeadId]);

  useEffect(() => {
    const el = remarksBodyRef.current;
    if (!el) return;

    const measure = () => {
      // show button only when collapsed AND content really overflows
      const needsMore = el.scrollHeight > el.clientHeight + 1;
      setShowRemarksMore(!remarksExpanded && needsMore);
    };

    // wait a frame for layout/styles to settle
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [selectedLeadIndex, leads, remarksExpanded]);



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


  const closeModal = () => setModalOpen(false);

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


  const currentUserName = React.useMemo(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('user'));
      return u?.fullName || u?.name || (u?.email ? u.email.split('@')[0] : '') || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }, []);


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
    setSelectedLead(lead);
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

  const updateLeadDetails = (contactNumber, newDetails) => {
    setLeads((prevLeads) => {
      return prevLeads.map((lead) =>
        lead.contactNumber === contactNumber ? { ...lead, details: newDetails } : lead
      );
    });
  };

  const filteredLeadsByFilters = (inputLeads) => {
    if (!inputLeads || inputLeads.length === 0) return [];

    let filtered = [...inputLeads];

    // Apply all filters (retentionStatus, date, followup, etc.)
    if (filters.retentionStatus && filters.retentionStatus !== "All") {
      const statusFilter = filters.retentionStatus.toLowerCase();
      filtered = filtered.filter((lead) => {
        const leadStatus = (lead.retentionStatus || "").toLowerCase();
        return statusFilter === "active"
          ? leadStatus === "active" || leadStatus === ""
          : statusFilter === "lost"
            ? leadStatus === "lost"
            : true;
      });
    }

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
        return (
          orderDate.toLocaleString("default", { month: "long" }) === monthName &&
          orderDate.getFullYear().toString() === year
        );
      });
    }

    if (filters.rtFollowupReminder !== null) {
      filtered = filtered.filter((lead) => {
        const reminder = lead.rtFollowupReminder || "";
        return filters.rtFollowupReminder === ""
          ? reminder === ""
          : reminder === filters.rtFollowupReminder;
      });
    }

    if (orderPlacedFilter === "Order Placed") {
      filtered = filtered.filter((lead) => !!lead.lastOrderDate);
    } else if (orderPlacedFilter === "Order Not Placed") {
      filtered = filtered.filter((lead) => !lead.lastOrderDate);
    }

    if (dateRangeFilter && !dateRangeFilter.includes(" ")) {
      const now = new Date();
      const isSameMonth = (d1, d2) =>
        d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

      filtered = filtered.filter((lead) => {
        if (!lead.lastOrderDate) return false;
        const date = new Date(lead.lastOrderDate);
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        switch (dateRangeFilter) {
          case "Today": return diffDays === 0;
          case "Yesterday": return diffDays === 1;
          case "Last 7 Days": return diffDays <= 7;
          case "Last 10 Days": return diffDays <= 10;
          case "10–20 Days Ago": return diffDays >= 10 && diffDays <= 20;
          case "21–30 Days Ago": return diffDays >= 21 && diffDays <= 30;
          case "This Month (Month to Date)": return isSameMonth(date, now);
          case "Last Month": {
            const lastMonth = new Date();
            lastMonth.setMonth(now.getMonth() - 1);
            return (
              date.getMonth() === lastMonth.getMonth() &&
              date.getFullYear() === lastMonth.getFullYear()
            );
          }
          case "Last 30 Days": return diffDays <= 30;
          case "Last 90 Days": return diffDays <= 90;
          default: return true;
        }
      });
    }

    // —— search / serial logic —— //
    const search = filters.name.trim().toLowerCase();

    if (search) {
      // 1–5 digits → serial lookup (slice from that index)
      if (/^\d{1,5}$/.test(search)) {
        const serialIndex = parseInt(search, 10) - 1;
        if (serialIndex >= 0 && serialIndex < filtered.length) {
          filtered = filtered.slice(serialIndex);
        } else {
          filtered = [];
        }
      }
      // anything else (text OR ≥6 digits) → name or phone match
      else {
        filtered = filtered.filter((lead) => {
          const nameMatch = lead.name?.toLowerCase().includes(search);
          const numberMatch = lead.contactNumber?.includes(search);
          return nameMatch || numberMatch;
        });
      }
    }

    // Final sort: latest order first
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
          <Box sx={{ mt: 1, mb: 1, display: "flex", gap: 1 }}>
            <Button
              variant={showingReached ? "contained" : "outlined"}
              color={showingReached ? "success" : "inherit"}
              size="small"
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                color: showingReached ? "#fff" : "black",
                borderColor: showingReached ? "green" : "black",
                textTransform: "none",
                px: 2,
              }}
              onClick={() => {
                if (!showingReached) {
                  const filtered = getReachedLeads(filteredAllLeads);
                  setLeads(filtered.slice(0, leadsPerPage));
                  setHasMore(filtered.length > leadsPerPage);
                  setCurrentIndex(leadsPerPage);
                  setShowingNotReached(false);
                } else {
                  applyFilters();
                }
                setShowingReached(!showingReached);
                setSelectedLeadIndex(null);
              }}
            >
              Reached This Week ({reachedLeadsCount})
            </Button>
            <Button
              variant={showingNotReached ? "contained" : "outlined"}
              color={showingNotReached ? "error" : "inherit"}
              size="small"
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                color: showingNotReached ? "#fff" : "black",
                borderColor: showingNotReached ? "red" : "black",
                textTransform: "none",
                px: 2,
              }}
              onClick={() => {
                if (!showingNotReached) {
                  const filtered = getNotReachedLeads(filteredAllLeads);
                  setLeads(filtered.slice(0, leadsPerPage));
                  setHasMore(filtered.length > leadsPerPage);
                  setCurrentIndex(leadsPerPage);
                  setShowingReached(false);
                } else {
                  applyFilters();
                }
                setShowingNotReached(!showingNotReached);
                setSelectedLeadIndex(null);
              }}
            >
              Not Reached This week ({notReachedLeadsCount})
            </Button>
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
            setSelectedYear(null);
            setSelectedMonth(null);
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
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
                    setSelectedYear(null);
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

            const isSelected = lead._id === selectedLeadId;

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
                  px: 1,
                }}
                onClick={() => {
                  setLeadLoading(true);
                  handleLeadSelect(idx, lead._id);
                  setTimeout(() => setLeadLoading(false), 500);
                }}
              >
                {/* Small Serial Number */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 3,
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    color: "text.secondary",
                    opacity: 0.7,
                  }}
                >
                  {allLeads.findIndex((l) => l._id === lead._id) + 1}
                </Box>
                <ListItemAvatar sx={{ position: "relative", ml: 2 }}>
                  <Avatar sx={{ bgcolor: "black", fontSize: "0.8rem" }}>
                    {initials}
                  </Avatar>
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      top: -3,
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

      {/* Right Content 80% - split lead details and Notes */}
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
    borderRadius: 2, // ~16px
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    backgroundColor: "#fff",
    fontSize: "0.85rem",
    fontFamily: '"Segoe UI", Inter, system-ui, sans-serif',
  }}
  elevation={0}
>
  {/* ===== Top area: Left (avatar + Shopify orders icon) + Right (lines) ===== */}
  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
    {/* Avatar + Shopify Orders icon below it */}
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <Avatar
        sx={{
          width: 44,
          height: 44,
          bgcolor: "#EAF3EE",
          color: "#2E7D32",
          fontWeight: 700,
          fontSize: "0.95rem",
          flex: "0 0 auto",
        }}
      >
        {(leads[selectedLeadIndex]?.name || "?")
          .split(" ")
          .map((n) => n?.[0] || "")
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </Avatar>

      {/* Shopify Orders toggle (icon-only, opens dialog) */}
      <Tooltip title={ordersLoading ? "Loading Order History..." : "Shopify Orders"}>
        <IconButton
          onClick={async () => {
            const opening = !showOrders;
            setShowOrders(opening);
            if (!opening) return;
            const phone = leads[selectedLeadIndex]?.contactNumber;
            if (!phone) return;
            const cached = shopifyDatesMap[phone];
            const hasOrders = Array.isArray(cached?.orders) && cached.orders.length > 0;
            if (hasOrders) return;
            try {
              setOrdersLoading(true);
              await fetchShopifyDates(phone);
            } finally {
              setOrdersLoading(false);
            }
          }}
          sx={{
            width: 36,
            height: 36,
            borderRadius: 999,
            bgcolor: "#fff",
            border: "1px solid #E6E8EC",
            "&:hover": { bgcolor: "#F7F9FB" },
          }}
        >
          {/* Shopify-like green bag icon */}
          <SvgIcon fontSize="small" sx={{ color: "#5E8E3E" }} viewBox="0 0 24 24">
            <path d="M7 7V6a5 5 0 0 1 10 0v1h1.5a1.5 1.5 0 0 1 1.49 1.29l1.36 9.5A2.5 2.5 0 0 1 18.89 21H5.11a2.5 2.5 0 0 1-2.46-2.21l1.36-9.5A1.5 1.5 0 0 1 5.5 7H7Zm2 0h6V6a3 3 0 0 0-6 0v1Z" />
            <path d="M10.6 14.8c.3.4.8.7 1.6.7.8 0 1.2-.3 1.2-.8 0-.6-.7-.7-1.4-.9-.9-.2-2-.5-2-1.8 0-1.1.9-1.9 2.3-1.9 1 0 1.8.3 2.3.9l-.9.8c-.3-.4-.8-.6-1.5-.6-.6 0-1 .3-1 .7 0 .5.6.6 1.3.8 1 .2 2.1.5 2.1 1.9 0 1.3-1 2.1-2.5 2.1-1.2 0-2.1-.4-2.6-1.1l.9-.8Z" />
          </SvgIcon>
        </IconButton>
      </Tooltip>
    </Box>

    {/* Content (stacked sections) */}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {/* ===== Line 1: Name – Phone – Actions – Customer Since / Last Order ===== */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111" }} noWrap>
          {leads[selectedLeadIndex]?.name || "—"}
        </Typography>

        <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "#D0D5DD" }} />

        <Typography sx={{ fontWeight: 600, color: "#111" }}>
          {leads[selectedLeadIndex]?.contactNumber || "N/A"}
        </Typography>

        {/* Copy */}
        <Tooltip title="Copy Number">
          <IconButton
            color="default"
            size="small"
            sx={{ color: "#111", p: 0.5 }}
            onClick={() => handleCopy(leads[selectedLeadIndex]?.contactNumber)}
          >
            <ContentCopyIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>

        {/* Call */}
        <Button
          onClick={() => handleCallIconClick(leads[selectedLeadIndex]?.contactNumber)}
          size="small"
          startIcon={<PhoneIcon />}
          sx={{
            textTransform: "none",
            bgcolor: "#2E7D32",
            color: "#fff",
            borderRadius: 999,
            px: 1.75,
            py: 0.5,
            "&:hover": { bgcolor: "#256528" },
          }}
        >
          Call
        </Button>

        {/* Add Log */}
        <Button
          size="small"
          onClick={(e) => {
            setReachoutTimestamp(new Date());
            setReachoutMethod("");
            setReachoutStatus("");
            setLogPopupAnchor(e.currentTarget);
          }}
          sx={{
            textTransform: "none",
            bgcolor: "#2E7D32",
            color: "#fff",
            borderRadius: 999,
            px: 1.75,
            py: 0.5,
            "&:hover": { bgcolor: "#256528" },
          }}
        >
          Add Log
        </Button>

        {/* History (opens dialog) */}
        <Tooltip title="View Logs">
          <IconButton
            size="small"
            sx={{ color: "#111" }}
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
                  backgroundColor: "#111",
                  color: "#fff",
                  boxShadow: "0 0 0 2px #fff",
                  fontWeight: 700,
                },
              }}
            >
              <HistoryIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Pill tags to the right of History */}
        {(() => {
          const phone = leads[selectedLeadIndex]?.contactNumber;
          const first = shopifyDatesMap[phone]?.firstOrderDate;
          const last = leads[selectedLeadIndex]?.lastOrderDate;

          const since = (() => {
            if (!first) return "N/A";
            const start = new Date(first);
            const now = new Date();
            let months =
              (now.getFullYear() - start.getFullYear()) * 12 +
              (now.getMonth() - start.getMonth());
            let days = now.getDate() - start.getDate();
            if (days < 0) {
              months -= 1;
              const prevMonthLen = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
              days += prevMonthLen;
            }
            return `${months}m ${Math.max(days, 0)}d`;
          })();

          const lastDays = (() => {
            if (!last) return "N/A";
            const d = getDaysSince(last);
            return d !== null ? `${d} days ago` : "N/A";
          })();

          return (
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  bgcolor: "#F5F7FA",
                  color: "#111",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                }}
              >
                CS – {since} 
              </Box>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  bgcolor: "#F5F7FA",
                  color: "#111",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                }}
              >
                Last Order – {lastDays}
              </Box>
            </Stack>
          );
        })()}
      </Box>

      {/* ===== Line 2: Agent | Language | Location + buttons immediately after Location ===== */}
      <Box
        sx={{
          mt: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        {/* Chips + buttons inline */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
          <Box
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 999,
              bgcolor: "#F5F7FA",
              color: "#333",
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              fontSize: "0.8rem",
            }}
          >
            <Typography sx={{ color: "#667085", fontSize: "0.8rem" }}>Agent</Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {leads[selectedLeadIndex]?.agentAssigned || "—"}
            </Typography>
          </Box>

          <Box
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 999,
              bgcolor: "#F5F7FA",
              color: "#333",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              fontSize: "0.8rem",
            }}
          >
            <LanguageIcon sx={{ fontSize: 16, color: "#667085" }} />
            <Typography sx={{ fontWeight: 600 }}>
              {leads[selectedLeadIndex]?.preferredLanguage || "English"}
            </Typography>
          </Box>

          <Box
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 999,
              bgcolor: "#F5F7FA",
              color: "#333",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              fontSize: "0.8rem",
            }}
          >
            <PlaceIcon sx={{ fontSize: 16, color: "#667085" }} />
            <Typography sx={{ fontWeight: 600 }}>
              {(() => {
                const phone = leads[selectedLeadIndex]?.contactNumber;
                const province =
                  shopifyDatesMap[phone]?.orders?.[0]?.shipping_address?.province;
                return province || "—";
              })()}
            </Typography>
          </Box>

          {/* Buttons now placed IMMEDIATELY to the right of Location */}
          <Button
            onClick={() => setDietPlanOpen(true)}
            sx={{
              textTransform: "none",
              bgcolor: "#2E7D32",
              color: "white",
              borderRadius: 999,
              px: 2,
              "&:hover": { backgroundColor: "#256528" },
            }}
          >
            Create Diet Plan
          </Button>

          <Button
            onClick={() => setOrderPopupOpen(true)}
            sx={{
              textTransform: "none",
              bgcolor: "#1976D2",
              color: "white",
              borderRadius: 999,
              px: 2,
              "&:hover": { backgroundColor: "#145ea8" },
            }}
          >
            Create Order
          </Button>
        </Stack>
      </Box>

      {/* ===== Line 3: Controls in ONE ROW with labels ===== */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ flexWrap: "wrap", alignItems: "center", mt: 2.5 }}
      >
        {/* Next Follow-up (date) */}
        <TextField
          label="Next Follow-up"
          type="date"
          value={leads[selectedLeadIndex]?.rtNextFollowupDate || ""}
          onChange={(e) => handleInputChange(e, selectedLeadIndex, "rtNextFollowupDate")}
          size="small"
          sx={{
            minWidth: 150,
            "& .MuiOutlinedInput-root": {
              borderRadius: 999,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E6E8EC" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#DDE1E6" },
              pr: 0,
            },
            "& .MuiInputLabel-root": { color: "#667085" },
          }}
          InputProps={{
            inputProps: {
              min: (() => {
                const today = new Date();
                return today.toISOString().split("T")[0];
              })(),
              max: (() => {
                const today = new Date();
                today.setDate(today.getDate() + 10);
                return today.toISOString().split("T")[0];
              })(),
            },
          }}
          InputLabelProps={{ shrink: true }}
        />

        {/* Retention Status */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Retention Status</InputLabel>
          <Select
            label="Retention Status"
            value={leads[selectedLeadIndex]?.retentionStatus || ""}
            onChange={(e) => handleInputChange(e, selectedLeadIndex, "retentionStatus")}
            sx={{
              borderRadius: 999,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E6E8EC" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#DDE1E6" },
            }}
          >
            {["Active", "Lost"].map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Follow-up Status */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Follow-up Status</InputLabel>
          <Select
            label="Follow-up Status"
            value={leads[selectedLeadIndex]?.rtFollowupStatus || ""}
            onChange={(e) => handleInputChange(e, selectedLeadIndex, "rtFollowupStatus")}
            sx={{
              borderRadius: 999,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E6E8EC" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#DDE1E6" },
            }}
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
        </FormControl>

        {/* Preferred Language */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Pref Language</InputLabel>
          <Select
            label="Pref Language"
            value={leads[selectedLeadIndex]?.preferredLanguage || ""}
            onChange={(e) => handleInputChange(e, selectedLeadIndex, "preferredLanguage")}
            sx={{
              borderRadius: 999,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E6E8EC" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#DDE1E6" },
            }}
          >
            {["Hindi", "English", "Others"].map((lang) => (
              <MenuItem key={lang} value={lang}>
                {lang}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Preferred Method */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Pref Method</InputLabel>
          <Select
            label="Pref Method"
            value={leads[selectedLeadIndex]?.communicationMethod || ""}
            onChange={(e) => handleInputChange(e, selectedLeadIndex, "communicationMethod")}
            sx={{
              borderRadius: 999,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E6E8EC" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#DDE1E6" },
            }}
          >
            {["Call", "WhatsApp", "Both"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Box>
  </Box>

  {/* ---------- Popups & dialogs (unchanged functionality) ---------- */}
  {orderPopupOpen && selectedLeadIndex !== null && (
    <CreateOrderPopup
      open={orderPopupOpen}
      onClose={() => setOrderPopupOpen(false)}
      prefillCustomer={{
        name: leads[selectedLeadIndex]?.name || "",
        phone: leads[selectedLeadIndex]?.contactNumber || "",
      }}
    />
  )}

  {dietPlanOpen && selectedLeadIndex !== null && (
    <CreateDietPlanPopup
      open={dietPlanOpen}
      onClose={() => setDietPlanOpen(false)}
      prefillCustomer={{
        name: leads[selectedLeadIndex]?.name || "",
        phone: leads[selectedLeadIndex]?.contactNumber || "",
        leadId: leads[selectedLeadIndex]?._id || "",
      }}
    />
  )}

  {/* Log popup (unchanged) */}
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
            await axios.post(
              `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${leads[selectedLeadIndex]._id}/reachout-log`,
              { timestamp: reachoutTimestamp, method }
            );
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
                await axios.post(
                  `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${leads[selectedLeadIndex]._id}/reachout-log`,
                  { timestamp: reachoutTimestamp, method: reachoutMethod, status }
                );
                setLogPopupAnchor(null);
              }}
            >
              {["OC", "CNP", "Followup Done", "Order Placed", "Call Back Later", "Busy", "Switch Off", "Drop On Intro"].map((status) => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </>
        )}
      </Box>
    </Menu>
  )}

  {/* Logs Modal (unchanged) */}
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

  {/* ===== Shopify Orders Dialog (replaces inline showOrders block) ===== */}
  <Dialog
    open={showOrders}
    onClose={() => setShowOrders(false)}
    maxWidth="md"
    fullWidth
    scroll="paper"
  >
    <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <SvgIcon fontSize="small" sx={{ color: "#5E8E3E" }} viewBox="0 0 24 24">
        <path d="M7 7V6a5 5 0 0 1 10 0v1h1.5a1.5 1.5 0 0 1 1.49 1.29l1.36 9.5A2.5 2.5 0 0 1 18.89 21H5.11a2.5 2.5 0 0 1-2.46-2.21l1.36-9.5A1.5 1.5 0 0 1 5.5 7H7Zm2 0h6V6a3 3 0 0 0-6 0v1Z" />
        <path d="M10.6 14.8c.3.4.8.7 1.6.7.8 0 1.2-.3 1.2-.8 0-.6-.7-.7-1.4-.9-.9-.2-2-.5-2-1.8 0-1.1.9-1.9 2.3-1.9 1 0 1.8.3 2.3.9l-.9.8c-.3-.4-.8-.6-1.5-.6-.6 0-1 .3-1 .7 0 .5.6.6 1.3.8 1 .2 2.1.5 2.1 1.9 0 1.3-1 2.1-2.5 2.1-1.2 0-2.1-.4-2.6-1.1l.9-.8Z" />
      </SvgIcon>
      Shopify Orders — {leads[selectedLeadIndex]?.name || "Customer"}
    </DialogTitle>

    <DialogContent dividers>
      {ordersLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <>
          {/* Summary cards */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 1.5,
              mb: 2,
            }}
          >
            <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">Total Orders</Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber]?.orders?.length || 0}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">First Order Date</Typography>
              <Typography>
                {shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber]?.firstOrderDate
                  ? new Date(
                      shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber].firstOrderDate
                    ).toLocaleDateString()
                  : "N/A"}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">Total Spend</Typography>
              <Typography>
                ₹{shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber]?.totalSpend?.toFixed(2) || "0.00"}
              </Typography>
            </Paper>
          </Box>

          {/* Orders list */}
          {(shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber]?.orders || []).map((order, i) => {
            const noteInput = noteInputs[order.id] || "";
            const savingNote = savingNotes[order.id] || false;
            const cleanOrderId = order.name.replace(/^#/, "").trim();
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
                  const updatedOrders =
                    prev[leads[selectedLeadIndex]?.contactNumber].orders.map((o) =>
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
              <Paper
                key={order.id}
                variant="outlined"
                sx={{
                  p: 1.25,
                  mb: 1.25,
                  borderRadius: 2,
                  borderColor: "#E6E8EC",
                  backgroundColor: "#FAFAFA",
                }}
              >
                {/* Header row */}
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 2,
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography sx={{ fontWeight: 700 }}>
                    {order.name}
                    <Box
                      component="span"
                      sx={{
                        ml: 1.5,
                        fontWeight: 500,
                        color: "#222",
                        bgcolor: "#F1F1F1",
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        fontSize: "0.75rem",
                      }}
                    >
                      Delivery Status: <b>{shipmentStatus}</b>
                    </Box>
                  </Typography>

                  <Box sx={{ ml: "auto", display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 600 }}>₹{order.total_price}</Typography>
                    <Typography color="text.secondary">
                      {new Date(order.created_at).toLocaleString()}
                    </Typography>
                    <Typography color="text.secondary">
                      {`Fulfillment: ${order.fulfillment_status || "Unfulfilled"}`}
                    </Typography>
                  </Box>
                </Box>

                {/* Items + Note */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                    mb: 1,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0, fontSize: "0.85rem" }}>
                    <b>Items:</b>{" "}
                    {order.line_items.map((item) => `${item.quantity} x ${item.name}`).join(", ")}
                  </Box>

                  <Box sx={{ minWidth: 240, maxWidth: 320 }}>
                    {order.note ? (
                      <Typography
                        sx={{ fontSize: "0.85rem", fontStyle: "italic", whiteSpace: "pre-wrap" }}
                      >
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

                {/* Address toggle */}
                <Box>
                  <Button
                    size="small"
                    sx={{
                      mt: 0.5,
                      backgroundColor: "white",
                      color: "black",
                      fontSize: "0.72rem",
                    }}
                    onClick={() => {
                      const updated = [
                        ...(shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber].orders || []),
                      ];
                      updated[i].showAddress = !updated[i].showAddress;
                      setShopifyDatesMap((prev) => ({
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
                    <Typography variant="body2" sx={{ mt: 1, fontSize: "0.85rem" }}>
                      {order.shipping_address?.address1 || ""},{" "}
                      {order.shipping_address?.city || ""},{" "}
                      {order.shipping_address?.zip || ""}
                    </Typography>
                  )}
                </Box>
              </Paper>
            );
          })}
        </>
      )}
    </DialogContent>
  </Dialog>
</Paper>
 


              <Details contactNumber={leads[selectedLeadIndex]?.contactNumber} onDetailsUpdate={updateLeadDetails} />

              <RetentionFollowUp contactNumber={leads[selectedLeadIndex]?.contactNumber} />

              <CohortDataCustomer contactNumber={leads[selectedLeadIndex]?.contactNumber} />

            </Box>

            {/* Notes Section */}
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

              <Box
                sx={{
                  mt: 1,
                  height: '50vh',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >

                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                  Notes
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                    multiline
                    minRows={3}   // ~3x taller input
                    size="small"
                    fullWidth
                    variant="outlined"
                  />

                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleAddSubcell(selectedLeadIndex)}
                    sx={{ alignSelf: 'flex-start', backgroundColor: 'black', textTransform: 'none' }}
                  >
                    Save
                  </Button>
                </Box>


                {/* Scrollable/collapsible body */}
                <Box
                  ref={remarksBodyRef}
                  sx={{
                    mt: 1,
                    pr: 1,
                    overflowY: remarksExpanded ? 'auto' : 'hidden',
                    height: remarksExpanded ? '50vh' : '40vh',
                    position: 'relative'
                  }}
                >
                  <Box sx={{ mt: 1 }}>
                    {(() => {
                      const list = [...(leads[selectedLeadIndex]?.rtSubcells || [])];

                      const normalizeUser = (by) =>
                        (typeof by === 'string' ? by.trim() : '') || 'Expert';

                      list.sort((a, b) => {
                        const ta = toDateSafe(a?.date)?.getTime() ?? -Infinity;
                        const tb = toDateSafe(b?.date)?.getTime() ?? -Infinity;
                        return tb - ta;
                      });

                      const dated = {};
                      const invalid = {};

                      const getInvalidLabel = (raw) => {
                        const s = String(raw ?? "").trim();
                        return s || "—";
                      };

                      list.forEach((sub) => {
                        const key = getISTDayKey(sub?.date);
                        if (key) {
                          (dated[key] ||= []).push(sub);
                        } else {
                          const label = getInvalidLabel(sub?.date);
                          (invalid[label] ||= []).push(sub);
                        }
                      });

                      const blocks = [];

                      Object.keys(dated)
                        .sort((a, b) => (a > b ? -1 : 1))
                        .forEach((dayKey) => {
                          const items = dated[dayKey];

                          // Within the day, newest first
                          items.sort((a, b) => {
                            const ta = toDateSafe(a?.date)?.getTime() ?? -Infinity;
                            const tb = toDateSafe(b?.date)?.getTime() ?? -Infinity;
                            return tb - ta;
                          });

                          const usersLabel = Array.from(
                            new Set(items.map(s => normalizeUser(s?.by)))
                          ).join(', ');

                          const firstTime = formatTimeIST(items[0]?.date);
                          const notesJoined = items
                            .map((s) => (s?.value?.trim() ? s.value.trim() : "—"))
                            .join(" | ");

                          blocks.push(
                            <Box key={`dated-${dayKey}`} sx={{ mb: 1.25 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {`${formatDayHeaderIST(dayKey)}-(${usersLabel})`}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  overflowWrap: "anywhere",
                                  lineHeight: 1.4,
                                  mt: 0.25,
                                }}
                              >
                                {firstTime && firstTime !== "—"
                                  ? `${firstTime} — ${notesJoined}`
                                  : notesJoined}
                              </Typography>
                            </Box>
                          );
                        });

                      Object.keys(invalid).forEach((label) => {
                        const items = invalid[label];

                        const usersLabel = Array.from(
                          new Set(items.map(s => normalizeUser(s?.by)))
                        ).join(', ');

                        const notesJoined = items
                          .map((s) => (s?.value?.trim() ? s.value.trim() : "—"))
                          .join(" | ");

                        blocks.push(
                          <Box key={`invalid-${label}`} sx={{ mb: 1.25 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {`${label}: (${usersLabel})`}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                                lineHeight: 1.4,
                                mt: 0.25,
                              }}
                            >
                              {notesJoined}
                            </Typography>
                          </Box>
                        );
                      });

                      return blocks;
                    })()}
                  </Box>


                  {/* First Cons Notes at the bottom */}
                  {leads[selectedLeadIndex]?.rtRemark && (
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          display: 'block',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                          lineHeight: 1.4
                        }}
                      >
                        <Box component="span" sx={{ fontWeight: 600, mr: 1 }}>
                          First Cons Notes:
                        </Box>
                        {leads[selectedLeadIndex]?.rtRemark}
                      </Typography>
                    </Box>
                  )}


                  {/* Fade + Load more (only when collapsed and overflowing) */}
                  {!remarksExpanded && showRemarksMore && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 56,
                        background:
                          'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        pb: 0.5,
                        zIndex: 1,
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setRemarksExpanded(true)}
                        sx={{ textTransform: 'none', color: 'black', borderColor: 'black' }}
                      >
                        Load more
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>

            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
};

export default RetentionLeads;  