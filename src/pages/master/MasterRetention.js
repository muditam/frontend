import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Stack,
  Typography,
  Avatar,
  Divider,
  TextField,
  Paper,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Button,
  IconButton,
  Popover,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";

// Helper: get initials from name
const getInitials = (name) =>
  name
    ? name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    : "";

const followupMap = {
  "Follow-up Missed": { color: "#f44336", label: "Missed" },
  Missed: { color: "#f44336", label: "Missed" },
  Today: { color: "#388e3c", label: "Today" },
  Tomorrow: { color: "#1976d2", label: "Tomorrow" },
  Later: { color: "#fbc02d", label: "Later" },
  NotSet: { color: "#bdbdbd", label: "NotSet" },
  "": { color: "#bdbdbd", label: "NotSet" },
  null: { color: "#bdbdbd", label: "NotSet" },
  undefined: { color: "#bdbdbd", label: "NotSet" },
};
function getFollowup(reminder) {
  if (!reminder) return followupMap[""];
  if (reminder === "Follow-up Missed") return followupMap["Missed"];
  return followupMap[reminder] || { color: "#eee", label: reminder };
}

const formatCS = (lead) => {
  if (lead.lastOrderDate) {
    const diff =
      (new Date() - new Date(lead.lastOrderDate)) / (1000 * 60 * 60 * 24);
    return `CS - ${Math.floor(diff)} days`;
  }
  return "CS - N/A";
};

const FOLLOWUP_BUTTONS = [
  { key: "Today", label: "Today" },
  { key: "Tomorrow", label: "Tomorrow" },
  { key: "Missed", label: "Missed" }, // Use Missed key (not "Follow-up Missed")
  { key: "Later", label: "Later" },
  { key: "NotSet", label: "NotSet" },
];

const TOP_FILTERS = [
  { key: "All", label: "All" },
  { key: "Active", label: "Active" },
  { key: "Lost", label: "Lost" },
];

const PAGE_SIZE = 20;
// const API_BASE = "http://localhost:5001";
const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const API_URL = `${API_BASE}/api/leads/retention`;

export default function RetentionTable() {
  // State
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState({});
  const [topCounts, setTopCounts] = useState({});
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [followupFilter, setFollowupFilter] = useState(null);
  const [topFilter, setTopFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [filterType, setFilterType] = useState(null); // "salesAgent" | "healthExpert"
  const [agents, setAgents] = useState([]);
  const [healthExperts, setHealthExperts] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [selectedHealthExperts, setSelectedHealthExperts] = useState([]);


  const listRef = useRef(null);

  // Fetch leads paginated with filters
  const fetchLeads = useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ 
          page: reset ? "1" : page.toString(), 
          limit: PAGE_SIZE.toString(), 
          retentionStatus: topFilter,
        });
        if (search.trim()) params.append("search", search.trim());
        if (followupFilter) params.append("followup", followupFilter);
        if (selectedAgents.length > 0) params.append("agentAssigned", selectedAgents.join(","));
        if (selectedHealthExperts.length > 0) params.append("healthExpertAssigned", selectedHealthExperts.join(","));

        const res = await fetch(`${API_URL}?${params}`);
        const data = await res.json();
        setLeads((prev) => (reset ? data.leads : [...prev, ...data.leads]));
        setCounts(data.counts || {});
        setTopCounts(data.topCounts || {});
        setHasMore(data.leads.length === PAGE_SIZE);
      } catch (err) {
        setHasMore(false);
      }
      setLoading(false);
    },
    [page, topFilter, followupFilter, search, selectedAgents, selectedHealthExperts]
  );


  // On mount & when page changes
  useEffect(() => {
    fetchLeads(page === 1);
    // eslint-disable-next-line
  }, [page]);

  useEffect(() => {
    // Only active employees, and specific roles
    const fetchEmployees = async () => {
      const agentsRes = await fetch("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees?role=Sales%20Agent");
      const agentsData = await agentsRes.json();
      setAgents(agentsData.filter((emp) => emp.status === "active"));

      const healthRes = await fetch("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees?role=Retention%20Agent");
      const healthData = await healthRes.json();
      setHealthExperts(healthData.filter((emp) => emp.status === "active"));
    };
    fetchEmployees();
  }, []);


  // Reset on filter/search
  useEffect(() => {
    setPage(1);
    setLeads([]);
    fetchLeads(true);
    setSelectedIdx(0);
    // eslint-disable-next-line
  }, [followupFilter, topFilter, search, selectedAgents, selectedHealthExperts]);


  // Infinite scroll handler
  const onScroll = (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40 && !loading && hasMore) {
      setPage((p) => p + 1);
    }
  };

  // Render
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Sidebar 25% */}
      <Box
        sx={{
          width: "25%",
          minWidth: 260,
          maxWidth: 390,
          bgcolor: "#fff",
          boxShadow: "2px 0 10px #0001",
          borderRight: "1px solid #eee",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          p: 0,
        }}
      >
        {/* Top Filter Buttons */}
        <Stack direction="row" spacing={1} sx={{ p: 2, pt: 2.2, pb: 0 }}>
          {TOP_FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={topFilter === f.key ? "contained" : "outlined"}
              color="inherit"
              onClick={() => setTopFilter(f.key)}
              sx={{
                px: 2.1,
                pt: 1,
                pb: 0.4,
                minWidth: 0,
                fontSize: 11,
                fontWeight: 500,
                borderRadius: 2.5,
                borderColor: "#ccc",
                boxShadow: topFilter === f.key ? 1 : 0,
                bgcolor: topFilter === f.key ? "#222" : "#fff",
                color: topFilter === f.key ? "#fff" : "#222",
                position: "relative",
                flexDirection: "column",
                transition: "all 0.15s",
                "&:hover": { bgcolor: topFilter === f.key ? "#222" : "#f3f3f3" },
                textTransform: "none",
                lineHeight: 1,
                height: 38,
                mb: 0.4,
              }}
            >
              {f.label}
              <Typography
                sx={{
                  fontWeight: 500,
                  fontSize: 12,
                  color: topFilter === f.key ? "#eee" : "#999",
                  mt: 0.2,
                  lineHeight: 1,
                }}
              >
                {topCounts[f.key] || 0}
              </Typography>
            </Button>
          ))}
        </Stack>
        {/* Followup Buttons Row */}
        <Stack direction="row" spacing={1} sx={{ px: 2, pb: 0.2, pt: 1 }}>
          {FOLLOWUP_BUTTONS.map((f) => {
            const selected = followupFilter === f.key;
            const pill = getFollowup(f.key);
            return (
              <Button
                key={f.key}
                variant={selected ? "contained" : "outlined"}
                color="inherit"
                onClick={() => setFollowupFilter(selected ? null : f.key)}
                sx={{
                  px: 2.1,
                  pt: 1,
                  pb: 0.4,
                  minWidth: 0,
                  fontSize: 11,
                  fontWeight: 500,
                  borderRadius: 2.5,
                  borderColor: "#ccc",
                  boxShadow: selected ? 1 : 0,
                  bgcolor: selected ? pill.color || "#222" : "#fff",
                  color: selected ? "#fff" : "#222",
                  position: "relative",
                  flexDirection: "column",
                  transition: "all 0.15s",
                  "&:hover": {
                    bgcolor: selected ? pill.color || "#222" : "#f3f3f3",
                  },
                  textTransform: "none",
                  lineHeight: 1,
                  height: 38,
                  mb: 0.4,
                }}
              >
                {f.label}
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 12,
                    color: selected
                      ? pill.color === "#fbc02d" || pill.color === "#bdbdbd"
                        ? "#222"
                        : "#fff"
                      : "#888",
                    mt: 0.2,
                    lineHeight: 1.1,
                  }}
                >
                  {counts[f.label] || counts[f.key] || 0}
                </Typography>
              </Button>
            );
          })}
        </Stack>

        <Box sx={{ px: 2, pt: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              placeholder="Search leads..."
              size="small"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                sx: { borderRadius: 2, fontSize: 14 },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "#888" }} />
                  </InputAdornment>
                ),
              }}
            />
            <IconButton
              size="small"
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            >
              <FilterListIcon sx={{ color: "#888" }} />
            </IconButton>

            {/* <IconButton size="small">
              <SortIcon sx={{ color: "#888" }} />
            </IconButton> */}
          </Box>
          <Popover
            open={Boolean(filterAnchorEl)}
            anchorEl={filterAnchorEl}
            onClose={() => { setFilterAnchorEl(null); setFilterType(null); }}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            {!filterType ? (
              <Stack sx={{ p: 1, minWidth: 180 }}>
                <Button
                  onClick={() => setFilterType("salesAgent")}
                  sx={{ justifyContent: "flex-start", textTransform: "none", mb: 1 }}
                >
                  Sales Agent
                </Button>
                <Button
                  onClick={() => setFilterType("healthExpert")}
                  sx={{ justifyContent: "flex-start", textTransform: "none" }}
                >
                  Health Expert
                </Button>
              </Stack>
            ) : (
              <Stack sx={{ p: 2, minWidth: 220 }}>
                <Typography sx={{ mb: 1.5, fontWeight: 600 }}>
                  {filterType === "salesAgent" ? "Select Sales Agents" : "Select Health Experts"}
                </Typography>
                <Stack direction="column" spacing={1} sx={{ maxHeight: 280, overflowY: "auto" }}>
                  {(filterType === "salesAgent" ? agents : healthExperts).map((emp) => (
                    <FormControlLabel
                      key={emp._id}
                      control={
                        <Checkbox
                          size="small"
                          checked={
                            filterType === "salesAgent"
                              ? selectedAgents.includes(emp.fullName)
                              : selectedHealthExperts.includes(emp.fullName)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const setSelected = filterType === "salesAgent" ? setSelectedAgents : setSelectedHealthExperts;
                            const selected = filterType === "salesAgent" ? selectedAgents : selectedHealthExperts;
                            setSelected(
                              checked
                                ? [...selected, emp.fullName]
                                : selected.filter((name) => name !== emp.fullName)
                            );
                          }}
                        />
                      }
                      label={emp.fullName}
                    />
                  ))}
                </Stack>
              </Stack>
            )}
          </Popover>

        </Box>
        <Divider sx={{ mt: 2 }} />

        {/* Leads List (infinite scroll) */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 0.5,
            pt: 1,
            position: "relative",
          }}
          ref={listRef}
          onScroll={onScroll}
        >
          <Stack spacing={0.8}>
            {leads.length === 0 && !loading && (
              <Typography align="center" sx={{ mt: 6, color: "#aaa" }}>
                No leads found
              </Typography>
            )}
            {leads.map((lead, idx) => {
              const isActive = idx === selectedIdx;
              const followup = getFollowup(lead.calculatedReminder);
              return (
                <Paper
                  key={lead._id || idx}
                  elevation={isActive ? 4 : 0}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                    mb: 0.2,
                    border: isActive
                      ? "2.5px solid #1976d2"
                      : "1px solid #e0e0e0",
                    bgcolor: isActive ? "#e9f4ff" : "#fff",
                    cursor: "pointer",
                    position: "relative",
                  }}
                  onClick={() => setSelectedIdx(idx)}
                >
                  <Avatar
                    sx={{
                      bgcolor: "#222",
                      width: 40,
                      height: 40,
                      fontWeight: 600,
                      fontSize: 18,
                      mr: 1,
                    }}
                  >
                    {getInitials(lead.name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: 15.5,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: "#111",
                      }}
                    >
                      {lead.name || "No Name"}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#666",
                        fontWeight: 400,
                        mt: 0.1,
                      }}
                    >
                      {formatCS(lead)}
                    </Typography>
                  </Box>
                  {/* Percentage circle at absolute right top */}
                  <Tooltip title="Profile Completion">
                    <Box
                      sx={{
                        position: "absolute",
                        top: -2,
                        right: 2,
                        width: 22,
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2,
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#1976d2",
                        }}
                      >
                        {typeof lead.profilePercent === "number"
                          ? `${lead.profilePercent}%`
                          : "0%"}
                      </Typography>
                    </Box>
                  </Tooltip>
                  <Box
                    sx={{
                      minWidth: 72,
                      display: "flex",
                      justifyContent: "flex-end",
                      ml: 1,
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: followup.color,
                        color:
                          followup.color === "#fbc02d" ||
                            followup.color === "#bdbdbd"
                            ? "#111"
                            : "#fff",
                        borderRadius: 1,
                        px: 1.2,
                        fontSize: 13,
                        fontWeight: 500,
                        height: 26,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {followup.label}
                    </Box>
                  </Box>
                </Paper>
              );
            })}
            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Main content 75% */}
      <Box sx={{ flex: 1, p: 3, minWidth: 0, bgcolor: "#f8fafc" }}>
        {leads[selectedIdx] ? (
          <Paper
            sx={{
              borderRadius: 3,
              boxShadow: "0 3px 16px #0002",
              p: 3,
              minHeight: 340,
              bgcolor: "#fff",
              width: "100%",
              mb: 2,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2} mb={2}>
              <Avatar
                sx={{
                  bgcolor: "#222",
                  width: 60,
                  height: 60,
                  fontWeight: 600,
                  fontSize: 28,
                  mr: 2,
                }}
              >
                {getInitials(leads[selectedIdx].name)}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {leads[selectedIdx].name}
                </Typography>
                <Typography sx={{ color: "#666", fontSize: 16 }}>
                  {leads[selectedIdx].contactNumber}
                </Typography>
                <Stack direction="row" spacing={2} mt={1}>
                  <Box
                    sx={{
                      bgcolor:
                        leads[selectedIdx].retentionStatus === "Lost"
                          ? "#f44336"
                          : "#388e3c",
                      color: "#fff",
                      borderRadius: 1.5,
                      px: 1.7,
                      fontWeight: 600,
                      fontSize: 14,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {leads[selectedIdx].retentionStatus || "Active"}
                  </Box>
                  <Box
                    sx={{
                      bgcolor: "#1976d2",
                      color: "#fff",
                      borderRadius: 1.5,
                      px: 1.7,
                      fontWeight: 500,
                      fontSize: 14,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {leads[selectedIdx].agentAssigned || "Unassigned"}
                  </Box>
                </Stack>
              </Box>
            </Stack>
            {/* Summary Custom Sections */}
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {/* --- BASIC INFO SECTION --- */}
              <Box>
                <Typography sx={{ color: "#777", fontWeight: 600 }}>Lead Information</Typography>
                <Stack direction="row" spacing={4} mt={1} flexWrap="wrap">
                  <Box><b>Lead Source:</b> {leads[selectedIdx]?.leadSource || "--"}</Box>
                  <Box><b>Enquiry For:</b> {leads[selectedIdx]?.enquiryFor || "--"}</Box>
                  <Box><b>Customer Type:</b> {leads[selectedIdx]?.customerType || "--"}</Box>
                  <Box><b>Order ID:</b> {leads[selectedIdx]?.orderId || "--"}</Box>
                  <Box><b>Agent Assigned:</b> {leads[selectedIdx]?.agentAssigned || "--"}</Box>
                  <Box><b>Sales Status:</b> {leads[selectedIdx]?.salesStatus || "--"}</Box>
                  <Box><b>Lead Status:</b> {leads[selectedIdx]?.leadStatus || "--"}</Box> 
                </Stack>
              </Box>

              {/* --- PRODUCT & PAYMENT SECTION --- */}
              <Box>
                <Typography sx={{ color: "#777", fontWeight: 600 }}>Product & Payment</Typography>
                <Stack direction="row" spacing={4} mt={1} flexWrap="wrap">
                  <Box>
                    <b>Products Ordered:</b> {(leads[selectedIdx]?.productsOrdered || []).join(", ") || "--"}
                  </Box>
                  <Box><b>Dosage Ordered:</b> {leads[selectedIdx]?.dosageOrdered || "--"}</Box>
                  <Box>
                    <b>Amount Paid:</b>{" "}
                    {typeof leads[selectedIdx]?.amountPaid === "number"
                      ? `₹${leads[selectedIdx].amountPaid}` : "--"}
                  </Box>
                  <Box><b>Mode of Payment:</b> {leads[selectedIdx]?.modeOfPayment || "--"}</Box>
                  <Box><b>Delivery Status:</b> {leads[selectedIdx]?.deliveryStatus || "--"}</Box>
                </Stack>
              </Box>

              {/* --- FOLLOW UP & RETENTION SECTION --- */}
              <Box>
                <Typography sx={{ color: "#777", fontWeight: 600 }}>Follow Up & Retention</Typography>
                <Stack direction="row" spacing={4} mt={1} flexWrap="wrap">
                  <Box>
                    <b>Next Followup Date:</b> {leads[selectedIdx]?.rtNextFollowupDate || "--"}
                  </Box>
                  <Box>
                    <b>Followup Reminder:</b> {leads[selectedIdx]?.calculatedReminder || "--"}
                  </Box>
                  <Box>
                    <b>Followup Status:</b> {leads[selectedIdx]?.rtFollowupStatus || "--"}
                  </Box>
                  <Box>
                    <b>Remark:</b> {leads[selectedIdx]?.agentsRemarks || "--"}
                  </Box>
                  <Box>
                    <b>Retention Status:</b> {leads[selectedIdx]?.retentionStatus || "--"}
                  </Box>
                  <Box>
                    <b>Last Order Date:</b> {leads[selectedIdx]?.lastOrderDate || "--"}
                  </Box>
                  <Box>
                    <b>Communication Method:</b> {leads[selectedIdx]?.communicationMethod || "--"}
                  </Box>
                  <Box>
                    <b>Preferred Language:</b> {leads[selectedIdx]?.preferredLanguage || "--"}
                  </Box>
                </Stack>
              </Box>

              {/* --- HEALTH & DOSAGE SECTION --- */}
              <Box>
                <Typography sx={{ color: "#777", fontWeight: 600 }}>Health & Dosage</Typography>
                <Stack direction="row" spacing={4} mt={1} flexWrap="wrap">
                  <Box>
                    <b>Health Expert Assigned:</b> {leads[selectedIdx]?.healthExpertAssigned || "--"}
                  </Box>
                  <Box>
                    <b>Dosage Expiring:</b> {leads[selectedIdx]?.dosageExpiring || "--"}
                  </Box>
                  <Box>
                    <b>Repeat Dosage Ordered:</b> {leads[selectedIdx]?.repeatDosageOrdered || "--"}
                  </Box>
                  <Box>
                    <b>RT Remark:</b> {leads[selectedIdx]?.rtRemark || "--"}
                  </Box>
                </Stack>
              </Box>

              {/* --- DETAILS (NESTED) SECTION --- */}
              {leads[selectedIdx]?.details && (
                <Box>
                  <Typography sx={{ color: "#777", fontWeight: 600 }}>Patient Details</Typography>
                  <Stack direction="row" spacing={4} mt={1} flexWrap="wrap">
                    {Object.entries(leads[selectedIdx].details).map(([key, value]) => (
                      <Box key={key}>
                        <b>{key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}:</b>{" "}
                        {Array.isArray(value) ? value.join(", ") : (value || "--")}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* --- FOLLOW UPS (NESTED ARRAY) --- */}
              {Array.isArray(leads[selectedIdx]?.followUps) && leads[selectedIdx].followUps.length > 0 && (
                <Box>
                  <Typography sx={{ color: "#777", fontWeight: 600 }}>Follow Ups</Typography>
                  <Stack direction="column" spacing={1} mt={1}>
                    {leads[selectedIdx].followUps.map((fu, i) => (
                      <Box key={i} sx={{ border: "1px solid #eee", p: 1, borderRadius: 1 }}>
                        {Object.entries(fu).map(([k, v]) => (
                          <Box key={k}>
                            <b>{k.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}:</b>{" "}
                            {typeof v === "object" && v !== null ? JSON.stringify(v) : (v || "--")}
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* --- IMAGES (NESTED ARRAY) --- */}
              {Array.isArray(leads[selectedIdx]?.images) && leads[selectedIdx].images.length > 0 && (
                <Box>
                  <Typography sx={{ color: "#777", fontWeight: 600 }}>Images</Typography>
                  <Stack direction="column" spacing={1} mt={1}>
                    {leads[selectedIdx].images.map((img, i) => (
                      <Box key={i} sx={{ border: "1px solid #eee", p: 1, borderRadius: 1 }}>
                        <b>URL:</b> {img.url} <br />
                        <b>Date:</b> {img.date ? new Date(img.date).toLocaleString() : "--"} <br />
                        <b>Tag:</b> {img.tag || "--"}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* --- RT SUBCELLS (NESTED ARRAY) --- */}
              {Array.isArray(leads[selectedIdx]?.rtSubcells) && leads[selectedIdx].rtSubcells.length > 0 && (
                <Box>
                  <Typography sx={{ color: "#777", fontWeight: 600 }}>RT Subcells</Typography>
                  <Stack direction="row" spacing={4} mt={1} flexWrap="wrap">
                    {leads[selectedIdx].rtSubcells.map((rt, i) => (
                      <Box key={i}>
                        <b>Date:</b> {rt.date || "--"} <b>Value:</b> {rt.value || "--"}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* --- REACHOUT LOGS (NESTED ARRAY) --- */}
              {Array.isArray(leads[selectedIdx]?.reachoutLogs) && leads[selectedIdx].reachoutLogs.length > 0 && (
                <Box>
                  <Typography sx={{ color: "#777", fontWeight: 600 }}>Reachout Logs</Typography>
                  <Stack direction="column" spacing={1} mt={1}>
                    {leads[selectedIdx].reachoutLogs.map((log, i) => (
                      <Box key={i} sx={{ border: "1px solid #eee", p: 1, borderRadius: 1 }}>
                        <b>Timestamp:</b> {log.timestamp ? new Date(log.timestamp).toLocaleString() : "--"} <br />
                        <b>Method:</b> {log.method || "--"} <br />
                        <b>Status:</b> {log.status || "--"}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>
        ) : (
          <Paper sx={{ p: 4, textAlign: "center", color: "#aaa" }}>
            No Lead Selected
          </Paper>
        )}
      </Box>
    </Box>
  );
}
