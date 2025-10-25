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
import axios from "axios";
import Details from "./Details";
import RetentionFollowUp from "./RetentionFollowUp";
import CreateOrderPopup from "./CreateOrderPopup";
import CohortDataCustomer from "./CohortDataCustomer";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
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

import CreateDietPlanPopup from "./CreateDietPlanPopup";

const getDaysSince = (startDate, endDate = new Date()) => {
  if (!startDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : null;
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

  const [noteDraft, setNoteDraft] = useState("");

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
    followups: { missed: 0, notset: 0, today: 0, tomorrow: 0, later: 0 },
  });

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

      const resp = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retentions", {
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


  const saveSubcellsToBackend = async (leadId, subcells) => {
    try {
      await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${leadId}`, { rtSubcells: subcells });
    } catch (error) {
      console.error("Error saving subcells:", error);
    }
  };


  const handleAddSubcell = (leadIdx) => {
    const text = (noteDraft || "").trim();
    if (!text) return; // prevent empty saves

    // update UI
    setLeads(prev => {
      const list = [...prev];
      const lead = { ...list[leadIdx] };

      const newEntry = {
        date: new Date().toISOString(),
        value: text,
        by: currentUserName,
      };

      lead.rtSubcells = [...(lead.rtSubcells || []), newEntry];
      list[leadIdx] = lead;
      return list;
    });

    // persist
    const leadId = leads[leadIdx]?._id;
    const nextSubcells = [
      ...(leads[leadIdx]?.rtSubcells || []),
      { date: new Date().toISOString(), value: text, by: currentUserName },
    ];
    saveSubcellsToBackend(leadId, nextSubcells);
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
    const lead = leads[selectedLeadIndex];
    const latestVal = lead?.rtSubcells?.length
      ? lead.rtSubcells[lead.rtSubcells.length - 1]?.value || ""
      : lead?.rtRemark || "";
    setNoteDraft(latestVal);
  }, [selectedLeadIndex, leads]);


  const handleInputChange = async (e, index, field) => {
    const value = e.target.value;
    const updatedLeads = [...leads];
    updatedLeads[index][field] = value;

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
      await axios.put(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${updatedLeads[index]._id}`,
        { rowColor: color }
      );
    } catch (error) { 
      console.error("Error updating row color:", error);
    }
  };

  const fetchDietPlanCount = async (leadId) => {
    if (!leadId) return;
    if (planCountLoading[leadId] || planCountMap[leadId] != null) return;
    try {
      setPlanCountLoading((p) => ({ ...p, [leadId]: true }));
      const res = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/diet-plans",
        { params: { leadId, limit: 200 } } // fetch enough to cover recent
      );
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


  const updateLeadDetails = (contactNumber, newDetails) => {
    setLeads((prevLeads) => {
      return prevLeads.map((lead) =>
        lead.contactNumber === contactNumber ? { ...lead, details: newDetails } : lead
      );
    });
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
          <Stack direction="row" spacing={2}>
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
                sx={filters.rtNextFollowupDate ? { bgcolor: "rgba(25,118,210,0.12)" } : undefined}
              >
                <CalendarMonthIcon />
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

            const followupDisplay = computeReminderIST(lead.rtNextFollowupDate);
            const tagInfo = followupTagMap[followupDisplay] || followupTagMap[""];

            const isSelected = lead._id === selectedLeadId;

            return (
              <ListItemButton
                key={lead._id || idx}
                sx={{
                  mb: 0.5,
                  borderRadius: 1,
                  minHeight: 64,
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
                        sx={{ fontWeight: "normal", whiteSpace: "nowrap", fontSize: "0.7rem", opacity: 0.8 }}
                        component="div"
                      >
                        {(() => {
                          const last = lead.lastOrderDate;
                          const daysSinceLast = getDaysSince(last);

                          // normalize + helpers
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
                  p: 2,
                  borderRadius: 2,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  backgroundColor: "#fff",
                  fontSize: "0.85rem",
                  fontFamily: '"Segoe UI", Inter, system-ui, sans-serif',
                }}
                elevation={0}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
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
                        <SvgIcon fontSize="small" sx={{ color: "#5E8E3E" }} viewBox="0 0 24 24">
                          <path d="M7 7V6a5 5 0 0 1 10 0v1h1.5a1.5 1.5 0 0 1 1.49 1.29l1.36 9.5A2.5 2.5 0 0 1 18.89 21H5.11a2.5 2.5 0 0 1-2.46-2.21l1.36-9.5A1.5 1.5 0 0 1 5.5 7H7Zm2 0h6V6a3 3 0 0 0-6 0v1Z" />
                          <path d="M10.6 14.8c.3.4.8.7 1.6.7.8 0 1.2-.3 1.2-.8 0-.6-.7-.7-1.4-.9-.9-.2-2-.5-2-1.8 0-1.1.9-1.9 2.3-1.9 1 0 1.8.3 2.3.9l-.9.8c-.3-.4-.8-.6-1.5-.6-.6 0-1 .3-1 .7 0 .5.6.6 1.3.8 1 .2 2.1.5 2.1 1.9 0 1.3-1 2.1-2.5 2.1-1.2 0-2.1-.4-2.6-1.1l.9-.8Z" />
                        </SvgIcon>
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
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

                    <Box
                      sx={{
                        mt: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
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

                        <Button
                          onClick={() => setDietPlanOpen(true)}
                          sx={{
                            textTransform: "none",
                            bgcolor: "#2E7D32",
                            color: "white",
                            borderRadius: 999,
                            px: 1.55,
                            py: 0.5,
                            "&:hover": { backgroundColor: "#256528" },
                          }}
                        >
                          Diet Plan
                        </Button>

                        <Button
                          onClick={() => setOrderPopupOpen(true)}
                          sx={{
                            textTransform: "none",
                            bgcolor: "#1976D2",
                            color: "white",
                            borderRadius: 999,
                            px: 1.55,
                            py: 0.5,
                            "&:hover": { backgroundColor: "#145ea8" },
                          }}
                        >
                          Order
                        </Button>
                      </Stack>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ flexWrap: "wrap", alignItems: "center", mt: 2.5 }}
                    >
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

                      <FormControl size="small" sx={{ minWidth: 130 }}>
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
                      <FormControl size="small" sx={{ minWidth: 140 }}>
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
                      <FormControl size="small" sx={{ minWidth: 140 }}>
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

                      <FormControl
                        size="small"
                        sx={{ minWidth: 150 }}
                        error={(selectedConditions?.length ?? 0) === 0}
                        focused // 👈 keep focused style always
                      >
                        <InputLabel
                          id="conditions-label"
                          shrink // 👈 keep label floating always
                          error={(selectedConditions?.length ?? 0) === 0}
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
                                <span style={{ color: 'var(--mui-palette-error-main)', fontWeight: 700 }}>
                                  Select 1
                                </span>
                              );
                            }
                            return `${s.length} selected`;
                          }}
                          sx={{
                            borderRadius: 999,
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E6E8EC" },
                            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#DDE1E6" },
                          }}
                        >
                          <MenuItem value="Diabetes">Diabetes</MenuItem>
                          <MenuItem value="Liver">Liver</MenuItem>
                          <MenuItem value="Cholesterol">Cholesterol</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
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
                            {["CNP", "Followup Done", "Order Placed", "Call Back Later", "Busy", "Switch Off", "Drop On Intro"].map((status) => (
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

              <Details contactNumber={leads[selectedLeadIndex]?.contactNumber} onDetailsUpdate={updateLeadDetails} activeConditions={selectedConditions} />

              <RetentionFollowUp contactNumber={leads[selectedLeadIndex]?.contactNumber} />

              <CohortDataCustomer contactNumber={leads[selectedLeadIndex]?.contactNumber} />

            </Box>

            <Paper
              sx={{
                flex: "0 0 20%",
                p: 2,
                boxShadow: 2,
                borderRadius: 2,
                backgroundColor: "background.paper",
                fontSize: "0.85rem",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                color: "black",
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

                {/* Editor */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    label="Add / update note"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    multiline
                    minRows={3}
                    size="small"
                    fullWidth
                    variant="outlined"
                  />

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleAddSubcell(selectedLeadIndex)}
                      sx={{ alignSelf: 'flex-start', backgroundColor: 'black', textTransform: 'none' }}
                    >
                      Save
                    </Button>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        if (selectedLeadIndex == null) return;
                        const lead = leads[selectedLeadIndex];
                        const latestVal = lead?.rtSubcells?.length
                          ? lead.rtSubcells[lead.rtSubcells.length - 1]?.value || ""
                          : lead?.rtRemark || "";
                        setNoteDraft(latestVal);
                      }}
                      sx={{ textTransform: 'none', borderColor: 'black', color: 'black' }}
                    >
                      Reset
                    </Button>
                  </Box>
                </Box>

                {/* Scrollable history */}
                <Box
                  ref={remarksBodyRef}
                  sx={{
                    mt: 1,
                    pr: 1,
                    overflowY: remarksExpanded ? 'auto' : 'hidden',
                    height: remarksExpanded ? '56vh' : '44vh',
                    position: 'relative'
                  }}
                >
                  <Box sx={{ mt: 1 }}>
                    {/* First consult note FIRST, separate card */}
                    {leads[selectedLeadIndex]?.rtRemark && (
                      <Box sx={{ mb: 1.25, p: 1, bgcolor: "#FAFAFA", borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
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

                    {/* Dated subcells as cards */}
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
                            <Box
                              key={`dated-${dayKey}`}
                              sx={{
                                mb: 1,
                                p: 1,
                                borderRadius: 1,
                                border: "1px solid #E6E8EC",
                                bgcolor: "#FFFFFF",
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {`${formatDayHeaderIST(dayKey)} (${usersLabel})`}
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
                          <Box
                            key={`invalid-${label}`}
                            sx={{
                              mb: 1,
                              p: 1,
                              borderRadius: 1,
                              border: "1px solid #E6E8EC",
                              bgcolor: "#FFFFFF",
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {`${label} (${usersLabel})`}
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

