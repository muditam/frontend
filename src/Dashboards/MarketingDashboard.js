// pages/ReportPage.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Tabs,
  Tab,
  LinearProgress,
} from "@mui/material";
import {
  Description as ScriptIcon,
  Campaign as AdsIcon,
  ViewCarousel as StaticCarouselIcon,
  SmartDisplay as OtherVideoIcon,
  ContentCut as CutIcon,
  Edit as EditStageIcon,
  Send as PostIcon,
  DateRange as DateRangeIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Create as WriteIcon,
  Block as BlockIcon,
} from "@mui/icons-material";

const API =
  "https://muditamleads-14f32a10d7f7.herokuapp.com/api/marketing-dashboard";

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

const AVATAR_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#e11d48",
  "#0d9488",
];

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

const SCHEMA_META = {
  script: {
    key: "script",
    label: "Script",
    short: "Scripts",
    icon: ScriptIcon,
    color: BRAND.blue,
    bg: BRAND.blueBg,
    startStage: "Script",
    startLabel: "Script Review",
  },
  adsVideo: {
    key: "adsVideo",
    label: "Ads Video",
    short: "Ads",
    icon: AdsIcon,
    color: BRAND.green,
    bg: BRAND.greenBg,
    startStage: "Ideation",
    startLabel: "Ideation",
  },
  staticCarousel: {
    key: "staticCarousel",
    label: "Static Carousel",
    short: "Static / Carousel",
    icon: StaticCarouselIcon,
    color: BRAND.purple,
    bg: BRAND.purpleBg,
    startStage: "Ideation",
    startLabel: "Ideation",
  },
  otherVideo: {
    key: "otherVideo",
    label: "Other Video",
    short: "Other Video",
    icon: OtherVideoIcon,
    color: BRAND.cyan,
    bg: BRAND.cyanBg,
    startStage: "Ideation",
    startLabel: "Ideation",
  },
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

const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const n = (v) => Number(v || 0);

const softChipSx = (bg, color) => ({
  height: 24,
  fontSize: "0.72rem",
  fontWeight: 700,
  bgcolor: bg,
  color,
  borderRadius: "999px",
});

const stageColor = (stage = "") =>
  (
    {
      Script: BRAND.blue,
      Ideation: BRAND.blue,
      "Shoot Pending": "#f59e0b",
      "Shoot Done": BRAND.green,
      "Cut Pending": BRAND.orange,
      "Cut Done": BRAND.amber,
      "Edit Pending": BRAND.purple,
      "Edit Done": BRAND.cyan,
      Post: BRAND.green,
    }[stage] || "#64748b"
  );

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

const getItemId = (row = {}) =>
  row.scriptId || row.adsVideoId || row.otherVideoId || row.staticCarouselId || "—";

const getItemType = (row = {}) => {
  if (row.adType) return row.adType;
  if (row.contentType && row.scriptType) return `${row.contentType} • ${row.scriptType}`;
  if (row.contentType) return row.contentType;
  if (row.scriptType) return row.scriptType;
  return "—";
};

const getReviewStatus = (row = {}) => row.scriptStatus || row.ideationStatus || "—";

const SectionHeader = React.memo(function SectionHeader({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  chip,
}) {
  return (
    <Stack direction="row" alignItems="center" gap={1.4} mb={2}>
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
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: BRAND.heading }}>
            {title}
          </Typography>
          {chip}
        </Stack>
        {subtitle && (
          <Typography sx={{ fontSize: "0.76rem", color: BRAND.textLight, mt: 0.2 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  );
});

const StatTile = React.memo(function StatTile({
  label,
  value,
  Icon,
  color,
  bg,
  subtitle,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        p: 2.2,
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
        <Box sx={{ minWidth: 0 }}>
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
              fontSize: { xs: "1.7rem", md: "1.9rem" },
              fontWeight: 900,
              color: BRAND.heading,
              lineHeight: 1,
            }}
          >
            {value ?? 0}
          </Typography>

          {subtitle ? (
            <Typography sx={{ mt: 0.6, fontSize: "0.73rem", color: BRAND.textLight }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>

        {Icon ? (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              bgcolor: bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${color}20`,
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 22, color }} />
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
});

const MiniCountBox = React.memo(function MiniCountBox({ label, value, color, bg }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 3,
        bgcolor: bg,
        border: `1px solid ${color}18`,
        minHeight: 78,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.68rem",
          fontWeight: 800,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          mb: 0.5,
          lineHeight: 1.25,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: "1.55rem", fontWeight: 900, color, lineHeight: 1 }}>
        {value ?? 0}
      </Typography>
    </Box>
  );
});

const SchemaSection = React.memo(function SchemaSection({ schema }) {
  const Icon = schema.icon;
  const statusBadges = [
    { label: "Pending", value: schema.status.pending, style: getStatusChipStyles("Pending") },
    { label: "Approved", value: schema.status.approved, style: getStatusChipStyles("Approved") },
    { label: "Rewrite", value: schema.status.rewrite, style: getStatusChipStyles("Rewrite") },
    { label: "On Hold", value: schema.status.onHold, style: getStatusChipStyles("On Hold") },
    { label: "Rejected", value: schema.status.rejected, style: getStatusChipStyles("Rejected") },
    { label: "Posted", value: schema.status.posted, style: getStatusChipStyles("Posted") },
    {
      label: "Used in Ads",
      value: schema.status.usedInAds,
      style: getStatusChipStyles("Used in Ads"),
    },
  ].filter((item) => item.value > 0);

  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        p: 2.5,
        height: "100%",
        transition: "all 0.2s ease",
        "&:hover": { boxShadow: BRAND.shadowHover, transform: "translateY(-2px)" },
      }}
    >
      <SectionHeader
        icon={Icon}
        iconColor={schema.color}
        iconBg={schema.bg}
        title={schema.label}
        chip={
          <Chip
            label={`${schema.total} total`}
            size="small"
            sx={softChipSx(schema.bg, schema.color)}
          />
        }
      />

      <Grid container spacing={1.5} mb={2}>
        <Grid item xs={6} sm={3}>
          <MiniCountBox label="Total" value={schema.total} color={schema.color} bg={schema.bg} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MiniCountBox
            label="Pending Approval"
            value={schema.pendingApproval}
            color={BRAND.amber}
            bg="#fffbeb"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MiniCountBox
            label="In Pipeline"
            value={schema.inPipeline}
            color={BRAND.purple}
            bg="#faf5ff"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MiniCountBox
            label="Published / Done"
            value={schema.completed}
            color={BRAND.green}
            bg="#f0fdf4"
          />
        </Grid>
      </Grid>

      <Typography sx={{ fontWeight: 800, fontSize: "0.84rem", color: BRAND.heading, mb: 1.1 }}>
        Stage Snapshot
      </Typography>

      <Grid container spacing={1.2} mb={2}>
        <Grid item xs={6} sm={4} md={2}>
          <MiniCountBox
            label={schema.startLabel}
            value={schema.stage.start}
            color={schema.color}
            bg={schema.bg}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <MiniCountBox
            label="Shoot Pending"
            value={schema.pipeline.shootPending}
            color="#f59e0b"
            bg="#fffbeb"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <MiniCountBox
            label="Cut Pending"
            value={schema.pipeline.cutPending}
            color={BRAND.orange}
            bg={BRAND.orangeBg}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <MiniCountBox
            label="Edit Pending"
            value={schema.pipeline.editPending}
            color={BRAND.purple}
            bg={BRAND.purpleBg}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <MiniCountBox
            label="Post Pending"
            value={schema.pipeline.postPending}
            color={BRAND.red}
            bg={BRAND.redBg}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <MiniCountBox
            label="Buffer"
            value={schema.pipeline.buffer}
            color="#6b7280"
            bg="#f3f4f6"
          />
        </Grid>
      </Grid>

      <Typography sx={{ fontWeight: 800, fontSize: "0.84rem", color: BRAND.heading, mb: 1 }}>
        Status Breakdown
      </Typography>

      {statusBadges.length ? (
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {statusBadges.map((item) => (
            <Chip
              key={item.label}
              label={`${item.label}: ${item.value}`}
              size="small"
              sx={softChipSx(item.style.bg, item.style.color)}
            />
          ))}
        </Stack>
      ) : (
        <Typography sx={{ fontSize: "0.78rem", color: BRAND.textLight }}>—</Typography>
      )}
    </Paper>
  );
});

const WriterItemsDialog = React.memo(function WriterItemsDialog({
  open,
  onClose,
  writerName,
  filterType,
  dateParams,
}) {
  const [items, setItems] = useState([]);
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
      .then(({ data }) => setItems(data.scripts || data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, writerName, filterType, dateParams]);

  const titleMap = {
    pendingReview: "Pending Review",
    approved: "Approved",
    posted: "Posted",
    rewrite: "Rewrite",
    onHold: "On Hold",
    rejected: "Rejected",
  };

  const colorMap = {
    pendingReview: BRAND.amber,
    approved: BRAND.green,
    posted: BRAND.blue,
    rewrite: BRAND.amber,
    onHold: "#64748b",
    rejected: BRAND.red,
  };

  const color = colorMap[filterType] || BRAND.blue;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
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
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: BRAND.heading }}>
              {titleMap[filterType] || "Items"} — <span style={{ color }}>{writerName}</span>
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: "0.75rem", color: BRAND.textLight, mt: 0.35, pl: 2.3 }}>
            {loading ? "Loading…" : `${items.length} record${items.length !== 1 ? "s" : ""}`}
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
        ) : !items.length ? (
          <Typography sx={{ textAlign: "center", py: 7, color: BRAND.textLight }}>
            No records found
          </Typography>
        ) : (
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>#</TableCell>
                <TableCell sx={tableHeadCellSx}>ID</TableCell>
                <TableCell sx={tableHeadCellSx}>Type</TableCell>
                <TableCell sx={tableHeadCellSx}>Stage</TableCell>
                <TableCell sx={tableHeadCellSx}>Review Status</TableCell>
                <TableCell sx={tableHeadCellSx}>Created</TableCell>
                <TableCell sx={tableHeadCellSx}>Approved By</TableCell>
                <TableCell sx={tableHeadCellSx}>Approved At</TableCell>
                <TableCell sx={tableHeadCellSx}>Posted Date</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {items.map((row, i) => {
                const reviewStatus = getReviewStatus(row);
                const stat = getStatusChipStyles(reviewStatus);

                return (
                  <TableRow
                    key={row._id || i}
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
                    <TableCell sx={{ color: BRAND.textLight, fontWeight: 700 }}>
                      {i + 1}
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          color,
                          fontSize: "0.82rem",
                          fontFamily: "monospace",
                        }}
                      >
                        {getItemId(row)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={getItemType(row)}
                        size="small"
                        sx={softChipSx("#f1f5f9", "#475569")}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.stage || "—"}
                        size="small"
                        sx={softChipSx(stageColor(row.stage), "#fff")}
                      />
                    </TableCell>

                    <TableCell>
                      {reviewStatus && reviewStatus !== "—" ? (
                        <Chip
                          label={reviewStatus}
                          size="small"
                          sx={softChipSx(stat.bg, stat.color)}
                        />
                      ) : (
                        <Typography sx={{ color: BRAND.textLight }}>—</Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ color: "#475569", whiteSpace: "nowrap" }}>
                      {fmt(row.createdAt)}
                    </TableCell>
                    <TableCell sx={{ color: "#475569", fontWeight: 700 }}>
                      {row.approvedBy || "—"}
                    </TableCell>
                    <TableCell sx={{ color: "#475569", whiteSpace: "nowrap" }}>
                      {fmt(row.approvedAt)}
                    </TableCell>
                    <TableCell sx={{ color: "#475569", whiteSpace: "nowrap" }}>
                      {fmt(row.postedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 1.5,
          borderTop: `1px solid ${BRAND.border}`,
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontSize: "0.75rem", color: BRAND.textLight, flex: 1 }}>
          Showing {items.length} records
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
});

const PersonItemsDialog = React.memo(function PersonItemsDialog({
  open,
  onClose,
  personName,
  field,
  title,
  dateParams,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !personName || !field) return;

    setLoading(true);
    axios
      .get(`${API}/scripts-by-person`, {
        params: { name: personName, field, ...dateParams },
        headers: getAuthHeaders(),
        withCredentials: true,
      })
      .then(({ data }) => setItems(data.items || data.scripts || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, personName, field, dateParams]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          maxHeight: "82vh",
          border: `1px solid ${BRAND.border}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: BRAND.heading }}>
            {title} — <span style={{ color: BRAND.blue }}>{personName}</span>
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: BRAND.textLight, mt: 0.35 }}>
            {loading
              ? "Loading…"
              : `${items.length} record${items.length !== 1 ? "s" : ""}`}
          </Typography>
        </Box>

        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0, overflow: "auto" }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress size={26} sx={{ color: BRAND.blue }} />
          </Box>
        ) : !items.length ? (
          <Typography sx={{ textAlign: "center", py: 6, color: BRAND.textLight }}>
            No records found
          </Typography>
        ) : (
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>#</TableCell>
                <TableCell sx={tableHeadCellSx}>ID</TableCell>
                <TableCell sx={tableHeadCellSx}>Type</TableCell>
                <TableCell sx={tableHeadCellSx}>Stage</TableCell>
                <TableCell sx={tableHeadCellSx}>Shoot Done By</TableCell>
                <TableCell sx={tableHeadCellSx}>Shoot Done At</TableCell>
                <TableCell sx={tableHeadCellSx}>Cut Done By</TableCell>
                <TableCell sx={tableHeadCellSx}>Cut Done At</TableCell>
                <TableCell sx={tableHeadCellSx}>Cut Uploaded By</TableCell>
                <TableCell sx={tableHeadCellSx}>Created</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {items.map((row, i) => (
                <TableRow
                  key={row._id || i}
                  hover
                  sx={{
                    "& td": {
                      fontSize: "0.82rem",
                      borderBottom: `1px solid ${BRAND.borderSoft}`,
                      py: 1.2,
                    },
                    "&:hover": { bgcolor: "#fbfdff" },
                  }}
                >
                  <TableCell sx={{ color: BRAND.textLight, fontWeight: 700 }}>
                    {i + 1}
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        color: BRAND.blue,
                        fontSize: "0.82rem",
                        fontFamily: "monospace",
                      }}
                    >
                      {getItemId(row)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={getItemType(row)}
                      size="small"
                      sx={softChipSx("#f1f5f9", "#475569")}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={row.stage || "—"}
                      size="small"
                      sx={softChipSx(stageColor(row.stage), "#fff")}
                    />
                  </TableCell>

                  <TableCell>{row.shootDoneBy || "—"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(row.shootDoneAt)}</TableCell>
                  <TableCell>{row.cutDoneBy || "—"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(row.cutDoneAt)}</TableCell>
                  <TableCell>{row.cutUploadedBy || "—"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(row.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: `1px solid ${BRAND.border}` }}>
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
});

const WriterMetricsTable = React.memo(function WriterMetricsTable({
  metrics,
  dateParams,
}) {
  const [expanded, setExpanded] = useState(false);
  const [dialog, setDialog] = useState({ open: false, name: "", filter: "" });
  const visible = expanded ? metrics : metrics.slice(0, 6);

  if (!metrics?.length) {
    return (
      <Typography sx={{ px: 3, py: 4, color: BRAND.textLight }}>
        No writer metrics available.
      </Typography>
    );
  }

  return (
    <>
      <Paper elevation={0} sx={{ borderRadius: 0, overflow: "hidden", bgcolor: "#fff" }}>
        <Box sx={{ overflow: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>Writer</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Total
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Approved
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Pending
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Rewrite
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  On Hold
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Rejected
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Posted
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visible.map((w, i) => (
                <TableRow
                  key={w.name || i}
                  hover
                  sx={{
                    "& td": {
                      borderBottom: `1px solid ${BRAND.borderSoft}`,
                      py: 1.25,
                      fontSize: "0.83rem",
                    },
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
                          {(w.name || "?")
                            .split(" ")
                            .map((x) => x[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </Typography>
                      </Box>

                      <Typography
                        sx={{ fontWeight: 700, color: BRAND.heading, fontSize: "0.83rem" }}
                      >
                        {w.name || "—"}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell align="center">
                    <Typography sx={{ fontWeight: 900, color: BRAND.blue }}>
                      {w.totalWritten ?? w.total ?? 0}
                    </Typography>
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
                      {w.approved ?? 0}
                    </Button>
                  </TableCell>

                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="text"
                      onClick={() =>
                        setDialog({ open: true, name: w.name, filter: "pendingReview" })
                      }
                      sx={{
                        fontWeight: 900,
                        color: BRAND.amber,
                        fontSize: "0.83rem",
                        p: 0,
                        minWidth: 0,
                        "&:hover": { textDecoration: "underline", bgcolor: "transparent" },
                      }}
                    >
                      {w.pendingReview ?? 0}
                    </Button>
                  </TableCell>

                  <TableCell align="center">
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
                      {w.rewrite ?? 0}
                    </Button>
                  </TableCell>

                  <TableCell align="center">
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
                      {w.onHold ?? 0}
                    </Button>
                  </TableCell>

                  <TableCell align="center">
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
                      {w.rejected ?? 0}
                    </Button>
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
                      {w.posted ?? 0}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {metrics.length > 6 ? (
          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderTop: `1px solid ${BRAND.borderSoft}`,
              textAlign: "center",
            }}
          >
            <Button
              size="small"
              onClick={() => setExpanded((v) => !v)}
              sx={{
                textTransform: "none",
                color: BRAND.textMuted,
                fontWeight: 700,
                fontSize: "0.82rem",
              }}
            >
              {expanded ? "Show less" : `Show all ${metrics.length} writers`}
            </Button>
          </Box>
        ) : null}
      </Paper>

      <WriterItemsDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, name: "", filter: "" })}
        writerName={dialog.name}
        filterType={dialog.filter}
        dateParams={dateParams}
      />
    </>
  );
});

const VideographerMetricsTable = React.memo(function VideographerMetricsTable({
  metrics,
  dateParams,
}) {
  const [expanded, setExpanded] = useState(false);
  const [dialog, setDialog] = useState({
    open: false,
    name: "",
    field: "",
    title: "",
  });

  const visible = expanded ? metrics : metrics.slice(0, 6);

  if (!metrics?.length) {
    return (
      <Typography sx={{ px: 3, py: 4, color: BRAND.textLight }}>
        No videographer metrics available.
      </Typography>
    );
  }

  return (
    <>
      <Paper elevation={0} sx={{ borderRadius: 0, overflow: "hidden", bgcolor: "#fff" }}>
        <Box sx={{ overflow: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>Videographer</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Shoot Done
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Cut Done
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Cut Uploaded
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Total Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visible.map((person, i) => (
                <TableRow
                  key={person.name || i}
                  hover
                  sx={{
                    "& td": {
                      borderBottom: `1px solid ${BRAND.borderSoft}`,
                      py: 1.25,
                      fontSize: "0.83rem",
                    },
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
                          {(person.name || "?")
                            .split(" ")
                            .map((x) => x[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </Typography>
                      </Box>

                      <Typography
                        sx={{ fontWeight: 700, color: BRAND.heading, fontSize: "0.83rem" }}
                      >
                        {person.name || "—"}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="text"
                      onClick={() =>
                        setDialog({
                          open: true,
                          name: person.name,
                          field: "shootDoneBy",
                          title: "Shoot Done Items",
                        })
                      }
                      sx={{
                        fontWeight: 900,
                        color: BRAND.green,
                        fontSize: "0.83rem",
                        p: 0,
                        minWidth: 0,
                        "&:hover": { textDecoration: "underline", bgcolor: "transparent" },
                      }}
                    >
                      {person.shootDone ?? 0}
                    </Button>
                  </TableCell>

                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="text"
                      onClick={() =>
                        setDialog({
                          open: true,
                          name: person.name,
                          field: "cutDoneBy",
                          title: "Cut Done Items",
                        })
                      }
                      sx={{
                        fontWeight: 900,
                        color: BRAND.orange,
                        fontSize: "0.83rem",
                        p: 0,
                        minWidth: 0,
                        "&:hover": { textDecoration: "underline", bgcolor: "transparent" },
                      }}
                    >
                      {person.cutDone ?? 0}
                    </Button>
                  </TableCell>

                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="text"
                      onClick={() =>
                        setDialog({
                          open: true,
                          name: person.name,
                          field: "cutUploadedBy",
                          title: "Cut Uploaded Items",
                        })
                      }
                      sx={{
                        fontWeight: 900,
                        color: BRAND.blue,
                        fontSize: "0.83rem",
                        p: 0,
                        minWidth: 0,
                        "&:hover": { textDecoration: "underline", bgcolor: "transparent" },
                      }}
                    >
                      {person.cutUploaded ?? 0}
                    </Button>
                  </TableCell>

                  <TableCell align="center">
                    <Typography sx={{ fontWeight: 900, color: BRAND.heading }}>
                      {person.totalActions ?? 0}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {metrics.length > 6 ? (
          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderTop: `1px solid ${BRAND.borderSoft}`,
              textAlign: "center",
            }}
          >
            <Button
              size="small"
              onClick={() => setExpanded((v) => !v)}
              sx={{
                textTransform: "none",
                color: BRAND.textMuted,
                fontWeight: 700,
                fontSize: "0.82rem",
              }}
            >
              {expanded ? "Show less" : `Show all ${metrics.length} videographers`}
            </Button>
          </Box>
        ) : null}
      </Paper>

      <PersonItemsDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, name: "", field: "", title: "" })}
        personName={dialog.name}
        field={dialog.field}
        title={dialog.title}
        dateParams={dateParams}
      />
    </>
  );
});

const BlockedItemsDialog = React.memo(function BlockedItemsDialog({
  open,
  onClose,
  data = [],
  loading = false,
  employeeName = "",
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 4, maxHeight: "82vh", border: `1px solid ${BRAND.border}` },
      }}
    >
      <DialogTitle
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" gap={1}>
            <BlockIcon sx={{ fontSize: 18, color: BRAND.red }} />
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: BRAND.heading }}>
              Blocked Items — <span style={{ color: BRAND.red }}>{employeeName}</span>
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: "0.75rem", color: BRAND.textLight, mt: 0.35, pl: 3 }}>
            {loading
              ? "Loading…"
              : `${data.length} item${data.length !== 1 ? "s" : ""} in re-edit / reshoot / on hold / rejected`}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0, overflow: "auto" }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress size={26} sx={{ color: BRAND.red }} />
          </Box>
        ) : !data.length ? (
          <Typography sx={{ textAlign: "center", py: 6, color: BRAND.textLight }}>
            No blocked items
          </Typography>
        ) : (
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>#</TableCell>
                <TableCell sx={tableHeadCellSx}>ID</TableCell>
                <TableCell sx={tableHeadCellSx}>Type</TableCell>
                <TableCell sx={tableHeadCellSx}>Stage</TableCell>
                <TableCell sx={tableHeadCellSx}>Edit Status</TableCell>
                <TableCell sx={tableHeadCellSx}>Post Status</TableCell>
                <TableCell sx={tableHeadCellSx}>Updated</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {data.map((row, i) => (
                <TableRow
                  key={row._id || i}
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
                  <TableCell sx={{ color: BRAND.textLight, fontWeight: 700 }}>
                    {i + 1}
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        color: BRAND.red,
                        fontSize: "0.82rem",
                        fontFamily: "monospace",
                      }}
                    >
                      {getItemId(row)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={getItemType(row)}
                      size="small"
                      sx={softChipSx("#f1f5f9", "#475569")}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={row.stage || "—"}
                      size="small"
                      sx={softChipSx(stageColor(row.stage), "#fff")}
                    />
                  </TableCell>

                  <TableCell>
                    {row.editStatus ? (
                      <Chip
                        label={row.editStatus}
                        size="small"
                        sx={softChipSx(
                          getStatusChipStyles(row.editStatus).bg,
                          getStatusChipStyles(row.editStatus).color
                        )}
                      />
                    ) : (
                      <Typography sx={{ color: BRAND.textLight }}>—</Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    {row.postStatus ? (
                      <Chip
                        label={row.postStatus}
                        size="small"
                        sx={softChipSx(
                          getStatusChipStyles(row.postStatus).bg,
                          getStatusChipStyles(row.postStatus).color
                        )}
                      />
                    ) : (
                      <Typography sx={{ color: BRAND.textLight }}>—</Typography>
                    )}
                  </TableCell>

                  <TableCell sx={{ color: "#475569", whiteSpace: "nowrap" }}>
                    {fmt(row.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: `1px solid ${BRAND.border}` }}>
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
});

const EditorMetricsTable = React.memo(function EditorMetricsTable({
  metrics,
  dateParams,
}) {
  const [expanded, setExpanded] = useState(false);
  const [blockedDialog, setBlockedDialog] = useState({
    open: false,
    name: "",
    loading: false,
    data: [],
  });

  const visible = expanded ? metrics : metrics.slice(0, 6);

  const openBlocked = async (emp) => {
    setBlockedDialog({ open: true, name: emp.name, loading: true, data: [] });

    try {
      const { data } = await axios.get(`${API}/blocked-scripts`, {
        params: { employeeName: emp.name, ...dateParams },
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      setBlockedDialog({
        open: true,
        name: emp.name,
        loading: false,
        data: data.scripts || data.items || [],
      });
    } catch {
      setBlockedDialog({
        open: true,
        name: emp.name,
        loading: false,
        data: [],
      });
    }
  };

  if (!metrics?.length) {
    return (
      <Typography sx={{ px: 3, py: 4, color: BRAND.textLight }}>
        No editor metrics available.
      </Typography>
    );
  }

  return (
    <>
      <Paper elevation={0} sx={{ borderRadius: 0, overflow: "hidden", bgcolor: "#fff" }}>
        <Box sx={{ overflow: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>Editor</TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Assigned
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Completed
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Pending
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Avg TAT
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="center">
                  Blocked
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visible.map((emp, i) => {
                const completionRate = emp.assigned
                  ? Math.round((emp.completed / emp.assigned) * 100)
                  : 0;

                return (
                  <TableRow
                    key={emp.name || i}
                    hover
                    sx={{
                      "& td": {
                        borderBottom: `1px solid ${BRAND.borderSoft}`,
                        py: 1.25,
                        fontSize: "0.83rem",
                      },
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
                            {(emp.name || "?")
                              .split(" ")
                              .map((x) => x[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography
                            sx={{ fontWeight: 700, color: BRAND.heading, fontSize: "0.83rem" }}
                          >
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
                            <Typography
                              sx={{
                                fontSize: "0.67rem",
                                color: BRAND.textLight,
                                fontWeight: 700,
                              }}
                            >
                              {completionRate}%
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 900, color: BRAND.blue }}>
                        {emp.assigned ?? 0}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 900, color: BRAND.green }}>
                        {emp.completed ?? 0}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 900, color: BRAND.amber }}>
                        {emp.pending ?? 0}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      {emp.avgTurnaround != null ? (
                        <Chip
                          label={`${emp.avgTurnaround}h`}
                          size="small"
                          sx={softChipSx("#ecfdf5", BRAND.green)}
                        />
                      ) : (
                        <Typography sx={{ color: BRAND.textLight }}>—</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {(emp.blocked ?? 0) > 0 ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openBlocked(emp)}
                          sx={{
                            fontSize: "0.72rem",
                            color: BRAND.red,
                            borderColor: "#fca5a5",
                            fontWeight: 800,
                            px: 1.2,
                            py: 0.35,
                            minWidth: 0,
                            borderRadius: 99,
                            "&:hover": { bgcolor: "#fff5f5", borderColor: BRAND.red },
                          }}
                        >
                          {emp.blocked} blocked
                        </Button>
                      ) : (
                        <Typography sx={{ color: BRAND.textLight }}>0</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        {metrics.length > 6 ? (
          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderTop: `1px solid ${BRAND.borderSoft}`,
              textAlign: "center",
            }}
          >
            <Button
              size="small"
              onClick={() => setExpanded((v) => !v)}
              sx={{
                textTransform: "none",
                color: BRAND.textMuted,
                fontWeight: 700,
                fontSize: "0.82rem",
              }}
            >
              {expanded ? "Show less" : `Show all ${metrics.length} editors`}
            </Button>
          </Box>
        ) : null}
      </Paper>

      <BlockedItemsDialog
        open={blockedDialog.open}
        onClose={() =>
          setBlockedDialog({ open: false, name: "", loading: false, data: [] })
        }
        data={blockedDialog.data}
        loading={blockedDialog.loading}
        employeeName={blockedDialog.name}
      />
    </>
  );
});

function normalizeSchema(schemaKey, raw = {}, reportData = {}, summaryData = {}) {
  const meta = SCHEMA_META[schemaKey];

  const fallbackForScriptOnly =
    schemaKey === "script" && !Object.keys(raw || {}).length
      ? {
          total: reportData?.summary?.totalScripts || 0,
          stageCounts: summaryData?.stageCounts || {},
          published: summaryData?.published || {},
          blocked: summaryData?.blocked || {},
          approval: {
            Pending: summaryData?.writerMetrics
              ? summaryData.writerMetrics.reduce((acc, row) => acc + n(row.pendingReview), 0)
              : 0,
            Approved: summaryData?.writerMetrics
              ? summaryData.writerMetrics.reduce((acc, row) => acc + n(row.approved), 0)
              : 0,
            Rewrite: summaryData?.writerMetrics
              ? summaryData.writerMetrics.reduce((acc, row) => acc + n(row.rewrite), 0)
              : 0,
            "On Hold": summaryData?.writerMetrics
              ? summaryData.writerMetrics.reduce((acc, row) => acc + n(row.onHold), 0)
              : 0,
            Rejected: summaryData?.writerMetrics
              ? summaryData.writerMetrics.reduce((acc, row) => acc + n(row.rejected), 0)
              : 0,
          },
        }
      : raw || {};

  const stageCounts = fallbackForScriptOnly.stageCounts || {};
  const approval = fallbackForScriptOnly.approval || fallbackForScriptOnly.statusCounts || {};
  const published = fallbackForScriptOnly.published || {};
  const blocked = fallbackForScriptOnly.blocked || {};

  const start = n(stageCounts[meta.startStage]);
  const shootPending = n(
    fallbackForScriptOnly?.pipeline?.shootPending ?? stageCounts["Shoot Pending"]
  );
  const cutPending = n(
    fallbackForScriptOnly?.pipeline?.cutPending ?? stageCounts["Cut Pending"]
  );
  const editPending = n(
    fallbackForScriptOnly?.pipeline?.editPending ?? stageCounts["Edit Pending"]
  );
  const postPending = n(
    fallbackForScriptOnly?.pipeline?.postPending ?? stageCounts["Post"]
  );
  const buffer = n(
    fallbackForScriptOnly?.pipeline?.buffer ??
      fallbackForScriptOnly?.bufferCount ??
      blocked.total
  );

  const pendingApproval = n(
    fallbackForScriptOnly.pendingApproval ?? approval.Pending ?? approval.pending ?? start
  );

  const total = n(
    fallbackForScriptOnly.total ??
      fallbackForScriptOnly.totalItems ??
      fallbackForScriptOnly.count
  );

  const posted = n(published.posted ?? fallbackForScriptOnly.posted);
  const usedInAds = n(published.usedInAds ?? fallbackForScriptOnly.usedInAds);
  const completed = n(
    fallbackForScriptOnly.completed ?? published.total ?? posted + usedInAds
  );

  return {
    ...meta,
    total,
    pendingApproval,
    completed,
    inPipeline: shootPending + cutPending + editPending + postPending + buffer,
    stage: {
      start,
      shootDone: n(stageCounts["Shoot Done"]),
      cutDone: n(stageCounts["Cut Done"]),
      editDone: n(stageCounts["Edit Done"]),
      post: n(stageCounts["Post"]),
    },
    pipeline: {
      shootPending,
      cutPending,
      editPending,
      postPending,
      buffer,
    },
    status: {
      pending: pendingApproval,
      approved: n(approval.Approved ?? approval.approved),
      rewrite: n(approval.Rewrite ?? approval.rewrite),
      onHold: n(approval["On Hold"] ?? approval.onHold),
      rejected: n(approval.Rejected ?? approval.rejected),
      posted,
      usedInAds,
    },
    blocked: {
      total: n(blocked.total),
      reEdit: n(blocked.reEdit),
      reshoot: n(blocked.reshoot),
      onHold: n(blocked.onHold),
    },
  };
}

function normalizeDashboard(reportData = {}, summaryData = {}) {
  const rawBySchema =
    summaryData.bySchema ||
    reportData.bySchema ||
    reportData?.summary?.bySchema ||
    {};

  const schemas = Object.keys(SCHEMA_META).map((key) =>
    normalizeSchema(key, rawBySchema[key], reportData, summaryData)
  );

  const hasMultiSchema = Object.keys(rawBySchema || {}).length > 0;

  const totalContent = hasMultiSchema
    ? schemas.reduce((acc, s) => acc + n(s.total), 0)
    : n(reportData?.summary?.totalScripts);

  const workflowCards = [
    {
      label: "Shoot Pending",
      value: hasMultiSchema
        ? schemas.reduce((acc, s) => acc + n(s.pipeline.shootPending), 0)
        : n(summaryData?.stageCounts?.["Shoot Pending"]),
      Icon: WarningIcon,
      color: "#f59e0b",
      bg: "#fffbeb",
      subtitle: "Waiting for shoot work",
    },
    {
      label: "Cut Pending",
      value: hasMultiSchema
        ? schemas.reduce((acc, s) => acc + n(s.pipeline.cutPending), 0)
        : n(summaryData?.stageCounts?.["Cut Pending"]),
      Icon: CutIcon,
      color: BRAND.orange,
      bg: BRAND.orangeBg,
      subtitle: "Waiting for cut work",
    },
    {
      label: "Edit Pending",
      value: hasMultiSchema
        ? schemas.reduce((acc, s) => acc + n(s.pipeline.editPending), 0)
        : n(summaryData?.stageCounts?.["Edit Pending"]),
      Icon: EditStageIcon,
      color: BRAND.purple,
      bg: BRAND.purpleBg,
      subtitle: "Waiting for edit work",
    },
    {
      label: "Post Pending / Buffer",
      value: hasMultiSchema
        ? schemas.reduce((acc, s) => acc + n(s.pipeline.postPending), 0)
        : n(summaryData?.stageCounts?.Post),
      Icon: PostIcon,
      color: BRAND.red,
      bg: BRAND.redBg,
      subtitle: "Waiting for post / publish",
    },
  ];

  const contentCards = [
    {
      label: "Total Content",
      value: totalContent,
      Icon: PersonIcon,
      color: BRAND.heading,
      bg: "#e2e8f0",
      subtitle: "All combined",
    },
    {
      label: "Scripts",
      value: schemas.find((s) => s.key === "script")?.total || 0,
      Icon: ScriptIcon,
      color: SCHEMA_META.script.color,
      bg: SCHEMA_META.script.bg,
      subtitle: "Script collection",
    },
    {
      label: "Ads Video",
      value: schemas.find((s) => s.key === "adsVideo")?.total || 0,
      Icon: AdsIcon,
      color: SCHEMA_META.adsVideo.color,
      bg: SCHEMA_META.adsVideo.bg,
      subtitle: "AdsVideo collection",
    },
    {
      label: "Static Carousel",
      value: schemas.find((s) => s.key === "staticCarousel")?.total || 0,
      Icon: StaticCarouselIcon,
      color: SCHEMA_META.staticCarousel.color,
      bg: SCHEMA_META.staticCarousel.bg,
      subtitle: "Static / Carousel collection",
    },
    {
      label: "Other Video",
      value: schemas.find((s) => s.key === "otherVideo")?.total || 0,
      Icon: OtherVideoIcon,
      color: SCHEMA_META.otherVideo.color,
      bg: SCHEMA_META.otherVideo.bg,
      subtitle: "OtherVideo collection",
    },
  ];

  return {
    hasMultiSchema,
    contentCards,
    workflowCards,
    schemas,
    writerMetrics: summaryData?.writerMetrics || [],
    videographerMetrics: summaryData?.videographerMetrics || [],
    editorMetrics: summaryData?.editorMetrics || [],
  };
}

export default function ReportPage() {
  const [reportData, setReportData] = useState({});
  const [summaryData, setSummaryData] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [appliedDateRange, setAppliedDateRange] = useState("all");
  const [appliedCustomStart, setAppliedCustomStart] = useState("");
  const [appliedCustomEnd, setAppliedCustomEnd] = useState("");

  const [dateAnchor, setDateAnchor] = useState(null);
  const [metricsTab, setMetricsTab] = useState(0);

  const firstLoadRef = useRef(true);

  const showSnack = (msg, severity = "success") =>
    setSnack({ open: true, msg, severity });

  const dateLabel =
    appliedDateRange === "custom" && appliedCustomStart && appliedCustomEnd
      ? `${appliedCustomStart} → ${appliedCustomEnd}`
      : DATE_RANGES.find((r) => r.value === appliedDateRange)?.label || "All Time";

  const buildReportParams = useCallback(() => {
    const p = {};
    if (appliedDateRange !== "all") p.dateRange = appliedDateRange;
    if (appliedDateRange === "custom" && appliedCustomStart) {
      p.customStart = appliedCustomStart;
    }
    if (appliedDateRange === "custom" && appliedCustomEnd) {
      p.customEnd = appliedCustomEnd;
    }
    return p;
  }, [appliedDateRange, appliedCustomStart, appliedCustomEnd]);

  const buildSummaryParams = useCallback(() => {
    if (!appliedDateRange || appliedDateRange === "all") return {};

    const now = new Date();
    let dateFrom;
    let dateTo;

    if (appliedDateRange === "today") {
      dateFrom = dateTo = now.toISOString().split("T")[0];
    } else if (appliedDateRange === "yesterday") {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      dateFrom = dateTo = d.toISOString().split("T")[0];
    } else if (appliedDateRange === "last7") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      dateFrom = d.toISOString().split("T")[0];
      dateTo = now.toISOString().split("T")[0];
    } else if (appliedDateRange === "last30") {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      dateFrom = d.toISOString().split("T")[0];
      dateTo = now.toISOString().split("T")[0];
    } else if (appliedDateRange === "lastMonth") {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      dateFrom = s.toISOString().split("T")[0];
      dateTo = e.toISOString().split("T")[0];
    } else if (
      appliedDateRange === "custom" &&
      appliedCustomStart &&
      appliedCustomEnd
    ) {
      dateFrom = appliedCustomStart;
      dateTo = appliedCustomEnd;
    }

    return dateFrom ? { dateFrom, dateTo } : {};
  }, [appliedDateRange, appliedCustomStart, appliedCustomEnd]);

  const load = useCallback(
    async (forceFresh = false, silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setInitialLoading(true);
        }

        const headers = getAuthHeaders();
        const refreshParam = forceFresh ? { refresh: 1 } : {};

        const [reportRes, summaryRes] = await Promise.all([
          axios.get(`${API}/report`, {
            params: { ...buildReportParams(), ...refreshParam },
            headers,
            withCredentials: true,
          }),
          axios.get(`${API}/summary`, {
            params: { ...buildSummaryParams(), ...refreshParam },
            headers,
            withCredentials: true,
          }),
        ]);

        setReportData(reportRes.data || {});
        setSummaryData(summaryRes.data || {});
      } catch {
        showSnack("Failed to load dashboard", "error");
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [buildReportParams, buildSummaryParams]
  );

  useEffect(() => {
    const isFirst = firstLoadRef.current;
    load(false, !isFirst);
    firstLoadRef.current = false;
  }, [load]);

  const dashboard = useMemo(
    () => normalizeDashboard(reportData, summaryData),
    [reportData, summaryData]
  );

  const summaryDateParams = useMemo(() => buildSummaryParams(), [buildSummaryParams]);

  return (
    <Box
      sx={{
        bgcolor: BRAND.bg,
        minHeight: "100vh",
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 1600, mx: "auto" }}>
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
            <Box>
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
            </Box>

            <Stack direction="row" alignItems="center" gap={1.2}>
              <Button
                variant="outlined"
                startIcon={<DateRangeIcon sx={{ fontSize: 15 }} />}
                endIcon={<ArrowDownIcon sx={{ fontSize: 15 }} />}
                onClick={(e) => setDateAnchor(e.currentTarget)}
                sx={{
                  borderColor: appliedDateRange !== "all" ? BRAND.blue : BRAND.border,
                  color: appliedDateRange !== "all" ? BRAND.blue : BRAND.textMuted,
                  bgcolor: appliedDateRange !== "all" ? BRAND.blueBg : "#fff",
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
                onClick={() => load(true, true)}
                disabled={refreshing}
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "#fff",
                  border: `1px solid ${BRAND.border}`,
                  "&:hover": { bgcolor: "#f8fafc" },
                  "&.Mui-disabled": {
                    opacity: 0.7,
                    bgcolor: "#fff",
                  },
                }}
              >
                <RefreshIcon
                  sx={{
                    fontSize: 18,
                    color: BRAND.textMuted,
                    animation: refreshing ? "spin 1s linear infinite" : "none",
                    "@keyframes spin": {
                      from: { transform: "rotate(0deg)" },
                      to: { transform: "rotate(360deg)" },
                    },
                  }}
                />
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

                    if (r.value !== "custom") {
                      setAppliedDateRange(r.value);
                      setAppliedCustomStart("");
                      setAppliedCustomEnd("");
                      setDateAnchor(null);
                    }
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
                    border:
                      dateRange === r.value
                        ? `1px solid ${BRAND.blue}20`
                        : "1px solid transparent",
                    "&:hover": { bgcolor: "#f8fafc" },
                  }}
                >
                  {r.label}
                </Box>
              ))}
            </Stack>

            {dateRange === "custom" ? (
              <Box mt={2}>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: BRAND.textMuted,
                    mb: 1,
                  }}
                >
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

                  {customStart && customEnd ? (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setAppliedDateRange("custom");
                        setAppliedCustomStart(customStart);
                        setAppliedCustomEnd(customEnd);
                        setDateAnchor(null);
                      }}
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
                  ) : null}
                </Stack>
              </Box>
            ) : null}
          </Popover>
        </Paper>

        {initialLoading ? (
          <Box display="flex" justifyContent="center" py={12}>
            <CircularProgress sx={{ color: BRAND.blue }} size={38} />
          </Box>
        ) : (
          <>
            {refreshing ? (
              <LinearProgress
                sx={{
                  mb: 2,
                  borderRadius: 999,
                  height: 4,
                  bgcolor: "#e2e8f0",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 999,
                    bgcolor: BRAND.blue,
                  },
                }}
              />
            ) : null}

            <SectionHeader
              icon={PersonIcon}
              iconColor={BRAND.blue}
              iconBg={BRAND.blueBg}
              title="Content Overview"
              subtitle="High-level count split by schema"
            />

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
              {dashboard.contentCards.map((card) => (
                <StatTile key={card.label} {...card} />
              ))}
            </Box>

            <SectionHeader
              icon={WarningIcon}
              iconColor={BRAND.amber}
              iconBg="#fffbeb"
              title="Workflow Overview"
              subtitle="Pending workload across key workflow stages"
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  lg: "repeat(4, 1fr)",
                },
                gap: 2,
                mb: 3,
              }}
            >
              {dashboard.workflowCards.map((card) => (
                <StatTile key={card.label} {...card} />
              ))}
            </Box>

            <SectionHeader
              icon={ScriptIcon}
              iconColor={BRAND.heading}
              iconBg="#e2e8f0"
              title="Category-wise Breakdown"
            />

            <Grid container spacing={2} mb={3}>
              {dashboard.schemas.map((schema) => (
                <Grid item xs={12} key={schema.key}>
                  <SchemaSection schema={schema} />
                </Grid>
              ))}
            </Grid>

            <Paper elevation={0} sx={{ ...panelSx, overflow: "hidden" }}>
              <Box sx={{ borderBottom: `1px solid ${BRAND.borderSoft}`, px: 3, pt: 2 }}>
                <SectionHeader
                  icon={WriteIcon}
                  iconColor={BRAND.blue}
                  iconBg={BRAND.blueBg}
                  title="Team Metrics"
                />

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
                  <Tab label={`Writers (${dashboard.writerMetrics.length})`} />
                  <Tab label={`Videographers (${dashboard.videographerMetrics.length})`} />
                  <Tab label={`Editors (${dashboard.editorMetrics.length})`} />
                </Tabs>
              </Box>

              <Box>
                {metricsTab === 0 ? (
                  <WriterMetricsTable
                    metrics={dashboard.writerMetrics}
                    dateParams={summaryDateParams}
                  />
                ) : metricsTab === 1 ? (
                  <VideographerMetricsTable
                    metrics={dashboard.videographerMetrics}
                    dateParams={summaryDateParams}
                  />
                ) : (
                  <EditorMetricsTable
                    metrics={dashboard.editorMetrics}
                    dateParams={summaryDateParams}
                  />
                )}
              </Box>
            </Paper>
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