import React, { useState, useEffect, useRef, useCallback, useDeferredValue } from "react";
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
import axios from "axios";
import Details from "./Details";
import RetentionFollowUp from "./RetentionFollowUp";
import CreateOrderPopup from "./CreateOrderPopup";
import CohortDataCustomer from "./CohortDataCustomer";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FormatColorFillIcon from "@mui/icons-material/FormatColorFill";
import PhoneIcon from "@mui/icons-material/Phone";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import HistoryIcon from "@mui/icons-material/History";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Badge from "@mui/material/Badge";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SpaIcon from "@mui/icons-material/Spa";
import LanguageIcon from "@mui/icons-material/Language";
import PlaceIcon from "@mui/icons-material/Place";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneDisabledIcon from "@mui/icons-material/PhoneDisabled";
import AddIcCallIcon from "@mui/icons-material/AddIcCall";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";

import CreateDietPlanPopup from "./CreateDietPlanPopup";
import WhatsAppChatDialog from "./WhatsAppChatDialog";
import { openZoomPhoneDialer } from "../../utils/zoomPhoneDialer";
 
const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const getDaysSince = (startDate, endDate = new Date()) => {
  if (!startDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : null;
};

const getISTTimestamp = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString();
};
const followupTagMap = {
  "Follow-up Missed": { label: "Missed", color: "error" },
  "Missed": { label: "Missed", color: "error" },
  Today: { label: "Today", color: "success" },
  Tomorrow: { label: "Tomorrow", color: "info" },
  Later: { label: "Later", color: "warning" },
  "": { label: "Not Set", color: "default" },
};

const IST_TZ = 'Asia/Kolkata';
const MONTHS_3_UPPER = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'];

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

const toDateSafe = (raw) => {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === 'number') return new Date(raw);

  const s = String(raw).trim();

  if (/^\d+$/.test(s)) {
    const ms = parseInt(s, 10);
    const d = new Date(ms);
    return isValidDate(d) ? d : null;
  }

  if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(s)) {
    const d = new Date(s);
    return isValidDate(d) ? d : null;
  }

  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    let [, dd, mm, yyyy] = m;
    if (yyyy.length === 2) yyyy = '20' + yyyy;
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00+05:30`);
    return isValidDate(d) ? d : null;
  }

  const d = new Date(s);
  return isValidDate(d) ? d : null;
};

const getISTDayKey = (raw) => {
  const d = toDateSafe(raw);
  if (!isValidDate(d)) return null;
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d);
  return formatted;
};

const formatDayHeaderIST = (dayKeyOrRaw) => {
  let dayKey = /^\d{4}-\d{2}-\d{2}$/.test(String(dayKeyOrRaw))
    ? String(dayKeyOrRaw)
    : getISTDayKey(dayKeyOrRaw);

  if (!dayKey) return '—';

  const [yyyy, mm, dd] = dayKey.split('-');
  const monthIdx = parseInt(mm, 10) - 1;
  return `${dd} ${MONTHS_3_UPPER[monthIdx]} ${yyyy}`;
};

const formatTimeIST = (raw) => {
  const d = toDateSafe(raw);
  if (!isValidDate(d)) return '—';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TZ,
    hour: '2-digit', minute: '2-digit', hour12: true
  }).formatToParts(d);

  const hh = (parts.find(p => p.type === 'hour')?.value ?? '00').padStart(2, '0');
  const mm = (parts.find(p => p.type === 'minute')?.value ?? '00').padStart(2, '0');
  const ap = (parts.find(p => p.type === 'dayPeriod')?.value ?? 'AM').toUpperCase();

  return `${hh}:${mm} ${ap}`;
};

// ⬇️ ADD near your other date helpers
const startOfIST = (d = new Date()) => {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return new Date(`${ymd}T00:00:00+05:30`);
};
const diffDaysIST = (a, b = new Date()) => {
  const A = startOfIST(a).getTime();
  const B = startOfIST(b).getTime();
  return Math.round((A - B) / 86400000);
};
const computeReminderIST = (rawDate) => {
  if (!rawDate) return "";
  const d = toDateSafe(rawDate);
  if (!isValidDate(d)) return "";
  const diff = diffDaysIST(d, new Date());
  if (diff < 0) return "Follow-up Missed";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return "Later";
};


const RetentionLeads = () => {
  const [allLeads, setAllLeads] = useState([]); // All leads fetched from server
  const [leads, setLeads] = useState([]); // Leads currently displayed 
  const [loggedInUser, setLoggedInUser] = useState({});
  const [loading, setLoading] = useState(false);
  const [callingMessage, setCallingMessage] = useState("");
  const [zoomDialerOpen, setZoomDialerOpen] = useState(false);
  const [zoomDialNumber, setZoomDialNumber] = useState("");
  const [callStatus, setCallStatus] = useState("Idle");
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [callLeadName, setCallLeadName] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [modalIndex, setModalIndex] = useState(0);
  const [leadLoading, setLeadLoading] = useState(false);
  const [filteredAllLeads, setFilteredAllLeads] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [orderPlacedFilter, setOrderPlacedFilter] = useState("Order Placed");
  const [dateRangeFilter, setDateRangeFilter] = useState("");
  const [logPopupAnchor, setLogPopupAnchor] = useState(null);
  const [reachoutMethod, setReachoutMethod] = useState("");
  const [reachoutStatus, setReachoutStatus] = useState("");
  const [reachoutTimestamp, setReachoutTimestamp] = useState(null);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsData, setLogsData] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [showAltNumberEditor, setShowAltNumberEditor] = useState(false);
  const [altNumberDraft, setAltNumberDraft] = useState("");
  const [waOpen, setWaOpen] = useState(false);


  const [noteDraft, setNoteDraft] = useState("");
  const [notesCollapsed, setNotesCollapsed] = useState(true);

  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState(null);

  const [noteInputs, setNoteInputs] = useState({});
  const [savingNotes, setSavingNotes] = useState({});

  const [copySuccess, setCopySuccess] = useState(false);

  const [sortSubMenuAnchorEl, setSortSubMenuAnchorEl] = useState(null);
  const [activeSortType, setActiveSortType] = useState(null);

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const [planCountMap, setPlanCountMap] = useState({});
  const [planCountLoading, setPlanCountLoading] = useState({});

  const [ordersLoading, setOrdersLoading] = useState(false);

  const [dietPlanOpen, setDietPlanOpen] = useState(false);
  const [callLockMap, setCallLockMap] = useState({});


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
    retentionStatus: "All",
  });
  const [searchInput, setSearchInput] = useState("");
  const deferredSearchInput = useDeferredValue(searchInput);

  const leadsPerPage = 50;

  const containerRef = useRef(null);

  const followupDateInputRef = useRef(null);

  const [shopifyDatesMap, setShopifyDatesMap] = useState({});

  const [showOrders, setShowOrders] = useState(false);

  const [anchorElColor, setAnchorElColor] = useState(null);
  const [colorMenuIdx, setColorMenuIdx] = useState(null);

  const [shipmentStatusMap, setShipmentStatusMap] = useState({});

  const [orderPopupOpen, setOrderPopupOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const [followupDateAnchorEl, setFollowupDateAnchorEl] = useState(null);
  const [followupDateDraft, setFollowupDateDraft] = useState("");

  const remarksBodyRef = useRef(null);
  const [showRemarksMore, setShowRemarksMore] = useState(false);
  const [remarksExpanded, setRemarksExpanded] = useState(false);

  const [planRemainingDaysMap, setPlanRemainingDaysMap] = useState({});

  const [serverPage, setServerPage] = useState(1);
  const [serverLimit] = useState(50);
  const [serverHasMore, setServerHasMore] = useState(true);
  const [serverTotal, setServerTotal] = useState(0);

  const [colorFilter, setColorFilter] = useState(undefined);
  const [acqYear, setAcqYear] = useState(null);
  const [acqMonth, setAcqMonth] = useState(null);

  const [serverCounts, setServerCounts] = useState({
    all: 0,
    active: 0,
    lost: 0,
    nocall: 0,
    followups: { missed: 0, notset: 0, today: 0, tomorrow: 0, later: 0 },
  });
  const [firstCallStats, setFirstCallStats] = useState({
    total: 0,
    connected: 0,
    notConnected: 0,
    percentage: 0
  });

  const handleMarkFirstCallConnected = async () => {
    if (!leads[selectedLeadIndex]?._id) return;

    if (leads[selectedLeadIndex]?.firstCallConnected) {
      alert(`First call already marked as connected on ${new Date(leads[selectedLeadIndex].firstCallConnectedAt).toLocaleString()}`);
      return;
    }

    try {
      // ✅ FIX: Use IST timestamp to match backend date range queries
      const istTimestamp = getISTTimestamp();

      console.log('✅ Marking first call with IST timestamp:', istTimestamp);

      const response = await api.post(
        `/api/leads/${leads[selectedLeadIndex]._id}/first-call-connected`,
        { firstCallConnectedAt: istTimestamp }
      );

      // Update lead in state
      setLeads(prev => {
        const updated = [...prev];
        updated[selectedLeadIndex] = {
          ...updated[selectedLeadIndex],
          firstCallConnected: true,
          firstCallConnectedAt: istTimestamp // ✅ Use same IST timestamp
        };
        return updated;
      });

      // Refresh stats
      fetchFirstCallStats();

      alert("First call marked as connected successfully!");
    } catch (error) {
      console.error("Error marking first call:", error);
      alert(error.response?.data?.message || "Failed to mark first call");
    }
  };
  // Fetch first call stats
  const fetchFirstCallStats = async () => {
    if (!loggedInUser?.fullName) return;

    try {
      const response = await api.get("/api/leads/first-call-stats", {
        params: {
          healthExpertAssigned: loggedInUser.fullName,
          email: loggedInUser.email,
        },
      });
      setFirstCallStats(response.data);
    } catch (error) {
      console.error("Error fetching first call stats:", error);
    }
  };


  useEffect(() => {
    if (loggedInUser?.fullName) {
      fetchFirstCallStats();
    }
  }, [loggedInUser]);
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
  };

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

  const fetchRetentionLeadsPage = async (user, page = 1) => {
    if (!user?.fullName || !user?.email) return { items: [], hasMore: false };
    if (page === 1) setLoading(true);

    try {
      // map chip -> backend param
      const followupCategory =
        filters.rtFollowupReminder === null
          ? undefined
          : ({
            "Follow-up Missed": "missed",
            Missed: "missed",
            Today: "today",
            Tomorrow: "tomorrow",
            Later: "later",
            "": "notset",
          }[filters.rtFollowupReminder]);

      const rawSearch = (filters.name || "").trim();
      const serialMatch = rawSearch.startsWith("#")
        ? rawSearch.slice(1)
        : (/^\d{1,5}$/.test(rawSearch) ? rawSearch : null);
      const serialParam =
        serialMatch && /^\d+$/.test(serialMatch) ? parseInt(serialMatch, 10) : null;

      const resp = await api.get("/api/leads/retentions", {
        params: {
          fullName: user.fullName,
          email: user.email,
          page,
          limit: serverLimit,
          retentionStatus: filters.retentionStatus || "All",
          ...(followupCategory ? { followupCategory } : {}),
          ...(serialParam ? { serial: serialParam } : rawSearch ? { search: rawSearch } : {}),
          ...(filters.rtNextFollowupDate ? { followupDate: filters.rtNextFollowupDate } : {}),
          ...(colorFilter !== undefined ? { rowColor: colorFilter } : {}),
          ...(acqYear && acqMonth ? { acquiredYear: acqYear, acquiredMonth: acqMonth } : {}),
        },
      });

      const { items = [], total = 0, hasMore: pageHasMore = false, counts } = resp.data || {};

      if (counts) setServerCounts(counts);
      setServerTotal(total);
      setServerHasMore(pageHasMore);

      const { async, agentNumber, callerId } = await fetchUserDetails(user);

      const normalized = items.map((lead) => ({
        ...lead,
        async,
        agentNumber,
        callerId,
        rtSubcells: lead.rtSubcells || [],
      }));

      if (page === 1) {
        // Seed base list
        setAllLeads(normalized);

        // Seed visible slice ONCE for page 1 (prevents snap-back during later appends)
        const filtered = filteredLeadsByFilters(normalized);
        const firstSlice = filtered.slice(0, leadsPerPage);

        setFilteredAllLeads(filtered);
        setLeads(firstSlice);
        setHasMore(pageHasMore || filtered.length > firstSlice.length);
        setServerPage(1);
      } else {
        setAllLeads((prevAll) => {
          const merged = [...prevAll, ...normalized];
          const after = filteredLeadsByFilters(merged);

          setLeads((prev) => {
            const start = prev.length;
            const nextSlice = after.slice(start, start + leadsPerPage);

            setHasMore(pageHasMore || after.length > (start + nextSlice.length));

            return nextSlice.length ? [...prev, ...nextSlice] : prev;
          });

          setFilteredAllLeads(after);
          return merged;
        });
      }

      return { items: normalized, hasMore: pageHasMore };
    } catch (error) {
      console.error("Failed to fetch retention leads:", error);
      return { items: [], hasMore: false };
    } finally {
      if (page === 1) setLoading(false);
    }
  };

  // ✅ UPDATED: Track when adding subcells/notes
  const handleAddSubcell = async (leadIdx) => {
    const text = (noteDraft || "").trim();
    if (!text) return;

    const newEntry = {
      date: new Date().toISOString(),
      value: text,
      by: currentUserName,
    };

    // Update UI
    setLeads(prev => {
      const list = [...prev];
      const lead = { ...list[leadIdx] };
      lead.rtSubcells = [...(lead.rtSubcells || []), newEntry];
      list[leadIdx] = lead;
      return list;
    });

    // Persist with tracking
    const leadId = leads[leadIdx]?._id;
    const nextSubcells = [
      ...(leads[leadIdx]?.rtSubcells || []),
      newEntry
    ];

    try {
      await api.put(`/api/leads/${leadId}`, {
        rtSubcells: nextSubcells,
        profileUpdatedAt: new Date().toISOString(),
        profileUpdatedBy: currentUserName,
      });
      setNoteDraft("");
    } catch (error) {
      console.error("Error saving subcells:", error);
    }
  };

  const fetchShopifyDates = async (phoneNumber) => {
    try {
      const res = await api.get("/api/shopify/orders-dates", {
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

  const groupLogsByDate = (logs) => {
    const grouped = {};

    logs.forEach((log) => {
      const dateStr = new Date(log.timestamp).toLocaleDateString();
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(log);
    });

    return grouped;
  };

  const groupedLogs = groupLogsByDate(logsData);

  const sortedDates = Object.keys(groupedLogs).sort(
    (a, b) => new Date(b) - new Date(a)
  );

  const [expandedDate, setExpandedDate] = React.useState(sortedDates[0] || null);

  const handleAccordionChange = (date) => (event, isExpanded) => {
    setExpandedDate(isExpanded ? date : null);
  };

  const fetchLogs = async (leadId) => {
    try {
      const res = await api.get(`/api/leads/${leadId}/reachout-logs`);
      setLogsData(res.data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  const handleCreateDietPlanClick = (lead) => {
    setSelectedLead(lead);
    setDietPlanOpen(true);
  };

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
      const needsMore = el.scrollHeight > el.clientHeight + 1;
      setShowRemarksMore(!remarksExpanded && needsMore);
    };

    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [selectedLeadIndex, leads, remarksExpanded]);


  useEffect(() => {
    if (selectedLeadIndex == null) {
      setNoteDraft("");
      return;
    }
    setNoteDraft("");
  }, [selectedLeadIndex, leads]);

  useEffect(() => {
    setShowAltNumberEditor(false);
    if (selectedLeadIndex == null) {
      setAltNumberDraft("");
      return;
    }
    setAltNumberDraft(leads[selectedLeadIndex]?.alternativeNumber || "");
  }, [selectedLeadIndex, selectedLeadId, leads]);


  // ✅ UPDATED: Track profile and condition updates
  const handleInputChange = async (e, index, field) => {
    const value = e.target.value;
    const updatedLeads = [...leads];
    const oldValue = updatedLeads[index][field];

    updatedLeads[index][field] = value;
    setLeads(updatedLeads);

    try {
      const updatePayload = { [field]: value };

      // ✅ Track profile update
      const profileFields = [
        'leadStatus', 'salesStatus', 'retentionStatus', 'communicationMethod',
        'preferredLanguage', 'rtNextFollowupDate', 'rtFollowupReminder',
        'rtFollowupStatus', 'lastOrderDate', 'repeatDosageOrdered', 'healthExpertAssigned'
      ];

      if (profileFields.includes(field)) {
        updatePayload.profileUpdatedAt = new Date().toISOString();
        updatePayload.profileUpdatedBy = currentUserName;
      }

      // ✅ Track sales done
      if (field === 'salesStatus' && /^sales done$/i.test(value) && !/^sales done$/i.test(oldValue)) {
        updatePayload.salesDoneAt = new Date().toISOString();
      }

      await api.put(`/api/leads/${updatedLeads[index]._id}`, updatePayload);
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  };

  // near other refs
  const loadingMoreRef = useRef(false);

  // replace loadMoreLeads with this:
  const loadMoreLeads = useCallback(async () => {
    if (loadingMoreRef.current || loadingMore) return;

    const localFilteredLen = filteredAllLeads.length;
    const haveLocalHidden = leads.length < localFilteredLen;

    // If server has no more AND we already rendered all local filtered items, stop.
    if (!serverHasMore && !haveLocalHidden) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      // 1) reveal local hidden first
      if (haveLocalHidden) {
        const nextSlice = filteredAllLeads.slice(leads.length, leads.length + leadsPerPage);
        if (nextSlice.length) setLeads(prev => [...prev, ...nextSlice]);

        setHasMore(serverHasMore || (leads.length + nextSlice.length) < localFilteredLen);
        return;
      }

      // 2) otherwise fetch next server page
      if (serverHasMore && loggedInUser) {
        const nextPage = serverPage + 1;
        await fetchRetentionLeadsPage(loggedInUser, nextPage); // this will append & slice
        setServerPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [
    loadingMore,
    serverHasMore,
    loggedInUser,
    serverPage,
    filteredAllLeads,
    leads,
    leadsPerPage,
    fetchRetentionLeadsPage,
  ]);


  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || !hasMore || loadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadMoreLeads();
    }
  }, [hasMore, loadingMore, loadMoreLeads]);



  const handleColorSelect = async (color, index) => {
    const updatedLeads = [...leads];
    updatedLeads[index].rowColor = color;
    setLeads(updatedLeads);
    setAnchorElColor(null);
    setColorMenuIdx(null);

    try {
      await api.put(`/api/leads/${updatedLeads[index]._id}`, { rowColor: color });
    } catch (error) {
      console.error("Error updating row color:", error);
    }
  };

  const fetchDietPlanCount = async (leadId) => {
    if (!leadId) return;
    if (planCountLoading[leadId] || planCountMap[leadId] != null) return;
    try {
      setPlanCountLoading((p) => ({ ...p, [leadId]: true }));
      const res = await api.get("/api/diet-plans", {
        params: { leadId, limit: 200 },
      });
      const items = res?.data?.items || [];
      const now = new Date();
      const ms14 = 14 * 24 * 60 * 60 * 1000;
      const ms30 = 30 * 24 * 60 * 60 * 1000;
      const cutoff14 = new Date(now.getTime() - ms14);
      const cutoff30 = new Date(now.getTime() - ms30);

      let count = 0;
      let latestStart = null;
      let latestType = null;

      for (const plan of items) {
        const sd = plan?.startDate ? new Date(plan.startDate) : null;
        if (!sd || isNaN(sd.getTime())) continue;
        const type = String(plan?.planType || "").toLowerCase();
        const qualifies =
          (type === "weekly" && sd >= cutoff14) ||
          (type === "monthly" && sd >= cutoff30);
        if (qualifies) {
          count += 1;
          if (!latestStart || sd > latestStart) {
            latestStart = sd;
            latestType = type; // "weekly" or "monthly"
          }
        }
      }
      setPlanCountMap((p) => ({ ...p, [leadId]: count }));

      // compute remaining days from the latest qualifying plan
      if (latestStart && latestType) {
        const totalDays = latestType === "weekly" ? 14 : 30;
        const elapsed = Math.floor((now - latestStart) / (1000 * 60 * 60 * 24));
        const remaining = Math.max(totalDays - elapsed, 0);
        setPlanRemainingDaysMap((m) => ({ ...m, [leadId]: remaining }));
      } else {
        setPlanRemainingDaysMap((m) => ({ ...m, [leadId]: null }));
      }
    } catch (e) {
      // On error, mark as zero so we don't hammer repeatedly
      setPlanCountMap((p) => ({ ...p, [leadId]: 0 }));
      setPlanRemainingDaysMap((m) => ({ ...m, [leadId]: null }));
      console.error("Failed fetching diet plans for lead", leadId, e?.response?.data || e?.message || e);
    } finally {
      setPlanCountLoading((p) => ({ ...p, [leadId]: false }));
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
    const filtered = filteredLeadsByFilters(allLeads);
    setFilteredAllLeads(filtered);

    setLeads(filtered.slice(0, leadsPerPage));
    setHasMore(filtered.length > leadsPerPage || serverHasMore);
    setCurrentIndex(leadsPerPage);
  }, [allLeads, leadsPerPage, serverHasMore, filteredLeadsByFilters]);


  useEffect(() => {
    applyFilters();
  }, [filters, orderPlacedFilter, dateRangeFilter]);

  useEffect(() => {
    const normalizedSearch = deferredSearchInput.trimStart();
    const timeoutId = window.setTimeout(() => {
      setFilters((prev) =>
        prev.name === normalizedSearch
          ? prev
          : { ...prev, name: normalizedSearch }
      );
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [deferredSearchInput]);

  useEffect(() => {
    setSearchInput((prev) => (prev === filters.name ? prev : filters.name));
  }, [filters.name]);

  useEffect(() => {
    (async () => {
      for (const l of leads) {
        if (l?._id && planCountMap[l._id] == null && !planCountLoading[l._id]) {
          fetchDietPlanCount(l._id);
        }
      }
    })();
  }, [leads]);

  useEffect(() => {
    if (!loggedInUser?.fullName || !loggedInUser?.email) return;

    setServerPage(1);
    setAllLeads([]);
    setFilteredAllLeads([]);
    setLeads([]);
    setServerHasMore(true);
    setHasMore(true);

    fetchRetentionLeadsPage(loggedInUser, 1);
  }, [loggedInUser, filters.retentionStatus, filters.rtFollowupReminder, filters.name, filters.rtNextFollowupDate, colorFilter, acqYear, acqMonth]);

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
      setServerPage(1);
      setAllLeads([]);
      fetchRetentionLeadsPage(user, 1);
    }
  }, []);


  useEffect(() => {
    setReachoutMethod("");
    setReachoutStatus("");
    setLogPopupAnchor(null);
    setReachoutTimestamp(null);
  }, [selectedLeadIndex]);

  const handleCallIconClick = async (contactNumber) => {
    const selected = leads?.[selectedLeadIndex] || {};
    const resolvedNumber =
      String(contactNumber || "").trim() ||
      String(selected?.contactNumber || "").trim() ||
      String(selected?.phone || "").trim();

    if (!resolvedNumber) {
      setCallingMessage("No contact number found for this lead.");
      return;
    }

    if (callLockMap[resolvedNumber]) return;
    setCallLockMap((prev) => ({ ...prev, [resolvedNumber]: true }));

    setLoading(true);
    try {
      const dialTarget = String(resolvedNumber || "").trim();
      if (!dialTarget) {
        setCallingMessage("Invalid call number");
        return;
      }

      setZoomDialNumber(dialTarget);
      setCallLeadName(String(selected?.name || "Unknown"));
      setCallStatus("Dialing");
      setCallStartedAt(null);
      setCallDurationSec(0);
      setZoomDialerOpen(true);
      setCallingMessage(`Opening Zoom Phone for ${dialTarget}...`);
    } finally {
      setLoading(false);
      // Release lock so the same lead can be dialed again if needed.
      setTimeout(() => {
        setCallLockMap((prev) => {
          const next = { ...prev };
          delete next[resolvedNumber];
          return next;
        });
      }, 1500);
    }
  };

  const handleZoomDialerFrameLoad = () => {
    try {
      if (!zoomDialNumber) return;
      const iframe = document.getElementById("retention-zoom-phone-frame");
      iframe?.contentWindow?.postMessage(
        { type: "zp-make-call", phoneNumber: String(zoomDialNumber).trim() },
        "https://applications.zoom.us"
      );
    } catch (_) {}
  };

  useEffect(() => {
    const onZoomMessage = (event) => {
      if (event.origin !== "https://applications.zoom.us") return;
      const { type, data } = event.data || {};
      if (type === "zp-softphone-ready") {
        setCallingMessage((prev) => prev || "Zoom softphone ready.");
      }
      if (type === "zp-call-state-change") {
        const state = data?.state || "updated";
        const normalized = String(state).toLowerCase();
        if (normalized.includes("ring")) {
          setCallStatus("Ringing");
        } else if (normalized.includes("dial")) {
          setCallStatus("Dialing");
        } else if (normalized.includes("connect") || normalized.includes("active") || normalized.includes("talk")) {
          setCallStatus("Connected");
          setCallStartedAt((prev) => prev || new Date());
        } else if (normalized.includes("end") || normalized.includes("hang") || normalized.includes("term")) {
          setCallStatus("Ended");
          setCallStartedAt(null);
        } else {
          setCallStatus(state);
        }
        setCallingMessage(`Call state: ${state}`);
      }
      if (type === "zp-error") {
        setCallStatus("Error");
        setCallStartedAt(null);
        setCallingMessage("Zoom softphone reported an error.");
      }
    };
    window.addEventListener("message", onZoomMessage);
    return () => window.removeEventListener("message", onZoomMessage);
  }, []);

  useEffect(() => {
    if (!zoomDialerOpen || !callStartedAt) return undefined;
    const id = setInterval(() => {
      const secs = Math.max(0, Math.floor((Date.now() - new Date(callStartedAt).getTime()) / 1000));
      setCallDurationSec(secs);
    }, 1000);
    return () => clearInterval(id);
  }, [zoomDialerOpen, callStartedAt]);

  const handleEndFloatingCall = () => {
    try {
      const iframe = document.getElementById("retention-zoom-phone-frame");
      iframe?.contentWindow?.postMessage(
        { type: "zp-end-call" },
        "https://applications.zoom.us"
      );
    } catch (_) {}
    setZoomDialerOpen(false);
    setCallStatus("Ended");
  };


  const handleCreateOrderClick = (lead) => {
    setSelectedLead(lead);
    setOrderPopupOpen(true);
  };

  const updateLeadDetails = async (contactNumber, newDetails) => {
    // Find the lead
    const leadIndex = leads.findIndex(l => l.contactNumber === contactNumber);
    if (leadIndex === -1) {
      console.warn('Lead not found for contact:', contactNumber);
      return;
    }

    const lead = leads[leadIndex];

    // ✅ Check if condition fields changed
    const conditionFields = [
      'hba1c', 'fastingSugar', 'ppSugar', 'durationOfDiabetes', 'lastTestDone',
      'totalCholesterol', 'ldl', 'hdl', 'triglycerides', 'lastCholesterolTest',
      'sgpt', 'sgot', 'ggt', 'ultrasoundFindings', 'lastLiverTest'
    ];

    const hasConditionUpdate = Object.keys(newDetails).some(field =>
      conditionFields.includes(field) &&
      newDetails[field] !== lead.details?.[field]
    );

    const updatePayload = { details: newDetails };

    // ✅ Track condition update
    if (hasConditionUpdate) {
      updatePayload.conditionsUpdatedAt = new Date().toISOString();
      updatePayload.conditionsUpdatedBy = currentUserName;
      console.log('✅ Condition field updated, tracking:', {
        lead: lead.name,
        timestamp: updatePayload.conditionsUpdatedAt,
        user: currentUserName
      });
    }

    try {
      await api.put(`/api/leads/${lead._id}`, updatePayload);

      // Update local state
      setLeads((prevLeads) => {
        return prevLeads.map((l) =>
          l.contactNumber === contactNumber ? { ...l, details: newDetails } : l
        );
      });

      console.log('✅ Lead details updated successfully');
    } catch (error) {
      console.error("❌ Error updating lead details:", error);
      throw error; // Re-throw so Details.jsx can show error state
    }
  };

  function filteredLeadsByFilters(inputLeads) {
    if (!inputLeads || inputLeads.length === 0) return [];

    let filtered = [...inputLeads];



    return filtered;
  }


  const handleSortMenuClick = (event, type) => {
    setActiveSortType(type);
    setSortSubMenuAnchorEl(event.currentTarget);
  };

  const handleSortByColor = (color) => {
    // color: "#ffdbbb" | "#baddff" | "#bafff5" | "" (No Color)
    setColorFilter(color);

    // reset & refetch page 1 with new server filter
    setSortMenuAnchorEl(null);
    setSortSubMenuAnchorEl(null);
    setActiveSortType(null);

    setServerPage(1);
    setAllLeads([]);
    setFilteredAllLeads([]);
    setLeads([]);
    setServerHasMore(true);
    setHasMore(true);
    fetchRetentionLeadsPage(loggedInUser, 1);
  };

  const premiumPillSx = (isSelected) => ({
    textTransform: "none",
    borderRadius: "12px",
    fontSize: "0.72rem",
    fontWeight: 600,
    color: isSelected ? "#fff" : "#1B2430",
    borderColor: isSelected ? "transparent" : "#D6DEE8",
    background: isSelected
      ? "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)"
      : "rgba(255,255,255,0.92)",
    boxShadow: isSelected
      ? "0 8px 18px rgba(15, 23, 42, 0.25)"
      : "inset 0 1px 0 rgba(255,255,255,0.8)",
    "&:hover": {
      background: isSelected
        ? "linear-gradient(135deg, #111827 0%, #1F2937 100%)"
        : "rgba(255,255,255,1)",
      borderColor: isSelected ? "transparent" : "#C8D2DE",
    },
  });

  const premiumInputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: "rgba(255,255,255,0.92)",
      "& .MuiOutlinedInput-notchedOutline": { borderColor: "#D6DEE8" },
      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#C8D2DE" },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#8EA9C7" },
    },
    "& .MuiInputLabel-root": { color: "#5B6B7F" },
  };

  const solidActionSx = {
    textTransform: "none",
    borderRadius: 999,
    px: 1.75,
    py: 0.5,
    fontWeight: 600,
    letterSpacing: 0.2,
    boxShadow: "0 10px 20px rgba(15,23,42,0.16)",
  };
  const headerIconButtonSx = {
    width: 38,
    height: 38,
    borderRadius: "10px",
    border: "1px solid #D6DEE8",
    bgcolor: "rgba(255,255,255,0.88)",
    boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
    flexShrink: 0,
  };
  const leadFormControlSx = {
    width: "100%",
    ...premiumInputSx,
    "& .MuiOutlinedInput-root": {
      ...premiumInputSx["& .MuiOutlinedInput-root"],
      minHeight: 56,
      borderRadius: "14px",
      "& .MuiInputBase-input, & .MuiSelect-select": {
        fontSize: "0.8rem",
        fontWeight: 600,
      },
    },
    "& .MuiInputLabel-root": {
      color: "#64748B",
      fontWeight: 600,
      fontSize: "0.8rem",
    },
  };
  const selectedAltNumber = selectedLeadIndex != null
    ? (leads[selectedLeadIndex]?.alternativeNumber || "").trim()
    : "";
  const openAltNumberEditor = () => {
    setAltNumberDraft(selectedAltNumber);
    setShowAltNumberEditor(true);
  };
  const cancelAltNumberEditor = () => {
    setAltNumberDraft(selectedAltNumber);
    setShowAltNumberEditor(false);
  };
  const saveAltNumber = async () => {
    if (selectedLeadIndex == null) return;
    await handleInputChange(
      { target: { value: (altNumberDraft || "").trim() } },
      selectedLeadIndex,
      "alternativeNumber"
    );
    setShowAltNumberEditor(false);
  };
  const altMetaButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 11px",
    minHeight: 34,
    borderRadius: 999,
    border: "1px solid #CAD5E3",
    background: "#F7FAFF",
    color: "#1E293B",
    fontSize: "0.8rem",
    fontWeight: 600,
    lineHeight: 1,
    cursor: "pointer",
  };
  const altEditorWrapStyle = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 6px",
    minHeight: 34,
    borderRadius: 999,
    border: "1px solid #CAD5E3",
    background: "#FFFFFF",
    boxShadow: "0 6px 16px rgba(15,23,42,0.08)",
  };
  const altInputStyle = {
    width: 130,
    height: 26,
    borderRadius: 999,
    border: "1px solid #D4DEEA",
    padding: "0 9px",
    fontSize: "0.76rem",
    fontWeight: 500,
    color: "#0F172A",
    outline: "none",
  };
  const altActionBtnStyle = {
    height: 26,
    borderRadius: 999,
    border: "1px solid #C5D1E0",
    background: "#F8FBFF",
    color: "#1E293B",
    padding: "0 8px",
    fontSize: "0.7rem",
    fontWeight: 600,
    cursor: "pointer",
  };
  const metaPillSx = {
    px: 1.2,
    py: 0.45,
    minHeight: 34,
    borderRadius: 999,
    border: "1px solid #D5DFEA",
    bgcolor: "#EDF2F8",
    color: "#1E293B",
    display: "inline-flex",
    alignItems: "center",
    gap: 0.6,
    fontSize: "0.8rem",
    fontWeight: 600,
    lineHeight: 1,
  };
  const notesExpanded = !notesCollapsed;


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
      <Box
        sx={{
          width: "20%",
          borderRight: "1px solid #D7E0EA",
          display: "flex",
          flexDirection: "column",
          pt: 0,
          px: 1.25,
          pb: 1.25,
          background:
            "radial-gradient(140% 90% at 0% 0%, #F6F9FC 0%, #EEF3F9 55%, #E9EEF5 100%)",
          overflowY: "auto",
        }}
        ref={containerRef}
      >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            backdropFilter: "blur(8px)",
            background:
              "linear-gradient(180deg, rgba(241,246,252,0.97) 0%, rgba(241,246,252,0.92) 100%)",
            mt: 0,
            pt: 1.25,
            pb: 1.1,
            borderBottom: "1px solid #D7E0EA",
            borderRadius: "0 0 16px 16px",
          }}
        > 
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ flexWrap: "wrap", rowGap: 0.75, columnGap: 0.75, flex: "1 1 auto" }}
            >
              {[
                {
                  label: "All",
                  value: "All",
                  count: serverCounts.all,
                },
                {
                  label: "Active",
                  value: "Active",
                  count: serverCounts.active,
                },
                {
                  label: "Lost",
                  value: "Lost",
                  count: serverCounts.lost,
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
                        rtFollowupReminder: null,
                      }))
                    }
                    size="small"
                    sx={premiumPillSx(isSelected)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography>{label}</Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.65rem", opacity: 0.7, ml: 0.15 }}
                      >
                        ({count})
                      </Typography>
                    </Box>
                  </Button>
                );
              })}
            </Stack>

            <Tooltip title="No Call">
              <IconButton
                size="small"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    retentionStatus: "No-Call",
                    rtFollowupReminder: null,
                  }))
                }
                sx={{
                  ...headerIconButtonSx,
                  border: "1px solid #D6DEE8",
                  bgcolor: filters.retentionStatus === "No-Call" ? "#E7EEF8" : "rgba(255,255,255,0.85)",
                  color: "#1B2430",
                }}
              >
                <Badge
                  badgeContent={serverCounts.nocall || 0}
                  color="error"
                  overlap="circular"
                  anchorOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <PhoneDisabledIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>

          <Stack direction="row" spacing={0.65} mt={1} sx={{ flexWrap: "wrap", rowGap: 0.65 }}>
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
                    }));
                  }}
                  size="small"
                  sx={{
                    ...premiumPillSx(isSelected),
                    borderRadius: "10px",
                    minWidth: 58,
                    px: 0.65,
                    py: 0.35,
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
                      {{
                        "Today": serverCounts.followups.today,
                        "Tomorrow": serverCounts.followups.tomorrow,
                        "Follow-up Missed": serverCounts.followups.missed,
                        "Later": serverCounts.followups.later,
                        "": serverCounts.followups.notset,
                      }[value] ?? 0}
                    </Typography>
                  </Box>
                </Button>
              );
            })}
          </Stack>

          <Box sx={{ display: "flex", alignItems: "center", mb: 0, gap: 0.6, mt: 1 }}>
            <TextField
              size="small"
              placeholder="Search leads..."
              variant="outlined"
              fullWidth
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                sx: {
                  borderRadius: "12px",
                  bgcolor: "rgba(255,255,255,0.92)",
                  boxShadow: "0 6px 14px rgba(15,23,42,0.06)",
                },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#60758D" }} />
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title="Filter by Next Follow-up">
              <IconButton
                size="small"
                onClick={() => {
                  const el = followupDateInputRef.current;
                  if (!el) return;
                  // Prefer showPicker() when supported; otherwise fallback to click()
                  if (typeof el.showPicker === "function") el.showPicker();
                  else el.click();
                }}
                // Optional: highlight when active
                sx={{
                  borderRadius: "10px",
                  ...headerIconButtonSx,
                  bgcolor: filters.rtNextFollowupDate ? "#E7EEF8" : "rgba(255,255,255,0.88)",
                }}
              >
                <CalendarMonthIcon sx={{ color: "#334155" }} />
              </IconButton>
            </Tooltip>

            {/* Hidden input that the calendar icon triggers */}
            <input
              ref={followupDateInputRef}
              type="date"
              style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
              value={filters.rtNextFollowupDate || ""}
              onChange={(e) => {
                const v = e.target.value || "";
                setFilters((prev) => ({ ...prev, rtNextFollowupDate: v }));
              }}
            />


            <Tooltip title="Filter">
              <Badge
                color="primary"
                badgeContent={
                  orderPlacedFilter === "Acquired In" && dateRangeFilter
                    ? serverTotal
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
                  sx={{
                    ...headerIconButtonSx,
                  }}
                >
                  <FilterListIcon sx={{ color: "#334155" }} />
                </IconButton>
              </Badge>
            </Tooltip>
            <Tooltip title="Sort">
              <IconButton
                size="small"
                onClick={(e) => setSortMenuAnchorEl(e.currentTarget)}
                sx={{
                  ...headerIconButtonSx,
                }}
              >
                <SortIcon sx={{ color: "#334155" }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Menu
          anchorEl={followupDateAnchorEl}
          open={Boolean(followupDateAnchorEl)}
          onClose={() => setFollowupDateAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
          <Box sx={{ p: 2, width: 260, display: "grid", gap: 1 }}>
            <Typography variant="subtitle2">Next Follow-up on</Typography>

            <TextField
              size="small"
              type="date"
              value={followupDateDraft}
              onChange={(e) => setFollowupDateDraft(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, rtNextFollowupDate: followupDateDraft || "" }));
                  setFollowupDateAnchorEl(null);
                }}
                disabled={!followupDateDraft}
                sx={{ textTransform: "none" }}
              >
                Apply
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setFollowupDateDraft("");
                  setFilters((prev) => ({ ...prev, rtNextFollowupDate: "" }));
                  setFollowupDateAnchorEl(null);
                }}
                sx={{ textTransform: "none" }}
              >
                Clear
              </Button>
            </Box>
          </Box>
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
                sx={{
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  px: 2,
                  pt: 1,
                  pb: 0.25,
                  color: "text.primary",
                }}
              >
                Acquired In
              </Typography>

              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  px: 2,
                  pt: 1,
                  pb: 0.5,
                  color: "text.disabled",
                }}
              >
                {selectedYear ? "Select Month" : "Select Year"}
              </Typography>

              {!selectedYear ? (
                [2023, 2024, 2025, 2026].map((year) => (
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
                  "December",
                ].map((month) => (
                  <MenuItem
                    key={month}
                    selected={selectedMonth === month}
                    onClick={() => {
                      const combined = `${month} ${selectedYear}`;
                      setSelectedMonth(month);
                      setDateRangeFilter(combined);

                      const monthIndex = [
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                      ].indexOf(month) + 1;
                      setAcqYear(selectedYear);
                      setAcqMonth(monthIndex);

                      setServerPage(1);
                      setAllLeads([]);
                      setFilteredAllLeads([]);
                      setLeads([]);
                      setServerHasMore(true);
                      setHasMore(true);
                      setFilterAnchorEl(null);
                      fetchRetentionLeadsPage(loggedInUser, 1);
                    }}
                  >
                    {month}
                  </MenuItem>
                ))
              )}
            </Box>
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
        </Menu>

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
        </Menu>


        <List disablePadding sx={{ mt: 1, pb: 0.5 }}>
          {leads.map((lead, idx) => {
            const initials = lead.name
              ? lead.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
              : "?";

            const followupDisplay = computeReminderIST(lead.rtNextFollowupDate);
            const tagInfo = followupTagMap[followupDisplay] || followupTagMap[""];

            const isSelected = lead._id === selectedLeadId;

            return (
              <ListItemButton
                key={lead._id || idx}
                sx={{
                  mb: 0.9,
                  borderRadius: 2.2,
                  minHeight: 70,
                  background: lead.rowColor
                    ? `linear-gradient(135deg, ${lead.rowColor} 0%, #FFFFFF 100%)`
                    : isSelected
                      ? "linear-gradient(135deg, #E4EDF9 0%, #F8FBFF 100%)"
                      : "rgba(255,255,255,0.92)",
                  position: "relative",
                  border: isSelected ? "1px solid #93B3D8" : "1px solid #D8E1EC",
                  boxShadow: isSelected
                    ? "0 14px 26px rgba(30,41,59,0.14)"
                    : "0 8px 18px rgba(15,23,42,0.07)",
                  px: 1.05,
                  py: 0.25,
                  transition: "all .18s ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "0 14px 28px rgba(15,23,42,0.14)",
                    borderColor: "#C3D3E6",
                  },
                }}
                onClick={() => {
                  setLeadLoading(true);
                  handleLeadSelect(idx, lead._id);
                  setTimeout(() => setLeadLoading(false), 500);
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: -8,
                    left: 8,
                    fontSize: "0.64rem",
                    fontWeight: 700,
                    color: "#4E6073",
                    border: "1px solid #D4DEEA",
                    bgcolor: "#F8FAFD",
                    borderRadius: 999,
                    px: 0.75,
                    py: 0.1,
                  }}
                >
                  {allLeads.findIndex((l) => l._id === lead._id) + 1}
                </Box>
                <ListItemAvatar sx={{ position: "relative", ml: 1.8 }}>
                  <Avatar
                    sx={{
                      background: "linear-gradient(135deg, #0F172A 0%, #334155 100%)",
                      fontSize: "0.78rem",
                      width: 34,
                      height: 34,
                    }}
                  >
                    {initials}
                  </Avatar>
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      top: -4,
                      left: -8,
                      bgcolor: "#FFFFFF",
                      width: 20,
                      height: 20,
                      p: 0.3,
                      border: "1px solid #D6DEE8",
                      boxShadow: "0 4px 10px rgba(15,23,42,0.16)",
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
                        sx={{ maxWidth: "68%", color: "#0F172A", letterSpacing: 0.1 }}
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
                          sx={{
                            fontWeight: 700,
                            height: 22,
                            borderRadius: "7px",
                            "& .MuiChip-label": { px: 1, fontSize: "0.66rem" },
                          }}
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
                        sx={{
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          fontSize: "0.68rem",
                          opacity: 0.9,
                          color: "#60758D",
                          lineHeight: 1.35,
                        }}
                        component="div"
                      >
                        {(() => {
                          const last = lead.lastOrderDate;
                          const daysSinceLast = getDaysSince(last);


                          const norm = (s) => String(s || "").trim().toLowerCase();
                          const logsAll = Array.isArray(lead.reachoutLogs) ? lead.reachoutLogs : [];

                          const latestFromStatuses = (statuses) => {
                            const wanted = new Set(statuses.map((s) => s.toLowerCase()));
                            let latest = null;
                            for (const log of logsAll) {
                              if (wanted.has(norm(log?.status))) {
                                const d = toDateSafe(log?.timestamp);
                                if (d && (!latest || d > latest)) latest = d;
                              }
                            }
                            return latest;
                          };

                          const latestConnected = latestFromStatuses(["Followup Done", "Order Placed"]);
                          const lastConnectedDays = latestConnected ? getDaysSince(latestConnected) : null;

                          const latestReached = latestFromStatuses(["CNP", "Call Back Later", "Switch Off", "Busy", "Drop On Intro"]);
                          const lastReachedDays = !latestConnected && latestReached ? getDaysSince(latestReached) : null;

                          if (daysSinceLast === null) return "N/A";

                          return (
                            <>
                              <div>Last Order - {daysSinceLast} days</div>
                              {lastConnectedDays !== null ? (
                                <div>
                                  Last Connected - {lastConnectedDays} day{lastConnectedDays === 1 ? "" : "s"}
                                </div>
                              ) : lastReachedDays !== null ? (
                                <div>
                                  Last Reached - {lastReachedDays} day{lastReachedDays === 1 ? "" : "s"}
                                </div>
                              ) : null}
                            </>
                          );
                        })()}

                      </Typography>
                    </Box>
                  }
                />
                {!!planCountMap[lead._id] && planCountMap[lead._id] > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      right: 6,
                      bottom: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <Tooltip
                      title={`Diet plans in last 14/30 days — ${planRemainingDaysMap[lead._id] != null
                        ? planRemainingDaysMap[lead._id] + " days left"
                        : "no active plan window"
                        }`}
                    >
                      <Badge
                        color="success"
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      >
                        <SpaIcon sx={{ fontSize: 18, color: "#2E7D32" }} />
                      </Badge>
                    </Tooltip>
                    {planRemainingDaysMap[lead._id] != null && (
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: "#2E7D32", lineHeight: 1 }}
                      >
                        {planRemainingDaysMap[lead._id]}d
                      </Typography>
                    )}
                  </Box>
                )}
              </ListItemButton>
            );
          })}
        </List>

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

        {!loading && leads.length === 0 && (
          <Typography variant="body2" align="center" color="text.secondary" mt={2}>
            No leads found.
          </Typography>
        )}

        {loading && !loadingMore && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}
      </Box>

      <Box
        sx={{
          width: "80%",
          p: 3,
          overflowY: "auto",
          display: "flex",
          gap: 2,
          background:
            "radial-gradient(120% 120% at 85% 0%, #F3F7FC 0%, #EEF3F9 55%, #EAF0F7 100%)",
        }}
      >
        {selectedLeadIndex === null || leadLoading ? (
          <Box sx={{ flex: "1 1 70%", flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Paper
                sx={{
                  mb: 3,
                  p: 1.8,
                  borderRadius: 3,
                  boxShadow: "0 20px 38px rgba(15,23,42,0.12)",
                  border: "1px solid #D5DFEA",
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.98) 100%)",
                  fontSize: "0.85rem",
                  fontFamily: '"Segoe UI", Inter, system-ui, sans-serif',
                }}
                elevation={0}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                    <Avatar
                      sx={{
                        width: 46,
                        height: 46,
                        background: "linear-gradient(135deg, #0F172A 0%, #334155 100%)",
                        color: "#F8FAFC",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        flex: "0 0 auto",
                        boxShadow: "0 12px 24px rgba(15,23,42,0.24)",
                      }}
                    >
                      {(leads[selectedLeadIndex]?.name || "?")
                        .split(" ")
                        .map((n) => n?.[0] || "")
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </Avatar>

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
                          bgcolor: "rgba(255,255,255,0.95)",
                          border: "1px solid #D4DEEA",
                          boxShadow: "0 6px 14px rgba(15,23,42,0.12)",
                          "&:hover": { bgcolor: "#F7FAFD" },
                        }}
                      >
                        <SvgIcon fontSize="small" sx={{ color: "#5E8E3E" }} viewBox="0 0 24 24">
                          <path d="M7 7V6a5 5 0 0 1 10 0v1h1.5a1.5 1.5 0 0 1 1.49 1.29l1.36 9.5A2.5 2.5 0 0 1 18.89 21H5.11a2.5 2.5 0 0 1-2.46-2.21l1.36-9.5A1.5 1.5 0 0 1 5.5 7H7Zm2 0h6V6a3 3 0 0 0-6 0v1Z" />
                          <path d="M10.6 14.8c.3.4.8.7 1.6.7.8 0 1.2-.3 1.2-.8 0-.6-.7-.7-1.4-.9-.9-.2-2-.5-2-1.8 0-1.1.9-1.9 2.3-1.9 1 0 1.8.3 2.3.9l-.9.8c-.3-.4-.8-.6-1.5-.6-.6 0-1 .3-1 .7 0 .5.6.6 1.3.8 1 .2 2.1.5 2.1 1.9 0 1.3-1 2.1-2.5 2.1-1.2 0-2.1-.4-2.6-1.1l.9-.8Z" />
                        </SvgIcon>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={
                      leads[selectedLeadIndex]?.firstCallConnected
                        ? `First call connected on ${new Date(leads[selectedLeadIndex].firstCallConnectedAt).toLocaleString()}`
                        : "Mark first call as connected"
                    }>
                      <IconButton
                        onClick={handleMarkFirstCallConnected}
                        disabled={leads[selectedLeadIndex]?.firstCallConnected}
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 999,
                          bgcolor: leads[selectedLeadIndex]?.firstCallConnected ? "#4CAF50" : "#fff",
                          border: "1px solid #D4DEEA",
                          boxShadow: "0 6px 14px rgba(15,23,42,0.12)",
                          "&:hover": {
                            bgcolor: leads[selectedLeadIndex]?.firstCallConnected ? "#45a049" : "#F7F9FB"
                          },
                          color: leads[selectedLeadIndex]?.firstCallConnected ? "#fff" : "#2E7D32",
                          "&:disabled": {
                            bgcolor: "#4CAF50",
                            color: "#fff",
                          }
                        }}
                      >
                        <AddIcCallIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flexWrap: "wrap" }}>
                        <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }} noWrap>
                          {leads[selectedLeadIndex]?.name || "—"}
                        </Typography>
                        <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "#D0D5DD" }} />
                        <Typography sx={{ fontWeight: 600, color: "#1E293B" }}>
                          {leads[selectedLeadIndex]?.contactNumber || "N/A"}
                        </Typography>
                        <Tooltip title="Copy Number">
                          <IconButton
                            color="default"
                            size="small"
                            sx={{ color: "#334155", p: 0.5 }}
                            onClick={() => handleCopy(leads[selectedLeadIndex]?.contactNumber)}
                          >
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Call">
                          <IconButton
                            size="small"
                            sx={{ color: "#0F766E", p: 0.5 }}
                            onClick={async () => {
                              const selectedLead = leads[selectedLeadIndex] || {};
                              const num = String(selectedLead?.contactNumber || "").trim();
                              if (!num) return;
                              try {
                                const { data } = await api.post("/api/zoom/call-intents", {
                                  leadId: String(selectedLead?._id || selectedLeadId || ""),
                                  phoneNumber: num,
                                  sourcePage: "/retention/leads",
                                  sourceContext: {
                                    customerName: String(selectedLead?.name || ""),
                                    retentionStatus: String(selectedLead?.retentionStatus || ""),
                                  },
                                });
                                openZoomPhoneDialer(data?.dialNumberE164 || num);
                              } catch (_) {
                                openZoomPhoneDialer(num);
                              }
                            }}
                          >
                            <PhoneIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="WhatsApp">
                          <IconButton
                            size="small"
                            sx={{ color: "#25D366", p: 0.5 }}
                            onClick={() => setWaOpen(true)}
                          >
                            <WhatsAppIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                          size="small"
                          onClick={(e) => {
                            setReachoutTimestamp(new Date());
                            setReachoutMethod("");
                            setReachoutStatus("");
                            setLogPopupAnchor(e.currentTarget);
                          }}
                          sx={{
                            ...solidActionSx,
                            bgcolor: "#1D4ED8",
                            color: "#fff",
                            "&:hover": { bgcolor: "#1E40AF" },
                          }}
                        >
                          Add Log
                        </Button>
                        <Tooltip title="View Logs">
                          <IconButton
                            size="small"
                            sx={{
                              color: "#334155",
                              border: "1px solid #D4DEEA",
                              borderRadius: "10px",
                              p: 0.7,
                              bgcolor: "rgba(255,255,255,0.92)",
                            }}
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
                      </Stack>
                    </Box>

                    <Box
                      sx={{
                        mt: 0.85,
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 0.75,
                      }}
                    >
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
                          <>
                            <Box sx={{ ...metaPillSx, bgcolor: "#EAF0F8" }}>CS – {since}</Box>
                            <Box sx={{ ...metaPillSx, bgcolor: "#EAF0F8" }}>Last Order – {lastDays}</Box>
                            <Box sx={metaPillSx}>
                              <Typography sx={{ color: "#667085", fontSize: "0.8rem" }}>Expert</Typography>
                              <Typography sx={{ fontWeight: 700 }}>
                                {leads[selectedLeadIndex]?.agentAssigned || "—"}
                              </Typography>
                            </Box>
                            <Box sx={metaPillSx}>
                              <LanguageIcon sx={{ fontSize: 16, color: "#667085" }} />
                              <Typography sx={{ fontWeight: 700 }}>
                                {leads[selectedLeadIndex]?.preferredLanguage || "English"}
                              </Typography>
                            </Box>
                            <Box sx={metaPillSx}>
                              <PlaceIcon sx={{ fontSize: 16, color: "#667085" }} />
                              <Typography sx={{ fontWeight: 700 }}>
                                {(() => {
                                  const province =
                                    shopifyDatesMap[phone]?.orders?.[0]?.shipping_address?.province;
                                  return province || "—";
                                })()}
                              </Typography>
                            </Box>
                          </>
                        );
                      })()}

                      {showAltNumberEditor ? (
                        <div style={altEditorWrapStyle}>
                          <PhoneIcon sx={{ fontSize: 16, color: "#64748B" }} />
                          <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="Alt number"
                            value={altNumberDraft}
                            onChange={(e) => setAltNumberDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveAltNumber();
                              if (e.key === "Escape") cancelAltNumberEditor();
                            }}
                            style={altInputStyle}
                          />
                          <button type="button" onClick={saveAltNumber} style={altActionBtnStyle}>
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelAltNumberEditor}
                            style={{ ...altActionBtnStyle, background: "#FFF" }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : selectedAltNumber ? (
                        <button type="button" onClick={openAltNumberEditor} style={altMetaButtonStyle}>
                          <PhoneIcon sx={{ fontSize: 16, color: "#64748B" }} />
                          <span>{`Alt. No- ${selectedAltNumber}`}</span>
                        </button>
                      ) : (
                        <button type="button" onClick={openAltNumberEditor} style={altMetaButtonStyle}>
                          <PhoneIcon sx={{ fontSize: 16, color: "#64748B" }} />
                          <span>Add Alt No.</span>
                        </button>
                      )}
                    </Box>

                    <Box
                      sx={{
                        mt: 0.9,
                        display: "grid",
                        gap: 0.9,
                        gridTemplateColumns: {
                          xs: "minmax(0, 1fr)",
                          sm: "repeat(2, minmax(0, 1fr))",
                          md: "repeat(3, minmax(0, 1fr))",
                          lg: "repeat(6, minmax(0, 1fr))",
                        },
                      }}
                    >
                      <TextField
                        label="Next Follow-up"
                        type="date"
                        value={leads[selectedLeadIndex]?.rtNextFollowupDate || ""}
                        onChange={(e) => handleInputChange(e, selectedLeadIndex, "rtNextFollowupDate")}
                        size="small"
                        sx={{
                          ...leadFormControlSx,
                          "& .MuiOutlinedInput-root": {
                            ...leadFormControlSx["& .MuiOutlinedInput-root"],
                            pr: 0,
                          },
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

                      <FormControl size="small" sx={leadFormControlSx}>
                        <InputLabel>Retention Status</InputLabel>

                        <Select
                          label="Retention Status"
                          value={leads[selectedLeadIndex]?.retentionStatus || ""}
                          onChange={(e) => {
                            const last = leads[selectedLeadIndex]?.lastOrderDate;
                            const days = getDaysSince(last);

                            if (e.target.value === "Lost" && days < 60) {
                              alert(`Cannot mark Lost. Last order was ${days} days ago. 
You can mark Lost only after 60 days.`);
                              return;
                            }

                            handleInputChange(e, selectedLeadIndex, "retentionStatus");
                          }}
                          sx={{ borderRadius: "12px" }}
                        >
                          <MenuItem value="Active">Active</MenuItem>

                          <MenuItem
                            value="Lost"
                            disabled={(() => {
                              const last = leads[selectedLeadIndex]?.lastOrderDate;
                              const days = getDaysSince(last);
                              return days < 60;
                            })()}
                          >
                            Lost {(() => {
                              const last = leads[selectedLeadIndex]?.lastOrderDate;
                              const days = getDaysSince(last);
                              return days < 60 ? ` (after ${60 - days} days)` : "";
                            })()}
                          </MenuItem>
                          <MenuItem value="No-Call">No-Call</MenuItem>
                        </Select>
                      </FormControl>


                      {/* Follow-up Status */}
                      <FormControl size="small" sx={leadFormControlSx}>
                        <InputLabel>Follow-up Status</InputLabel>
                        <Select
                          label="Follow-up Status"
                          value={leads[selectedLeadIndex]?.rtFollowupStatus || ""}
                          onChange={(e) => handleInputChange(e, selectedLeadIndex, "rtFollowupStatus")}
                          sx={{ borderRadius: "12px" }}
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
                      <FormControl size="small" sx={leadFormControlSx}>
                        <InputLabel>Pref Language</InputLabel>
                        <Select
                          label="Pref Language"
                          value={leads[selectedLeadIndex]?.preferredLanguage || ""}
                          onChange={(e) => handleInputChange(e, selectedLeadIndex, "preferredLanguage")}
                          sx={{ borderRadius: "12px" }}
                        >
                          {["Hindi", "English", "Others"].map((lang) => (
                            <MenuItem key={lang} value={lang}>
                              {lang}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Preferred Method */}
                      <FormControl size="small" sx={leadFormControlSx}>
                        <InputLabel>Pref Method</InputLabel>
                        <Select
                          label="Pref Method"
                          value={leads[selectedLeadIndex]?.communicationMethod || ""}
                          onChange={(e) => handleInputChange(e, selectedLeadIndex, "communicationMethod")}
                          sx={{ borderRadius: "12px" }}
                        >
                          {["Call", "WhatsApp", "Both"].map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl
                        size="small"
                        sx={leadFormControlSx}
                      >
                        <InputLabel
                          id="conditions-label"
                          shrink // 👈 keep label floating always
                        >
                          Conditions
                        </InputLabel>

                        <Select
                          labelId="conditions-label"
                          id="conditions-select"
                          multiple
                          displayEmpty
                          label="Conditions"
                          value={selectedConditions || []}
                          onChange={(e) =>
                            setSelectedConditions(
                              typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value
                            )
                          }
                          renderValue={(selected) => {
                            const s = Array.isArray(selected) ? selected : [];
                            if (s.length === 0) {
                              return (
                                <span style={{ color: "#0F172A", fontWeight: 600 }}>
                                  Select 1
                                </span>
                              );
                            }
                            return `${s.length} selected`;
                          }}
                          sx={{ borderRadius: "12px" }}
                        >
                          <MenuItem value="Diabetes">Diabetes</MenuItem>
                          <MenuItem value="Liver">Liver</MenuItem>
                          <MenuItem value="Cholesterol">Cholesterol</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                </Box>

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

                {/* ✅ UPDATED: Log popup with activity tracking */}
                {logPopupAnchor && (
                  <Menu
                    anchorEl={logPopupAnchor}
                    open={Boolean(logPopupAnchor)}
                    onClose={() => setLogPopupAnchor(null)}
                  >
                    <Box sx={{ px: 2, py: 1.5, minWidth: 280 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B" }}>Reachout Method</Typography>
                      <RadioGroup
                        value={reachoutMethod}
                        onChange={async (e) => {
                          const method = e.target.value;
                          setReachoutMethod(method);
                          await api.post(`/api/leads/${leads[selectedLeadIndex]._id}/reachout-log`, {
                            timestamp: reachoutTimestamp,
                            method,
                            profileUpdatedAt: new Date().toISOString(),
                            profileUpdatedBy: currentUserName,
                          });
                        }}
                      >
                        {["WhatsApp", "Call", "Both"].map((opt) => (
                          <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
                        ))}
                      </RadioGroup>

                      {reachoutMethod && (
                        <>
                          <Typography variant="body2" mt={2} sx={{ fontWeight: 700, color: "#1E293B" }}>Disposition</Typography>
                          <Select
                            size="small"
                            fullWidth
                            value={reachoutStatus}
                            onChange={async (e) => {
                              const status = e.target.value;
                              setReachoutStatus(status);
                              await api.post(`/api/leads/${leads[selectedLeadIndex]._id}/reachout-log`, {
                                timestamp: reachoutTimestamp,
                                method: reachoutMethod,
                                status,
                                profileUpdatedAt: new Date().toISOString(),
                                profileUpdatedBy: currentUserName,
                              });
                              setLogPopupAnchor(null);
                            }}
                            sx={{ mt: 0.6, borderRadius: "10px" }}
                          >
                            {["CNP", "Followup Done", "Order Placed", "Call Back Later", "Busy", "Switch Off", "Drop On Intro"].map((status) => (
                              <MenuItem key={status} value={status}>{status}</MenuItem>
                            ))}
                          </Select>
                        </>
                      )}
                    </Box>
                  </Menu>
                )}

                <Dialog open={logsModalOpen} onClose={() => setLogsModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, border: "1px solid #D4DEEA" } }}>
                  <DialogTitle sx={{ fontWeight: 700, color: "#0F172A", borderBottom: "1px solid #E3E9F2" }}>Reachout Logs</DialogTitle>
                  <DialogContent sx={{ bgcolor: "#F7FAFD", py: 1.5 }}>
                    {sortedDates.map((date) => (
                      <Accordion
                        key={date}
                        expanded={expandedDate === date}
                        onChange={handleAccordionChange(date)}
                        sx={{
                          borderRadius: "12px !important",
                          border: "1px solid #D8E1ED",
                          boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                          mb: 1,
                          "&:before": { display: "none" },
                        }}
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
                <Dialog
                  open={showOrders}
                  onClose={() => setShowOrders(false)}
                  maxWidth="md"
                  fullWidth
                  scroll="paper"
                  PaperProps={{
                    sx: {
                      borderRadius: 3,
                      border: "1px solid #D4DEEA",
                      background: "linear-gradient(160deg, #FFFFFF 0%, #F6FAFE 100%)",
                    },
                  }}
                >
                  <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <SvgIcon fontSize="small" sx={{ color: "#5E8E3E" }} viewBox="0 0 24 24">
                      <path d="M7 7V6a5 5 0 0 1 10 0v1h1.5a1.5 1.5 0 0 1 1.49 1.29l1.36 9.5A2.5 2.5 0 0 1 18.89 21H5.11a2.5 2.5 0 0 1-2.46-2.21l1.36-9.5A1.5 1.5 0 0 1 5.5 7H7Zm2 0h6V6a3 3 0 0 0-6 0v1Z" />
                      <path d="M10.6 14.8c.3.4.8.7 1.6.7.8 0 1.2-.3 1.2-.8 0-.6-.7-.7-1.4-.9-.9-.2-2-.5-2-1.8 0-1.1.9-1.9 2.3-1.9 1 0 1.8.3 2.3.9l-.9.8c-.3-.4-.8-.6-1.5-.6-.6 0-1 .3-1 .7 0 .5.6.6 1.3.8 1 .2 2.1.5 2.1 1.9 0 1.3-1 2.1-2.5 2.1-1.2 0-2.1-.4-2.6-1.1l.9-.8Z" />
                    </SvgIcon>
                    Shopify Orders — {leads[selectedLeadIndex]?.name || "Customer"}
                  </DialogTitle>
                  <DialogContent dividers sx={{ borderColor: "#E3E9F2" }}>
                    {ordersLoading ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                        <CircularProgress size={28} />
                      </Box>
                    ) : (
                      <>

                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                            gap: 1.5,
                            mb: 2,
                          }}
                        >
                          <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: "#D8E2EE", background: "#F9FBFE" }}>
                            <Typography variant="caption" color="text.secondary">Total Orders</Typography>
                            <Typography sx={{ fontWeight: 700 }}>
                              {shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber]?.orders?.length || 0}
                            </Typography>
                          </Paper>
                          <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: "#D8E2EE", background: "#F9FBFE" }}>
                            <Typography variant="caption" color="text.secondary">First Order Date</Typography>
                            <Typography>
                              {shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber]?.firstOrderDate
                                ? new Date(
                                  shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber].firstOrderDate
                                ).toLocaleDateString()
                                : "N/A"}
                            </Typography>
                          </Paper>
                          <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: "#D8E2EE", background: "#F9FBFE" }}>
                            <Typography variant="caption" color="text.secondary">Total Spend</Typography>
                            <Typography>
                              ₹{shopifyDatesMap[leads[selectedLeadIndex]?.contactNumber]?.totalSpend?.toFixed(2) || "0.00"}
                            </Typography>
                          </Paper>
                        </Box>
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
                                borderColor: "#D7E1ED",
                                background: "linear-gradient(150deg, #FFFFFF 0%, #F8FBFF 100%)",
                                boxShadow: "0 6px 16px rgba(15,23,42,0.08)",
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
                                        sx={premiumInputSx}
                                      />
                                      <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleSaveNote}
                                        disabled={savingNote}
                                        sx={{ borderRadius: "10px", textTransform: "none" }}
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
                                    backgroundColor: "#fff",
                                    color: "#1E293B",
                                    fontSize: "0.72rem",
                                    border: "1px solid #D7E1ED",
                                    borderRadius: "10px",
                                    textTransform: "none",
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

              <Details contactNumber={leads[selectedLeadIndex]?.contactNumber} onDetailsUpdate={updateLeadDetails} activeConditions={selectedConditions} />

              <RetentionFollowUp contactNumber={leads[selectedLeadIndex]?.contactNumber} />

              <CohortDataCustomer contactNumber={leads[selectedLeadIndex]?.contactNumber} />

              <WhatsAppChatDialog
                open={waOpen}
                onClose={() => setWaOpen(false)}
                phone={leads[selectedLeadIndex]?.contactNumber || ""}
                leadId={leads[selectedLeadIndex]?._id}
                leadName={leads[selectedLeadIndex]?.name || ""}
                currentUserName={currentUserName}
                onSavePrivateNote={async (text) => {
                  const lead = leads[selectedLeadIndex];
                  if (!lead?._id) return;

                  const entry = {
                    date: new Date().toISOString(),
                    value: `[PRIVATE] ${text}`,
                    by: currentUserName,
                  };

                  const nextSubcells = [...(lead.rtSubcells || []), entry];

                  setLeads((prev) => {
                    const copy = [...prev];
                    copy[selectedLeadIndex] = { ...copy[selectedLeadIndex], rtSubcells: nextSubcells };
                    return copy;
                  });

                  await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${lead._id}`, {
                    rtSubcells: nextSubcells,
                  });
                }}
              />

            </Box>

            <Box
              sx={{ flex: "0 0 auto", display: "flex", alignItems: "stretch", minWidth: notesExpanded ? 320 : 48 }}
            >
              <Box
                sx={{
                  width: 46,
                  borderRadius: notesExpanded ? "14px 0 0 14px" : "14px",
                  border: "1px solid #CFDBE9",
                  borderRight: notesExpanded ? "none" : "1px solid #CFDBE9",
                  background: "linear-gradient(180deg, #F4F8FD 0%, #EAF0F8 100%)",
                  boxShadow: "0 16px 30px rgba(15,23,42,0.12)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 1,
                }}
              >
                <Stack spacing={0.5} alignItems="center">
                  <Tooltip title={notesExpanded ? "Collapse Notes" : "Expand Notes"}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setNotesCollapsed((v) => !v);
                      }}
                      sx={{ border: "1px solid #D1DDEB", bgcolor: "#fff" }}
                    >
                      {notesExpanded ? (
                        <KeyboardDoubleArrowRightIcon fontSize="small" />
                      ) : (
                        <KeyboardDoubleArrowLeftIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Notes">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setNotesCollapsed(false);
                      }}
                      sx={{ border: "1px solid #D1DDEB", bgcolor: "#fff", color: "#1E293B" }}
                    >
                      <StickyNote2Icon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Diet Plan">
                    <IconButton
                      size="small"
                      onClick={() => setDietPlanOpen(true)}
                      sx={{ border: "1px solid #D1DDEB", bgcolor: "#fff", color: "#166534" }}
                    >
                      <SpaIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Create Order">
                    <IconButton
                      size="small"
                      onClick={() => setOrderPopupOpen(true)}
                      sx={{ border: "1px solid #D1DDEB", bgcolor: "#fff", color: "#1D4ED8" }}
                    >
                      <ShoppingBagOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="History">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setNotesCollapsed(false);
                        setRemarksExpanded(true);
                      }}
                      sx={{ border: "1px solid #D1DDEB", bgcolor: "#fff", color: "#1E293B" }}
                    >
                      <HistoryIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Typography sx={{ fontSize: "0.64rem", color: "#64748B", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                  Notes
                </Typography>
              </Box>

              {notesExpanded && (
                <Paper
                  sx={{
                    flex: "0 0 320px",
                    p: 2.2,
                    boxShadow: "0 24px 42px rgba(15,23,42,0.18)",
                    borderRadius: "0 14px 14px 0",
                    border: "1px solid #CFDBE9",
                    borderLeft: "none",
                    background:
                      "linear-gradient(162deg, rgba(255,255,255,0.99) 0%, rgba(242,248,255,0.98) 100%)",
                    fontSize: "0.85rem",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    color: "black",
                    transition: "all .18s ease",
                  }}
                  elevation={3}
                >
                  <Box
                    sx={{
                      mt: 0.5,
                      height: '100%',
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="subtitle2" sx={{ color: "#0F172A", fontWeight: 800, letterSpacing: 0.2 }}>
                        Expert Notes
                      </Typography>
                      <Chip
                        size="small"
                        label={`${(leads[selectedLeadIndex]?.rtSubcells || []).length} entries`}
                        sx={{ bgcolor: "#EAF0F8", border: "1px solid #D1DDEB", color: "#334155", fontWeight: 700 }}
                      />
                    </Stack>

                    {/* Editor */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        p: 1.25,
                        borderRadius: 2,
                        border: "1px solid #D6E1EE",
                        background: "linear-gradient(170deg, #FFFFFF 0%, #F8FBFF 100%)",
                        boxShadow: "0 10px 20px rgba(15,23,42,0.08)",
                      }}
                    >
                      <TextField
                        label="Add / update note"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        multiline
                        minRows={4}
                        size="small"
                        fullWidth
                        variant="outlined"
                        sx={premiumInputSx}
                      />

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleAddSubcell(selectedLeadIndex)}
                          sx={{
                            alignSelf: 'flex-start',
                            background: "linear-gradient(135deg, #0F172A 0%, #334155 100%)",
                            textTransform: 'none',
                            borderRadius: "10px",
                            boxShadow: "0 10px 20px rgba(15,23,42,0.22)",
                            fontWeight: 700,
                            px: 2,
                          }}
                        >
                          Save
                        </Button>

                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setNoteDraft("")}
                          sx={{ textTransform: 'none', borderColor: '#C6D3E2', color: '#1E293B', borderRadius: "10px" }}
                        >
                          Reset
                        </Button>
                      </Box>
                    </Box>

                    {/* Scrollable saved notes */}
                    <Box
                      ref={remarksBodyRef}
                      sx={{
                        mt: 1,
                        pr: 0.5,
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                      }}
                    >
                      <Box sx={{ mt: 1 }}>
                        {/* First consult note FIRST, separate card */}
                        {leads[selectedLeadIndex]?.rtRemark && (
                          <Box
                            sx={{
                              mb: 1.25,
                              p: 1.1,
                              bgcolor: "#F6F9FD",
                              borderRadius: 1.8,
                              border: "1px solid #D7E1ED",
                              boxShadow: "0 8px 16px rgba(15,23,42,0.08)",
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#0F172A" }}>
                              First Cons Notes
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                                lineHeight: 1.4
                              }}
                            >
                              {leads[selectedLeadIndex]?.rtRemark}
                            </Typography>
                          </Box>
                        )}

                        {/* Saved notes as separate cards */}
                        {(() => {
                          const list = [...(leads[selectedLeadIndex]?.rtSubcells || [])];

                          const normalizeUser = (by) =>
                            (typeof by === 'string' ? by.trim() : '') || 'Expert';

                          list.sort((a, b) => {
                            const ta = toDateSafe(a?.date)?.getTime() ?? -Infinity;
                            const tb = toDateSafe(b?.date)?.getTime() ?? -Infinity;
                            return tb - ta;
                          });

                          return list.map((sub, idx) => {
                            const dayKey = getISTDayKey(sub?.date);
                            const dayLabel = dayKey ? formatDayHeaderIST(dayKey) : (String(sub?.date ?? "").trim() || "—");
                            const timeLabel = formatTimeIST(sub?.date);
                            const userLabel = normalizeUser(sub?.by);
                            const noteText = sub?.value?.trim() || "—";

                            return (
                              <Box
                                key={`${sub?.date || "note"}-${idx}`}
                                sx={{
                                  mb: 1,
                                  p: 1.1,
                                  borderRadius: 1.8,
                                  border: "1px solid #D1DDEB",
                                  bgcolor: "#FFFFFF",
                                  boxShadow: "0 8px 16px rgba(15,23,42,0.08)",
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }}>
                                  {`${dayLabel} (${userLabel})`}
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
                                  {timeLabel && timeLabel !== "—"
                                    ? `${timeLabel} — ${noteText}`
                                    : noteText}
                                </Typography>
                              </Box>
                            );
                          });
                        })()}
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              )}
            </Box>
          </>
        )}
      </Box>

      {zoomDialerOpen && (
        <Box
          sx={{
            position: "fixed",
            right: 88,
            bottom: 18,
            zIndex: 2500,
            width: 320,
            borderRadius: "18px",
            bgcolor: "rgba(17,24,39,0.88)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 20px 46px rgba(2,6,23,0.42)",
            backdropFilter: "blur(10px)",
            color: "#fff",
            p: 1.35,
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar sx={{ width: 38, height: 38, bgcolor: "#111827", fontWeight: 700 }}>
              {(callLeadName || "U").slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 20, lineHeight: 1.1 }} noWrap>
                {callLeadName || "Unknown"}
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }} noWrap>
                {zoomDialNumber || "N/A"}
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: 12.5, mt: 0.25 }}>
                {callStatus} • {new Date(callDurationSec * 1000).toISOString().slice(14, 19)}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleEndFloatingCall}
              sx={{
                width: 44,
                height: 44,
                bgcolor: "#ef4444",
                color: "#fff",
                "&:hover": { bgcolor: "#dc2626" },
              }}
            >
              <PhoneDisabledIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}>
            <iframe
              id="retention-zoom-phone-frame"
              title="Retention Zoom Phone"
              src="https://applications.zoom.us/integration/phone/embeddablephone/home"
              onLoad={handleZoomDialerFrameLoad}
              style={{ width: 1, height: 1, border: 0 }}
              allow="microphone; speaker"
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default RetentionLeads;
