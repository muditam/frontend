import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  List,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  Stack,
  Tooltip,
} from "@mui/material";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import PhoneIcon from "@mui/icons-material/Phone";
import AddIcon from "@mui/icons-material/Add";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import HistoryIcon from "@mui/icons-material/History";

// 🔹 Global retention-specific details form
import GlobalRetentionDetails from "./GlobalRetentionDetails";

const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const CONDITION_OPTIONS = [
  "Diabetes",
  "Liver",
  "Cholesterol",
  "Thyroid",
  "Others",
];

const normalizeConditions = (...values) => {
  const flattened = values
    .flatMap((value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        return value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return [];
    })
    .map((item) => String(item).trim())
    .filter(Boolean);

  return [...new Set(flattened)];
};

const statusChipColor = (status) => {
  const s = (status || "").toLowerCase().trim();
  switch (s) {
    case "today":
      return "success";
    case "tomorrow":
      return "info";
    case "missed":
      return "error";
    case "not set":
    case "notset":
      return "warning";
    case "later":
      return "default";
    default:
      return "default";
  }
};

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " • " +
    d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
};

const toDateInputValue = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const computeFollowupLabel = (lead) => {
  if (lead.followupTag) return lead.followupTag;

  const raw = lead.nextFollowup;
  if (!raw) return "Not Set";

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "Not Set";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (day.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays >= 2) return "Later";
  if (diffDays < 0) return "Missed";

  return "Not Set";
};

const GlobalRetentionLeads = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [followupFilter, setFollowupFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedLead, setSelectedLead] = useState(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    number: "",
    age: "",
    lookingFor: [],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const [logsByLead, setLogsByLead] = useState({});
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logMethod, setLogMethod] = useState("WhatsApp");
  const [logDisposition, setLogDisposition] = useState("Connected");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const [notesByLead, setNotesByLead] = useState({});
  const [noteInput, setNoteInput] = useState("");

  const [nextFollowupLocal, setNextFollowupLocal] = useState("");
  const [retentionStatusLocal, setRetentionStatusLocal] = useState("");
  const [followupStatusLocal, setFollowupStatusLocal] = useState("");
  const [prefMethodLocal, setPrefMethodLocal] = useState("");
  const [conditionLocal, setConditionLocal] = useState([]);

  const [minFollowupDate, setMinFollowupDate] = useState("");
  const [maxFollowupDate, setMaxFollowupDate] = useState("");

  useEffect(() => {
    const today = new Date();
    const max = new Date();
    max.setDate(today.getDate() + 7);

    setMinFollowupDate(toDateInputValue(today.toISOString()));
    setMaxFollowupDate(toDateInputValue(max.toISOString()));
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${API_BASE_URL}/api/global-retention-leads`, {
        params: {
          page,
          limit,
          search: search || undefined,
          status: tab === "all" ? undefined : tab,
          followupFilter: followupFilter === "all" ? undefined : followupFilter,
        },
      });

      const data = res.data || {};
      const list = data.leads || data.items || [];
      setLeads(list);
    } catch (err) {
      console.error("Error fetching global retention leads:", err);
      setError(
        err.response?.data?.message || "Failed to load global retention leads."
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, tab, followupFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const prefill = location.state?.prefillLead;
    if (!location.state?.openAddDialog || !prefill) return;

    setSaveError("");
    setSaveSuccess("");
    setNewLead({
      name: prefill.name || "",
      number: prefill.number || "",
      age: prefill.age || "",
      lookingFor: normalizeConditions(prefill.lookingFor),
    });
    setAddDialogOpen(true);

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  // Sync local UI state with selectedLead
  useEffect(() => {
    if (!selectedLead) return;

    setNextFollowupLocal(
      selectedLead.nextFollowup ? toDateInputValue(selectedLead.nextFollowup) : ""
    );

    const rs = selectedLead.retentionStatus || selectedLead.status || "";
    setRetentionStatusLocal(
      rs && rs.toLowerCase().startsWith("lost")
        ? "Lost"
        : rs && rs.toLowerCase().startsWith("active")
        ? "Active"
        : ""
    );

    setFollowupStatusLocal(selectedLead.followupStatus || "");

    const pm = selectedLead.prefMethod || selectedLead.communicationMethod || "";
    setPrefMethodLocal(pm);

    setConditionLocal(
      normalizeConditions(
        selectedLead.condition,
        selectedLead.enquiryFor,
        selectedLead.lookingFor
      )
    );
  }, [selectedLead]);

  // Ensure selectedLead is always in the list
  useEffect(() => {
    if (!selectedLead && leads.length > 0) {
      setSelectedLead(leads[0]);
    } else if (selectedLead) {
      const stillExists = leads.some((l) => l._id === selectedLead._id);
      if (!stillExists && leads.length > 0) {
        setSelectedLead(leads[0]);
      }
    }
  }, [leads, selectedLead]);

  const handleTabChange = (_e, value) => {
    setTab(value);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFollowupChipClick = (value) => {
    setFollowupFilter((prev) => (prev === value ? "all" : value));
    setPage(1);
  };

  const onChangeNewLeadField = (field) => (e) => {
    setNewLead((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleOpenAddDialog = () => {
    setSaveError("");
    setSaveSuccess("");
    setAddDialogOpen(true);
  };

  const handleCloseAddDialog = () => {
    if (!saving) {
      setAddDialogOpen(false);
    }
  };

  const handleAddLead = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const payload = {
        name: newLead.name.trim(),
        phoneNumber: newLead.number.trim(),
        age: newLead.age ? Number(newLead.age) : null,
        lookingFor: normalizeConditions(newLead.lookingFor),
      };

      if (!payload.name || !payload.phoneNumber) {
        setSaveError("Name and Number are required.");
        setSaving(false);
        return;
      }

      const res = await axios.post(
        `${API_BASE_URL}/api/global-retention-leads`,
        payload
      );

      setSaveSuccess("Lead added successfully.");
      setNewLead({
        name: "",
        number: "",
        age: "",
        lookingFor: [],
      });

      await fetchLeads();
      if (res.data && res.data.lead) {
        setSelectedLead(res.data.lead);
      }

      setAddDialogOpen(false);
    } catch (err) {
      console.error("Error adding global retention lead:", err);
      setSaveError(
        err.response?.data?.message || "Failed to add retention lead."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAutoSaveField = async (field, rawValue) => {
    if (!selectedLead) return;

    let value = rawValue;

    if (field === "nextFollowup") {
      value = rawValue || null;
    }

    try {
      const res = await axios.patch(
        `${API_BASE_URL}/api/global-retention-leads/${selectedLead._id}`,
        { [field]: value }
      );

      const updated = res.data?.lead;
      if (updated) {
        setSelectedLead(updated);
        setLeads((prev) =>
          prev.map((l) => (l._id === updated._id ? updated : l))
        );
      }
    } catch (err) {
      console.error("Error auto-saving field:", field, err);
      setError(
        err.response?.data?.message ||
          "Failed to auto-save follow-up / retention details."
      );
    }
  };

  const renderLeadItem = (lead, index) => {
    const initials =
      (lead.name || lead.fullName || "")
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2) || "U";
    const leadContactNumber = lead.contactNumber || lead.phoneNumber || "";

    const lastOrderText = lead.lastOrderDays
      ? `Last Order • ${lead.lastOrderDays} days`
      : "";

    const lastReachedText = lead.lastReachedDays
      ? `Last Reached • ${lead.lastReachedDays} days`
      : "";

    const statusLabel = computeFollowupLabel(lead);
    const isSelected = selectedLead && selectedLead._id === lead._id;

    return (
      <Box
        key={lead._id || lead.id || index}
        onClick={() => setSelectedLead(lead)}
        sx={{
          mb: 1,
          px: 1.1,
          py: 1,
          borderRadius: "16px",
          border: isSelected ? "1px solid transparent" : "1px solid #D8E2EE",
          background: isSelected
            ? "linear-gradient(135deg, #1F3B57 0%, #345B81 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,253,0.98) 100%)",
          boxShadow: isSelected
            ? "0 14px 28px rgba(31,59,87,0.26)"
            : "0 8px 18px rgba(15,23,42,0.06)",
          cursor: "pointer",
          transition: "transform 140ms ease, box-shadow 140ms ease, background 140ms ease",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: isSelected
              ? "0 18px 32px rgba(31,59,87,0.3)"
              : "0 12px 24px rgba(15,23,42,0.1)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.1 }}>
          <Typography
            variant="body2"
            sx={{
              minWidth: 26,
              textAlign: "center",
              fontWeight: 700,
              fontSize: 13,
              mt: 0.5,
              color: isSelected ? "rgba(255,255,255,0.82)" : "#52657A",
            }}
          >
            {index + 1}
          </Typography>

          <Avatar
            sx={{
              width: 42,
              height: 42,
              bgcolor: isSelected ? "rgba(255,255,255,0.16)" : "#1F3B57",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: isSelected ? "#FFFFFF" : "#0F172A",
                  lineHeight: 1.25,
                }}
              >
                {lead.name || lead.fullName}
              </Typography>
              <Chip
                label={statusLabel}
                size="small"
                color={statusChipColor(statusLabel)}
                sx={{
                  height: 24,
                  fontSize: 11,
                  fontWeight: 700,
                  ...(isSelected
                    ? {
                        bgcolor: "rgba(255,255,255,0.16)",
                        color: "#FFFFFF",
                        "& .MuiChip-label": { px: 1 },
                      }
                    : {}),
                }}
              />
            </Box>

            {leadContactNumber && (
              <Typography
                variant="body2"
                sx={{
                  mt: 0.35,
                  fontSize: 12.5,
                  color: isSelected ? "rgba(255,255,255,0.78)" : "#60758D",
                }}
              >
                {leadContactNumber}
              </Typography>
            )}

            <Box sx={{ mt: 0.5 }}>
              {lastOrderText && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    color: isSelected ? "rgba(255,255,255,0.72)" : "#6B7280",
                    fontSize: 11.5,
                  }}
                >
                  {lastOrderText}
                </Typography>
              )}
              {lastReachedText && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    color: isSelected ? "rgba(255,255,255,0.72)" : "#6B7280",
                    fontSize: 11.5,
                  }}
                >
                  {lastReachedText}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  const detail = selectedLead || {};
  const contactNumber = detail.contactNumber || detail.phoneNumber || "";

  const handleCopyNumber = () => {
    if (!contactNumber) return;
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(contactNumber).catch(() => {});
    }
  };

  const currentLogs =
    (selectedLead && logsByLead[selectedLead._id]) || [];

  const currentNotes =
    (selectedLead && notesByLead[selectedLead._id]) || [];

  const handleOpenLogDialog = () => {
    setLogMethod("WhatsApp");
    setLogDisposition("Connected");
    setLogDialogOpen(true);
  };

  const handleSaveLog = () => {
    if (!selectedLead) return;
    const newLog = {
      id: Date.now(),
      when: new Date().toISOString(),
      method: logMethod,
      disposition: logDisposition,
    };
    setLogsByLead((prev) => {
      const existing = prev[selectedLead._id] || [];
      return {
        ...prev,
        [selectedLead._id]: [newLog, ...existing],
      };
    });
    setLogDialogOpen(false);
  };

  const handleSaveNote = () => {
    if (!selectedLead) return;
    const trimmed = noteInput.trim();
    if (!trimmed) return;

    const newNote = {
      id: Date.now(),
      text: trimmed,
      when: new Date().toISOString(),
    };

    setNotesByLead((prev) => {
      const existing = prev[selectedLead._id] || [];
      return {
        ...prev,
        [selectedLead._id]: [newNote, ...existing],
      };
    });

    setNoteInput("");
  };

  const handleResetNote = () => {
    setNoteInput("");
  };

  const activeConditions =
    conditionLocal.length > 0
      ? conditionLocal
      : normalizeConditions(detail.condition, detail.enquiryFor, detail.lookingFor);

  const statusTabs = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Lost", value: "lost" },
  ];

  const followupChips = [
    { key: "today", label: "Today" },
    { key: "tomorrow", label: "Tomorrow" },
    { key: "later", label: "Later" },
    { key: "missed", label: "Missed" },
    { key: "notset", label: "Not Set" },
  ];

  const premiumPillSx = (isSelected) => ({
    minWidth: 0,
    textTransform: "none",
    borderRadius: "12px",
    px: 1.1,
    py: 0.55,
    border: isSelected ? "1px solid transparent" : "1px solid #D6DEE8",
    color: isSelected ? "#FFFFFF" : "#1E293B",
    bgcolor: isSelected ? "#1F3B57" : "rgba(255,255,255,0.88)",
    boxShadow: isSelected
      ? "0 10px 20px rgba(31,59,87,0.22)"
      : "0 2px 8px rgba(15,23,42,0.06)",
    "&:hover": {
      borderColor: isSelected ? "transparent" : "#C8D2DE",
      bgcolor: isSelected ? "#244564" : "rgba(255,255,255,1)",
    },
  });

  const headerIconButtonSx = {
    width: 38,
    height: 38,
    borderRadius: "10px",
    border: "1px solid #D6DEE8",
    bgcolor: "rgba(255,255,255,0.88)",
    boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
    color: "#1B2430",
    flexShrink: 0,
    "&:hover": {
      bgcolor: "#FFFFFF",
    },
  };

  const premiumInputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: "rgba(255,255,255,0.92)",
      "& .MuiOutlinedInput-notchedOutline": { borderColor: "#D6DEE8" },
      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#C8D2DE" },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "#8EA9C7",
      },
    },
    "& .MuiInputLabel-root": { color: "#5B6B7F" },
  };

  const leadFieldSx = {
    ...premiumInputSx,
    "& .MuiOutlinedInput-root": {
      ...premiumInputSx["& .MuiOutlinedInput-root"],
      minHeight: 54,
    },
    "& .MuiInputBase-input, & .MuiSelect-select": {
      fontSize: 14,
      fontWeight: 600,
    },
    "& .MuiInputLabel-root": {
      color: "#64748B",
      fontSize: 13,
      fontWeight: 600,
    },
  };

  const metaPillSx = {
    px: 1.2,
    py: 0.45,
    minHeight: 32,
    borderRadius: 999,
    border: "1px solid #D5DFEA",
    bgcolor: "#EDF2F8",
    color: "#1E293B",
    display: "inline-flex",
    alignItems: "center",
    gap: 0.6,
    fontSize: 12.5,
    fontWeight: 600,
    lineHeight: 1,
  };

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        fontFamily: '"Segoe UI", sans-serif',
        backgroundColor: "background.default",
        color: "black",
      }}
    >
      <Box
        sx={{
          width: { xs: "100%", md: "22%" },
          minWidth: { md: 290 },
          borderRight: "1px solid #D7E0EA",
          display: "flex",
          flexDirection: "column",
          px: 1.25,
          pb: 1.25,
          background:
            "radial-gradient(140% 90% at 0% 0%, #F6F9FC 0%, #EEF3F9 55%, #E9EEF5 100%)",
          overflowY: "auto",
        }}
      >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            backdropFilter: "blur(8px)",
            background:
              "linear-gradient(180deg, rgba(241,246,252,0.97) 0%, rgba(241,246,252,0.92) 100%)",
            pt: 1.25,
            pb: 1.1,
            borderBottom: "1px solid #D7E0EA",
            borderRadius: "0 0 16px 16px",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <Tooltip title="Add lead">
              <IconButton size="small" onClick={handleOpenAddDialog} sx={headerIconButtonSx}>
                <PersonAddIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Stack
              direction="row"
              spacing={0.75}
              sx={{ flexWrap: "wrap", rowGap: 0.75, columnGap: 0.75, flex: "1 1 auto" }}
            >
              {statusTabs.map(({ label, value }) => {
                const isSelected = tab === value;
                return (
                  <Button
                    key={value}
                    variant={isSelected ? "contained" : "outlined"}
                    onClick={() => handleTabChange(null, value)}
                    size="small"
                    sx={premiumPillSx(isSelected)}
                  >
                    {label}
                  </Button>
                );
              })}
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.65} mt={1} sx={{ flexWrap: "wrap", rowGap: 0.65 }}>
            {followupChips.map((item) => {
              const isSelected = followupFilter === item.key;
              return (
                <Button
                  key={item.key}
                  variant={isSelected ? "contained" : "outlined"}
                  onClick={() => handleFollowupChipClick(item.key)}
                  size="small"
                  sx={{
                    ...premiumPillSx(isSelected),
                    borderRadius: "10px",
                    minWidth: 58,
                    px: 0.7,
                    py: 0.35,
                    fontSize: 12,
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Stack>

          <Box sx={{ display: "flex", alignItems: "center", mb: 0, gap: 0.6, mt: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search leads..."
              value={search}
              onChange={handleSearchChange}
              sx={premiumInputSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#60758D" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            mt: 1.2,
            flex: 1,
            overflowY: "auto",
            pr: 0.25,
          }}
        >
          {loading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <CircularProgress size={28} />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : leads.length === 0 ? (
            <Typography
              variant="body2"
              sx={{
                mt: 2,
                textAlign: "center",
                color: "text.secondary",
                fontSize: 15,
              }}
            >
              No leads found.
            </Typography>
          ) : (
            <List dense disablePadding>
              {leads.map((lead, idx) => renderLeadItem(lead, idx))}
            </List>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          p: 1.5,
          background:
            "linear-gradient(180deg, rgba(250,252,255,0.98) 0%, rgba(243,247,252,0.98) 100%)",
          overflow: "auto",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            minHeight: "100%",
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            borderRadius: 3,
            border: "1px solid #D7E1ED",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,249,253,0.98) 100%)",
          }}
        >
            {selectedLead ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                  flex: 1,
                  minHeight: 0,
                  flexDirection: { xs: "column", lg: "row" },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      borderRadius: 3,
                      border: "1px solid #D8E2EE",
                      p: 2,
                      bgcolor: "#ffffff",
                      boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.25,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 52,
                          height: 52,
                          bgcolor: "#1F3B57",
                          color: "#ffffff",
                          fontSize: 20,
                          fontWeight: 700,
                        }}
                      >
                        {(detail.name || detail.fullName || "U")
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)}
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: 24,
                            color: "#0F172A",
                            lineHeight: 1.2,
                          }}
                        >
                          {detail.name || detail.fullName}
                        </Typography>

                        <Box
                          sx={{
                            mt: 0.75,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          {contactNumber && (
                            <Box sx={metaPillSx}>{contactNumber}</Box>
                          )}
                        {activeConditions.map((condition) => (
                          <Box key={condition} sx={metaPillSx}>
                            {condition}
                          </Box>
                        ))}
                          {detail.age && <Box sx={metaPillSx}>Age {detail.age}</Box>}
                        </Box>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                        {contactNumber && (
                          <Tooltip title="Copy number">
                            <IconButton
                              size="small"
                              onClick={handleCopyNumber}
                              sx={headerIconButtonSx}
                            >
                              <ContentCopyIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Add log">
                          <IconButton
                            size="small"
                            onClick={handleOpenLogDialog}
                            sx={headerIconButtonSx}
                          >
                            <PlaylistAddIcon sx={{ fontSize: 20 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="History">
                          <IconButton
                            size="small"
                            onClick={() => setHistoryDialogOpen(true)}
                            sx={headerIconButtonSx}
                          >
                            <HistoryIcon sx={{ fontSize: 20 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        mt: 0.35,
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: {
                          xs: "minmax(0, 1fr)",
                          sm: "repeat(2, minmax(0, 1fr))",
                          xl: "repeat(5, minmax(0, 1fr))",
                        },
                      }}
                    >
                      <TextField
                        label="Next Follow-up"
                        type="date"
                        size="small"
                        fullWidth
                        value={nextFollowupLocal}
                        onChange={(e) => {
                          const v = e.target.value;
                          setNextFollowupLocal(v);
                          handleAutoSaveField("nextFollowup", v);
                        }}
                        sx={leadFieldSx}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          inputProps: {
                            min: minFollowupDate || undefined,
                            max: maxFollowupDate || undefined,
                          },
                        }}
                      />

                      <TextField
                        label="Retention Status"
                        size="small"
                        fullWidth
                        select
                        value={retentionStatusLocal}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRetentionStatusLocal(v);
                          handleAutoSaveField("retentionStatus", v);
                        }}
                        sx={leadFieldSx}
                      >
                        <MenuItem value="">Select</MenuItem>
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="Lost">Lost</MenuItem>
                      </TextField>

                      <TextField
                        label="Followup Status"
                        size="small"
                        fullWidth
                        select
                        value={followupStatusLocal}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFollowupStatusLocal(v);
                          handleAutoSaveField("followupStatus", v);
                        }}
                        sx={leadFieldSx}
                      >
                        <MenuItem value="">Select</MenuItem>
                        <MenuItem value="Good result">Good result</MenuItem>
                        <MenuItem value="No result">No result</MenuItem>
                        <MenuItem value="Call back requested">Call back requested</MenuItem>
                        <MenuItem value="Could not connect">Could not connect</MenuItem>
                        <MenuItem value="Not interested">Not interested</MenuItem>
                      </TextField>

                      <TextField
                        label="Pref Method"
                        size="small"
                        fullWidth
                        select
                        value={prefMethodLocal}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPrefMethodLocal(v);
                          handleAutoSaveField("prefMethod", v);
                        }}
                        sx={leadFieldSx}
                      >
                        <MenuItem value="">Select</MenuItem>
                        <MenuItem value="Call">Call</MenuItem>
                        <MenuItem value="WhatsApp">WhatsApp</MenuItem>
                        <MenuItem value="Both">Both</MenuItem>
                      </TextField>

                      <TextField
                        label="Condition"
                        size="small"
                        fullWidth
                        select
                        value={conditionLocal}
                        onChange={(e) => {
                          const value = Array.isArray(e.target.value)
                            ? e.target.value
                            : normalizeConditions(e.target.value);
                          setConditionLocal(value);
                          handleAutoSaveField("condition", value);
                        }}
                        sx={leadFieldSx}
                        SelectProps={{
                          multiple: true,
                          displayEmpty: true,
                          renderValue: (selected) => {
                            const values = Array.isArray(selected) ? selected : [];
                            if (values.length === 0) {
                              return (
                                <Typography sx={{ color: "#94A3B8", fontSize: 14 }}>
                                  Select conditions
                                </Typography>
                              );
                            }
                            return (
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 0.5,
                                  maxWidth: "100%",
                                }}
                              >
                                {values.map((value) => (
                                  <Chip
                                    key={value}
                                    label={value}
                                    size="small"
                                    sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                                  />
                                ))}
                              </Box>
                            );
                          },
                        }}
                      >
                        {CONDITION_OPTIONS.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 1.5 }}>
                    <GlobalRetentionDetails
                      leadId={detail._id}
                      contactNumber={contactNumber}
                      activeConditions={activeConditions}
                    />
                  </Box>
                </Box>

                <Box
                  sx={{
                    width: { xs: "100%", lg: 340 },
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      borderRadius: 3,
                      border: "1px solid #D8E2EE",
                      bgcolor: "#ffffff",
                      p: 2,
                      boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        mb: 1,
                        fontSize: 18,
                        color: "#0F172A",
                      }}
                    >
                      Notes
                    </Typography>
                    <TextField
                      multiline
                      minRows={3}
                      maxRows={6}
                      size="small"
                      fullWidth
                      placeholder="Add / update note"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      sx={premiumInputSx}
                      InputProps={{ sx: { fontSize: 14 } }}
                    />
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 1,
                        mt: 1.5,
                      }}
                    >
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleSaveNote}
                        sx={{
                          ...premiumPillSx(true),
                          borderRadius: "10px",
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleResetNote}
                        sx={{
                          ...premiumPillSx(false),
                          borderRadius: "10px",
                        }}
                      >
                        Reset
                      </Button>
                    </Box>

                    <Box
                      sx={{
                        mt: 2,
                        borderTop: "1px solid #e5e7eb",
                        pt: 1.5,
                        overflowY: "auto",
                        flex: 1,
                        minHeight: 0,
                      }}
                    >
                      {currentNotes.length === 0 ? (
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary", fontSize: 16 }}
                        >
                          No notes yet.
                        </Typography>
                      ) : (
                        currentNotes.map((n) => (
                          <Box
                            key={n.id}
                            sx={{
                              mb: 1.5,
                              p: 1.15,
                              borderRadius: 2,
                              border: "1px solid #D8E2EE",
                              bgcolor: "#F8FBFF",
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontSize: 14, mb: 0.5, color: "#0F172A" }}
                            >
                              {n.text}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary", fontSize: 12 }}
                            >
                              {formatDateTime(n.when)}
                            </Typography>
                          </Box>
                        ))
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.secondary",
                }}
              >
                <Typography variant="body2" sx={{ fontSize: 18 }}>
                  Select a lead from the left to view details.
                </Typography>
              </Box>
            )}
        </Paper>
      </Box>

      {/* Add Lead Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={handleCloseAddDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: 20, fontWeight: 600, color: "#000000" }}>
          Add Global Retention Lead
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" onSubmit={handleAddLead} sx={{ mt: 1 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  value={newLead.name}
                  onChange={onChangeNewLeadField("name")}
                  placeholder="Name"
                  autoFocus
                  InputProps={{ sx: { fontSize: 16 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  value={newLead.number}
                  onChange={onChangeNewLeadField("number")}
                  placeholder="Contact Number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon
                          fontSize="small"
                          sx={{ color: "#000000" }}
                        />
                      </InputAdornment>
                    ),
                    sx: { fontSize: 16 },
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={newLead.age}
                  onChange={onChangeNewLeadField("age")}
                  placeholder="Age"
                  InputProps={{ sx: { fontSize: 16 } }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Condition"
                  value={newLead.lookingFor}
                  onChange={(e) => {
                    const value = Array.isArray(e.target.value)
                      ? e.target.value
                      : normalizeConditions(e.target.value);
                    setNewLead((prev) => ({ ...prev, lookingFor: value }));
                  }}
                  InputProps={{ sx: { fontSize: 16 } }}
                  SelectProps={{
                    multiple: true,
                    displayEmpty: true,
                    renderValue: (selected) => {
                      const values = Array.isArray(selected) ? selected : [];
                      if (values.length === 0) return "Select";
                      return values.join(", ");
                    },
                  }}
                >
                  {CONDITION_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {saveError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {saveError}
              </Alert>
            )}
            {saveSuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {saveSuccess}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleAddLead}
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            disabled={saving}
            sx={{ bgcolor: "#000000", "&:hover": { bgcolor: "#333333" } }}
          >
            {saving ? "Saving..." : "Add Lead"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Log Dialog */}
      <Dialog
        open={logDialogOpen}
        onClose={() => setLogDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: 20, fontWeight: 600, color: "#000000" }}>
          Add Reachout Log
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Reachout Method"
              size="small"
              select
              fullWidth
              value={logMethod}
              onChange={(e) => setLogMethod(e.target.value)}
              InputProps={{ sx: { fontSize: 16 } }}
            >
              <MenuItem value="WhatsApp">WhatsApp</MenuItem>
              <MenuItem value="Call">Call</MenuItem>
              <MenuItem value="Both">Both</MenuItem>
            </TextField>

            <TextField
              label="Disposition"
              size="small"
              select
              fullWidth
              value={logDisposition}
              onChange={(e) => setLogDisposition(e.target.value)}
              InputProps={{ sx: { fontSize: 16 } }}
            >
              <MenuItem value="Connected">Connected</MenuItem>
              <MenuItem value="Not reachable">Not reachable</MenuItem>
              <MenuItem value="Busy">Busy</MenuItem>
              <MenuItem value="No answer">No answer</MenuItem>
              <MenuItem value="Wrong number">Wrong number</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveLog}
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            sx={{ bgcolor: "#000000", "&:hover": { bgcolor: "#333333" } }}
          >
            Save Log
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: 20, fontWeight: 600, color: "#000000" }}>
          Reachout History
        </DialogTitle>
        <DialogContent dividers>
          {currentLogs.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", fontSize: 16 }}
            >
              No reachout logs yet.
            </Typography>
          ) : (
            currentLogs.map((log) => (
              <Box
                key={log.id}
                sx={{
                  mb: 1.5,
                  p: 1,
                  borderRadius: 1,
                  border: "1px solid #e5e7eb",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, mb: 0.5, fontSize: 18 }}
                >
                  {log.method} – {log.disposition}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", fontSize: 14 }}
                >
                  {formatDate(log.when)} •{" "}
                  {new Date(log.when).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GlobalRetentionLeads;
