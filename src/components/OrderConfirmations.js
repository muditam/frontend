import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
  Snackbar,
  Alert,
  CircularProgress,
  Collapse,
  Divider,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Badge,
  Switch,
  FormControlLabel,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PhoneIcon from "@mui/icons-material/Phone";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LaunchIcon from "@mui/icons-material/Launch";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import SearchIcon from "@mui/icons-material/Search";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ScheduleCallDialog from "./ScheduleCallDialog";
import axios from "axios";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const CREATE_PAYMENT_LINK_URL =
  "https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/create-payment-link";

const CALL_STATUS = [
  { value: "CNP", label: "CNP" },
  { value: "ORDER_CONFIRMED", label: "Order Confirmed" },
  { value: "CALL_BACK_LATER", label: "Call Back Later" },
  { value: "CANCEL_ORDER", label: "Cancel Order" },
];

const TAB_MAP = {
  ALL: { special: true },
  PENDING: { special: true },
  CNP: { value: "CNP", label: "CNP" },
  ORDER_CONFIRMED: { value: "ORDER_CONFIRMED", label: "Order Confirmed" },
  CALL_BACK_LATER: { value: "CALL_BACK_LATER", label: "Call Back Later" },
  CANCEL_ORDER: { value: "CANCEL_ORDER", label: "Cancel Order" },
  ALL_CNPS: { value: "CNP", label: "All CNPs" },
};

const LANGUAGE_OPTIONS = ["English", "Hindi", "Malayalam", "Kannada", "Telugu", "Marathi"];

const theme = createTheme({
  palette: { primary: { main: "#000000" } },
  components: {
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          paddingInline: 14,
          "&.Mui-selected": {
            fontWeight: 700,
            borderColor: "#000000",
            backgroundColor: "rgba(0,0,0,0.08)",
          },
        },
      },
    },
  },
});

// ---- helpers ----
const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const currency = (amt, curr = "INR") => {
  if (typeof amt !== "number" || isNaN(amt)) return "";
  const s = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: curr,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amt);
  return s.replace(/(\.00)(?!\d)/, "");
};

const copyToClipboard = async (text, onDone) => {
  try {
    await navigator.clipboard.writeText(text || "");
    onDone?.(true);
  } catch {
    onDone?.(false);
  }
};

const telHref = (num) => (num ? `tel:${num}` : undefined);

// debounce
function useDebouncedValue(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const statusValueToLabel = (val) => {
  const found = CALL_STATUS.find((s) => s.value === val);
  return found ? found.label : String(val || "");
};

const toTenDigits = (num) => {
  if (!num) return "";
  const d = String(num).replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : d;
};

const rowMatchesTab = (row, tab) => {
  const ops = row?.orderConfirmOps || {};
  if (tab === "ALL") return true;
  if (tab === "PENDING") {
    return !(ops.shopifyNotes && ops.shopifyNotes.trim());
  }
  const want = TAB_MAP[tab];
  if (!want) return true;
  const byNotes = (ops.shopifyNotes || "").trim().toLowerCase() === want.label?.toLowerCase();
  const byStatus = (ops.callStatus || "").trim().toUpperCase() === want.value?.toUpperCase();
  return byNotes || byStatus;
};

const rowAgeBg = (row) => {
  const dt = row?.orderDate || row?.createdAt;
  if (!dt) return undefined;
  const mins = (Date.now() - new Date(dt).getTime()) / 60000;
  if (mins <= 5) return "#e8f5e9";
  if (mins <= 10) return "#fff3e0";
  return "#ffffff";
};

const channelLabel = (row) => {
  const id = String(row?.channelName || row?.sourceId || row?.source_id || "").trim();
  if (id === "252664381441") return "Online Order";
  if (id === "205650526209") return "Team";
  return id || "-";
};

const boolToChoice = (v) => (v === true ? "yes" : v === false ? "no" : null);
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
const triValue = (ops, key) => {
  if (!ops) return null;
  if (!hasOwn(ops, key)) return null;
  return ops[key] === true ? "yes" : "no";
};

const getLoggedIn = () => {
  const rawUser = sessionStorage.getItem("user");
  if (!rawUser) return { id: null, fullName: "", roles: [] };
  try {
    const parsed = JSON.parse(rawUser);
    const roles = []
      .concat(parsed?.role || [])
      .concat(parsed?.roles || [])
      .filter(Boolean)
      .map((r) => String(r).toLowerCase());
    return {
      id: parsed?._id || parsed?.id || null,
      fullName: parsed?.fullName || parsed?.name || "",
      roles,
    };
  } catch {
    return { id: null, fullName: "", roles: [] };
  }
};

const safeDec = (n) => Math.max(0, (Number(n) || 0) - 1);
const safeInc = (n) => (Number(n) || 0) + 1;

function moveStatusCount(setCounts, prevStatus, newStatus) {
  const P = (s) => String(s || "").toUpperCase();
  const from = P(prevStatus);
  const to = P(newStatus);
  if (from === to) return;

  setCounts((c) => ({
    ...c,
    ...(from ? { [from]: safeDec(c[from]) } : {}),
    ...(to ? { [to]: safeInc(c[to]) } : {}),
  }));
}

function decrementPendingOnFirstNote(setCounts) {
  setCounts((c) => ({ ...c, PENDING: safeDec(c.PENDING) }));
}

const START_FROM_ISO = new Date("2025-10-01T00:00:00+05:30").toISOString();

const ASSIGNED_FILTER = {
  ALL: "ALL",
  UNASSIGNED: "UNASSIGNED",
  ME: "ME",
};

export default function OrderConfirmations() {
  const [{ id: myAgentId, fullName: myFullName, roles }, setIdentity] = useState(getLoggedIn());
  const isManager = useMemo(() => roles.includes("manager"), [roles]);
  const isOperations = useMemo(() => roles.includes("operations"), [roles]);

  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 500);
  const [toast, setToast] = useState({ open: false, severity: "success", msg: "" });
  const [agents, setAgents] = useState([]);
  const [savingRow, setSavingRow] = useState({});
  const [cancelingRow, setCancelingRow] = useState({});
  const [confirmCancel, setConfirmCancel] = useState({ open: false, row: null, reason: "" });
  const [expandedId, setExpandedId] = useState(null);
  const [scheduleDlg, setScheduleDlg] = useState({ open: false, row: null });
  const [historyDlg, setHistoryDlg] = useState({ open: false, phone: "", items: [], loading: false });
  const [channel, setChannel] = useState("");
  const [todayConfirmedCount, setTodayConfirmedCount] = useState(0);
  const [counts, setCounts] = useState({
    ALL: 0,
    PENDING: 0,
    CNP: 0,
    ORDER_CONFIRMED: 0,
    CALL_BACK_LATER: 0,
    CANCEL_ORDER: 0,
    ALL_CNPS: 0,
  });

  const [dateFilter, setDateFilter] = useState("");

  const [assigned, setAssigned] = useState(() => (isManager ? ASSIGNED_FILTER.ALL : ASSIGNED_FILTER.ME));

  // Active toggle state
  const [myActive, setMyActive] = useState(() => {
    // hydrate from sessionStorage immediately to avoid flicker
    const stored = sessionStorage.getItem("orderConfirmActive");
    return stored === "true";
  });
  const [savingActive, setSavingActive] = useState(false);

  // Refresh identity (in case sessionStorage changed elsewhere)
  useEffect(() => {
    setIdentity(getLoggedIn());
  }, []);

  // keep assigned default in sync when role info changes
  useEffect(() => {
    setAssigned((prev) => {
      if (isManager) return prev; // keep user choice
      return ASSIGNED_FILTER.ME;  // force for non-managers
    });
  }, [isManager]);

  const isConfirmedTab = tab === "ORDER_CONFIRMED";

  const allFilteredItems = useMemo(() => {
    if (!isConfirmedTab) return items;

    return items.filter((row) => {
      const tracking = row?.shipping?.tracking_number;
      return !tracking || String(tracking).trim() === "";
    });
  }, [items, isConfirmedTab]);

  // Step 2: apply pagination on filtered rows
  const visibleItems = useMemo(() => {
    if (!isConfirmedTab) return items; // normal tabs use backend pagination

    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return allFilteredItems.slice(start, end);
  }, [allFilteredItems, isConfirmedTab, page, rowsPerPage]);

  // Step 3: correct count
  const visibleTotal = useMemo(() => {
    return isConfirmedTab ? allFilteredItems.length : total;
  }, [isConfirmedTab, allFilteredItems, total]);


  // Payment dialog state
  const [payDlg, setPayDlg] = useState({
    open: false,
    rowId: null,
    orderName: "",
    customerName: "",
    customerEmail: "",
    contact: "",
    currency: "INR",
    amount: "",
    generating: false,
    link: "",
    discountPct: 0,
  });

  const getLoggedInFullName = () => myFullName || "";

  const fetchAgents = useCallback(async () => {
    try {
      const { data } = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees");
      const filtered = Array.isArray(data)
        ? data.filter((a) => !!a?.isDoctor && (a?.status === "active" || a?.status === "Active"))
        : [];
      setAgents(
        filtered.map((a) => ({
          id: a?._id || a?.id || a?.email || a?.name,
          label: a?.fullName || a?.name || a?.email || String(a?._id || ""),
        }))
      );
    } catch (e) {
      console.error("Failed to fetch agents", e);
    }
  }, [myAgentId]);

  const assignedParam = useMemo(() => {
    if (!isManager && myAgentId) return myAgentId;

    if (assigned === ASSIGNED_FILTER.UNASSIGNED) return "unassigned";
    if (assigned === ASSIGNED_FILTER.ME && myAgentId) return myAgentId;
    return undefined;
  }, [assigned, isManager, myAgentId]);

  const fetchList = useCallback(
    async (pageZeroBased = 0, limit = rowsPerPage) => {
      try {
        setLoading(true);

        const params = {
          tab,
          financial: "pending",
          page: isConfirmedTab ? 1 : pageZeroBased + 1,
          limit: isConfirmedTab ? 5000 : limit,
          q: qDebounced,
          channel,
        };

        // common single-date filter for all tabs
        if (dateFilter) params.dateFilter = dateFilter;

        if (tab === "ALL_CNPS") {
          // no assigned scoping for ALL_CNPS
        } else {
          if (assignedParam) params.assigned = assignedParam;
          params.startDate = START_FROM_ISO;
        }

        const { data } = await axios.get(
          "https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/list",
          { params }
        );

        const rows = data?.items || [];
        setTotal(typeof data?.total === "number" ? data.total : rows.length);
        setItems(rows);
      } catch (e) {
        console.error("fetchList error", e);
        setToast({ open: true, severity: "error", msg: "Failed to fetch orders" });
      } finally {
        setLoading(false);
      }
    },
    [qDebounced, rowsPerPage, tab, channel, assignedParam, dateFilter, isConfirmedTab]
  );


  const fetchCounts = useCallback(async () => {
    try {
      const params = {
        q: qDebounced,
        channel,
        assigned: assignedParam,
        startDate: START_FROM_ISO,
      };

      // common single-date filter for all tabs
      if (dateFilter) {
        params.dateFilter = dateFilter;
      }

      const { data } = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/counts",
        { params }
      );

      if (data?.counts) setCounts(data.counts);
    } catch (e) {
      console.error("fetchCounts error", e);
    }
  }, [qDebounced, channel, assignedParam, dateFilter]);

  const fetchTodayConfirmedCount = useCallback(async () => {
    try {
      const params = (!isManager && myAgentId) ? { agentId: myAgentId } : {};
      const { data } = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/today-confirmed-count",
        { params }
      );
      setTodayConfirmedCount(Number(data?.count || 0));
    } catch (e) {
      console.error("fetchTodayConfirmedCount error", e);
    }
  }, [myAgentId, isManager]);

  const syncNewAndRefresh = useCallback(async () => {
    try {
      setSyncing(true);
      const { data } = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders-shopify/sync-new");
      const stats = data || {};
      const parts = [];
      ["inserted", "updated", "processed", "fetched", "upserts", "total"].forEach((k) => {
        if (typeof stats[k] === "number") parts.push(`${k}: ${stats[k]}`);
      });
      setToast({
        open: true,
        severity: "success",
        msg: parts.length ? `Synced (${parts.join(", ")})` : "Synced new orders",
      });
      await fetchList(page, rowsPerPage);
      fetchCounts();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Sync failed";
      setToast({ open: true, severity: "error", msg });
    } finally {
      setSyncing(false);
    }
  }, [fetchList, page, rowsPerPage, fetchCounts]);

  const doRoundRobinAssign = useCallback(async () => {
    if (loading || syncing) return;

    try {
      setSyncing(true);
      const { data } = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/assign/round-robin",
        {}
      );
      const msg = data?.assigned
        ? `Assigned ${data.assigned} orders across ${data.agents} agents`
        : "No unassigned orders";
      setToast({ open: true, severity: "success", msg });

      await fetchList(page, rowsPerPage);
      fetchCounts();
    } catch (err) {
      console.error("Round-robin failed", err);
      setToast({ open: true, severity: "error", msg: "Round-robin failed" });
    } finally {
      setSyncing(false);
    }
  }, [loading, syncing, fetchList, page, rowsPerPage, fetchCounts]);


  const openConfirmCancel = (row) => setConfirmCancel({ open: true, row, reason: row?.orderConfirmOps?.ocCancelReason || "" });
  const closeConfirmCancel = () => setConfirmCancel({ open: false, row: null });
  const confirmCancelYes = async () => {
    const row = confirmCancel.row;
    if (!row) return;
    await cancelOrderOnShopify(row, confirmCancel.reason || "");
    closeConfirmCancel();
  };

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    setPage(0);
    fetchList(0, isConfirmedTab ? 5000 : rowsPerPage);
    setExpandedId(null);
  }, [tab, qDebounced, channel, assignedParam, dateFilter, isConfirmedTab, rowsPerPage, fetchList]);

  useEffect(() => {
    fetchTodayConfirmedCount();
  }, [fetchTodayConfirmedCount]);

  const handleChangePage = (_e, newPage) => {
    setPage(newPage);
    fetchList(newPage, rowsPerPage);
    setExpandedId(null);
  };

  const finalAmount = useMemo(() => {
    const base = Number(payDlg.amount) || 0;
    const pct = Number(payDlg.discountPct) || 0;
    const discounted = base * (1 - pct / 100);
    return Number(discounted.toFixed(2));
  }, [payDlg.amount, payDlg.discountPct]);

  const openScheduleDialog = (row) => setScheduleDlg({ open: true, row });
  const closeScheduleDialog = () => setScheduleDlg({ open: false, row: null });

  const setRowSaving = (id, yes) => setSavingRow((s) => ({ ...s, [id]: yes }));

  const patchOrder = async (id, payload, msgOnSuccess = "Saved") => {
    try {
      setRowSaving(id, true);
      const { data } = await axios.patch(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/${id}`, payload);
      setItems((rows) =>
        rows.map((r) =>
          String(r._id) === String(id)
            ? { ...r, orderConfirmOps: { ...(r.orderConfirmOps || {}), ...(data?.orderConfirmOps || {}) } }
            : r
        )
      );
      setToast({ open: true, severity: "success", msg: msgOnSuccess });
      return data; // updated ops
    } catch (e) {
      console.error("patchOrder error", e);
      const apiMsg = e?.response?.data?.error;
      setToast({ open: true, severity: "error", msg: apiMsg || "Failed to save" });
      throw e;
    } finally {
      setRowSaving(id, false);
    }
  };

  const openHistoryByPhone = async (rawPhone) => {
    const phone = toTenDigits(rawPhone);
    if (!phone) return;
    setHistoryDlg({ open: true, phone, items: [], loading: true });
    try {
      const { data } = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/history-by-phone", {
        params: { phone },
      });
      setHistoryDlg((s) => ({ ...s, items: Array.isArray(data?.items) ? data.items : [], loading: false }));
    } catch (e) {
      setHistoryDlg((s) => ({ ...s, loading: false }));
      setToast({ open: true, severity: "error", msg: "Failed to load history" });
    }
  };
  const closeHistoryDlg = () => setHistoryDlg({ open: false, phone: "", items: [], loading: false });

  const submitSchedule = async (payload) => {
    const id = scheduleDlg.row?._id;
    if (!id) return;
    const updated = await patchOrder(id, payload, "Call scheduled");
    setItems((rows) =>
      rows.map((r) => (r._id === id ? { ...r, orderConfirmOps: { ...(r.orderConfirmOps || {}), ...(updated?.orderConfirmOps || {}) } } : r))
    );
  };

  const statusToNote = (val) => statusValueToLabel(val);

  const handleShopifyNotesChange = async (row, newValue) => {
    const prevStatus = String(row?.orderConfirmOps?.callStatus || "").toUpperCase();
    const newStatus = String(newValue || "").toUpperCase();

    const hadNoNoteBefore = !((row?.orderConfirmOps?.shopifyNotes || "").trim());

    const label = statusToNote(newValue) || String(newValue || "");
    const userFullName = getLoggedInFullName() || "";
    const finalNote = userFullName ? `${label} - ${userFullName}` : label;

    try {
      await patchOrder(row._id, { callStatus: newValue }, "Status updated");

      moveStatusCount(setCounts, prevStatus, newStatus);

      const nowIso = new Date().toISOString();
      const patchedRow = {
        ...row,
        orderConfirmOps: {
          ...(row.orderConfirmOps || {}),
          callStatus: newValue,
          callStatusUpdatedAt: nowIso,
        },
      };

      const shouldStayAfterStatus = rowMatchesTab(patchedRow, tab);
      if (!shouldStayAfterStatus) {
        setItems((rows) => rows.filter((r) => r._id !== row._id));
        setTotal((t) => Math.max(0, t - 1));
        setExpandedId((prev) => (prev === row._id ? null : prev));
      } else {
        setItems((rows) => rows.map((r) => (r._id === row._id ? patchedRow : r)));
      }

      if (prevStatus !== newStatus && (prevStatus === "ORDER_CONFIRMED" || newStatus === "ORDER_CONFIRMED")) {
        fetchTodayConfirmedCount?.();
      }
    } catch {
      return;
    }

    try {
      await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/shopify-notes", {
        orderName: row.orderName,
        note: label,
        userFullName,
      });

      setToast({ open: true, severity: "success", msg: "Shopify note updated" });

      const updatedRow = {
        ...row,
        orderConfirmOps: {
          ...(row.orderConfirmOps || {}),
          shopifyNotes: finalNote,
          callStatus: newValue,
          callStatusUpdatedAt: new Date().toISOString(),
        },
      };

      const shouldStayFinal = rowMatchesTab(updatedRow, tab);
      if (!shouldStayFinal) {
        setItems((rows) => rows.filter((r) => r._id !== row._id));
        setTotal((t) => Math.max(0, t - 1));
        setExpandedId((prev) => (prev === row._id ? null : prev));
      } else {
        setItems((rows) => rows.map((r) => (r._id === row._id ? updatedRow : r)));
      }

      if (hadNoNoteBefore) {
        decrementPendingOnFirstNote(setCounts);
      }


    } catch (e) {
      console.error("shopify-notes push error", e?.response?.data || e.message);
      const msg = e?.response?.data?.error || "Failed to update Shopify note";
      setToast({ open: true, severity: "error", msg });
    }
  };

  const cancelOrderOnShopify = async (row, ocReason = "") => {
    const id = row._id;
    try {
      setCancelingRow((m) => ({ ...m, [id]: true }));

      // Call the new backend
      const { data } = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/cancel",
        {
          orderName: row.orderName,
          reason: "customer",
          email: true,
          restock: true,
          note: "Cancel Order - via OC",
          ocCancelReason: ocReason,
        }
      );

      // Toast & update status + counts
      setToast({ open: true, severity: "success", msg: data?.alreadyCancelled ? "Order already cancelled" : "Order cancelled" });

      await handleShopifyNotesChange(row, "CANCEL_ORDER");

      setItems((rows) =>
        rows.map((r) =>
          r._id === row._id
            ? {
              ...r,
              orderConfirmOps: {
                ...(r.orderConfirmOps || {}),
                ocCancelReason: ocReason,
              },
            }
            : r
        )
      );
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Cancel operation failed";
      setToast({ open: true, severity: "error", msg });
    } finally {
      setCancelingRow((m) => ({ ...m, [id]: false }));
    }
  };

  const fetchMyActiveStatus = useCallback(async () => {
    if (!myAgentId) return;
    try {
      const { data } = await axios.get(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/agents/${myAgentId}/status`
      );
      const serverVal = !!data?.agent?.orderConfirmActive;
      setMyActive(serverVal);
      sessionStorage.setItem("orderConfirmActive", String(serverVal));
    } catch (e) {
      // silent fail; keep current toggle
      console.error("fetchMyActiveStatus error", e);
    }
  }, [myAgentId]);

  useEffect(() => {
    fetchMyActiveStatus();
  }, [fetchMyActiveStatus]);

  const openPaymentDialog = (row) => {
    setPayDlg({
      open: true,
      rowId: row._id,
      orderName: row.orderName || "",
      customerName: row.customerName || "",
      customerEmail: row.customerEmail || "",
      contact: toTenDigits(row.contactNumber || row?.customerAddress?.phone || ""),
      currency: "INR",
      amount: typeof row.amount === "number" ? row.amount : "",
      generating: false,
      link: "",
      discountPct: 0,
    });
  };
  const closePaymentDialog = () => setPayDlg((s) => ({ ...s, open: false }));

  const generateAndShareLink = async () => {
    const { rowId, amount, currency, customerName, customerEmail, contact, discountPct = 0 } = payDlg;
    const base = Number(amount);
    if (!base || base <= 0) {
      setToast({ open: true, severity: "error", msg: "Enter a valid amount" });
      return;
    }
    if (!contact || contact.length !== 10) {
      setToast({ open: true, severity: "error", msg: "Customer phone must be 10 digits" });
      return;
    }

    const amtFinal = Number((base * (1 - (Number(discountPct) || 0) / 100)).toFixed(2));

    try {
      setPayDlg((s) => ({ ...s, generating: true }));
      const { data } = await axios.post(CREATE_PAYMENT_LINK_URL, {
        amount: amtFinal,
        currency: currency || "INR",
        customer: { name: customerName || "Customer", email: customerEmail || "", contact },
      });
      const shortUrl = data?.paymentLink;
      if (!shortUrl) throw new Error("No payment link returned");

      await patchOrder(rowId, { paymentLink: shortUrl }, "Payment link saved");
      setPayDlg((s) => ({ ...s, link: shortUrl, generating: false }));
      setToast({
        open: true,
        severity: "success",
        msg: discountPct ? `Link generated with ${discountPct}% discount` : "Link generated & shared via SMS",
      });
    } catch (e) {
      console.error("Generate payment link failed:", e);
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "Failed to generate payment link";
      setToast({ open: true, severity: "error", msg });
      setPayDlg((s) => ({ ...s, generating: false }));
    }
  };

  const renderReadOnlyCallStatus = (val) => {
    const label = statusValueToLabel(val) || "-";
    return <Chip size="small" label={label} />;
  };

  // NEW: increment plus count
  const handlePlusClick = async (row) => {
    try {
      await patchOrder(row._id, { incPlusCount: true }, "Count updated");
    } catch { }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box>
        {/* Header + Tabs + Actions */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={700}>
                Order Confirmations
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={`Today's Confirmed${isManager ? '' : ' (Me)'}: ${todayConfirmedCount}`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="assigned-filter-label">Assigned</InputLabel>
                  <Select
                    labelId="assigned-filter-label"
                    label="Assigned"
                    value={assigned}
                    onChange={(e) => setAssigned(e.target.value)}
                    disabled={!isManager} // non-managers are locked to "ME"
                  >
                    <MenuItem value={ASSIGNED_FILTER.ALL}>All</MenuItem>
                    <MenuItem value={ASSIGNED_FILTER.UNASSIGNED}>Unassigned</MenuItem>
                    <MenuItem value={ASSIGNED_FILTER.ME} disabled={!myAgentId}>
                      Me
                    </MenuItem>
                  </Select>
                </FormControl>

                {/* Active/Inactive toggle (persist immediately, then reconcile w/ server) */}
                {!isManager && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={myActive}
                        onChange={async (_e, checked) => {
                          if (!myAgentId) {
                            setToast({ open: true, severity: "error", msg: "No agent id found for current user" });
                            return;
                          }
                          try {
                            // optimistic
                            setMyActive(checked);
                            sessionStorage.setItem("orderConfirmActive", String(!!checked));
                            setSavingActive(true);

                            const { data } = await axios.post(
                              "https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/agents/toggle",
                              { agentId: myAgentId, active: checked }
                            );

                            const serverVal = !!data?.agent?.orderConfirmActive;
                            setMyActive(serverVal);
                            sessionStorage.setItem("orderConfirmActive", String(serverVal));

                            setToast({
                              open: true,
                              severity: "success",
                              msg: serverVal ? "You are Active for OC" : "You are Inactive for OC",
                            });
                          } catch (err) {
                            console.error("toggle active failed", err);
                            // rollback to last known good (server)
                            await fetchMyActiveStatus();
                            setToast({ open: true, severity: "error", msg: "Failed to update active status" });
                          } finally {
                            setSavingActive(false);
                          }
                        }}
                        disabled={savingActive}
                      />
                    }
                    label={savingActive ? "Saving..." : "Active for OC"}
                  />
                )}

                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="channel-filter-label">Channel</InputLabel>
                  <Select
                    labelId="channel-filter-label"
                    label="Channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  >
                    <MenuItem value="">All Channels</MenuItem>
                    <MenuItem value="Team">Team</MenuItem>
                    <MenuItem value="Online Order">Online Order</MenuItem>
                  </Select>
                </FormControl>


                {/* Round-robin button – visible to all; backend should only assign to Active OC + Operations */}
                <Tooltip title="Round-robin: assign all unassigned, pending & unfulfilled orders to ACTIVE Operations agents">
                  <span>
                    <IconButton
                      onClick={doRoundRobinAssign}
                      disabled={loading || syncing}
                      color="primary"
                    >
                      {syncing ? <CircularProgress size={18} /> : <AddIcon />}
                    </IconButton>
                  </span>
                </Tooltip>

                {/* Refresh – visible to all */}
                <Tooltip title="Refresh">
                  <span>
                    <IconButton onClick={syncNewAndRefresh} disabled={loading || syncing} color="primary">
                      {syncing ? <CircularProgress size={18} /> : <RefreshIcon />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                borderBottom: 1,
                borderColor: "divider",
                // stack on very small screens
                flexWrap: { xs: "wrap", sm: "nowrap" },
              }}
            >
              <Tabs
                value={tab}
                onChange={(_e, v) => setTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ flex: 1, minHeight: 48 }}
              >
                <Tab value="ALL" label={`All (${counts.ALL || 0})`} />
                <Tab value="PENDING" label={`Pending (${counts.PENDING || 0})`} />
                <Tab value="CNP" label={`CNP (${counts.CNP || 0})`} />
                <Tab
                  value="ORDER_CONFIRMED"
                  label={
                    isConfirmedTab
                      ? `Confirmed (${visibleTotal})`
                      : `Confirmed (${counts.ORDER_CONFIRMED || 0})`
                  }
                />
                <Tab value="CALL_BACK_LATER" label={`Call Back (${counts.CALL_BACK_LATER || 0})`} />
                <Tab value="CANCEL_ORDER" label={`Cancel (${counts.CANCEL_ORDER || 0})`} />
                <Tab value="ALL_CNPS" label={`All CNPs (${counts.ALL_CNPS || 0})`} />
              </Tabs>

              <TextField
                label="Date Filter"
                type="date"
                size="small"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  width: 170,
                  my: { xs: 1, sm: 0 },
                }}
              />

              {/* Search box pinned to the right */}
              <TextField
                size="small"
                placeholder="Search order # or phone…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // immediate refresh; debounced will also kick in
                    setPage(0);
                    fetchList(0, rowsPerPage);
                  }
                }}
                sx={{
                  width: { xs: "100%", sm: 280 },
                  my: { xs: 1, sm: 0 },
                }}
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ mr: 1, opacity: 0.7 }} fontSize="small" />
                  ),
                  endAdornment: q ? (
                    <IconButton
                      aria-label="Clear search"
                      size="small"
                      onClick={() => {
                        setQ("");
                        setPage(0);
                        fetchList(0, rowsPerPage);
                      }}
                    >
                      <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                  ) : null,
                }}
              />
            </Box>
          </Stack>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>SNo.</TableCell>
                <TableCell>Date & Time</TableCell>
                {isConfirmedTab && <TableCell>OC Date &amp; Time</TableCell>}
                <TableCell>Order Name</TableCell>
                <TableCell>Mobile</TableCell>
                {!isConfirmedTab && <TableCell>Address</TableCell>}
                <TableCell>Products Ordered</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell width={240}>Shopify Notes</TableCell>
                {isConfirmedTab && <TableCell>Shipment Status</TableCell>}
                {isConfirmedTab && <TableCell>Tracking ID</TableCell>}
                <TableCell align="center">More</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visibleItems.map((row, idx) => {
                const ops = row.orderConfirmOps || {};
                const rowSaving = !!savingRow[row._id];
                const isOpen = expandedId === row._id;
                const serial = page * rowsPerPage + idx + 1;
                const shipping = row.shipping || {};
                const tracking = shipping.tracking_number || "-";
                const shipmentStatus = shipping.shipment_status || "-";

                return (
                  <React.Fragment key={row._id}>
                    <TableRow
                      hover
                      sx={{
                        backgroundColor: rowAgeBg(row),
                        "&:hover": { backgroundColor: rowAgeBg(row) },
                      }}
                    >
                      <TableCell>{serial}</TableCell>

                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2">{formatDateTime(row.orderDate || row.createdAt)}</Typography>
                        </Stack>
                      </TableCell>

                      {isConfirmedTab && (
                        <TableCell>
                          <Typography variant="body2">
                            {ops.callStatusUpdatedAt ? formatDateTime(ops.callStatusUpdatedAt) : "-"}
                          </Typography>
                        </TableCell>
                      )}

                      <TableCell>
                        <Stack spacing={0.5}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" fontWeight={600}>
                              {row.orderName || "-"}
                            </Typography>
                            {(() => {
                              const count = Number(row?.totalOrdersForPhone || 0);
                              const isExisting = count > 1;
                              const label = isExisting ? `Rpt-${count}` : "New";

                              if (isExisting) {
                                const phone = row?.contactNumber || row?.customerAddress?.phone || "";
                                return (
                                  <Tooltip title="View previous orders">
                                    <Chip
                                      size="small"
                                      label={label}
                                      variant="outlined"
                                      onClick={() => openHistoryByPhone(phone)}
                                      sx={{ cursor: "pointer" }}
                                    />
                                  </Tooltip>
                                );
                              }
                              return <Chip size="small" label={label} sx={{ bgcolor: "#2e7d32", color: "#fff" }} />;
                            })()}
                          </Stack>

                          {row.customerName ? <Chip size="small" label={row.customerName} variant="outlined" /> : null}

                          {row?.orderConfirmOps?.assignedAgentName ? (
                            <Chip size="small" color="default" label={`Agent: ${row.orderConfirmOps.assignedAgentName}`} />
                          ) : (
                            <Chip size="small" variant="outlined" label="Unassigned" />
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2">{row.contactNumber || "-"}</Typography>

                          <Tooltip title="Copy">
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() =>
                                  copyToClipboard(row.contactNumber, (ok) =>
                                    setToast({
                                      open: true,
                                      severity: ok ? "success" : "error",
                                      msg: ok ? "Copied" : "Copy failed",
                                    })
                                  )
                                }
                              >
                                <ContentCopyIcon fontSize="inherit" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Call">
                            <span>
                              <IconButton size="small" component="a" href={telHref(row.contactNumber)} color="primary">
                                <PhoneIcon fontSize="inherit" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>

                      {!isConfirmedTab && (
                        <TableCell sx={{ whiteSpace: "normal", lineHeight: 1.3, maxWidth: 360 }}>
                          <Typography variant="body2">
                            {[
                              row?.customerAddress?.address1,
                              row?.customerAddress?.address2,
                              row?.customerAddress?.city,
                              row?.customerAddress?.province,
                              row?.customerAddress?.zip,
                              row?.customerAddress?.country,
                            ]
                              .filter(Boolean)
                              .join(", ") || "-"}
                          </Typography>
                        </TableCell>
                      )}

                      <TableCell sx={{ whiteSpace: "normal", lineHeight: 1.3, maxWidth: 360 }}>
                        <Typography variant="body2">
                          {Array.isArray(row?.productsOrdered) && row.productsOrdered.length
                            ? row.productsOrdered.map((p) => `${p?.title || ""}${p?.quantity ? ` ×${p.quantity}` : ""}`).join(", ")
                            : "-"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{channelLabel(row)}</Typography>
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Typography variant="body2">{currency(row.amount, row.currency || "INR")}</Typography>

                          {(() => {
                            const last = row?.orderConfirmOps?.plusUpdatedAt
                              ? `Last call: ${formatDateTime(row.orderConfirmOps.plusUpdatedAt)}`
                              : "No call logged yet";

                            return (
                              <Tooltip title={last}>
                                <span>
                                  <Badge
                                    overlap="rectangular"
                                    color="primary"
                                    badgeContent={Number(row?.orderConfirmOps?.plusCount || 0)}
                                    anchorOrigin={{ vertical: "top", horizontal: "right" }}
                                  >
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      onClick={() => handlePlusClick(row)}
                                      disabled={!!savingRow[row._id]}
                                      sx={{
                                        textTransform: "none",
                                        fontWeight: 600,
                                        px: 1.25,
                                        py: 0.25,
                                        lineHeight: 1.2,
                                        borderWidth: 1.5,
                                        borderStyle: "solid",
                                      }}
                                    >
                                      Log
                                    </Button>
                                  </Badge>
                                </span>
                              </Tooltip>
                            );
                          })()}
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Stack spacing={0.5}>
                          {isConfirmedTab ? (
                            <>
                              <Chip size="small" label="Order Confirmed" color="success" />

                              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {ops.callStatusUpdatedAt
                                  ? `Updated: ${formatDateTime(ops.callStatusUpdatedAt)}`
                                  : "Not updated yet"}
                              </Typography>
                            </>
                          ) : (
                            <>
                              <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel id={`call-status-${row._id}`}>Shopify Notes</InputLabel>
                                <Select
                                  labelId={`call-status-${row._id}`}
                                  label="Shopify Notes"
                                  value={ops.callStatus || ""}
                                  onChange={(e) => handleShopifyNotesChange(row, e.target.value)}
                                  disabled={rowSaving}
                                >
                                  {CALL_STATUS.map((cs) => (
                                    <MenuItem key={cs.value} value={cs.value}>
                                      {cs.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {ops.callStatusUpdatedAt ? `Updated: ${formatDateTime(ops.callStatusUpdatedAt)}` : "Not updated yet"}
                              </Typography>
                            </>
                          )}
                        </Stack>
                      </TableCell>

                      {isConfirmedTab && (
                        <TableCell>
                          <Typography variant="body2" title={shipping.carrier_title || ""}>
                            {shipmentStatus}
                          </Typography>
                        </TableCell>
                      )}
                      {isConfirmedTab && (
                        <TableCell>
                          {tracking && tracking !== "-" ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2">
                                <a
                                  href={`https://track.shipway.com/t/${encodeURIComponent(tracking)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ textDecoration: "none", color: "#1976d2", fontWeight: 600 }}
                                >
                                  {tracking}
                                </a>
                              </Typography>
                              <Tooltip title="Copy">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() =>
                                      copyToClipboard(tracking, (ok) =>
                                        setToast({
                                          open: true,
                                          severity: ok ? "success" : "error",
                                          msg: ok ? "Copied" : "Copy failed",
                                        })
                                      )
                                    }
                                  >
                                    <ContentCopyIcon fontSize="inherit" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          ) : (
                            <Typography variant="body2">-</Typography>
                          )}
                        </TableCell>
                      )}

                      <TableCell align="center">
                        <IconButton
                          onClick={() => setExpandedId((prev) => (prev === row._id ? null : row._id))}
                          color="primary"
                          size="small"
                        >
                          {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={isConfirmedTab ? 11 : 10} sx={{ py: 0, background: "rgba(0,0,0,0.02)" }}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2 }}>
                            {isConfirmedTab ? (
                              <Stack direction="row" spacing={3} alignItems="center" useFlexGap flexWrap="wrap">
                                <ToggleButtonGroup
                                  exclusive
                                  size="small"
                                  color="primary"
                                  value={triValue(row?.orderConfirmOps, "doctorCallNeeded")}
                                  onChange={(_, val) => {
                                    if (val === "yes") {
                                      patchOrder(row._id, { doctorCallNeeded: true }, "Saved")
                                        .then(() => openScheduleDialog(row))
                                        .catch(() => { });
                                    } else if (val === "no") {
                                      patchOrder(row._id, { doctorCallNeeded: false }, "Saved").catch(() => { });
                                      closeScheduleDialog();
                                    }
                                  }}
                                >
                                  <ToggleButton value="yes">Yes</ToggleButton>
                                  <ToggleButton value="no">No</ToggleButton>
                                </ToggleButtonGroup>

                                <ToggleButtonGroup
                                  exclusive
                                  size="small"
                                  color="primary"
                                  value={triValue(row?.orderConfirmOps, "dietPlanNeeded")}
                                  onChange={(_, val) => {
                                    if (!val) return;
                                    patchOrder(row._id, { dietPlanNeeded: val === "yes" });
                                  }}
                                >
                                  <ToggleButton value="yes">Yes</ToggleButton>
                                  <ToggleButton value="no">No</ToggleButton>
                                </ToggleButtonGroup>

                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                                    Language
                                  </Typography>
                                  <Chip size="small" label={row?.orderConfirmOps?.languageUsed || "-"} variant="outlined" />
                                </Stack>

                                <Divider flexItem orientation="vertical" />

                                <ToggleButtonGroup
                                  exclusive
                                  size="small"
                                  color="primary"
                                  value={triValue(row?.orderConfirmOps, "codToPrepaid")}
                                  onChange={(_, val) => {
                                    if (!val) return;
                                    patchOrder(row._id, { codToPrepaid: val === "yes" });
                                  }}
                                >
                                  <ToggleButton value="yes">Yes</ToggleButton>
                                  <ToggleButton value="no">No</ToggleButton>
                                </ToggleButtonGroup>

                                {row?.orderConfirmOps?.assignedExpert ? (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" sx={{ minWidth: 140 }}>
                                      Assigned expert
                                    </Typography>
                                    <Chip size="small" label={row.orderConfirmOps.assignedExpert} variant="outlined" />
                                  </Stack>
                                ) : null}
                              </Stack>
                            ) : (
                              <Stack direction="row" spacing={3} alignItems="center" useFlexGap flexWrap="wrap">
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                                    Doctor call needed
                                  </Typography>
                                  <ToggleButtonGroup
                                    exclusive
                                    size="small"
                                    color="primary"
                                    value={boolToChoice(row?.orderConfirmOps?.doctorCallNeeded)}
                                    onChange={(_, val) => {
                                      if (val === "yes") {
                                        patchOrder(row._id, { doctorCallNeeded: true }, "Saved")
                                          .then(() => openScheduleDialog(row))
                                          .catch(() => { });
                                      } else if (val === "no") {
                                        patchOrder(row._id, { doctorCallNeeded: false }, "Saved").catch(() => { });
                                        closeScheduleDialog();
                                      }
                                    }}
                                  >
                                    <ToggleButton value="yes">Yes</ToggleButton>
                                    <ToggleButton value="no">No</ToggleButton>
                                  </ToggleButtonGroup>
                                </Stack>

                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                                    Diet plan needed
                                  </Typography>
                                  <ToggleButtonGroup
                                    exclusive
                                    size="small"
                                    color="primary"
                                    value={boolToChoice(row?.orderConfirmOps?.dietPlanNeeded)}
                                    onChange={(_, val) => {
                                      if (!val) return;
                                      patchOrder(row._id, { dietPlanNeeded: val === "yes" });
                                    }}
                                  >
                                    <ToggleButton value="yes">Yes</ToggleButton>
                                    <ToggleButton value="no">No</ToggleButton>
                                  </ToggleButtonGroup>
                                </Stack>

                                <Autocomplete
                                  size="small"
                                  freeSolo
                                  options={LANGUAGE_OPTIONS}
                                  value={row?.orderConfirmOps?.languageUsed || ""}
                                  onInputChange={(_, val) => {
                                    setItems((rows) =>
                                      rows.map((r) =>
                                        r._id === row._id
                                          ? {
                                            ...r,
                                            orderConfirmOps: {
                                              ...(r.orderConfirmOps || {}),
                                              languageUsed: val,
                                            },
                                          }
                                          : r
                                      )
                                    );
                                  }}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    if (typeof val === "string") {
                                      patchOrder(row._id, { languageUsed: val });
                                    }
                                  }}
                                  renderInput={(params) => <TextField {...params} label="Language" sx={{ minWidth: 200 }} />}
                                />

                                <Divider flexItem orientation="vertical" />

                                {/* COD → Prepaid */}
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                                    COD → Prepaid
                                  </Typography>
                                  <ToggleButtonGroup
                                    exclusive
                                    size="small"
                                    color="primary"
                                    value={boolToChoice(row?.orderConfirmOps?.codToPrepaid)}
                                    onChange={(_, val) => {
                                      if (!val) return;
                                      patchOrder(row._id, { codToPrepaid: val === "yes" });
                                    }}
                                  >
                                    <ToggleButton value="yes">Yes</ToggleButton>
                                    <ToggleButton value="no">No</ToggleButton>
                                  </ToggleButtonGroup>

                                  {/* Actions */}
                                  {row?.orderConfirmOps?.codToPrepaid ? (
                                    <>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<LinkOutlinedIcon />}
                                        onClick={() => openPaymentDialog(row)}
                                      >
                                        Generate Payment Link
                                      </Button>

                                      {row?.orderConfirmOps?.paymentLink ? (
                                        <Tooltip title="Open payment link">
                                          <IconButton
                                            size="small"
                                            color="primary"
                                            component="a"
                                            href={row.orderConfirmOps.paymentLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <LaunchIcon fontSize="inherit" />
                                          </IconButton>
                                        </Tooltip>
                                      ) : null}
                                    </>
                                  ) : null}

                                  {/* Cancel Order */}
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    startIcon={cancelingRow[row._id] ? <CircularProgress size={16} /> : <CancelOutlinedIcon />}
                                    onClick={() => openConfirmCancel(row)}
                                    disabled={!!cancelingRow[row._id]}
                                  >
                                    {cancelingRow[row._id] ? "Cancelling…" : "Cancel Order"}
                                  </Button>

                                  {row?.orderConfirmOps?.ocCancelReason ? (
                                    <Chip
                                      size="small"
                                      variant="outlined"
                                      sx={{ ml: 1 }}
                                      label={`Reason: ${row.orderConfirmOps.ocCancelReason}`}
                                    />
                                  ) : null}
                                </Stack>
                              </Stack>
                            )}

                            <ScheduleCallDialog
                              open={scheduleDlg.open}
                              onClose={() => setScheduleDlg({ open: false, row: null })}
                              agents={agents}
                              orderId={scheduleDlg.row?._id}
                              customerId={scheduleDlg.row?.customerId}
                              createdBy={""}
                              onScheduled={(mirror) => {
                                const id = scheduleDlg.row?._id;
                                if (!id) return;
                                setItems((rows) =>
                                  rows.map((r) =>
                                    r._id === id ? { ...r, orderConfirmOps: { ...(r.orderConfirmOps || {}), ...mirror } } : r
                                  )
                                );
                              }}
                            />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}

              {loading && (
                <TableRow>
                  <TableCell colSpan={isConfirmedTab ? 11 : 10} align="center">
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2">Loading…</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Dialog open={historyDlg.open} onClose={closeHistoryDlg} maxWidth="md" fullWidth>
            <DialogTitle>Previous Orders — {historyDlg.phone ? `+91 ${historyDlg.phone}` : ""}</DialogTitle>
            <DialogContent dividers>
              {historyDlg.loading ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={20} />
                  <Typography variant="body2">Loading history…</Typography>
                </Stack>
              ) : historyDlg.items.length === 0 ? (
                <Typography variant="body2">No previous orders found for this customer.</Typography>
              ) : (
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Shipment Status</TableCell>
                      <TableCell>Order Date</TableCell>
                      <TableCell>Tracking Number</TableCell>
                      <TableCell>Carrier Title</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyDlg.items.map((h) => (
                      <TableRow key={h.order_id}>
                        <TableCell>{h.order_id}</TableCell>
                        <TableCell>{h.shipment_status || "-"}</TableCell>
                        <TableCell>{h.order_date ? formatDateTime(h.order_date) : "-"}</TableCell>
                        <TableCell>{h.tracking_number || "-"}</TableCell>
                        <TableCell>{h.carrier_title || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={closeHistoryDlg}>Close</Button>
            </DialogActions>
          </Dialog>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={visibleTotal}
            page={page}
            onPageChange={(_e, newPage) => {
              setPage(newPage);
              if (!isConfirmedTab) fetchList(newPage, rowsPerPage);
            }}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              const newRpp = parseInt(e.target.value, 10);
              setRowsPerPage(newRpp);
              setPage(0);
              fetchList(0, newRpp);
              setExpandedId(null);
            }}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </TableContainer>

        {/* Toast */}
        <Snackbar
          open={toast.open}
          autoHideDuration={2200}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))} variant="filled" sx={{ width: "100%" }}>
            {toast.msg}
          </Alert>
        </Snackbar>

        <Dialog open={confirmCancel.open} onClose={closeConfirmCancel} maxWidth="xs" fullWidth>
          <DialogTitle>Cancel this order?</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2">
              This will create a cancellation request in Shopify for <strong>{confirmCancel.row?.orderName || "-"}</strong>.
            </Typography>

            <Box sx={{ mt: 2 }}>
              <TextField
                label="Reason"
                placeholder="e.g., Customer requested cancellation"
                value={confirmCancel.reason}
                onChange={(e) => setConfirmCancel((s) => ({ ...s, reason: e.target.value }))}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeConfirmCancel}>No</Button>
            <Button
              color="error"
              variant="contained"
              onClick={confirmCancelYes}
              startIcon={cancelingRow[confirmCancel.row?._id] ? <CircularProgress size={16} /> : <CancelOutlinedIcon />}
              disabled={!!cancelingRow[confirmCancel.row?._id]}
            >
              {cancelingRow[confirmCancel.row?._id] ? "Cancelling…" : "Yes, Cancel"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Payment Link Dialog */}
        <Dialog open={payDlg.open} onClose={payDlg.generating ? undefined : closePaymentDialog} maxWidth="xs" fullWidth>
          <DialogTitle>Generate Payment Link</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Amount (INR)"
                type="number"
                inputProps={{ min: 1, step: "0.01" }}
                value={payDlg.amount}
                onChange={(e) => setPayDlg((s) => ({ ...s, amount: e.target.value }))}
                fullWidth
              />

              <TextField
                label="Customer Name"
                value={payDlg.customerName}
                onChange={(e) => setPayDlg((s) => ({ ...s, customerName: e.target.value }))}
                fullWidth
              />

              <TextField
                label="Customer Phone (10 digits)"
                value={payDlg.contact}
                onChange={(e) => setPayDlg((s) => ({ ...s, contact: toTenDigits(e.target.value) }))}
                fullWidth
              />

              <TextField
                label="Customer Email (optional)"
                value={payDlg.customerEmail || ""}
                onChange={(e) => setPayDlg((s) => ({ ...s, customerEmail: e.target.value }))}
                fullWidth
              />

              {/* Discount options */}
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Discount
                </Typography>

                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant={payDlg.discountPct === 5 ? "contained" : "outlined"}
                    onClick={() => setPayDlg((s) => ({ ...s, discountPct: s.discountPct === 5 ? 0 : 5 }))}
                    sx={{ textTransform: "none" }}
                  >
                    5% Off
                  </Button>
                  <Button
                    size="small"
                    variant={payDlg.discountPct === 10 ? "contained" : "outlined"}
                    onClick={() => setPayDlg((s) => ({ ...s, discountPct: s.discountPct === 10 ? 0 : 10 }))}
                    sx={{ textTransform: "none" }}
                  >
                    10% Off
                  </Button>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="baseline">
                  {Number(payDlg.discountPct) > 0 ? (
                    <>
                      <Typography variant="caption" sx={{ textDecoration: "line-through", opacity: 0.7 }}>
                        {currency(Number(payDlg.amount) || 0, payDlg.currency || "INR")}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {currency(finalAmount, payDlg.currency || "INR")}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        ({payDlg.discountPct}% off)
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      Final amount: <strong>{currency(Number(payDlg.amount) || 0, payDlg.currency || "INR")}</strong>
                    </Typography>
                  )}
                </Stack>
              </Stack>

              {/* Generated link preview + actions */}
              {payDlg.link ? (
                <Stack spacing={1}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Payment Link
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField value={payDlg.link} size="small" fullWidth InputProps={{ readOnly: true }} />
                    <Tooltip title="Copy link">
                      <span>
                        <IconButton
                          onClick={() =>
                            copyToClipboard(payDlg.link, (ok) =>
                              setToast({
                                open: true,
                                severity: ok ? "success" : "error",
                                msg: ok ? "Link copied" : "Copy failed",
                              })
                            )
                          }
                          color="primary"
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Open link">
                      <span>
                        <IconButton color="primary" component="a" href={payDlg.link} target="_blank" rel="noopener noreferrer">
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    SMS has been sent to the customer via Razorpay.
                  </Typography>
                </Stack>
              ) : null}
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button onClick={closePaymentDialog} disabled={payDlg.generating}>
              Close
            </Button>
            <Button variant="contained" onClick={generateAndShareLink} disabled={payDlg.generating}>
              {payDlg.generating ? "Generating…" : "Generate & Share"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
