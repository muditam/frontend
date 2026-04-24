// src/pages/TaskBoard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Autocomplete,
  Alert,
  Snackbar,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Chip,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import RepeatIcon from "@mui/icons-material/Repeat";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";
import axios from "axios";

// ── Light theme ──────────────────────────────────────────────
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563EB" },
    background: { default: "#F0F4FF", paper: "#FFFFFF" },
  },
  typography: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: {
      styleOverrides: {
        root: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", fontWeight: 600 },
      },
    },
  },
});

// ── Google Font ──────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap";
document.head.appendChild(fontLink);

const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";

export const COLUMN_IDS = {
  NEW: "NEW",
  OPEN: "OPEN",
  PAUSED: "PAUSED",
  CLOSED: "CLOSED",
};

const DEFAULT_COLUMNS = [
  { id: COLUMN_IDS.NEW, title: "New", order: 0 },
  { id: COLUMN_IDS.OPEN, title: "Open", order: 1 },
  { id: COLUMN_IDS.PAUSED, title: "Paused", order: 2 },
  { id: COLUMN_IDS.CLOSED, title: "Closed", order: 3 },
];

const TITLE_TO_ID = {
  New: COLUMN_IDS.NEW,
  Open: COLUMN_IDS.OPEN,
  Paused: COLUMN_IDS.PAUSED,
  Closed: COLUMN_IDS.CLOSED,
};

// ── Column accent colors (light) ─────────────────────────────
const COLUMN_STYLES = {
  [COLUMN_IDS.NEW]: {
    accent: "#6366F1",
    bg: "#EEF2FF",
    badge: "#C7D2FE",
    badgeText: "#3730A3",
    dot: "#6366F1",
  },
  [COLUMN_IDS.OPEN]: {
    accent: "#10B981",
    bg: "#ECFDF5",
    badge: "#A7F3D0",
    badgeText: "#065F46",
    dot: "#10B981",
  },
  [COLUMN_IDS.PAUSED]: {
    accent: "#F59E0B",
    bg: "#FFFBEB",
    badge: "#FDE68A",
    badgeText: "#78350F",
    dot: "#F59E0B",
  },
  [COLUMN_IDS.CLOSED]: {
    accent: "#94A3B8",
    bg: "#F8FAFC",
    badge: "#E2E8F0",
    badgeText: "#475569",
    dot: "#94A3B8",
  },
};

const getColStyle = (id) =>
  COLUMN_STYLES[id] || {
    accent: "#8B5CF6",
    bg: "#F5F3FF",
    badge: "#DDD6FE",
    badgeText: "#4C1D95",
    dot: "#8B5CF6",
  };

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const slugify = (s) =>
  String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || `LIST_${Date.now().toString(36)}`;

const isEmptyArray = (arr) => !Array.isArray(arr) || arr.length === 0;

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

const formatTimeHM = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toTwo = (n) => String(n).padStart(2, "0");
const formatHHMMSS = (totalSeconds = 0) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${toTwo(h)}:${toTwo(m)}:${toTwo(sec)}`;
};

const computeSpentSeconds = (task) => {
  const base = Number(task.totalActiveSeconds || 0);
  if (task.status === COLUMN_IDS.OPEN && task.activeSince) {
    const delta = (Date.now() - new Date(task.activeSince).getTime()) / 1000;
    return base + Math.max(0, delta);
  }
  return base;
};

const getDueColor = (due) => {
  if (!due) return null;
  const now = Date.now();
  const d = new Date(due).getTime();
  if (d < now) return "#EF4444";
  if (d - now <= 24 * 3600 * 1000) return "#F59E0B";
  return "#10B981";
};

const getDueBg = (due) => {
  if (!due) return null;
  const now = Date.now();
  const d = new Date(due).getTime();
  if (d < now) return "#FEF2F2";
  if (d - now <= 24 * 3600 * 1000) return "#FFFBEB";
  return "#F0FDF4";
};

const getTaskBgColor = (task) => {
  const now = Date.now();
  if (task.dueDate) {
    const due = new Date(task.dueDate).getTime();
    if (due < now && task.status !== COLUMN_IDS.CLOSED) return "#FFF5F5";
  }
  return "#FFFFFF";
};

// ── Priority dot helper ──────────────────────────────────────
const getUrgency = (task) => {
  if (!task.dueDate) return null;
  const now = Date.now();
  const d = new Date(task.dueDate).getTime();
  if (d < now) return { color: "#EF4444", label: "Overdue" };
  if (d - now <= 24 * 3600 * 1000) return { color: "#F59E0B", label: "Due soon" };
  return null;
};

// ════════════════════════════════════════════════════════════
// TaskCard
// ════════════════════════════════════════════════════════════
const TaskCard = ({ task, index, onEdit, onDelete }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (task.status !== COLUMN_IDS.OPEN) return;
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [task.status]);

  const firstAttachment =
    Array.isArray(task.attachments) && task.attachments.length > 0
      ? task.attachments[0]
      : null;

  const showAssignedBy =
    task.assignedByName && task.assignedByName !== task.assigneeName;

  const urgency = getUrgency(task);
  const spentSecs = computeSpentSeconds(task);
  const isActive = task.status === COLUMN_IDS.OPEN;
  const isClosed = task.status === COLUMN_IDS.CLOSED;

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <Paper
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          elevation={snapshot.isDragging ? 8 : 0}
          sx={{
            mb: 1.5,
            p: 0,
            borderRadius: "12px",
            bgcolor: getTaskBgColor(task),
            border: snapshot.isDragging
              ? "2px solid #2563EB"
              : "1px solid #E2E8F0",
            cursor: "grab",
            overflow: "hidden",
            transition: "box-shadow 0.15s, border-color 0.15s",
            boxShadow: snapshot.isDragging
              ? "0 12px 28px rgba(37,99,235,0.18)"
              : "0 1px 3px rgba(0,0,0,0.04)",
            "&:hover": {
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              borderColor: "#CBD5E1",
            },
            opacity: isClosed ? 0.7 : 1,
          }}
        >
          {/* Active pulse bar */}
          {isActive && (
            <Box
              sx={{
                height: 3,
                background: "linear-gradient(90deg, #10B981, #34D399)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2s linear infinite",
                "@keyframes shimmer": {
                  "0%": { backgroundPosition: "0% 0%" },
                  "100%": { backgroundPosition: "200% 0%" },
                },
              }}
            />
          )}

          <Box sx={{ p: 1.5 }}>
            {firstAttachment && (
              <Box
                sx={{
                  mb: 1.5,
                  borderRadius: "8px",
                  overflow: "hidden",
                  maxHeight: 160,
                  border: "1px solid #E2E8F0",
                }}
              >
                <img
                  src={firstAttachment}
                  alt={task.title}
                  style={{ width: "100%", display: "block", objectFit: "cover" }}
                />
              </Box>
            )}

            {/* Header row */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 0.75,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, flex: 1 }}>
                {urgency && (
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      bgcolor: urgency.color,
                      mt: "4px",
                      flexShrink: 0,
                    }}
                  />
                )}
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: "#0F172A",
                    lineHeight: 1.4,
                    textDecoration: isClosed ? "line-through" : "none",
                    color: isClosed ? "#94A3B8" : "#0F172A",
                  }}
                >
                  {task.title}
                </Typography>
              </Box>

              <Stack direction="row" sx={{ ml: 0.5, mt: -0.5, opacity: 0 }}
                className="card-actions"
              >
                <IconButton
                  size="small"
                  onClick={() => onEdit(task)}
                  sx={{
                    color: "#64748B",
                    width: 26,
                    height: 26,
                    "&:hover": { color: "#2563EB", bgcolor: "#EFF6FF" },
                  }}
                >
                  <EditIcon sx={{ fontSize: 13 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDelete(task)}
                  sx={{
                    color: "#64748B",
                    width: 26,
                    height: 26,
                    "&:hover": { color: "#EF4444", bgcolor: "#FEF2F2" },
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Stack>
            </Box>

            {task.description && (
              <Typography
                sx={{
                  fontSize: 11.5,
                  color: "#64748B",
                  mb: 1,
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {task.description}
              </Typography>
            )}

            {/* Tags row */}
            <Stack direction="row" flexWrap="wrap" gap={0.5} mb={1}>
              {task.recurring && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.4,
                    px: 0.8,
                    py: 0.25,
                    borderRadius: "6px",
                    bgcolor: "#F0F9FF",
                    border: "1px solid #BAE6FD",
                  }}
                >
                  <RepeatIcon sx={{ fontSize: 10, color: "#0284C7" }} />
                  <Typography sx={{ fontSize: 10, color: "#0284C7", fontWeight: 600 }}>
                    {task.recurringInterval?.toLowerCase()}
                  </Typography>
                </Box>
              )}

              {task.dueDate && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.4,
                    px: 0.8,
                    py: 0.25,
                    borderRadius: "6px",
                    bgcolor: getDueBg(task.dueDate),
                    border: `1px solid ${getDueColor(task.dueDate)}30`,
                  }}
                >
                  <CalendarMonthIcon sx={{ fontSize: 10, color: getDueColor(task.dueDate) }} />
                  <Typography sx={{ fontSize: 10, color: getDueColor(task.dueDate), fontWeight: 600 }}>
                    {formatDate(task.dueDate)}
                  </Typography>
                </Box>
              )}
            </Stack>

            {/* Footer */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                pt: 1,
                borderTop: "1px solid #F1F5F9",
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                {task.assigneeName && (
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      bgcolor: "#E0E7FF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#4338CA",
                    }}
                  >
                    {task.assigneeName.charAt(0).toUpperCase()}
                  </Box>
                )}
                {task.assigneeName && (
                  <Typography sx={{ fontSize: 10.5, color: "#64748B", fontWeight: 500 }}>
                    {task.assigneeName}
                  </Typography>
                )}
                {showAssignedBy && (
                  <Typography sx={{ fontSize: 10, color: "#94A3B8" }}>
                    via {task.assignedByName}
                  </Typography>
                )}
              </Stack>

              {spentSecs > 0 || isActive ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.4,
                    px: 0.75,
                    py: 0.2,
                    borderRadius: "6px",
                    bgcolor: isActive ? "#ECFDF5" : "#F8FAFC",
                    border: `1px solid ${isActive ? "#6EE7B7" : "#E2E8F0"}`,
                  }}
                >
                  <AccessTimeIcon sx={{ fontSize: 10, color: isActive ? "#059669" : "#94A3B8" }} />
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: isActive ? "#059669" : "#64748B",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: 0.3,
                    }}
                  >
                    {formatHHMMSS(spentSecs)}
                  </Typography>
                </Box>
              ) : null}
            </Box>
          </Box>
        </Paper>
      )}
    </Draggable>
  );
};

// ════════════════════════════════════════════════════════════
// TaskColumn
// ════════════════════════════════════════════════════════════
const TaskColumn = ({
  column,
  tasks,
  loading,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDeleteColumn,
  isLimitedColumn = false,
  visibleCount,
  onSeeMore,
  canDeleteColumn,
}) => {
  const displayTasks =
    isLimitedColumn && typeof visibleCount === "number"
      ? tasks.slice(0, visibleCount)
      : tasks;

  const cs = getColStyle(column.id);

  return (
    <Paper
      elevation={0}
      sx={{
        minWidth: 288,
        maxWidth: 288,
        mr: 2,
        borderRadius: "16px",
        bgcolor: cs.bg,
        border: `1px solid ${cs.accent}22`,
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 160px)",
      }}
    >
      {/* Column header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `2px solid ${cs.accent}20`,
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: cs.dot,
              boxShadow: `0 0 0 3px ${cs.dot}25`,
            }}
          />
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 13,
              color: "#0F172A",
              letterSpacing: 0.2,
            }}
          >
            {column.title}
          </Typography>
          <Box
            sx={{
              px: 1,
              py: 0.2,
              borderRadius: "20px",
              bgcolor: cs.badge,
              border: `1px solid ${cs.accent}30`,
            }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: cs.badgeText }}>
              {tasks.length}
            </Typography>
          </Box>
        </Stack>

        {canDeleteColumn && onDeleteColumn && (
          <IconButton
            size="small"
            onClick={() => onDeleteColumn(column)}
            sx={{
              color: "#94A3B8",
              width: 24,
              height: 24,
              "&:hover": { color: "#EF4444", bgcolor: "#FEF2F2" },
            }}
          >
            <CloseIcon sx={{ fontSize: 12 }} />
          </IconButton>
        )}
      </Box>

      {/* Droppable area */}
      <Droppable droppableId={column.id} type="TASK">
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              flex: 1,
              p: 1.5,
              overflowY: "auto",
              bgcolor: snapshot.isDraggingOver ? `${cs.accent}08` : "transparent",
              transition: "background-color 0.15s",
              "&::-webkit-scrollbar": { width: 4 },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": {
                background: "#CBD5E1",
                borderRadius: 4,
              },
            }}
          >
            {displayTasks.length === 0 && !loading && (
              <Box
                sx={{
                  py: 4,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                  opacity: 0.5,
                }}
              >
                <Typography sx={{ fontSize: 11, color: "#94A3B8", textAlign: "center" }}>
                  No cards yet
                </Typography>
              </Box>
            )}

            {displayTasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}

            {provided.placeholder}

            {isLimitedColumn && tasks.length > (visibleCount || 0) && onSeeMore && (
              <Button
                size="small"
                onClick={onSeeMore}
                sx={{
                  mt: 0.5,
                  width: "100%",
                  textTransform: "none",
                  color: cs.badgeText,
                  fontSize: 12,
                  fontWeight: 600,
                  bgcolor: cs.badge,
                  borderRadius: "8px",
                  "&:hover": { bgcolor: `${cs.accent}25` },
                }}
              >
                Show {tasks.length - visibleCount} more…
              </Button>
            )}

            {/* Add card button */}
            <Button
              onClick={() => onAddTask(column.id)}
              sx={{
                mt: 0.5,
                width: "100%",
                textTransform: "none",
                justifyContent: "flex-start",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: "10px",
                py: 1,
                color: "#64748B",
                border: "1.5px dashed #CBD5E1",
                bgcolor: "rgba(255,255,255,0.6)",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.9)",
                  borderColor: cs.accent,
                  color: cs.accent,
                },
                transition: "all 0.15s",
              }}
              startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            >
              Add a card
            </Button>
          </Box>
        )}
      </Droppable>
    </Paper>
  );
};

// ════════════════════════════════════════════════════════════
// Shared field styles
// ════════════════════════════════════════════════════════════
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    bgcolor: "#F8FAFC",
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#93C5FD" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#2563EB",
      borderWidth: 2,
    },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#2563EB" },
};

// ════════════════════════════════════════════════════════════
// TaskDialog
// ════════════════════════════════════════════════════════════
const TaskDialog = ({
  open,
  draftTask,
  editingTask,
  columns,
  onClose,
  onChangeField,
  onSave,
  error,
  saving,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="sm"
    fullWidth
    PaperProps={{
      sx: {
        borderRadius: "20px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
      },
    }}
  >
    <DialogTitle
      sx={{
        fontWeight: 700,
        fontSize: 17,
        color: "#0F172A",
        px: 3,
        pt: 3,
        pb: 1,
        display: "flex",
        alignItems: "center",
        gap: 1,
        borderBottom: "1px solid #F1F5F9",
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "10px",
          bgcolor: editingTask ? "#FEF3C7" : "#EFF6FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {editingTask
          ? <EditIcon sx={{ fontSize: 15, color: "#D97706" }} />
          : <AddIcon sx={{ fontSize: 15, color: "#2563EB" }} />}
      </Box>
      {editingTask ? "Edit Card" : "New Card"}
    </DialogTitle>

    <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "#FAFBFC" }}>
      <Stack spacing={2} sx={{ mt: 0.5 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: "10px" }}>{error}</Alert>
        )}

        <TextField
          label="Title"
          placeholder="What needs to be done?"
          fullWidth
          required
          size="small"
          value={draftTask.title}
          onChange={(e) => onChangeField("title", e.target.value)}
          sx={fieldSx}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            select
            label="List"
            fullWidth
            size="small"
            value={draftTask.status}
            onChange={(e) => onChangeField("status", e.target.value)}
            sx={fieldSx}
          >
            {columns.map((c) => {
              const cs = getColStyle(c.id);
              const disabled =
                editingTask && editingTask.status === COLUMN_IDS.OPEN && c.id === COLUMN_IDS.NEW;
              return (
                <MenuItem key={c.id} value={c.id} disabled={disabled}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: cs.dot,
                      }}
                    />
                    {c.title}
                  </Box>
                </MenuItem>
              );
            })}
          </TextField>

          <TextField
            label="Assignee"
            fullWidth
            size="small"
            placeholder="Who owns this?"
            value={draftTask.assigneeName}
            onChange={(e) => onChangeField("assigneeName", e.target.value)}
            sx={fieldSx}
          />
        </Stack>

        <TextField
          label="Description"
          fullWidth
          multiline
          minRows={2}
          size="small"
          placeholder="Add context, links, or steps…"
          value={draftTask.description}
          onChange={(e) => onChangeField("description", e.target.value)}
          sx={fieldSx}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Image URL"
            fullWidth
            size="small"
            placeholder="https://…"
            value={draftTask.attachmentUrl}
            onChange={(e) => onChangeField("attachmentUrl", e.target.value)}
            sx={fieldSx}
          />
          <TextField
            label="Due date"
            type="date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            value={draftTask.dueDate}
            onChange={(e) => onChangeField("dueDate", e.target.value)}
            sx={fieldSx}
          />
        </Stack>

        <Box
          sx={{
            p: 2,
            borderRadius: "12px",
            bgcolor: "#F0F9FF",
            border: "1px solid #BAE6FD",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 2,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={!!draftTask.recurring}
                onChange={(e) => onChangeField("recurring", e.target.checked)}
                size="small"
                sx={{ "&.Mui-checked": { color: "#0284C7" } }}
              />
            }
            label={
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#0369A1" }}>
                Recurring task
              </Typography>
            }
            sx={{ m: 0 }}
          />

          <TextField
            select
            label="Repeat every"
            size="small"
            disabled={!draftTask.recurring}
            value={draftTask.recurringInterval}
            onChange={(e) => onChangeField("recurringInterval", e.target.value)}
            sx={{ ...fieldSx, minWidth: 160 }}
          >
            <MenuItem value="DAILY">Daily</MenuItem>
            <MenuItem value="WEEKLY">Weekly</MenuItem>
            <MenuItem value="MONTHLY">Monthly</MenuItem>
          </TextField>
        </Box>
      </Stack>
    </DialogContent>

    <DialogActions
      sx={{
        px: 3,
        py: 2,
        borderTop: "1px solid #F1F5F9",
        bgcolor: "#FAFBFC",
        gap: 1,
      }}
    >
      <Button
        onClick={onClose}
        disabled={saving}
        sx={{
          textTransform: "none",
          color: "#64748B",
          borderRadius: "10px",
          px: 2.5,
          "&:hover": { bgcolor: "#F1F5F9" },
        }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={onSave}
        disabled={saving}
        disableElevation
        sx={{
          textTransform: "none",
          borderRadius: "10px",
          px: 3,
          bgcolor: "#2563EB",
          fontWeight: 600,
          "&:hover": { bgcolor: "#1D4ED8" },
        }}
      >
        {saving && <CircularProgress size={14} sx={{ mr: 1, color: "white" }} />}
        {editingTask ? "Save changes" : "Create card"}
      </Button>
    </DialogActions>
  </Dialog>
);

// ════════════════════════════════════════════════════════════
// AssignTaskDialog
// ════════════════════════════════════════════════════════════
const AssignTaskDialog = ({ open, onClose, onSave, employees, currentUser, assigning }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignee, setAssignee] = useState(null);
  const [recurring, setRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState("DAILY");

  useEffect(() => {
    if (open) {
      setTitle(""); setDescription(""); setDueDate("");
      setAssignedDate(new Date().toISOString().slice(0, 10));
      setAssignee(null); setRecurring(false); setRecurringInterval("DAILY");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!title.trim() || !assignee) return;
    onSave({
      title: title.trim(), description,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      assignedDate: assignedDate ? new Date(assignedDate).toISOString() : new Date().toISOString(),
      assigneeId: assignee?._id || assignee?.id,
      assigneeName: assignee?.fullName || assignee?.name || "",
      assignedById: currentUser?._id || currentUser?.id,
      assignedByName: currentUser?.fullName || currentUser?.name || "",
      status: COLUMN_IDS.NEW,
      recurring, recurringInterval,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: "20px", boxShadow: "0 24px 64px rgba(0,0,0,0.12)" } }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: 17,
          color: "#0F172A",
          px: 3,
          pt: 3,
          pb: 1,
          borderBottom: "1px solid #F1F5F9",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "10px",
            bgcolor: "#F0FDF4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AssignmentIndIcon sx={{ fontSize: 15, color: "#16A34A" }} />
        </Box>
        Assign Task
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "#FAFBFC" }}>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField label="Title" fullWidth required size="small" value={title}
            onChange={(e) => setTitle(e.target.value)} sx={fieldSx} />
          <TextField label="Description" fullWidth multiline minRows={2} size="small"
            value={description} onChange={(e) => setDescription(e.target.value)} sx={fieldSx} />
          <Stack direction="row" spacing={2}>
            <TextField label="Due date" type="date" fullWidth size="small"
              InputLabelProps={{ shrink: true }} value={dueDate}
              onChange={(e) => setDueDate(e.target.value)} sx={fieldSx} />
            <TextField label="Assigned date" type="date" fullWidth size="small"
              InputLabelProps={{ shrink: true }} value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)} sx={fieldSx} />
          </Stack>

          <TextField
            label="Assigned by"
            fullWidth
            size="small"
            value={currentUser?.fullName || currentUser?.name || ""}
            InputProps={{ readOnly: true }}
            helperText="Auto-filled from your account"
            sx={{
              ...fieldSx,
              "& .MuiOutlinedInput-root": {
                ...fieldSx["& .MuiOutlinedInput-root"],
                bgcolor: "#F1F5F9",
              },
            }}
          />

          <Autocomplete
            options={employees}
            getOptionLabel={(opt) => opt.fullName || opt.name || ""}
            isOptionEqualToValue={(o, v) => (o._id || o.id) === (v?._id || v?.id)}
            value={assignee}
            onChange={(_, v) => setAssignee(v)}
            renderInput={(params) => (
              <TextField {...params} label="Assign to" required size="small"
                helperText="Shows active employees" sx={fieldSx} />
            )}
          />

          <Box
            sx={{
              p: 2, borderRadius: "12px", bgcolor: "#F0F9FF",
              border: "1px solid #BAE6FD",
              display: "flex", flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" }, gap: 2,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  size="small" sx={{ "&.Mui-checked": { color: "#0284C7" } }} />
              }
              label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: "#0369A1" }}>Recurring task</Typography>}
              sx={{ m: 0 }}
            />
            <TextField select label="Repeat every" size="small"
              disabled={!recurring} value={recurringInterval}
              onChange={(e) => setRecurringInterval(e.target.value)}
              sx={{ ...fieldSx, minWidth: 160 }}>
              <MenuItem value="DAILY">Daily</MenuItem>
              <MenuItem value="WEEKLY">Weekly</MenuItem>
              <MenuItem value="MONTHLY">Monthly</MenuItem>
            </TextField>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #F1F5F9", bgcolor: "#FAFBFC", gap: 1 }}>
        <Button onClick={onClose} disabled={assigning}
          sx={{ textTransform: "none", color: "#64748B", borderRadius: "10px", px: 2.5, "&:hover": { bgcolor: "#F1F5F9" } }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={assigning} disableElevation
          sx={{ textTransform: "none", borderRadius: "10px", px: 3, bgcolor: "#16A34A", fontWeight: 600, "&:hover": { bgcolor: "#15803D" } }}>
          {assigning && <CircularProgress size={14} sx={{ mr: 1, color: "white" }} />}
          Assign Task
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
const TaskBoard = () => {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [draftTask, setDraftTask] = useState({
    id: null, title: "", description: "", status: "",
    assigneeName: "", dueDate: "", attachmentUrl: "",
    recurring: false, recurringInterval: "DAILY",
  });
  const [dialogError, setDialogError] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [assigningTask, setAssigningTask] = useState(false);
  const [showTeamView, setShowTeamView] = useState(false);
  const [showBoardInline, setShowBoardInline] = useState(false);
  const [selectedViewer, setSelectedViewer] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [viewingUserName, setViewingUserName] = useState("");
  const [constraintError, setConstraintError] = useState("");
  const [limitedVisibleCounts, setLimitedVisibleCounts] = useState({
    [COLUMN_IDS.PAUSED]: 10,
    [COLUMN_IDS.CLOSED]: 10,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [currentUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const currentUserId = useMemo(() => (currentUser && (currentUser._id || currentUser.id)) || null, [currentUser]);

  const canViewOtherBoards = useMemo(() => {
    const role = currentUser?.role || currentUser?.userRole || currentUser?.roleName || "";
    return role === "Manager" || role === "Super Admin";
  }, [currentUser]);

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleSnackbarClose = useCallback((_, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  useEffect(() => {
    if (!constraintError) return;
    const id = setTimeout(() => setConstraintError(""), 5000);
    return () => clearTimeout(id);
  }, [constraintError]);

  useEffect(() => {
    setLimitedVisibleCounts({ [COLUMN_IDS.PAUSED]: 10, [COLUMN_IDS.CLOSED]: 10 });
  }, [tasks.length, viewingUserId, showTeamView]);

  useEffect(() => {
    if (currentUserId && !viewingUserId) {
      setViewingUserId(currentUserId);
      setViewingUserName(currentUser?.fullName || currentUser?.name || "Me");
    }
  }, [currentUserId, currentUser, viewingUserId]);

  const viewingOwnBoard = useMemo(
    () => !!currentUserId && viewingUserId === currentUserId,
    [currentUserId, viewingUserId]
  );

  const headingPrefix = viewingUserName || currentUser?.fullName || "Task";

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/employees`);
      const raw = res.data || [];
      const active = raw
        .filter((emp) => (emp.status || "").toLowerCase() === "active")
        .sort((a, b) => (a.fullName || a.name || "").localeCompare(b.fullName || b.name || ""));
      setEmployees(active);
    } catch { setEmployees([]); }
  }, []);

  const normalizeColumns = (cols) => {
    const normalized = cols.map((c) => {
      const inferredId = c.id || c._id || TITLE_TO_ID[c.title] || String(c.title || "");
      return { id: TITLE_TO_ID[c.title] || String(inferredId), title: c.title, order: c.order ?? 0 };
    });
    return normalized.length ? normalized : DEFAULT_COLUMNS.slice();
  };

  const loadBoard = useCallback(async (ownerId) => {
    const targetId = ownerId || viewingUserId || currentUserId;
    if (!targetId) return;
    try {
      setLoading(true); setLoadError(null);
      const { data } = await axios.get(`${API_BASE_URL}/api/tasks/board`, { params: { userId: targetId } });
      const finalColsRaw = normalizeColumns(data?.columns || []);
      const finalCols = isEmptyArray(finalColsRaw) ? DEFAULT_COLUMNS.slice() : finalColsRaw.sort((a, b) => a.order - b.order);
      const validColumnIds = new Set(finalCols.map((c) => c.id));
      const fallbackColId = finalCols[0]?.id || COLUMN_IDS.NEW;
      const loadedTasks = (data.tasks || []).map((t) => {
        const safeStatus = validColumnIds.has(t.status) ? t.status : TITLE_TO_ID[t.status] || fallbackColId;
        return {
          id: String(t.id || t._id || generateId()), title: t.title,
          description: t.description || "", status: safeStatus,
          assigneeName: t.assigneeName || "", assigneeId: t.assigneeId || null,
          assignedByName: t.assignedByName || "", assignedById: t.assignedById || null,
          assignedDate: t.assignedDate || "", dueDate: t.dueDate || "",
          attachments: Array.isArray(t.attachments) ? t.attachments : t.attachmentUrl ? [t.attachmentUrl] : [],
          totalActiveSeconds: t.totalActiveSeconds ?? 0, activeSince: t.activeSince || null,
          startedAt: t.startedAt || null, createdAt: t.createdAt || null,
          recurring: !!t.recurring, recurringInterval: t.recurringInterval || "DAILY",
          lastRecurringAt: t.lastRecurringAt || null,
        };
      });
      setColumns(finalCols); setTasks(loadedTasks);
      if (finalCols.length > 0) setDraftTask((prev) => prev.status ? prev : { ...prev, status: finalCols[0].id });
    } catch (e) {
      setLoadError(e?.message || "Failed to contact server");
      setColumns(DEFAULT_COLUMNS); setTasks([]);
      setDraftTask((prev) => prev.status ? prev : { ...prev, status: DEFAULT_COLUMNS[0].id });
    } finally { setLoading(false); }
  }, [viewingUserId, currentUserId]);

  useEffect(() => { if (viewingUserId || currentUserId) loadBoard(viewingUserId || currentUserId); }, [loadBoard, viewingUserId, currentUserId]);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const filteredTasks = useMemo(() => {
    if (!viewingOwnBoard || !currentUserId) return tasks;
    const uid = currentUserId;
    if (showTeamView) return tasks.filter((t) => t.assignedById === uid && t.assigneeId && t.assigneeId !== uid);
    return tasks.filter((t) => !(t.assignedById === uid && t.assigneeId && t.assigneeId !== uid));
  }, [tasks, showTeamView, viewingOwnBoard, currentUserId]);

  const tasksByColumn = useMemo(() => {
    const map = {};
    columns.forEach((c) => (map[c.id] = []));
    const firstColId = columns[0]?.id || COLUMN_IDS.NEW;
    filteredTasks.forEach((t) => {
      const key = map[t.status] ? t.status : firstColId;
      map[key].push(t);
    });
    return map;
  }, [columns, filteredTasks]);

  const handleDragEnd = useCallback(async (result) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    const ownerKey = viewingUserId || currentUserId;

    if (type === "COLUMN") {
      if (source.index === destination.index || !ownerKey) return;
      const newCols = Array.from(columns);
      const [movedCol] = newCols.splice(source.index, 1);
      newCols.splice(destination.index, 0, movedCol);
      setColumns(newCols);
      try {
        await axios.patch(`${API_BASE_URL}/api/tasks/columns/reorder`, { userId: ownerKey, orderedIds: newCols.map((c) => c.id) });
      } catch (e) { console.error("Failed to reorder columns", e); }
      return;
    }

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;
    const sourceIndex = source.index;
    const destIndex = destination.index;
    if (sourceColId === destColId && sourceIndex === destIndex) return;

    if (sourceColId === COLUMN_IDS.OPEN && destColId === COLUMN_IDS.NEW) {
      setConstraintError("A started task cannot be moved back to New.");
      return;
    }
    if (destColId === COLUMN_IDS.OPEN && sourceColId !== COLUMN_IDS.OPEN) {
      const openCount = tasks.filter((t) => t.status === COLUMN_IDS.OPEN).length;
      if (openCount >= 2) { setConstraintError("You already have 2 open tasks. Close or pause open tasks first."); return; }
    }

    setTasks((prev) => {
      const copy = [...prev];
      const moved = copy.find((t) => String(t.id) === String(draggableId));
      if (!moved) return prev;
      if (destColId === COLUMN_IDS.OPEN && moved.status !== COLUMN_IDS.OPEN) {
        const nowIso = new Date().toISOString();
        moved.startedAt = moved.startedAt || nowIso;
        moved.activeSince = nowIso;
      }
      if (moved.status === COLUMN_IDS.OPEN && destColId !== COLUMN_IDS.OPEN) {
        if (moved.activeSince) {
          const deltaSec = (Date.now() - new Date(moved.activeSince).getTime()) / 1000;
          moved.totalActiveSeconds = (moved.totalActiveSeconds || 0) + Math.max(0, deltaSec);
        }
        moved.activeSince = null;
      }
      if (sourceColId === destColId) {
        const sameCol = copy.filter((t) => t.status === sourceColId);
        const others = copy.filter((t) => t.status !== sourceColId);
        const ordered = sameCol.slice();
        const [spliced] = ordered.splice(sourceIndex, 1);
        ordered.splice(destIndex, 0, spliced);
        return [...others, ...ordered];
      }
      moved.status = destColId;
      return copy;
    });

    try {
      if (!ownerKey) return;
      if (sourceColId === destColId) {
        const currentColumnTasks = tasks.filter((t) => t.status === destColId).sort((a, b) => String(a.id).localeCompare(String(b.id)));
        const orderedIds = (() => {
          const ids = currentColumnTasks.map((t) => String(t.id));
          const [movedId] = ids.splice(sourceIndex, 1);
          ids.splice(destIndex, 0, movedId);
          return ids;
        })();
        await axios.patch(`${API_BASE_URL}/api/tasks/reorder`, { status: destColId, orderedIds, userId: ownerKey });
      } else {
        const { data: updatedTask } = await axios.patch(`${API_BASE_URL}/api/tasks/${draggableId}/status`, { from: sourceColId, to: destColId, destIndex, userId: ownerKey });
        setTasks((prev) => prev.map((t) => String(t.id) === String(draggableId)
          ? { ...t, status: updatedTask.status || t.status, totalActiveSeconds: updatedTask.totalActiveSeconds ?? t.totalActiveSeconds, activeSince: updatedTask.activeSince || null, startedAt: updatedTask.startedAt || t.startedAt, closedAt: updatedTask.closedAt || null }
          : t));
      }
    } catch (e) { console.error("Failed to update DnD change", e); }
  }, [columns, tasks, viewingUserId, currentUserId]);

  const openCreateDialog = useCallback((columnId) => {
    const status = columnId || columns[0]?.id || COLUMN_IDS.NEW;
    setEditingTask(null); setDialogError("");
    setDraftTask({ id: null, title: "", description: "", status, assigneeName: "", dueDate: "", attachmentUrl: "", recurring: false, recurringInterval: "DAILY" });
    setDialogOpen(true);
  }, [columns]);

  const openEditDialog = useCallback((task) => {
    const firstAttachment = Array.isArray(task.attachments) && task.attachments.length > 0 ? task.attachments[0] : "";
    setEditingTask(task); setDialogError("");
    setDraftTask({ id: task.id, title: task.title, description: task.description || "", status: task.status, assigneeName: task.assigneeName || "", dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : "", attachmentUrl: firstAttachment, recurring: !!task.recurring, recurringInterval: task.recurringInterval || "DAILY" });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false); setEditingTask(null); setDialogError("");
    setDraftTask({ id: null, title: "", description: "", status: columns[0] ? columns[0].id : COLUMN_IDS.NEW, assigneeName: "", dueDate: "", attachmentUrl: "", recurring: false, recurringInterval: "DAILY" });
  }, [columns]);

  const handleDraftChange = useCallback((field, value) => {
    setDraftTask((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveTask = useCallback(async () => {
    if (!draftTask.title.trim()) return;
    const attachments = draftTask.attachmentUrl?.trim() ? [draftTask.attachmentUrl.trim()] : [];
    const safeStatus = draftTask.status || columns[0]?.id || COLUMN_IDS.NEW;
    if (safeStatus === COLUMN_IDS.OPEN) {
      const openCount = tasks.filter((t) => t.status === COLUMN_IDS.OPEN).length;
      const isAlreadyOpen = editingTask && editingTask.status === COLUMN_IDS.OPEN;
      if (openCount + (isAlreadyOpen ? 0 : 1) > 2) { setDialogError("You already have 2 open tasks. Close or pause open tasks first."); return; }
    }
    const ownerKey = viewingUserId || currentUserId;
    if (!ownerKey) return;
    const payloadForApi = { title: draftTask.title.trim(), description: draftTask.description, status: safeStatus, assigneeName: draftTask.assigneeName, dueDate: draftTask.dueDate ? new Date(draftTask.dueDate).toISOString() : null, attachments, recurring: !!draftTask.recurring, recurringInterval: draftTask.recurringInterval || "DAILY", userId: ownerKey };
    let tempId;
    setSavingTask(true);
    try {
      if (editingTask) {
        const { data } = await axios.put(`${API_BASE_URL}/api/tasks/${editingTask.id}`, payloadForApi);
        const updated = { id: String(data.id || data._id || editingTask.id), title: data.title, description: data.description || "", status: data.status, assigneeName: data.assigneeName || "", assigneeId: data.assigneeId || null, assignedByName: data.assignedByName || "", assignedById: data.assignedById || null, assignedDate: data.assignedDate || "", dueDate: data.dueDate || "", attachments: Array.isArray(data.attachments) ? data.attachments : data.attachmentUrl ? [data.attachmentUrl] : [], totalActiveSeconds: data.totalActiveSeconds ?? 0, activeSince: data.activeSince || null, startedAt: data.startedAt || null, closedAt: data.closedAt || null, createdAt: data.createdAt || null, recurring: !!draftTask.recurring, recurringInterval: draftTask.recurringInterval || "DAILY" };
        setTasks((prev) => prev.map((t) => t.id === editingTask.id ? updated : t));
        showSnackbar("Task updated", "success");
      } else {
        tempId = generateId();
        setTasks((prev) => [...prev, { ...payloadForApi, id: tempId, startedAt: safeStatus === COLUMN_IDS.OPEN ? new Date().toISOString() : null, totalActiveSeconds: 0, activeSince: safeStatus === COLUMN_IDS.OPEN ? new Date().toISOString() : null }]);
        const { data } = await axios.post(`${API_BASE_URL}/api/tasks`, payloadForApi);
        const created = { id: String(data.id || data._id || tempId), title: data.title, description: data.description || "", status: data.status, assigneeName: data.assigneeName || "", assigneeId: data.assigneeId || null, assignedByName: data.assignedByName || "", assignedById: data.assignedById || null, assignedDate: data.assignedDate || "", dueDate: data.dueDate || "", attachments: Array.isArray(data.attachments) ? data.attachments : data.attachmentUrl ? [data.attachmentUrl] : [], totalActiveSeconds: data.totalActiveSeconds ?? 0, activeSince: data.activeSince || null, startedAt: data.startedAt || null, closedAt: data.closedAt || null, createdAt: data.createdAt || null, recurring: !!draftTask.recurring, recurringInterval: draftTask.recurringInterval || "DAILY" };
        setTasks((prev) => prev.map((t) => t.id === tempId ? created : t));
        showSnackbar("Task created", "success");
      }
      closeDialog();
    } catch (e) { console.error("Failed to save task", e); }
    finally { setSavingTask(false); }
  }, [draftTask, editingTask, viewingUserId, currentUserId, closeDialog, columns, tasks, showSnackbar]);

  const handleDeleteTask = useCallback(async (task) => {
    const ownerKey = viewingUserId || currentUserId;
    if (!ownerKey) return;
    if (task.assignedById && task.assignedById !== ownerKey) { setConstraintError("You cannot delete a task assigned by someone else."); return; }
    if (!window.confirm("Delete this card?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/tasks/${task.id}`, { data: { userId: ownerKey } });
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      showSnackbar("Task deleted", "success");
    } catch (e) { console.error("Failed to delete task", e); }
  }, [viewingUserId, currentUserId, showSnackbar]);

  const handleSaveList = async () => {
    const ownerKey = viewingUserId || currentUserId;
    if (!newListTitle.trim() || !ownerKey) return;
    try {
      const title = newListTitle.trim();
      const tempCol = { id: TITLE_TO_ID[title] || slugify(title), title, order: columns.length, _temp: true };
      setColumns((prev) => [...prev, tempCol]);
      const { data } = await axios.post(`${API_BASE_URL}/api/tasks/columns`, { title, userId: ownerKey, order: tempCol.order });
      const realCol = { id: String(data.id || data._id || TITLE_TO_ID[data.title] || slugify(data.title)), title: data.title, order: data.order ?? tempCol.order };
      setColumns((prev) => prev.map((c) => c._temp && c.title === tempCol.title ? realCol : c));
    } catch (e) { console.error("Failed to create list", e); setColumns((prev) => prev.filter((c) => !c._temp)); }
    finally { setListDialogOpen(false); setNewListTitle(""); }
  };

  const handleDeleteColumn = useCallback(async (column) => {
    const ownerKey = viewingUserId || currentUserId;
    if (!ownerKey) return;
    if (Object.values(COLUMN_IDS).includes(column.id)) return;
    if (!window.confirm(`Delete list "${column.title}"? Cards will move to "New".`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/tasks/columns/${column.id}`, { data: { userId: ownerKey } });
      setColumns((prev) => prev.filter((c) => c.id !== column.id));
      setTasks((prev) => prev.map((t) => t.status === column.id ? { ...t, status: COLUMN_IDS.NEW } : t));
    } catch (e) { console.error("Failed to delete column", e); }
  }, [viewingUserId, currentUserId]);

  const handleAssignSave = useCallback(async (assignPayload) => {
    const assigneeId = assignPayload.assigneeId;
    const managerId = currentUserId;
    if (!assigneeId || !managerId) return;
    const { title, description, status, assigneeName, assignedByName, assignedDate, dueDate, recurring, recurringInterval } = assignPayload;
    const baseTask = { title, description: description || "", status: status || COLUMN_IDS.NEW, assigneeId, assigneeName: assigneeName || "", assignedById: managerId, assignedByName: assignedByName || currentUser?.fullName || currentUser?.name || "", assignedDate: assignedDate || new Date().toISOString(), dueDate: dueDate || null, attachments: [], recurring: !!recurring, recurringInterval: recurringInterval || "DAILY" };
    let tempId;
    setAssigningTask(true);
    try {
      await axios.post(`${API_BASE_URL}/api/tasks`, { ...baseTask, userId: assigneeId });
      tempId = generateId();
      if (viewingUserId === managerId) setTasks((prev) => [...prev, { ...baseTask, userId: managerId, id: tempId }]);
      const { data } = await axios.post(`${API_BASE_URL}/api/tasks`, { ...baseTask, userId: managerId });
      const newId = String(data.id || data._id || tempId);
      if (viewingUserId === managerId) setTasks((prev) => prev.map((t) => t.id === tempId ? { ...t, id: newId } : t));
      showSnackbar("Task assigned", "success");
    } catch (e) {
      console.error("Failed to assign task", e);
      if (tempId && viewingUserId === currentUserId) setTasks((prev) => prev.filter((t) => t.id !== tempId));
    } finally { setAssigningTask(false); setAssignDialogOpen(false); }
  }, [currentUser, currentUserId, viewingUserId, showSnackbar]);

  const totalCards = filteredTasks.length;

  const confirmOpenViewedBoard = () => {
    if (!selectedViewer) return;
    const id = selectedViewer._id || selectedViewer.id;
    if (!id) return;
    setViewingUserId(id);
    setViewingUserName(selectedViewer.fullName || selectedViewer.name || "User");
    setShowTeamView(false); setShowBoardInline(false);
  };

  const closeInlinePickerAndRevert = () => {
    if (!currentUserId) { setShowBoardInline(false); return; }
    setViewingUserId(currentUserId);
    setViewingUserName(currentUser?.fullName || currentUser?.name || "Me");
    setShowTeamView(false); setSelectedViewer(null); setShowBoardInline(false);
  };

  // ── Pill button style ──────────────────────────────────────
  const pillBtn = {
    textTransform: "none",
    borderRadius: "10px",
    fontWeight: 600,
    fontSize: 13,
    px: 2,
    py: 0.75,
    bgcolor: "#FFFFFF",
    color: "#374151",
    border: "1px solid #E5E7EB",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    "&:hover": { bgcolor: "#F9FAFB", borderColor: "#D1D5DB" },
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", bgcolor: "#F0F4FF" }}>
        {/* Top bar */}
        <Box
          sx={{
            bgcolor: "#FFFFFF",
            borderBottom: "1px solid #E5E7EB",
            px: 3,
            py: 1.75,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {/* Left: title */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AssignmentIndIcon sx={{ fontSize: 18, color: "#fff" }} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#0F172A",
                    lineHeight: 1.2,
                  }}
                >
                  {headingPrefix} —{" "}
                  {viewingOwnBoard
                    ? showTeamView ? "My Team Tasks" : "Taskboard"
                    : "Taskboard"}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#94A3B8" }}>
                  {loading ? "Loading…" : `${totalCards} card${totalCards === 1 ? "" : "s"}`}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Right: action buttons */}
          <Stack direction="row" spacing={1} alignItems="center">
            {viewingOwnBoard && (
              <Button
                variant="outlined"
                onClick={() => setShowTeamView((v) => !v)}
                sx={pillBtn}
                startIcon={<AssignmentIndIcon sx={{ fontSize: 14 }} />}
              >
                {showTeamView ? "My Board" : "Team Tasks"}
              </Button>
            )}

            {canViewOtherBoards &&
              (!showBoardInline ? (
                <Button
                  variant="outlined"
                  onClick={() => { setShowBoardInline(true); setSelectedViewer(null); }}
                  sx={pillBtn}
                  startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
                >
                  View Board
                </Button>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: "10px",
                    border: "1px solid #BFDBFE",
                    bgcolor: "#EFF6FF",
                    minWidth: 300,
                  }}
                >
                  <Autocomplete
                    sx={{ flex: 1 }}
                    size="small"
                    options={employees}
                    value={selectedViewer}
                    onChange={(_, v) => setSelectedViewer(v)}
                    getOptionLabel={(opt) => opt.fullName || opt.name || ""}
                    isOptionEqualToValue={(o, v) => (o._id || o.id) === (v?._id || v?.id)}
                    renderInput={(params) => (
                      <TextField {...params} size="small" placeholder="Search employee…"
                        sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff", borderRadius: "8px" } }} />
                    )}
                  />
                  <IconButton size="small" onClick={confirmOpenViewedBoard} disabled={!selectedViewer}
                    sx={{ bgcolor: "#2563EB", color: "#fff", width: 28, height: 28, borderRadius: "8px", "&:hover": { bgcolor: "#1D4ED8" }, "&.Mui-disabled": { bgcolor: "#BFDBFE", color: "#93C5FD" } }}>
                    <CheckIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton size="small" onClick={closeInlinePickerAndRevert}
                    sx={{ bgcolor: "#F1F5F9", color: "#64748B", width: 28, height: 28, borderRadius: "8px", "&:hover": { bgcolor: "#E2E8F0" } }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}

            <Button
              variant="outlined"
              onClick={() => setAssignDialogOpen(true)}
              sx={{ ...pillBtn, color: "#16A34A", borderColor: "#BBF7D0", bgcolor: "#F0FDF4", "&:hover": { bgcolor: "#DCFCE7", borderColor: "#86EFAC" } }}
              startIcon={<AssignmentIndIcon sx={{ fontSize: 14 }} />}
            >
              Assign Task
            </Button>

            <Button
              variant="contained"
              disableElevation
              onClick={() => openCreateDialog(COLUMN_IDS.NEW)}
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              sx={{
                textTransform: "none",
                borderRadius: "10px",
                px: 2.5,
                py: 0.85,
                fontWeight: 700,
                fontSize: 13,
                background: "linear-gradient(135deg, #2563EB, #4F46E5)",
                "&:hover": { background: "linear-gradient(135deg, #1D4ED8, #4338CA)" },
                boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
              }}
            >
              New Card
            </Button>
          </Stack>
        </Box>

        {/* Alerts */}
        {(loadError || constraintError) && (
          <Box sx={{ px: 3, pt: 2 }}>
            {loadError && (
              <Alert severity="warning" sx={{ borderRadius: "10px", mb: 1 }}>{String(loadError)}</Alert>
            )}
            {constraintError && (
              <Alert severity="error" sx={{ borderRadius: "10px" }}>{constraintError}</Alert>
            )}
          </Box>
        )}

        {/* Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="COLUMN">
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  overflowX: "auto",
                  p: 2.5,
                  pb: 3,
                  "&::-webkit-scrollbar": { height: 6 },
                  "&::-webkit-scrollbar-track": { background: "transparent" },
                  "&::-webkit-scrollbar-thumb": { background: "#CBD5E1", borderRadius: 3 },
                }}
              >
                {columns.map((column, index) => {
                  const isDefaultColumn = Object.values(COLUMN_IDS).includes(column.id);
                  const isLimitedColumn = column.id === COLUMN_IDS.PAUSED || column.id === COLUMN_IDS.CLOSED;
                  const visibleCount = limitedVisibleCounts[column.id] ?? 10;

                  return (
                    <Draggable key={column.id} draggableId={String(column.id)} index={index}>
                      {(dragProvided) => (
                        <Box ref={dragProvided.innerRef} {...dragProvided.draggableProps} sx={{ display: "flex" }}>
                          <TaskColumn
                            column={column}
                            tasks={tasksByColumn[column.id] || []}
                            loading={loading}
                            onAddTask={openCreateDialog}
                            onEditTask={openEditDialog}
                            onDeleteTask={handleDeleteTask}
                            onDeleteColumn={handleDeleteColumn}
                            dragHandleProps={dragProvided.dragHandleProps}
                            isLimitedColumn={isLimitedColumn}
                            visibleCount={visibleCount}
                            onSeeMore={isLimitedColumn ? () => setLimitedVisibleCounts((prev) => ({ ...prev, [column.id]: (prev[column.id] || 10) + 10 })) : undefined}
                            canDeleteColumn={!isDefaultColumn}
                          />
                        </Box>
                      )}
                    </Draggable>
                  );
                })}

                {provided.placeholder}

                {/* Add list button */}
                <Box
                  onClick={() => { setNewListTitle(""); setListDialogOpen(true); }}
                  sx={{
                    minWidth: 220,
                    height: 52,
                    borderRadius: "16px",
                    border: "2px dashed #CBD5E1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    cursor: "pointer",
                    color: "#94A3B8",
                    transition: "all 0.15s",
                    "&:hover": { borderColor: "#2563EB", color: "#2563EB", bgcolor: "#EFF6FF" },
                    mt: 0,
                  }}
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Add another list</Typography>
                </Box>
              </Box>
            )}
          </Droppable>
        </DragDropContext>

        {/* Dialogs */}
        <TaskDialog
          open={dialogOpen}
          draftTask={draftTask}
          editingTask={editingTask}
          columns={columns}
          onClose={closeDialog}
          onChangeField={handleDraftChange}
          onSave={handleSaveTask}
          error={dialogError}
          saving={savingTask}
        />

        <AssignTaskDialog
          open={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          onSave={handleAssignSave}
          employees={employees}
          currentUser={currentUser}
          assigning={assigningTask}
        />

        {/* New list dialog */}
        <Dialog
          open={listDialogOpen}
          onClose={() => setListDialogOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: "16px" } }}
        >
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16, color: "#0F172A", px: 3, pt: 2.5 }}>
            New List
          </DialogTitle>
          <DialogContent sx={{ px: 3 }}>
            <TextField
              autoFocus fullWidth label="List name" size="small"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveList()}
              sx={{ ...fieldSx, mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => setListDialogOpen(false)}
              sx={{ textTransform: "none", color: "#64748B", borderRadius: "8px" }}>
              Cancel
            </Button>
            <Button variant="contained" disableElevation onClick={handleSaveList}
              sx={{ textTransform: "none", borderRadius: "8px", fontWeight: 600, bgcolor: "#2563EB", "&:hover": { bgcolor: "#1D4ED8" } }}>
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            sx={{ width: "100%", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default TaskBoard;