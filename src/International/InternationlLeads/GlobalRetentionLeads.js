import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
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
} from "@mui/material";
import axios from "axios";
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
    lookingFor: "",
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
  const [conditionLocal, setConditionLocal] = useState("");

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

    const cond =
      selectedLead.condition ||
      selectedLead.enquiryFor ||
      selectedLead.lookingFor ||
      "";
    setConditionLocal(cond);
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
        lookingFor: newLead.lookingFor.trim(),
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
        lookingFor: "",
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

    const lastOrderText = lead.lastOrderDays
      ? `Last Order • ${lead.lastOrderDays} days`
      : "";

    const lastReachedText = lead.lastReachedDays
      ? `Last Reached • ${lead.lastReachedDays} days`
      : "";

    const statusLabel = computeFollowupLabel(lead);
    const isSelected = selectedLead && selectedLead._id === lead._id;

    return (
      <ListItem
        key={lead._id || lead.id || index}
        button
        selected={isSelected}
        onClick={() => setSelectedLead(lead)}
        sx={{
          mb: 1,
          borderRadius: 2,
          bgcolor: isSelected ? "#e3f2fd" : "#fff",
          border: "1px solid #eee",
          boxShadow: isSelected ? "0 0 0 1px #000000" : "none",
          "&.Mui-selected": {
            backgroundColor: "#e3f2fd",
          },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            width: 32,
            textAlign: "center",
            fontWeight: 600,
            fontSize: 14,
            mr: 1,
          }}
        >
          {index + 1}
        </Typography>

        <ListItemAvatar>
          <Avatar sx={{ bgcolor: "#000000", color: "#fff", fontSize: 17 }}>
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
              <Typography sx={{ fontWeight: 600, fontSize: 18 }}>
                {lead.name || lead.fullName}
              </Typography>
              <Chip
                label={statusLabel}
                size="small"
                color={statusChipColor(statusLabel)}
                sx={{ fontSize: 15 }}
              />
            </Box>
          }
          secondary={
            <Box sx={{ mt: 0.5 }}>
              {lastOrderText && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    color: "text.secondary",
                    fontSize: 14,
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
                    color: "text.secondary",
                    fontSize: 14,
                  }}
                >
                  {lastReachedText}
                </Typography>
              )}
            </Box>
          }
        />
      </ListItem>
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

  // 🔹 derive activeConditions for GlobalRetentionDetails
  const activeConditions = conditionLocal
    ? [conditionLocal]
    : detail.condition
    ? [detail.condition]
    : detail.lookingFor
    ? [detail.lookingFor]
    : [];

  return (
    <Box sx={{ p: 2, height: "calc(100vh - 80px)", bgcolor: "#f3f4f6" }}>
      <Grid
        container
        spacing={2}
        sx={{ height: "100%" }}
        columns={{ xs: 1, md: 100 }}
      >
        {/* LEFT PANEL */}
        <Grid item xs={1} md={21} sx={{ height: "100%" }}>
          <Paper
            elevation={2}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              p: 1.5,
              borderRadius: 3,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mb: 1,
              }}
            >
              <IconButton
                size="small"
                onClick={handleOpenAddDialog}
                sx={{
                  border: "1px solid #000000",
                  bgcolor: "#fff",
                  color: "#000000",
                  "&:hover": { bgcolor: "#f2f2f2" },
                }}
              >
                <PersonAddIcon fontSize="small" />
              </IconButton>

              <Tabs
                value={tab}
                onChange={handleTabChange}
                variant="fullWidth"
                scrollButtons={false}
                sx={{
                  flex: 1,
                  minHeight: 36,
                  "& .MuiTab-root": {
                    fontSize: 16,
                    textTransform: "none",
                    minHeight: 36,
                    color: "#000000",
                  },
                }}
                TabIndicatorProps={{
                  style: {
                    height: 3,
                    borderRadius: 999,
                    background: "#000000",
                  },
                }}
              >
                <Tab label="All" value="all" />
                <Tab label="Active" value="active" />
                <Tab label="Lost" value="lost" />
              </Tabs>
            </Box>

            <Box
              sx={{
                mt: 0.5,
                display: "flex",
                flexWrap: "wrap",
                gap: 0.5,
              }}
            >
              {[
                { key: "today", label: "Today" },
                { key: "tomorrow", label: "Tomorrow" },
                { key: "later", label: "Later" },
                { key: "missed", label: "Missed" },
                { key: "notset", label: "Not Set" },
              ].map((item) => (
                <Chip
                  key={item.key}
                  label={item.label}
                  size="small"
                  variant={
                    followupFilter === item.key ? "filled" : "outlined"
                  }
                  color={followupFilter === item.key ? "primary" : "default"}
                  sx={{
                    fontSize: 15,
                    "&.MuiChip-filledPrimary": {
                      backgroundColor: "#000000",
                    },
                  }}
                  onClick={() => handleFollowupChipClick(item.key)}
                />
              ))}
            </Box>

            <Box sx={{ mt: 1.5 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search leads..."
                value={search}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: "#000000" }} />
                    </InputAdornment>
                  ),
                  sx: { fontSize: 16 },
                }}
              />
            </Box>

            <Box
              sx={{
                mt: 1.5,
                flex: 1,
                overflowY: "auto",
                pr: 0.5,
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
                    fontSize: 16,
                  }}
                >
                  No leads found.
                </Typography>
              ) : (
                <List dense>
                  {leads.map((lead, idx) => renderLeadItem(lead, idx))}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* RIGHT PANEL */}
        <Grid item xs={1} md={79} sx={{ height: "100%" }}>
          <Paper
            elevation={2}
            sx={{
              height: "100%",
              p: 2,
              display: "flex",
              flexDirection: "column",
              borderRadius: 3,
            }}
          >
            {selectedLead ? (
              <Box
                sx={{
                  mt: 1,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {/* LEFT MAIN BOX */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      borderRadius: 2,
                      border: "1px solid #e5e7eb",
                      p: 2,
                      bgcolor: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    {/* HEADER ROW */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: "#000000",
                          color: "#ffffff",
                          fontSize: 20,
                        }}
                      >
                        {(detail.name || detail.fullName || "U")
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)}
                      </Avatar>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: 20,
                            color: "#000000",
                          }}
                        >
                          {detail.name || detail.fullName}
                        </Typography>

                        {contactNumber && (
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                              fontSize: 16,
                            }}
                          >
                            {contactNumber}
                          </Typography>
                        )}

                        {contactNumber && (
                          <IconButton
                            size="small"
                            onClick={handleCopyNumber}
                            sx={{ color: "#000000" }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 20 }} />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={handleOpenLogDialog}
                          sx={{ color: "#000000" }}
                        >
                          <PlaylistAddIcon sx={{ fontSize: 24 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setHistoryDialogOpen(true)}
                          sx={{ color: "#000000" }}
                        >
                          <HistoryIcon sx={{ fontSize: 24 }} />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* FIELDS BELOW HEADER */}
                    <Grid container spacing={2}>
                      {/* 🔹 Next Follow-up - SAVE ON CHANGE */}
                      <Grid item xs={12} md={2}>
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
                          InputLabelProps={{ shrink: true }}
                          InputProps={{
                            sx: { fontSize: 16 },
                            inputProps: {
                              min: minFollowupDate || undefined,
                              max: maxFollowupDate || undefined,
                            },
                          }}
                        />
                      </Grid>

                      {/* 🔹 Retention Status - SAVE ON CHANGE */}
                      <Grid item xs={12} md={2}>
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
                          InputProps={{ sx: { fontSize: 16 } }}
                        >
                          <MenuItem value="">Select</MenuItem>
                          <MenuItem value="Active">Active</MenuItem>
                          <MenuItem value="Lost">Lost</MenuItem>
                        </TextField>
                      </Grid>

                      {/* 🔹 Followup Status - SAVE ON CHANGE */}
                      <Grid item xs={12} md={2}>
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
                          InputProps={{ sx: { fontSize: 16 } }}
                        >
                          <MenuItem value="">Select</MenuItem>
                          <MenuItem value="Good result">
                            Good result
                          </MenuItem>
                          <MenuItem value="No result">No result</MenuItem>
                          <MenuItem value="Call back requested">
                            Call back requested
                          </MenuItem>
                          <MenuItem value="Could not connect">
                            Could not connect
                          </MenuItem>
                          <MenuItem value="Not interested">
                            Not interested
                          </MenuItem>
                        </TextField>
                      </Grid>

                      {/* 🔹 Pref Method - SAVE ON CHANGE */}
                      <Grid item xs={12} md={2}>
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
                          InputProps={{ sx: { fontSize: 16 } }}
                        >
                          <MenuItem value="">Select</MenuItem>
                          <MenuItem value="Call">Call</MenuItem>
                          <MenuItem value="WhatsApp">WhatsApp</MenuItem>
                          <MenuItem value="Both">Both</MenuItem>
                        </TextField>
                      </Grid>

                      {/* 🔹 Condition - SAVE ON CHANGE */}
                      <Grid item xs={12} md={2}>
                        <TextField
                          label="Condition"
                          size="small"
                          fullWidth
                          select
                          value={conditionLocal}
                          onChange={(e) => {
                            const v = e.target.value;
                            setConditionLocal(v);
                            handleAutoSaveField("condition", v);
                          }}
                          InputProps={{ sx: { fontSize: 16 } }}
                        >
                          <MenuItem value="">Select</MenuItem>
                          {CONDITION_OPTIONS.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                              {opt}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* 🔹 Global Retention Details form */}
                  <GlobalRetentionDetails
                    leadId={detail._id}
                    contactNumber={contactNumber}
                    activeConditions={activeConditions}
                  />
                </Box>

                {/* RIGHT NOTES BOX */}
                <Box
                  sx={{
                    width: { xs: "100%", md: 340 },
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      borderRadius: 2,
                      border: "1px solid #e5e7eb",
                      bgcolor: "#ffffff",
                      p: 2,
                      boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        fontSize: 18,
                        color: "#000000",
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
                      InputProps={{ sx: { fontSize: 16 } }}
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
                          bgcolor: "#000000",
                          "&:hover": { bgcolor: "#333333" },
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleResetNote}
                        sx={{ borderColor: "#000000", color: "#000000" }}
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
                              p: 1,
                              borderRadius: 1,
                              bgcolor: "#f9fafb",
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontSize: 17, mb: 0.5 }}
                            >
                              {n.text}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary", fontSize: 14 }}
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
        </Grid>
      </Grid>

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
                  onChange={onChangeNewLeadField("lookingFor")}
                  InputProps={{ sx: { fontSize: 16 } }}
                >
                  <MenuItem value="">Select</MenuItem>
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
