// pages/ReportPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Stack,
  Grid,
  Popover,
  Button,
  TextField,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Description as ScriptIcon,
  Videocam as ShootIcon,
  ContentCut as CutIcon,
  Edit as EditIcon,
  Send as PostIcon,
  DateRange as DateRangeIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as PendingIcon,
  Block as BlockIcon,
  Person as PersonIcon,
  Create as WriteIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

const API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/marketing-dashboard";

const getAuthHeaders = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  return { "x-session-user": JSON.stringify(user) };
};

const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "lastMonth", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

const AVATAR_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2", "#e11d48", "#0d9488"];

const BRAND = {
  bg: "#f4f7fb",
  panel: "#ffffff",
  panelAlt: "#fbfdff",
  border: "#e5edf5",
  borderSoft: "#eef3f8",
  text: "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  heading: "#0b1220",
  shadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  shadowHover: "0 14px 36px rgba(15, 23, 42, 0.10)",
  blue: "#2563eb",
  blueBg: "#eff6ff",
  green: "#059669",
  greenBg: "#dcfce7",
  amber: "#d97706",
  amberBg: "#fef3c7",
  orange: "#f97316",
  orangeBg: "#fff7ed",
  purple: "#7c3aed",
  purpleBg: "#f3e8ff",
  cyan: "#0891b2",
  cyanBg: "#e0f2fe",
  red: "#dc2626",
  redBg: "#fee2e2",
  slateBg: "#f8fafc",
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const stageColor = (stage = "") =>
  ({
    Script: "#2563eb",
    "Shoot Pending": "#f59e0b",
    "Shoot Done": "#059669",
    "Cut Pending": "#f97316",
    "Cut Done": "#d97706",
    "Edit Pending": "#7c3aed",
    "Edit Done": "#0891b2",
    Post: "#059669",
    "Post Pending": "#dc2626",
  }[stage] || "#64748b");

const getStatusChipStyles = (status = "") => {
  const map = {
    Approved: { color: BRAND.green, bg: "#dcfce7" },
    Rewrite: { color: BRAND.amber, bg: "#fef3c7" },
    Rejected: { color: BRAND.red, bg: "#fee2e2" },
    "On Hold": { color: "#475569", bg: "#e2e8f0" },
    Pending: { color: BRAND.blue, bg: "#dbeafe" },
    Reshoot: { color: BRAND.red, bg: "#fee2e2" },
    "Re-edit": { color: BRAND.amber, bg: "#fef3c7" },
    Posted: { color: BRAND.green, bg: "#dcfce7" },
    "Used in Ads": { color: BRAND.amber, bg: "#fef3c7" },
    "Not Published": { color: BRAND.red, bg: "#fee2e2" },
  };
  return map[status] || { color: "#64748b", bg: "#f1f5f9" };
};

const panelSx = {
  bgcolor: BRAND.panel,
  border: `1px solid ${BRAND.border}`,
  borderRadius: 4,
  boxShadow: BRAND.shadow,
};

const tableHeadCellSx = {
  bgcolor: "#f8fbff",
  fontWeight: 800,
  fontSize: "0.69rem",
  color: BRAND.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  borderBottom: `2px solid ${BRAND.border}`,
  whiteSpace: "nowrap",
  py: 1.35,
};

function softChipSx(bg, color) {
  return {
    height: 22,
    fontSize: "0.7rem",
    fontWeight: 700,
    bgcolor: bg,
    color,
    borderRadius: "999px",
  };
}

// ─────────────────────────────────────────────────────────────
// StatTile
// ─────────────────────────────────────────────────────────────
function StatTile({ label, value, Icon, color, bg }) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        p: 2.4,
        height: "100%",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: BRAND.shadowHover,
          transform: "translateY(-2px)",
        },
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "0 0 auto 0",
          height: 4,
          bgcolor: color,
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
        <Box>
          <Typography
            sx={{
              fontSize: "0.72rem",
              color: BRAND.textLight,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              lineHeight: 1.2,
              mb: 0.8,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "1.8rem", md: "2rem" },
              fontWeight: 900,
              color: BRAND.heading,
              lineHeight: 1,
            }}
          >
            {value ?? 0}
          </Typography>
        </Box>

        {Icon && (
          <Box
            sx={{
              width: 50,
              height: 50,
              borderRadius: 3,
              bgcolor: bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${color}20`,
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 24, color }} />
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

// ─────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, iconColor, iconBg, title, subtitle, chip }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.4} mb={2.2}>
      {Icon && (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2.2,
            bgcolor: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${iconColor}22`,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 18, color: iconColor }} />
        </Box>
      )}

      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: BRAND.heading }}>
            {title}
          </Typography>
          {chip}
        </Stack>
        {subtitle && (
          <Typography sx={{ fontSize: "0.76rem", color: BRAND.textLight, mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────
// BOARD_CONFIG
// ─────────────────────────────────────────────────────────────
const BOARD_CONFIG = {
  scripts: {
    field: "createdBy",
    label: "Scripts Created",
    color: BRAND.blue,
    dateCol: { header: "Created Date", key: "createdAt" },
    extraCols: [
      { header: "Script Status", render: (s) => s.scriptStatus || "—" },
      { header: "Approved By", render: (s) => s.approvedBy || "—" },
      { header: "Approved At", render: (s) => fmt(s.approvedAt) },
    ],
  },
  shoots: {
    field: "shootDoneBy",
    label: "Shoot Completions",
    color: BRAND.green,
    dateCol: { header: "Shoot Done", key: "shootDoneAt" },
    extraCols: [{ header: "Created Date", render: (s) => fmt(s.createdAt) }],
  },
  cuts: {
    field: "cutDoneBy",
    label: "Cut Completions",
    color: BRAND.amber,
    dateCol: { header: "Cut Done", key: "cutDoneAt" },
    extraCols: [
      { header: "Shoot Done", render: (s) => fmt(s.shootDoneAt) },
      { header: "Created Date", render: (s) => fmt(s.createdAt) },
    ],
  },
  uploads: {
    field: "cutUploadedBy",
    label: "Cut File Uploads",
    color: BRAND.cyan,
    dateCol: { header: "Upload Date", key: "cutDoneAt" },
    extraCols: [{ header: "Created Date", render: (s) => fmt(s.createdAt) }],
  },
  edits: {
    field: "editDoneBy",
    label: "Edit Completions",
    color: BRAND.purple,
    dateCol: { header: "Edit Done", key: "editDoneAt" },
    extraCols: [
      { header: "Cut Done", render: (s) => fmt(s.cutDoneAt) },
      { header: "Created Date", render: (s) => fmt(s.createdAt) },
    ],
  },
  posts: {
    field: "postedBy",
    label: "Posts Published",
    color: BRAND.green,
    dateCol: { header: "Posted Date", key: "postedAt" },
    extraCols: [
      { header: "Publish Status", render: (s) => s.postPublishStatus || "—" },
      { header: "Created Date", render: (s) => fmt(s.createdAt) },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// Employee Script Detail Dialog
// ─────────────────────────────────────────────────────────────
function EmployeeScriptsDialog({ open, onClose, employeeName, boardType, dateParams }) {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const cfg = BOARD_CONFIG[boardType] || BOARD_CONFIG.scripts;

  useEffect(() => {
    if (!open || !employeeName) return;
    setLoading(true);
    axios
      .get(`${API}/scripts-by-person`, {
        params: { name: employeeName, field: cfg.field, ...dateParams },
        headers: getAuthHeaders(),
        withCredentials: true,
      })
      .then(({ data }) => setScripts(data.scripts || []))
      .catch(() => setScripts([]))
      .finally(() => setLoading(false));
  }, [open, employeeName, boardType, dateParams, cfg.field]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${BRAND.border}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1.2,
          flexShrink: 0,
        }}
      >
        <Box>
          <Stack direction="row" alignItems="center" gap={1}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: cfg.color }} />
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: BRAND.heading }}>
              {cfg.label} — <span style={{ color: cfg.color }}>{employeeName}</span>
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: "0.75rem", color: BRAND.textLight, mt: 0.4, pl: 2.3 }}>
            {loading ? "Loading…" : `${scripts.length} script${scripts.length !== 1 ? "s" : ""} found`}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0, overflow: "auto", flex: 1 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={7}>
            <CircularProgress size={30} sx={{ color: cfg.color }} />
          </Box>
        ) : scripts.length === 0 ? (
          <Typography sx={{ textAlign: "center", py: 7, color: BRAND.textLight }}>
            No scripts found
          </Typography>
        ) : (
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>#</TableCell>
                <TableCell sx={tableHeadCellSx}>Script ID</TableCell>
                <TableCell sx={tableHeadCellSx}>Type</TableCell>
                <TableCell sx={tableHeadCellSx}>Stage</TableCell>
                <TableCell sx={tableHeadCellSx}>{cfg.dateCol.header}</TableCell>
                {cfg.extraCols.map((c, i) => (
                  <TableCell key={i} sx={tableHeadCellSx}>
                    {c.header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {scripts.map((s, i) => (
                <TableRow
                  key={s._id || i}
                  hover
                  sx={{
                    "& td": {
                      fontSize: "0.82rem",
                      borderBottom: `1px solid ${BRAND.borderSoft}`,
                      py: 1.25,
                    },
                    "&:hover": { bgcolor: "#fbfdff" },
                  }}
                >
                  <TableCell sx={{ color: BRAND.textLight, fontWeight: 700 }}>{i + 1}</TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        color: cfg.color,
                        fontSize: "0.82rem",
                        fontFamily: "monospace",
                      }}
                    >
                      {s.scriptId || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={s.scriptType || "—"} size="small" sx={softChipSx("#f1f5f9", "#475569")} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={s.stage || "—"}
                      size="small"
                      sx={{
                        ...softChipSx(stageColor(s.stage), "#fff"),
                        px: 0.4,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: "#475569", whiteSpace: "nowrap" }}>{fmt(s[cfg.dateCol.key])}</TableCell>
                  {cfg.extraCols.map((c, ci) => (
                    <TableCell key={ci} sx={{ color: "#475569", whiteSpace: "nowrap" }}>
                      {c.render(s)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: `1px solid ${BRAND.border}`, flexShrink: 0 }}>
        <Typography sx={{ fontSize: "0.75rem", color: BRAND.textLight, flex: 1 }}>
          Showing {scripts.length} records
        </Typography>
        <Button
          onClick={onClose}
          variant="outlined"
          size="small"
          sx={{
            textTransform: "none",
            color: BRAND.textMuted,
            borderColor: BRAND.border,
            fontWeight: 700,
            borderRadius: 2,
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Expanded Team Summary Dialog
// ─────────────────────────────────────────────────────────────
function ExpandedLeaderboardDialog({ open, onClose, title, data, color, bg, icon: Icon, boardType, dateParams }) {
  const [empDialog, setEmpDialog] = useState({ open: false, name: "" });
  const max = data[0]?.count || 1;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, maxHeight: "80vh", border: `1px solid ${BRAND.border}` } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            {Icon && (
              <Box
                sx={{
                  bgcolor: bg,
                  borderRadius: 2,
                  p: 0.9,
                  display: "flex",
                  border: `1px solid ${color}22`,
                }}
              >
                <Icon sx={{ fontSize: 18, color }} />
              </Box>
            )}
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: BRAND.heading }}>
              {title}
            </Typography>
            <Chip label={`${data.length} team members`} size="small" sx={softChipSx("#f1f5f9", BRAND.textMuted)} />
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ overflow: "auto", py: 2 }}>
          <Stack spacing={1.5}>
            {data.map((item, i) => {
              const initials = (item._id || "?")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              const pct = Math.round((item.count / max) * 100);

              return (
                <Box
                  key={item._id || i}
                  sx={{
                    p: 1.6,
                    borderRadius: 3,
                    border: `1px solid ${BRAND.borderSoft}`,
                    bgcolor: "#fff",
                    transition: "all 0.18s ease",
                    "&:hover": { bgcolor: "#fbfdff", borderColor: BRAND.border },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        bgcolor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#fff" }}>{initials}</Typography>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Button
                          variant="text"
                          onClick={() => setEmpDialog({ open: true, name: item._id })}
                          sx={{
                            p: 0,
                            minWidth: 0,
                            textTransform: "none",
                            fontSize: "0.86rem",
                            fontWeight: 700,
                            color: "#334155",
                            "&:hover": { color, bgcolor: "transparent", textDecoration: "underline" },
                          }}
                        >
                          {item._id || "Unknown"}
                        </Button>

                        <Typography sx={{ fontSize: "0.95rem", fontWeight: 900, color, ml: 1, flexShrink: 0 }}>
                          {item.count}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>

                  <Box sx={{ height: 6, bgcolor: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                    <Box
                      sx={{
                        height: "100%",
                        width: `${pct}%`,
                        bgcolor: color,
                        borderRadius: 99,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5, borderTop: `1px solid ${BRAND.border}` }}>
          <Button onClick={onClose} sx={{ textTransform: "none", color: BRAND.textMuted, fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <EmployeeScriptsDialog
        open={empDialog.open}
        onClose={() => setEmpDialog({ open: false, name: "" })}
        employeeName={empDialog.name}
        boardType={boardType}
        dateParams={dateParams}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Team Summary Card
// ─────────────────────────────────────────────────────────────
function LeaderboardCard({ title, data, color, bg, icon: Icon, boardType, dateParams }) {
  const [expandOpen, setExpandOpen] = useState(false);
  const [empDialog, setEmpDialog] = useState({ open: false, name: "" });
  const top3 = data.slice(0, 3);
  const max = data[0]?.count || 1;

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          ...panelSx,
          p: 2.4,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.2s ease",
          "&:hover": { boxShadow: BRAND.shadowHover, transform: "translateY(-2px)" },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.4}>
          <Stack direction="row" alignItems="center" gap={1}>
            {Icon && (
              <Box
                sx={{
                  bgcolor: bg,
                  borderRadius: 2,
                  p: 0.8,
                  display: "flex",
                  border: `1px solid ${color}22`,
                }}
              >
                <Icon sx={{ fontSize: 17, color }} />
              </Box>
            )}
            <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", color: BRAND.heading }}>
              {title}
            </Typography>
          </Stack>

          {data.length > 3 && (
            <Button
              size="small"
              onClick={() => setExpandOpen(true)}
              endIcon={<ExpandMoreIcon sx={{ fontSize: 14 }} />}
              sx={{
                textTransform: "none",
                fontSize: "0.72rem",
                color: BRAND.textMuted,
                fontWeight: 700,
                px: 1.2,
                py: 0.35,
                minWidth: 0,
                borderRadius: 99,
                "&:hover": { color, bgcolor: bg },
              }}
            >
              +{data.length - 3}
            </Button>
          )}
        </Stack>

        {top3.length === 0 ? (
          <Typography sx={{ color: BRAND.textLight, fontSize: "0.82rem", textAlign: "center", py: 3.5 }}>
            No data
          </Typography>
        ) : (
          <Stack spacing={2} sx={{ flex: 1 }}>
            {top3.map((item, i) => {
              const initials = (item._id || "?")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              const pct = Math.round((item.count / max) * 100);

              return (
                <Box key={item._id || i}>
                  <Stack direction="row" alignItems="center" spacing={1.4} mb={0.9}>
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        bgcolor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Typography sx={{ fontSize: "0.67rem", fontWeight: 800, color: "#fff" }}>{initials}</Typography>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Button
                          variant="text"
                          onClick={() => setEmpDialog({ open: true, name: item._id })}
                          sx={{
                            p: 0,
                            minWidth: 0,
                            textTransform: "none",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            color: "#334155",
                            justifyContent: "flex-start",
                            maxWidth: "calc(100% - 40px)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            "&:hover": { color, bgcolor: "transparent", textDecoration: "underline" },
                          }}
                        >
                          {item._id || "Unknown"}
                        </Button>

                        <Typography sx={{ fontSize: "0.88rem", fontWeight: 900, color, flexShrink: 0, ml: 1 }}>
                          {item.count}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>

                  <Box sx={{ height: 6, bgcolor: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                    <Box
                      sx={{
                        height: "100%",
                        width: `${pct}%`,
                        bgcolor: color,
                        borderRadius: 99,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}

        {data.length > 3 && (
          <Button
            fullWidth
            size="small"
            onClick={() => setExpandOpen(true)}
            sx={{
              mt: 2.2,
              textTransform: "none",
              fontSize: "0.79rem",
              color: BRAND.textMuted,
              fontWeight: 700,
              borderTop: `1px solid ${BRAND.borderSoft}`,
              pt: 1.5,
              borderRadius: 0,
              "&:hover": { color, bgcolor: "transparent" },
            }}
          >
            View all {data.length} team members
          </Button>
        )}
      </Paper>

      <ExpandedLeaderboardDialog
        open={expandOpen}
        onClose={() => setExpandOpen(false)}
        title={title}
        data={data}
        color={color}
        bg={bg}
        icon={Icon}
        boardType={boardType}
        dateParams={dateParams}
      />

      <EmployeeScriptsDialog
        open={empDialog.open}
        onClose={() => setEmpDialog({ open: false, name: "" })}
        employeeName={empDialog.name}
        boardType={boardType}
        dateParams={dateParams}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Writer Scripts Drill-Down Dialog
// ─────────────────────────────────────────────────────────────
function WriterScriptsDialog({ open, onClose, writerName, filterType, dateParams }) {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !writerName) return;
    setLoading(true);
    axios
      .get(`${API}/writer-scripts`, {
        params: { writerName, filter: filterType, ...dateParams },
        headers: getAuthHeaders(),
        withCredentials: true,
      })
      .then(({ data }) => setScripts(data.scripts || []))
      .catch(() => setScripts([]))
      .finally(() => setLoading(false));
  }, [open, writerName, filterType, dateParams]);

  const titles = {
    pendingReview: "Pending Review Scripts",
    approved: "Approved Scripts",
    posted: "Posted Scripts",
    rewrite: "Rewrite Scripts",
    onHold: "On Hold Scripts",
    rejected: "Rejected Scripts",
  };

  const colors = {
    pendingReview: BRAND.amber,
    approved: BRAND.green,
    posted: BRAND.blue,
    rewrite: BRAND.amber,
    onHold: "#64748b",
    rejected: BRAND.red,
  };

  const color = colors[filterType] || BRAND.blue;
  const title = titles[filterType] || "Scripts";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${BRAND.border}`,
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1.2, flexShrink: 0 }}>
        <Box>
          <Stack direction="row" alignItems="center" gap={1}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: BRAND.heading }}>
              {title} — <span style={{ color }}>{writerName}</span>
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: "0.75rem", color: BRAND.textLight, mt: 0.35, pl: 2.3 }}>
            {loading ? "Loading…" : `${scripts.length} script${scripts.length !== 1 ? "s" : ""}`}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0, overflow: "auto", flex: 1 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={7}>
            <CircularProgress size={28} sx={{ color }} />
          </Box>
        ) : scripts.length === 0 ? (
          <Typography sx={{ textAlign: "center", py: 7, color: BRAND.textLight }}>No scripts found</Typography>
        ) : (
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>#</TableCell>
                <TableCell sx={tableHeadCellSx}>Script ID</TableCell>
                <TableCell sx={tableHeadCellSx}>Type</TableCell>
                <TableCell sx={tableHeadCellSx}>Stage</TableCell>
                <TableCell sx={tableHeadCellSx}>Script Status</TableCell>
                <TableCell sx={tableHeadCellSx}>Created</TableCell>
                <TableCell sx={tableHeadCellSx}>Approved By</TableCell>
                <TableCell sx={tableHeadCellSx}>Approved At</TableCell>
                <TableCell sx={tableHeadCellSx}>Posted Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scripts.map((s, i) => {
                const stat = getStatusChipStyles(s.scriptStatus);
                return (
                  <TableRow
                    key={s._id || i}
                    hover
                    sx={{
                      "& td": {
                        fontSize: "0.82rem",
                        borderBottom: `1px solid ${BRAND.borderSoft}`,
                        py: 1.25,
                      },
                      "&:hover": { bgcolor: "#fbfdff" },
                    }}
                  >
                    <TableCell sx={{ color: BRAND.textLight, fontWeight: 700 }}>{i + 1}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800, color, fontSize: "0.82rem", fontFamily: "monospace" }}>
                        {s.scriptId || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={s.scriptType || "—"} size="small" sx={softChipSx("#f1f5f9", "#475569")} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={s.stage || "—"}
                        size="small"
                        sx={{ ...softChipSx(stageColor(s.stage), "#fff"), px: 0.4 }}
                      />
                    </TableCell>
                    <TableCell>
                      {s.scriptStatus ? (
                        <Chip label={s.scriptStatus} size="small" sx={softChipSx(stat.bg, stat.color)} />
                      ) : (
                        <Typography sx={{ color: BRAND.textLight }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: "#475569", whiteSpace: "nowrap" }}>{fmt(s.createdAt)}</TableCell>
                    <TableCell sx={{ color: "#475569", fontWeight: 700 }}>{s.approvedBy || "—"}</TableCell>
                    <TableCell sx={{ color: "#475569", whiteSpace: "nowrap" }}>{fmt(s.approvedAt)}</TableCell>
                    <TableCell sx={{ color: "#475569", whiteSpace: "nowrap" }}>{fmt(s.postedAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: `1px solid ${BRAND.border}`, flexShrink: 0 }}>
        <Typography sx={{ fontSize: "0.75rem", color: BRAND.textLight, flex: 1 }}>
          Showing {scripts.length} records
        </Typography>
        <Button
          onClick={onClose}
          variant="outlined"
          size="small"
          sx={{
            textTransform: "none",
            color: BRAND.textMuted,
            borderColor: BRAND.border,
            fontWeight: 700,
            borderRadius: 2,
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Writer Metrics Table
// ─────────────────────────────────────────────────────────────
function WriterMetricsTable({ metrics, dateParams }) {
  const [expanded, setExpanded] = useState(false);
  const [dialog, setDialog] = useState({ open: false, name: "", filter: "" });
  const visible = expanded ? metrics : metrics.slice(0, 5);

  if (!metrics || metrics.length === 0) return null;

  return (
    <>
      <Paper elevation={0} sx={{ borderRadius: 0, overflow: "hidden", bgcolor: "#fff" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2, borderBottom: `1px solid ${BRAND.borderSoft}` }}>
          <SectionHeader
            icon={WriteIcon}
            iconColor={BRAND.blue}
            iconBg={BRAND.blueBg}
            title="Script Writer Metrics"
            subtitle="Scripts written, approved, pending and content output per writer"
            chip={<Chip label={`${metrics.length} writers`} size="small" sx={softChipSx(BRAND.blueBg, BRAND.blue)} />}
          />
        </Stack>

        <Box sx={{ overflow: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>Writer</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Total Written</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Approved</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Pending Review</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Rewrite</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">On Hold</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Rejected</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Shoot Done</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Posted</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Approval Rate</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visible.map((w, i) => {
                const approvalRate = w.totalWritten ? Math.round((w.approved / w.totalWritten) * 100) : 0;
                const progressColor = approvalRate > 60 ? BRAND.green : approvalRate > 30 ? BRAND.amber : BRAND.red;

                return (
                  <TableRow
                    key={w.name || i}
                    hover
                    sx={{
                      "& td": { borderBottom: `1px solid ${BRAND.borderSoft}`, py: 1.25, fontSize: "0.83rem" },
                      "&:hover": { bgcolor: "#fbfdff" },
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            bgcolor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Typography sx={{ fontSize: "0.66rem", fontWeight: 800, color: "#fff" }}>
                            {(w.name || "?").split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2)}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 700, color: BRAND.heading, fontSize: "0.83rem" }}>
                          {w.name || "—"}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 900, color: BRAND.blue }}>{w.totalWritten}</Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setDialog({ open: true, name: w.name, filter: "approved" })}
                        sx={{
                          fontWeight: 900,
                          color: BRAND.green,
                          fontSize: "0.83rem",
                          p: 0,
                          minWidth: 0,
                          "&:hover": { textDecoration: "underline", bgcolor: "transparent" },
                        }}
                      >
                        {w.approved}
                      </Button>
                    </TableCell>

                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setDialog({ open: true, name: w.name, filter: "pendingReview" })}
                        sx={{
                          fontWeight: 900,
                          color: "#f59e0b",
                          fontSize: "0.83rem",
                          p: 0,
                          minWidth: 0,
                          "&:hover": { textDecoration: "underline", bgcolor: "transparent" },
                        }}
                      >
                        {w.pendingReview}
                      </Button>
                    </TableCell>

                    <TableCell align="center">
                      {w.rewrite > 0 ? (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setDialog({ open: true, name: w.name, filter: "rewrite" })}
                          sx={{
                            fontWeight: 900,
                            color: BRAND.amber,
                            fontSize: "0.83rem",
                            p: 0,
                            minWidth: 0,
                            "&:hover": { textDecoration: "underline", bgcolor: "transparent" },
                          }}
                        >
                          {w.rewrite}
                        </Button>
                      ) : (
                        <Typography sx={{ color: BRAND.textLight }}>0</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {w.onHold > 0 ? (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setDialog({ open: true, name: w.name, filter: "onHold" })}
                          sx={{
                            fontWeight: 900,
                            color: "#475569",
                            fontSize: "0.83rem",
                            p: 0,
                            minWidth: 0,
                            "&:hover": { textDecoration: "underline", bgcolor: "transparent" },
                          }}
                        >
                          {w.onHold}
                        </Button>
                      ) : (
                        <Typography sx={{ color: BRAND.textLight }}>0</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {w.rejected > 0 ? (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setDialog({ open: true, name: w.name, filter: "rejected" })}
                          sx={{
                            fontWeight: 900,
                            color: BRAND.red,
                            fontSize: "0.83rem",
                            p: 0,
                            minWidth: 0,
                            "&:hover": { textDecoration: "underline", bgcolor: "transparent" },
                          }}
                        >
                          {w.rejected}
                        </Button>
                      ) : (
                        <Typography sx={{ color: BRAND.textLight }}>0</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 900, color: BRAND.amber }}>{w.shootDone}</Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setDialog({ open: true, name: w.name, filter: "posted" })}
                        sx={{
                          fontWeight: 900,
                          color: BRAND.cyan,
                          fontSize: "0.83rem",
                          p: 0,
                          minWidth: 0,
                          "&:hover": { textDecoration: "underline", bgcolor: "transparent" },
                        }}
                      >
                        {w.posted}
                      </Button>
                    </TableCell>

                    <TableCell align="center">
                      <Stack direction="row" alignItems="center" gap={1} justifyContent="center">
                        <Box sx={{ width: 58, height: 6, bgcolor: "#eef2f7", borderRadius: 99, overflow: "hidden" }}>
                          <Box sx={{ height: "100%", width: `${approvalRate}%`, bgcolor: progressColor, borderRadius: 99 }} />
                        </Box>
                        <Typography sx={{ fontSize: "0.74rem", fontWeight: 800, color: BRAND.textMuted }}>
                          {approvalRate}%
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        {metrics.length > 5 && (
          <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${BRAND.borderSoft}`, textAlign: "center" }}>
            <Button
              size="small"
              onClick={() => setExpanded(!expanded)}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ textTransform: "none", color: BRAND.textMuted, fontWeight: 700, fontSize: "0.82rem" }}
            >
              {expanded ? "Show less" : `Show all ${metrics.length} writers`}
            </Button>
          </Box>
        )}
      </Paper>

      <WriterScriptsDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, name: "", filter: "" })}
        writerName={dialog.name}
        filterType={dialog.filter}
        dateParams={dateParams}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Editor Metrics Table
// ─────────────────────────────────────────────────────────────
function EditorMetricsTable({ metrics, dateParams }) {
  const [expanded, setExpanded] = useState(false);
  const [blockedEmp, setBlockedEmp] = useState(null);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const visible = expanded ? metrics : metrics.slice(0, 5);

  const showBlocked = async (emp) => {
    setLoadingBlocked(true);
    try {
      const { data } = await axios.get(`${API}/blocked-scripts`, {
        params: { employeeName: emp.name, ...dateParams },
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      setBlockedEmp({ name: emp.name, scripts: data.scripts || [] });
    } catch {
      setBlockedEmp({ name: emp.name, scripts: [] });
    } finally {
      setLoadingBlocked(false);
    }
  };

  if (!metrics || metrics.length === 0) return null;

  return (
    <>
      <Paper elevation={0} sx={{ borderRadius: 0, overflow: "hidden", bgcolor: "#fff" }}>
        <Stack direction="row" alignItems="center" sx={{ px: 3, py: 2, borderBottom: `1px solid ${BRAND.borderSoft}` }}>
          <SectionHeader
            icon={EditIcon}
            iconColor={BRAND.purple}
            iconBg={BRAND.purpleBg}
            title="Editor Metrics"
            subtitle="Assignments, completions, turnaround and blocked work per editor"
            chip={<Chip label={`${metrics.length} editors`} size="small" sx={softChipSx(BRAND.purpleBg, BRAND.purple)} />}
          />
        </Stack>

        <Box sx={{ overflow: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>Editor</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Assigned</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Completed</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Pending</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Avg Turnaround</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Re-edit</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Reshoot</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">On Hold</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">Blocked</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visible.map((emp, i) => {
                const completionRate = emp.assigned ? Math.round((emp.completed / emp.assigned) * 100) : 0;

                return (
                  <TableRow
                    key={emp.name || i}
                    hover
                    sx={{
                      "& td": { borderBottom: `1px solid ${BRAND.borderSoft}`, py: 1.25, fontSize: "0.83rem" },
                      "&:hover": { bgcolor: "#fbfdff" },
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            bgcolor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Typography sx={{ fontSize: "0.66rem", fontWeight: 800, color: "#fff" }}>
                            {(emp.name || "?").split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2)}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography sx={{ fontWeight: 700, color: BRAND.heading, fontSize: "0.83rem" }}>
                            {emp.name || "—"}
                          </Typography>
                          <Stack direction="row" alignItems="center" gap={0.7} mt={0.35}>
                            <LinearProgress
                              variant="determinate"
                              value={completionRate}
                              sx={{
                                width: 56,
                                height: 4,
                                borderRadius: 99,
                                bgcolor: "#eef2f7",
                                "& .MuiLinearProgress-bar": {
                                  bgcolor: BRAND.green,
                                  borderRadius: 99,
                                },
                              }}
                            />
                            <Typography sx={{ fontSize: "0.67rem", color: BRAND.textLight, fontWeight: 700 }}>
                              {completionRate}%
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 900, color: BRAND.blue }}>{emp.assigned}</Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 900, color: BRAND.green }}>{emp.completed}</Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 900, color: "#f59e0b" }}>{emp.pending}</Typography>
                    </TableCell>

                    <TableCell align="center">
                      {emp.avgTurnaround != null ? (
                        <Chip label={`${emp.avgTurnaround}h`} size="small" sx={softChipSx("#ecfdf5", BRAND.green)} />
                      ) : (
                        <Typography sx={{ color: BRAND.textLight, fontSize: "0.78rem" }}>—</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {emp.reEdit > 0 ? (
                        <Chip label={emp.reEdit} size="small" sx={softChipSx("#fef3c7", BRAND.amber)} />
                      ) : (
                        <Typography sx={{ color: BRAND.textLight }}>0</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {emp.reshoot > 0 ? (
                        <Chip label={emp.reshoot} size="small" sx={softChipSx("#fee2e2", BRAND.red)} />
                      ) : (
                        <Typography sx={{ color: BRAND.textLight }}>0</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {emp.onHold > 0 ? (
                        <Chip label={emp.onHold} size="small" sx={softChipSx("#e2e8f0", "#475569")} />
                      ) : (
                        <Typography sx={{ color: BRAND.textLight }}>0</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {emp.blocked > 0 ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => showBlocked(emp)}
                          sx={{
                            fontSize: "0.7rem",
                            color: BRAND.red,
                            borderColor: "#fca5a5",
                            fontWeight: 800,
                            px: 1.1,
                            py: 0.35,
                            minWidth: 0,
                            borderRadius: 99,
                            "&:hover": { bgcolor: "#fff5f5", borderColor: BRAND.red },
                          }}
                        >
                          {emp.blocked} blocked
                        </Button>
                      ) : (
                        <Typography sx={{ color: BRAND.textLight }}>—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        {metrics.length > 5 && (
          <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${BRAND.borderSoft}`, textAlign: "center" }}>
            <Button
              size="small"
              onClick={() => setExpanded(!expanded)}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ textTransform: "none", color: BRAND.textMuted, fontWeight: 700, fontSize: "0.82rem" }}
            >
              {expanded ? "Show less" : `Show all ${metrics.length} editors`}
            </Button>
          </Box>
        )}
      </Paper>

      <Dialog
        open={!!blockedEmp}
        onClose={() => setBlockedEmp(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, maxHeight: "80vh", border: `1px solid ${BRAND.border}` } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Box>
            <Stack direction="row" alignItems="center" gap={1}>
              <BlockIcon sx={{ fontSize: 18, color: BRAND.red }} />
              <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: BRAND.heading }}>
                Blocked Scripts — <span style={{ color: BRAND.red }}>{blockedEmp?.name}</span>
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: "0.75rem", color: BRAND.textLight, mt: 0.35, pl: 3 }}>
              {loadingBlocked ? "Loading…" : `${blockedEmp?.scripts?.length ?? 0} scripts in Re-edit / Reshoot / On Hold`}
            </Typography>
          </Box>
          <IconButton onClick={() => setBlockedEmp(null)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 0, overflow: "auto" }}>
          {loadingBlocked ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress size={26} sx={{ color: BRAND.red }} />
            </Box>
          ) : !blockedEmp?.scripts?.length ? (
            <Typography sx={{ textAlign: "center", py: 6, color: BRAND.textLight }}>No blocked scripts</Typography>
          ) : (
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...tableHeadCellSx, bgcolor: "#fff5f5", borderBottom: "2px solid #fee2e2" }}>#</TableCell>
                  <TableCell sx={{ ...tableHeadCellSx, bgcolor: "#fff5f5", borderBottom: "2px solid #fee2e2" }}>Script ID</TableCell>
                  <TableCell sx={{ ...tableHeadCellSx, bgcolor: "#fff5f5", borderBottom: "2px solid #fee2e2" }}>Type</TableCell>
                  <TableCell sx={{ ...tableHeadCellSx, bgcolor: "#fff5f5", borderBottom: "2px solid #fee2e2" }}>Stage</TableCell>
                  <TableCell sx={{ ...tableHeadCellSx, bgcolor: "#fff5f5", borderBottom: "2px solid #fee2e2" }}>Edit Status</TableCell>
                  <TableCell sx={{ ...tableHeadCellSx, bgcolor: "#fff5f5", borderBottom: "2px solid #fee2e2" }}>Post Status</TableCell>
                  <TableCell sx={{ ...tableHeadCellSx, bgcolor: "#fff5f5", borderBottom: "2px solid #fee2e2" }}>Last Updated</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {blockedEmp.scripts.map((s, i) => {
                  const isReshoot = s.editStatus === "Reshoot" || s.postStatus === "Reshoot";
                  const isReEdit = s.editStatus === "Re-edit";
                  const badgeColor = isReshoot ? BRAND.red : isReEdit ? BRAND.amber : "#475569";
                  const badgeBg = isReshoot ? "#fee2e2" : isReEdit ? "#fef3c7" : "#e2e8f0";

                  return (
                    <TableRow
                      key={s._id || i}
                      hover
                      sx={{ "& td": { fontSize: "0.82rem", borderBottom: "1px solid #fef2f2", py: 1.25 } }}
                    >
                      <TableCell sx={{ color: BRAND.textLight, fontWeight: 700 }}>{i + 1}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 800, color: BRAND.red, fontSize: "0.82rem", fontFamily: "monospace" }}>
                          {s.scriptId || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={s.scriptType || "—"} size="small" sx={softChipSx("#f1f5f9", "#475569")} />
                      </TableCell>
                      <TableCell>
                        <Chip label={s.stage || "—"} size="small" sx={{ ...softChipSx(stageColor(s.stage), "#fff"), px: 0.4 }} />
                      </TableCell>
                      <TableCell>
                        {s.editStatus ? (
                          <Chip label={s.editStatus} size="small" sx={softChipSx(badgeBg, badgeColor)} />
                        ) : (
                          <Typography sx={{ color: BRAND.textLight }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.postStatus ? (
                          <Chip label={s.postStatus} size="small" sx={softChipSx(badgeBg, badgeColor)} />
                        ) : (
                          <Typography sx={{ color: BRAND.textLight }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: "#475569", whiteSpace: "nowrap" }}>{fmt(s.updatedAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5, borderTop: "1px solid #fee2e2" }}>
          <Button
            onClick={() => setBlockedEmp(null)}
            variant="outlined"
            size="small"
            sx={{
              textTransform: "none",
              color: BRAND.textMuted,
              borderColor: BRAND.border,
              fontWeight: 700,
              borderRadius: 2,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function ReportPage() {
  const [reportSummary, setReportSummary] = useState({});
  const [boards, setBoards] = useState({});
  const [publish, setPublish] = useState([]);
  const [stageCounts, setStageCounts] = useState({});
  const [published, setPublished] = useState({});
  const [pendingNoAction, setPendingNoAction] = useState(0);
  const [blocked, setBlocked] = useState({});
  const [writerMetrics, setWriterMetrics] = useState([]);
  const [editorMetrics, setEditorMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [dateAnchor, setDateAnchor] = useState(null);
  const [metricsTab, setMetricsTab] = useState(0);

  const showSnack = (msg, severity = "success") => setSnack({ open: true, msg, severity });

  const dateLabel =
    dateRange === "custom" && customStart && customEnd
      ? `${customStart} → ${customEnd}`
      : DATE_RANGES.find((r) => r.value === dateRange)?.label || "All Time";

  const buildReportParams = useCallback(() => {
    const p = {};
    if (dateRange !== "all") p.dateRange = dateRange;
    if (dateRange === "custom" && customStart) p.customStart = customStart;
    if (dateRange === "custom" && customEnd) p.customEnd = customEnd;
    return p;
  }, [dateRange, customStart, customEnd]);

  const buildSummaryParams = useCallback(() => {
    if (!dateRange || dateRange === "all") return {};

    const now = new Date();
    let dateFrom;
    let dateTo;

    if (dateRange === "today") {
      dateFrom = dateTo = now.toISOString().split("T")[0];
    } else if (dateRange === "yesterday") {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      dateFrom = dateTo = d.toISOString().split("T")[0];
    } else if (dateRange === "last7") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      dateFrom = d.toISOString().split("T")[0];
      dateTo = now.toISOString().split("T")[0];
    } else if (dateRange === "last30") {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      dateFrom = d.toISOString().split("T")[0];
      dateTo = now.toISOString().split("T")[0];
    } else if (dateRange === "lastMonth") {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      dateFrom = s.toISOString().split("T")[0];
      dateTo = e.toISOString().split("T")[0];
    } else if (dateRange === "custom" && customStart && customEnd) {
      dateFrom = customStart;
      dateTo = customEnd;
    }

    return dateFrom ? { dateFrom, dateTo } : {};
  }, [dateRange, customStart, customEnd]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const [reportRes, summaryRes] = await Promise.all([
        axios.get(`${API}/report`, {
          params: buildReportParams(),
          headers,
          withCredentials: true,
        }),
        axios.get(`${API}/summary`, {
          params: buildSummaryParams(),
          headers,
          withCredentials: true,
        }),
      ]);

      setReportSummary(reportRes.data.summary || {});
      setBoards(reportRes.data.boards || {});
      setPublish(reportRes.data.publish || []);
      setStageCounts(summaryRes.data.stageCounts || {});
      setPublished(summaryRes.data.published || {});
      setPendingNoAction(summaryRes.data.pendingWithoutAction ?? 0);
      setBlocked(summaryRes.data.blocked || {});
      setWriterMetrics(summaryRes.data.writerMetrics || []);
      setEditorMetrics(summaryRes.data.editorMetrics || []);
    } catch {
      showSnack("Failed to load dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, [buildReportParams, buildSummaryParams]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPubs = publish.reduce((a, b) => a + (b.count || 0), 0);
  const dateParams = buildReportParams();
  const summaryDateParams = buildSummaryParams();

  const leaderboards = [
    { title: "Script Writers", data: boards.scripts || [], color: BRAND.blue, bg: BRAND.blueBg, icon: ScriptIcon, boardType: "scripts" },
    { title: "Shoot Completions", data: boards.shoots || [], color: BRAND.green, bg: BRAND.greenBg, icon: ShootIcon, boardType: "shoots" },
    { title: "Cut Completions", data: boards.cuts || [], color: BRAND.amber, bg: BRAND.amberBg, icon: CutIcon, boardType: "cuts" },
    { title: "Cut File Uploads", data: boards.uploads || [], color: BRAND.cyan, bg: BRAND.cyanBg, icon: CutIcon, boardType: "uploads" },
    { title: "Edit Completions", data: boards.edits || [], color: BRAND.purple, bg: BRAND.purpleBg, icon: EditIcon, boardType: "edits" },
    { title: "Posts Published", data: boards.posts || [], color: BRAND.green, bg: BRAND.greenBg, icon: PostIcon, boardType: "posts" },
  ];

  return (
    <Box sx={{ bgcolor: BRAND.bg, minHeight: "100vh", px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
      <Box sx={{ maxWidth: 1600, mx: "auto" }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            ...panelSx,
            mb: 3,
            p: { xs: 2.2, md: 2.6 },
            borderRadius: 4,
            bgcolor: "#fff",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={2}
          >
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: "1.25rem", md: "1.5rem" },
                color: BRAND.heading,
                lineHeight: 1.1,
              }}
            >
              Marketing Dashboard
            </Typography>

            <Stack direction="row" alignItems="center" gap={1.2}>
              <Button
                variant="outlined"
                startIcon={<DateRangeIcon sx={{ fontSize: 15 }} />}
                endIcon={<ArrowDownIcon sx={{ fontSize: 15 }} />}
                onClick={(e) => setDateAnchor(e.currentTarget)}
                sx={{
                  borderColor: dateRange !== "all" ? BRAND.blue : BRAND.border,
                  color: dateRange !== "all" ? BRAND.blue : BRAND.textMuted,
                  bgcolor: dateRange !== "all" ? BRAND.blueBg : "#fff",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  px: 2,
                  py: 0.9,
                  borderRadius: 2.5,
                  "&:hover": {
                    borderColor: BRAND.blue,
                    bgcolor: BRAND.blueBg,
                  },
                }}
              >
                {dateLabel}
              </Button>

              <IconButton
                size="small"
                onClick={load}
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "#fff",
                  border: `1px solid ${BRAND.border}`,
                  "&:hover": { bgcolor: "#f8fafc" },
                }}
              >
                <RefreshIcon sx={{ fontSize: 18, color: BRAND.textMuted }} />
              </IconButton>
            </Stack>
          </Stack>

          <Popover
            open={Boolean(dateAnchor)}
            anchorEl={dateAnchor}
            onClose={() => setDateAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
              sx: {
                mt: 1,
                p: 2,
                borderRadius: 3,
                minWidth: 230,
                border: `1px solid ${BRAND.border}`,
                boxShadow: BRAND.shadowHover,
              },
            }}
          >
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 800,
                color: BRAND.textMuted,
                mb: 1.5,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Date Range
            </Typography>

            <Stack spacing={0.7}>
              {DATE_RANGES.map((r) => (
                <Box
                  key={r.value}
                  onClick={() => {
                    setDateRange(r.value);
                    if (r.value !== "custom") setDateAnchor(null);
                  }}
                  sx={{
                    px: 1.5,
                    py: 0.95,
                    borderRadius: 2,
                    cursor: "pointer",
                    fontSize: "0.84rem",
                    fontWeight: dateRange === r.value ? 800 : 600,
                    color: dateRange === r.value ? BRAND.blue : "#374151",
                    bgcolor: dateRange === r.value ? BRAND.blueBg : "transparent",
                    border: dateRange === r.value ? `1px solid ${BRAND.blue}20` : "1px solid transparent",
                    "&:hover": { bgcolor: "#f8fafc" },
                  }}
                >
                  {r.label}
                </Box>
              ))}
            </Stack>

            {dateRange === "custom" && (
              <Box mt={2}>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: BRAND.textMuted, mb: 1 }}>
                  Custom Range
                </Typography>
                <Stack spacing={1}>
                  <TextField
                    label="Start"
                    type="date"
                    size="small"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="End"
                    type="date"
                    size="small"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  {customStart && customEnd && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => setDateAnchor(null)}
                      sx={{
                        bgcolor: BRAND.blue,
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: 2,
                        "&:hover": { bgcolor: "#1d4ed8" },
                      }}
                    >
                      Apply
                    </Button>
                  )}
                </Stack>
              </Box>
            )}
          </Popover>
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" py={12}>
            <CircularProgress sx={{ color: BRAND.blue }} size={38} />
          </Box>
        ) : (
          <>
            {/* Overview */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  lg: "repeat(5, 1fr)",
                },
                gap: 2,
                mb: 3,
              }}
            >
              {[
                { label: "Total Scripts", value: reportSummary.totalScripts, Icon: ScriptIcon, color: BRAND.blue, bg: BRAND.blueBg },
                { label: "Shoots Done", value: reportSummary.totalShoots, Icon: ShootIcon, color: BRAND.green, bg: BRAND.greenBg },
                { label: "Cuts Done", value: reportSummary.totalCuts, Icon: CutIcon, color: BRAND.amber, bg: BRAND.amberBg },
                { label: "Edits Done", value: reportSummary.totalEdits, Icon: EditIcon, color: BRAND.purple, bg: BRAND.purpleBg },
                { label: "Posts Published", value: reportSummary.totalPosts, Icon: PostIcon, color: BRAND.cyan, bg: BRAND.cyanBg },
              ].map((item) => (
                <StatTile key={item.label} {...item} />
              ))}
            </Box>

            {/* Pipeline + publish + alerts */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={5}>
                <Paper elevation={0} sx={{ ...panelSx, p: 2.5, height: "100%" }}>
                  <SectionHeader
                    icon={PendingIcon}
                    iconColor={BRAND.amber}
                    iconBg={BRAND.amberBg}
                    title="Scripts in Pipeline"
                    subtitle="Current workload distribution across key stages"
                  />
                  <Grid container spacing={1.5}>
                    {[
                      { stage: "Shoot Pending", label: "Shoot Pending", color: "#f59e0b", bg: "#fffbeb" },
                      { stage: "Cut Pending", label: "Cut Pending", color: BRAND.orange, bg: BRAND.orangeBg },
                      { stage: "Edit Pending", label: "Edit Pending", color: BRAND.purple, bg: BRAND.purpleBg },
                      { stage: "Post", label: "Post Pending", color: BRAND.red, bg: BRAND.redBg },
                    ].map(({ stage, label, color, bg }) => (
                      <Grid item xs={6} key={stage}>
                        <Box
                          sx={{
                            bgcolor: bg,
                            borderRadius: 3,
                            p: 2,
                            textAlign: "center",
                            border: `1px solid ${color}18`,
                            height: "100%",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              color,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              mb: 0.6,
                            }}
                          >
                            {label}
                          </Typography>
                          <Typography sx={{ fontSize: "2.1rem", fontWeight: 900, color, lineHeight: 1 }}>
                            {stageCounts[stage] ?? 0}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3.5}>
                <Paper elevation={0} sx={{ ...panelSx, p: 2.5, height: "100%" }}>
                  <SectionHeader
                    icon={PostIcon}
                    iconColor={BRAND.green}
                    iconBg={BRAND.greenBg}
                    title="Published"
                    chip={<Chip label={`${published.total ?? 0} total`} size="small" sx={softChipSx(BRAND.greenBg, BRAND.green)} />}
                  />
                  <Stack spacing={2.6} mt={0.5}>
                    {[
                      { label: "Posted", value: published.posted, color: BRAND.green },
                      { label: "Used in Ads", value: published.usedInAds, color: BRAND.amber },
                    ].map(({ label, value, color }) => {
                      const pct = published.total ? Math.round(((value || 0) / published.total) * 100) : 0;
                      return (
                        <Box key={label}>
                          <Stack direction="row" justifyContent="space-between" mb={0.7}>
                            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>{label}</Typography>
                            <Stack direction="row" alignItems="center" gap={1}>
                              <Typography sx={{ fontSize: "1.02rem", fontWeight: 900, color }}>{value ?? 0}</Typography>
                              <Typography sx={{ fontSize: "0.7rem", color: BRAND.textLight }}>{pct}%</Typography>
                            </Stack>
                          </Stack>
                          <Box sx={{ height: 8, bgcolor: "#edf2f7", borderRadius: 99, overflow: "hidden" }}>
                            <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: color, borderRadius: 99, transition: "width 0.5s" }} />
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3.5}>
                <Stack spacing={2} sx={{ height: "100%" }}>
                  <Paper elevation={0} sx={{ ...panelSx, bgcolor: "#fffbeb", border: "1px solid #fcd34d", p: 2.1, flex: 1 }}>
                    <Stack direction="row" alignItems="center" gap={1} mb={0.6}>
                      <WarningIcon sx={{ color: "#f59e0b", fontSize: 18 }} />
                      <Typography sx={{ fontWeight: 800, fontSize: "0.88rem", color: "#92400e" }}>
                        Pending Without Action
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: "2.45rem", fontWeight: 900, color: "#f59e0b", lineHeight: 1, mb: 0.4 }}>
                      {pendingNoAction}
                    </Typography>
                    <Typography sx={{ fontSize: "0.74rem", color: "#b45309" }}>
                      Scripts inactive for 3+ days in Shoot / Cut / Edit Pending
                    </Typography>
                  </Paper>

                  <Paper elevation={0} sx={{ ...panelSx, bgcolor: "#fff5f5", border: "1px solid #fca5a5", p: 2.1, flex: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.1}>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <BlockIcon sx={{ color: BRAND.red, fontSize: 18 }} />
                        <Typography sx={{ fontWeight: 800, fontSize: "0.88rem", color: "#991b1b" }}>
                          Blocked
                        </Typography>
                      </Stack>
                      <Chip label={`${blocked.total ?? 0} total`} size="small" sx={softChipSx("#fee2e2", BRAND.red)} />
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      {[
                        { label: "Re-edit", value: blocked.reEdit, color: BRAND.amber, bg: "#fef3c7" },
                        { label: "Reshoot", value: blocked.reshoot, color: BRAND.red, bg: "#fee2e2" },
                        { label: "On Hold", value: blocked.onHold, color: "#475569", bg: "#e2e8f0" },
                      ].map(({ label, value, color, bg }) => (
                        <Box key={label} sx={{ bgcolor: bg, borderRadius: 2, p: 1.1, textAlign: "center", flex: 1 }}>
                          <Typography sx={{ fontSize: "1.35rem", fontWeight: 900, color, lineHeight: 1 }}>
                            {value ?? 0}
                          </Typography>
                          <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color, mt: 0.35 }}>
                            {label}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Stack>
              </Grid>
            </Grid>

            {/* Team metrics */}
            <Paper elevation={0} sx={{ ...panelSx, mb: 3, overflow: "hidden" }}>
              <Box sx={{ borderBottom: `1px solid ${BRAND.borderSoft}`, px: 3, pt: 2 }}>
                <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: BRAND.heading, mb: 1.3 }}>
                  Team Metrics
                </Typography>
                <Tabs
                  value={metricsTab}
                  onChange={(_, v) => setMetricsTab(v)}
                  sx={{
                    minHeight: 40,
                    "& .MuiTab-root": {
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      minHeight: 40,
                      px: 2,
                      py: 0.5,
                    },
                    "& .Mui-selected": { color: BRAND.blue },
                    "& .MuiTabs-indicator": {
                      bgcolor: BRAND.blue,
                      height: 3,
                      borderRadius: 3,
                    },
                  }}
                >
                  <Tab label={`✍️ Script Writers (${writerMetrics.length})`} />
                  <Tab label={`🎬 Editors (${editorMetrics.length})`} />
                </Tabs>
              </Box>

              <Box>
                {metricsTab === 0 ? (
                  <WriterMetricsTable metrics={writerMetrics} dateParams={summaryDateParams} />
                ) : (
                  <EditorMetricsTable metrics={editorMetrics} dateParams={summaryDateParams} />
                )}
              </Box>
            </Paper>

            {/* Publish breakdown */}
            {publish.length > 0 && (
              <Paper elevation={0} sx={{ ...panelSx, p: 2.5, mb: 3 }}>
                <SectionHeader
                  icon={PostIcon}
                  iconColor={BRAND.green}
                  iconBg={BRAND.greenBg}
                  title="Publish Breakdown"
                  subtitle="Distribution across post publishing outcomes"
                />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                    gap: 2,
                  }}
                >
                  {publish.map((p) => {
                    const clr = {
                      Posted: BRAND.green,
                      "Used in Ads": BRAND.amber,
                      "Not Published": BRAND.red,
                    }[p._id] || "#64748b";
                    const pct = totalPubs ? Math.round((p.count / totalPubs) * 100) : 0;

                    return (
                      <Box
                        key={p._id}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: `1px solid ${BRAND.borderSoft}`,
                          bgcolor: BRAND.panelAlt,
                        }}
                      >
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: BRAND.textMuted, mb: 0.45 }}>
                          {p._id}
                        </Typography>
                        <Typography sx={{ fontSize: "1.9rem", fontWeight: 900, color: clr, lineHeight: 1 }}>
                          {p.count}
                        </Typography>
                        <Box sx={{ height: 7, bgcolor: "#edf2f7", borderRadius: 99, mt: 1.2 }}>
                          <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: clr, borderRadius: 99, transition: "width 0.5s" }} />
                        </Box>
                        <Typography sx={{ fontSize: "0.72rem", color: BRAND.textLight, mt: 0.55 }}>
                          {pct}% of total
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            )}

            {/* Team Summary */}
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <PersonIcon sx={{ color: BRAND.blue, fontSize: 20 }} />
              <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: BRAND.heading }}>
                Team Summary
              </Typography>
              <Typography sx={{ fontSize: "0.76rem", color: BRAND.textLight }}>
                Click any name to view their scripts
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              {leaderboards.map((lb) => (
                <Grid item xs={12} sm={6} md={4} key={lb.title}>
                  <LeaderboardCard {...lb} dateParams={dateParams} />
                </Grid>
              ))}
            </Grid>
          </>
        )}

        <Snackbar
          open={snack.open}
          autoHideDuration={3500}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            severity={snack.severity}
            onClose={() => setSnack((s) => ({ ...s, open: false }))}
            sx={{ borderRadius: 3, boxShadow: BRAND.shadow }}
          >
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

