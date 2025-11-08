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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";
import axios from "axios";

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

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

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
  return new Date(value).toLocaleDateString("en-IN");
};

const formatTimeHM = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleTimeString("en-IN", {
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
    const delta =
      (Date.now() - new Date(task.activeSince).getTime()) / 1000;
    return base + Math.max(0, delta);
  }
  return base;
};

const getDueColor = (due) => {
  if (!due) return null;
  const now = Date.now();
  const d = new Date(due).getTime();
  if (d < now) return "error.main";
  if (d - now <= 24 * 3600 * 1000) return "warning.main";
  return "success.main";
};

// background colour: overdue -> light red; else based on age
const getTaskBgColor = (task) => {
  const now = Date.now();

  if (task.dueDate) {
    const due = new Date(task.dueDate).getTime();
    if (due < now && task.status !== COLUMN_IDS.CLOSED) {
      return "#fde7e9"; // overdue
    }
  }

  const start = task.assignedDate || task.createdAt;
  if (!start) return "#ffffff";
  const diffMs = Date.now() - new Date(start).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 5) return "#e6f4ea"; // light green
  if (diffDays < 10) return "#fff4e5"; // light orange
  return "#fde7e9"; // light red
};

// ---------- Card component ----------
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
    task.assignedByName &&
    task.assignedByName !== task.assigneeName;

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <Paper
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          elevation={snapshot.isDragging ? 2 : 0}
          sx={{
            mb: 1,
            p: 1,
            borderRadius: 2,
            bgcolor: getTaskBgColor(task),
            color: "#111111",
            border: "1px solid #e5e7eb",
            cursor: "grab",
          }}
        >
          {firstAttachment && (
            <Box
              sx={{
                mb: 1,
                borderRadius: 1.5,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                maxHeight: 180,
              }}
            >
              <img
                src={firstAttachment}
                alt={task.title}
                style={{
                  width: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
              />
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 0.5,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, fontSize: 13, color: "#111" }}
            >
              {task.title}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                onClick={() => onEdit(task)}
                sx={{ color: "#111" }}
              >
                <EditIcon fontSize="inherit" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onDelete(task)}
                sx={{ color: "#111" }}
              >
                <DeleteIcon fontSize="inherit" />
              </IconButton>
            </Stack>
          </Box>

          {task.description && (
            <Typography
              variant="body2"
              sx={{ fontSize: 12, color: "#111", mb: 0.5 }}
            >
              {task.description}
            </Typography>
          )}

          {task.startedAt && task.status === COLUMN_IDS.OPEN && (
            <Typography
              variant="caption"
              sx={{
                fontSize: 11,
                color: "#374151",
                display: "block",
                mb: 0.25,
              }}
            >
              Started at {formatTimeHM(task.startedAt)}
            </Typography>
          )}

          {showAssignedBy && (
            <Typography
              variant="caption"
              sx={{
                fontSize: 11,
                color: "#4b5563",
                display: "block",
                mb: 0.25,
              }}
            >
              Assigned by {task.assignedByName}
            </Typography>
          )}

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            sx={{ fontSize: 11, color: "#111" }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {task.dueDate && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <CalendarMonthIcon
                    sx={{ fontSize: 14, color: getDueColor(task.dueDate) }}
                  />
                  <Typography variant="caption" sx={{ color: "#111" }}>
                    {formatDate(task.dueDate)}
                  </Typography>
                </Stack>
              )}
              {task.assigneeName && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <AssignmentIndIcon
                    sx={{ fontSize: 14, color: "#111" }}
                  />
                  <Typography variant="caption" sx={{ color: "#111" }}>
                    {task.assigneeName}
                  </Typography>
                </Stack>
              )}
            </Stack>

            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: "#111" }}
            >
              {formatHHMMSS(computeSpentSeconds(task))}
            </Typography>
          </Stack>
        </Paper>
      )}
    </Draggable>
  );
};

// ---------- Column component ----------
const TaskColumn = ({
  column,
  tasks,
  loading,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDeleteColumn,
  dragHandleProps,
  isLimitedColumn = false,
  visibleCount,
  onSeeMore,
  canDeleteColumn,
}) => {
  const displayTasks =
    isLimitedColumn && typeof visibleCount === "number"
      ? tasks.slice(0, visibleCount)
      : tasks;

  return (
    <Paper
      elevation={1}
      sx={{
        minWidth: 260,
        maxWidth: 260,
        mr: 2,
        borderRadius: 3,
        bgcolor: "#ffffff",
        color: "#111111",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 180px)",
        border: "1px solid #e5e7eb",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "#fafafa",
        }}
        {...dragHandleProps}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, fontSize: 14, color: "#111" }}
          >
            {column.title}
          </Typography>
          <Box
            sx={{
              px: 1,
              py: 0.3,
              borderRadius: 999,
              bgcolor: "#fff",
              border: "1px solid #e5e7eb",
              fontSize: 11,
              color: "#111",
            }}
          >
            {tasks.length}
          </Box>
        </Stack>
        {canDeleteColumn && onDeleteColumn && (
          <IconButton
            size="small"
            onClick={() => onDeleteColumn(column)}
            sx={{ color: "#6b7280" }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Droppable droppableId={column.id} type="TASK">
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              flex: 1,
              p: 1.5,
              overflowY: "auto",
              backgroundColor: snapshot.isDraggingOver
                ? "#f1f5f9"
                : "transparent",
              transition: "background-color 0.18s",
            }}
          >
            {displayTasks.length === 0 && !loading && (
              <Typography
                variant="caption"
                sx={{ color: "#6b7280", fontSize: 11 }}
              >
                No cards yet
              </Typography>
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

            {isLimitedColumn &&
              tasks.length > (visibleCount || 0) &&
              onSeeMore && (
                <Button
                  size="small"
                  onClick={onSeeMore}
                  sx={{
                    mt: 0.5,
                    textTransform: "none",
                    justifyContent: "flex-start",
                    color: "#111",
                    fontSize: 12,
                  }}
                >
                  Show more tasks…
                </Button>
              )}

            <Button
              onClick={() => onAddTask(column.id)}
              sx={{
                mt: 0.75,
                textTransform: "none",
                justifyContent: "flex-start",
                fontSize: 13,
                borderRadius: 2,
                px: 1,
                py: 0.5,
                bgcolor: "#f3f4f6",
                color: "#111",
                "&:hover": {
                  bgcolor: "#e5e7eb",
                },
              }}
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            >
              Add a card
            </Button>
          </Box>
        )}
      </Droppable>
    </Paper>
  );
};

// ---------- Dialog for task (quick create/edit) ----------
const TaskDialog = ({
  open,
  draftTask,
  editingTask,
  columns,
  onClose,
  onChangeField,
  onSave,
  error,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle
      sx={{
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      {editingTask ? (
        <>
          <EditIcon fontSize="small" />
          Edit card
        </>
      ) : (
        <>
          <AddIcon fontSize="small" />
          Create new card
        </>
      )}
    </DialogTitle>

    <DialogContent
      dividers
      sx={{
        bgcolor: "#fafafa",
      }}
    >
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 0.5 }}>
            {error}
          </Alert>
        )}

        {/* Title & List */}
        <Stack spacing={1.5}>
          <TextField
            label="Title"
            placeholder="e.g. Follow up with client, design homepage hero..."
            fullWidth
            required
            size="small"
            value={draftTask.title}
            onChange={(e) => onChangeField("title", e.target.value)}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              select
              label="List"
              fullWidth
              size="small"
              value={draftTask.status}
              onChange={(e) => onChangeField("status", e.target.value)}
            >
              {columns.map((c) => {
                const disabled =
                  editingTask &&
                  editingTask.status === COLUMN_IDS.OPEN &&
                  c.id === COLUMN_IDS.NEW;
                return (
                  <MenuItem key={c.id} value={c.id} disabled={disabled}>
                    {c.title}
                  </MenuItem>
                );
              })}
            </TextField>

            <TextField
              label="Assignee (optional)"
              fullWidth
              size="small"
              placeholder="Who owns this card?"
              value={draftTask.assigneeName}
              onChange={(e) => onChangeField("assigneeName", e.target.value)}
            />
          </Stack>
        </Stack>

        {/* Description */}
        <TextField
          label="Description"
          fullWidth
          multiline
          minRows={2}
          size="small"
          placeholder="Add useful context, links, or steps…"
          value={draftTask.description}
          onChange={(e) => onChangeField("description", e.target.value)}
        />

        {/* Attachment + Due date */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Attachment image URL"
            fullWidth
            size="small"
            placeholder="https://… (optional)"
            value={draftTask.attachmentUrl}
            onChange={(e) => onChangeField("attachmentUrl", e.target.value)}  
          />

          <TextField
            label="Due date"
            type="date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            value={draftTask.dueDate}
            onChange={(e) => onChangeField("dueDate", e.target.value)}
          />
        </Stack>
      </Stack>
    </DialogContent>

    <DialogActions
      sx={{
        bgcolor: "#f9fafb",
        px: 3,
        py: 1.5,
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <Button onClick={onClose} sx={{ textTransform: "none" }}>
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={onSave}
        sx={{ textTransform: "none", borderRadius: 999, px: 3 }}
      >
        {editingTask ? "Save changes" : "Create card"}
      </Button>
    </DialogActions>
  </Dialog>
);

// ---------- Assign Task Dialog ----------
const AssignTaskDialog = ({ open, onClose, onSave, employees, currentUser }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedDate, setAssignedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [assignee, setAssignee] = useState(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setDueDate("");
      setAssignedDate(new Date().toISOString().slice(0, 10));
      setAssignee(null);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!title.trim() || !assignee) return;
    onSave({
      title: title.trim(),
      description,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      assignedDate: assignedDate
        ? new Date(assignedDate).toISOString()
        : new Date().toISOString(),
      assigneeId: assignee?._id || assignee?.id,
      assigneeName: assignee?.fullName || assignee?.name || "",
      assignedById: currentUser?._id || currentUser?.id,
      assignedByName: currentUser?.fullName || currentUser?.name || "",
      status: COLUMN_IDS.NEW,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <AssignmentIndIcon fontSize="small" />
        Assign Task
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          bgcolor: "#fafafa",
        }}
      >
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            fullWidth
            required
            size="small"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={2}
            size="small"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Due date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <TextField
              label="Assigned date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)}
            />
          </Stack>
          <TextField
            label="Assigned by"
            fullWidth
            size="small"
            value={currentUser?.fullName || currentUser?.name || ""}
            InputProps={{ readOnly: true }}
            helperText="Auto-filled from your account"
          />
          <Autocomplete
            options={employees}
            getOptionLabel={(opt) => opt.fullName || opt.name || ""}
            isOptionEqualToValue={(o, v) =>
              (o._id || o.id) === (v?._id || v?.id)
            }
            value={assignee}
            onChange={(_, v) => setAssignee(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Assigned to"
                required
                size="small"
                helperText="Shows active employees"
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          bgcolor: "#f9fafb",
        }}
      >
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ================= MAIN COMPONENT =================

const TaskBoard = () => {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [draftTask, setDraftTask] = useState({
    id: null,
    title: "",
    description: "",
    status: "",
    assigneeName: "",
    dueDate: "",
    attachmentUrl: "",
  });
  const [dialogError, setDialogError] = useState("");

  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [showTeamView, setShowTeamView] = useState(false);
  const [showBoardInline, setShowBoardInline] = useState(false);
  const [selectedViewer, setSelectedViewer] = useState(null);

  const [viewingUserId, setViewingUserId] = useState(null);
  const [viewingUserName, setViewingUserName] = useState("");

  const [constraintError, setConstraintError] = useState("");

  // show-more counts for PAUSED + CLOSED
  const [limitedVisibleCounts, setLimitedVisibleCounts] = useState({
    [COLUMN_IDS.PAUSED]: 10,
    [COLUMN_IDS.CLOSED]: 10,
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [currentUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const currentUserId = useMemo(
    () => (currentUser && (currentUser._id || currentUser.id)) || null,
    [currentUser]
  );

  const canViewOtherBoards = useMemo(() => {
    const role =
      currentUser?.role ||
      currentUser?.userRole ||
      currentUser?.roleName ||
      "";
    return role === "Manager" || role === "Super Admin";
  }, [currentUser]);

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleSnackbarClose = useCallback((_, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  // auto-clear constraint errors
  useEffect(() => {
    if (!constraintError) return;
    const id = setTimeout(() => setConstraintError(""), 5000);
    return () => clearTimeout(id);
  }, [constraintError]);

  // reset visible counts when tasks change significantly
  useEffect(() => {
    setLimitedVisibleCounts({
      [COLUMN_IDS.PAUSED]: 10,
      [COLUMN_IDS.CLOSED]: 10,
    });
  }, [tasks.length, viewingUserId, showTeamView]);

  // initialize viewing to self
  useEffect(() => {
    if (currentUserId && !viewingUserId) {
      setViewingUserId(currentUserId);
      setViewingUserName(
        currentUser?.fullName || currentUser?.name || "Me"
      );
    }
  }, [currentUserId, currentUser, viewingUserId]);

  const viewingOwnBoard = useMemo(
    () => !!currentUserId && viewingUserId === currentUserId,
    [currentUserId, viewingUserId]
  );

  const headingPrefix =
    viewingUserName || currentUser?.fullName || "Task";

  // fetch active employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/employees`);
      const raw = res.data || [];
      const active = raw
        .filter((emp) => (emp.status || "").toLowerCase() === "active")
        .sort((a, b) =>
          (a.fullName || a.name || "").localeCompare(
            b.fullName || b.name || ""
          )
        );
      setEmployees(active);
    } catch (e) {
      console.error("Failed to fetch employees", e);
      setEmployees([]);
    }
  }, []);

  const normalizeColumns = (cols) => {
    const normalized = cols.map((c) => {
      const inferredId =
        c.id || c._id || TITLE_TO_ID[c.title] || String(c.title || "");
      return {
        id: TITLE_TO_ID[c.title] || String(inferredId),
        title: c.title,
        order: c.order ?? 0,
      };
    });
    return normalized.length ? normalized : DEFAULT_COLUMNS.slice();
  };

  // load board
  const loadBoard = useCallback(
    async (ownerId) => {
      const targetId = ownerId || viewingUserId || currentUserId;
      if (!targetId) return;

      try {
        setLoading(true);
        setLoadError(null);

        const { data } = await axios.get(
          `${API_BASE_URL}/api/tasks/board`,
          {
            params: { userId: targetId },
          }
        );

        const finalColsRaw = normalizeColumns(data?.columns || []);
        const finalCols = isEmptyArray(finalColsRaw)
          ? DEFAULT_COLUMNS.slice()
          : finalColsRaw.sort((a, b) => a.order - b.order);

        const validColumnIds = new Set(finalCols.map((c) => c.id));
        const fallbackColId = finalCols[0]?.id || COLUMN_IDS.NEW;

        const loadedTasks = (data.tasks || []).map((t) => {
          const safeStatus = validColumnIds.has(t.status)
            ? t.status
            : TITLE_TO_ID[t.status] || fallbackColId;
          return {
            id: String(t.id || t._id || generateId()),
            title: t.title,
            description: t.description || "",
            status: safeStatus,
            assigneeName: t.assigneeName || "",
            assigneeId: t.assigneeId || null,
            assignedByName: t.assignedByName || "",
            assignedById: t.assignedById || null,
            assignedDate: t.assignedDate || "",
            dueDate: t.dueDate || "",
            attachments: Array.isArray(t.attachments)
              ? t.attachments
              : t.attachmentUrl
                ? [t.attachmentUrl]
                : [],
            totalActiveSeconds: t.totalActiveSeconds ?? 0,
            activeSince: t.activeSince || null,
            startedAt: t.startedAt || null,
            createdAt: t.createdAt || null,
          };
        });

        setColumns(finalCols);
        setTasks(loadedTasks);

        if (finalCols.length > 0) {
          setDraftTask((prev) =>
            prev.status ? prev : { ...prev, status: finalCols[0].id }
          );
        }
      } catch (e) {
        console.error("Failed to load board", e);
        setLoadError(e?.message || "Failed to contact server");
        setColumns(DEFAULT_COLUMNS);
        setTasks([]);
        setDraftTask((prev) =>
          prev.status ? prev : { ...prev, status: DEFAULT_COLUMNS[0].id }
        );
      } finally {
        setLoading(false);
      }
    },
    [viewingUserId, currentUserId]
  );

  useEffect(() => {
    if (viewingUserId || currentUserId) {
      loadBoard(viewingUserId || currentUserId);
    }
  }, [loadBoard, viewingUserId, currentUserId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // filter logic
  const filteredTasks = useMemo(() => {
    if (!viewingOwnBoard) return tasks;
    if (!currentUserId) return tasks;
    const uid = currentUserId;

    if (showTeamView) {
      return tasks.filter(
        (t) =>
          t.assignedById === uid && t.assigneeId && t.assigneeId !== uid
      );
    }
    return tasks.filter(
      (t) =>
        !(
          t.assignedById === uid &&
          t.assigneeId &&
          t.assigneeId !== uid
        )
    );
  }, [tasks, showTeamView, viewingOwnBoard, currentUserId]);

  // group by column
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

  // dnd handler (columns + tasks)
  const handleDragEnd = useCallback(
    async (result) => {
      const { source, destination, draggableId, type } = result;
      if (!destination) return;

      const ownerKey = viewingUserId || currentUserId;

      // Column drag
      if (type === "COLUMN") {
        if (
          source.index === destination.index ||
          !ownerKey
        )
          return;

        const newCols = Array.from(columns);
        const [movedCol] = newCols.splice(source.index, 1);
        newCols.splice(destination.index, 0, movedCol);
        setColumns(newCols);

        try {
          await axios.patch(
            `${API_BASE_URL}/api/tasks/columns/reorder`,
            {
              userId: ownerKey,
              orderedIds: newCols.map((c) => c.id),
            }
          );
        } catch (e) {
          console.error("Failed to reorder columns", e);
        }
        return;
      }

      // Task drag
      const sourceColId = source.droppableId;
      const destColId = destination.droppableId;
      const sourceIndex = source.index;
      const destIndex = destination.index;

      if (
        sourceColId === destColId &&
        sourceIndex === destIndex
      )
        return;

      // once OPEN, cannot go back to NEW
      if (
        sourceColId === COLUMN_IDS.OPEN &&
        destColId === COLUMN_IDS.NEW
      ) {
        setConstraintError(
          "A started task cannot be moved back to New."
        );
        return;
      }

      // max 2 open tasks at a time
      if (
        destColId === COLUMN_IDS.OPEN &&
        sourceColId !== COLUMN_IDS.OPEN
      ) {
        const openCount = tasks.filter(
          (t) => t.status === COLUMN_IDS.OPEN
        ).length;
        if (openCount >= 2) {
          setConstraintError(
            "You already have 2 open tasks. Close or pause open tasks first."
          );
          return;
        }
      }

      // optimistic local update
      setTasks((prev) => {
        const copy = [...prev];
        const moved = copy.find(
          (t) => String(t.id) === String(draggableId)
        );
        if (!moved) return prev;

        // NEW/PAUSED -> OPEN: set startedAt/activeSince
        if (
          destColId === COLUMN_IDS.OPEN &&
          moved.status !== COLUMN_IDS.OPEN
        ) {
          const nowIso = new Date().toISOString();
          moved.startedAt = moved.startedAt || nowIso;
          moved.activeSince = nowIso;
        }

        if (
          moved.status === COLUMN_IDS.OPEN &&
          destColId !== COLUMN_IDS.OPEN
        ) {
          moved.activeSince = null;
        }

        if (sourceColId === destColId) {
          const sameCol = copy.filter(
            (t) => t.status === sourceColId
          );
          const others = copy.filter(
            (t) => t.status !== sourceColId
          );

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
          const currentColumnTasks = tasks
            .filter((t) => t.status === destColId)
            .sort((a, b) =>
              String(a.id).localeCompare(String(b.id))
            );

          const orderedIds = (() => {
            const ids = currentColumnTasks.map((t) =>
              String(t.id)
            );
            const [movedId] = ids.splice(sourceIndex, 1);
            ids.splice(destIndex, 0, movedId);
            return ids;
          })();

          await axios.patch(
            `${API_BASE_URL}/api/tasks/reorder`,
            {
              status: destColId,
              orderedIds,
              userId: ownerKey,
            }
          );
        } else {
          const { data: updatedTask } = await axios.patch(
            `${API_BASE_URL}/api/tasks/${draggableId}/status`,
            {
              from: sourceColId,
              to: destColId,
              destIndex,
              userId: ownerKey,
            }
          );

          // sync timers + status from server
          setTasks((prev) =>
            prev.map((t) =>
              String(t.id) === String(draggableId)
                ? {
                    ...t,
                    status: updatedTask.status || t.status,
                    totalActiveSeconds:
                      updatedTask.totalActiveSeconds ?? t.totalActiveSeconds,
                    activeSince: updatedTask.activeSince || null,
                    startedAt: updatedTask.startedAt || t.startedAt,
                    closedAt: updatedTask.closedAt || null,
                  }
                : t
            )
          );
        }
      } catch (e) {
        console.error("Failed to update DnD change", e);
      }
    },
    [columns, tasks, viewingUserId, currentUserId]
  );

  // task dialog handlers
  const openCreateDialog = useCallback(
    (columnId) => {
      const status = columnId || columns[0]?.id || COLUMN_IDS.NEW;
      setEditingTask(null);
      setDialogError("");
      setDraftTask({
        id: null,
        title: "",
        description: "",
        status,
        assigneeName: "",
        dueDate: "",
        attachmentUrl: "",
      });
      setDialogOpen(true);
    },
    [columns]
  );

  const openEditDialog = useCallback((task) => {
    const firstAttachment =
      Array.isArray(task.attachments) &&
        task.attachments.length > 0
        ? task.attachments[0]
        : "";
    setEditingTask(task);
    setDialogError("");
    setDraftTask({
      id: task.id,
      title: task.title,
      description: task.description || "",
      status: task.status,
      assigneeName: task.assigneeName || "",
      dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : "",
      attachmentUrl: firstAttachment,
    });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingTask(null);
    setDialogError("");
    setDraftTask({
      id: null,
      title: "",
      description: "",
      status: columns[0] ? columns[0].id : COLUMN_IDS.NEW,
      assigneeName: "",
      dueDate: "",
      attachmentUrl: "",
    });
  }, [columns]);

  const handleDraftChange = useCallback((field, value) => {
    setDraftTask((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveTask = useCallback(
    async () => {
      if (!draftTask.title.trim()) return;

      const attachments = draftTask.attachmentUrl?.trim()
        ? [draftTask.attachmentUrl.trim()]
        : [];

      const safeStatus =
        draftTask.status || columns[0]?.id || COLUMN_IDS.NEW;

      // enforce max 2 OPEN
      if (safeStatus === COLUMN_IDS.OPEN) {
        const openCount = tasks.filter(
          (t) => t.status === COLUMN_IDS.OPEN
        ).length;
        const isAlreadyOpen =
          editingTask && editingTask.status === COLUMN_IDS.OPEN;
        const effectiveOpen =
          openCount + (isAlreadyOpen ? 0 : 1);
        if (effectiveOpen > 2) {
          setDialogError(
            "You already have 2 open tasks. Close or pause open tasks first."
          );
          return;
        }
      }

      const ownerKey = viewingUserId || currentUserId;
      if (!ownerKey) return;

      const payloadForApi = {
        title: draftTask.title.trim(),
        description: draftTask.description,
        status: safeStatus,
        assigneeName: draftTask.assigneeName,
        dueDate: draftTask.dueDate
          ? new Date(draftTask.dueDate).toISOString()
          : null,
        attachments,
        userId: ownerKey,
      };

      let tempId;
      try {
        if (editingTask) {
          await axios.put(
            `${API_BASE_URL}/api/tasks/${editingTask.id}`,
            payloadForApi
          );
          setTasks((prev) =>
            prev.map((t) =>
              t.id === editingTask.id
                ? { ...t, ...payloadForApi }
                : t
            )
          );
          showSnackbar("Task updated", "success");
        } else {
          tempId = generateId();
          setTasks((prev) => [
            ...prev,
            {
              ...payloadForApi,
              id: tempId,
              startedAt:
                safeStatus === COLUMN_IDS.OPEN
                  ? new Date().toISOString()
                  : null,
            },
          ]);

          const { data } = await axios.post(
            `${API_BASE_URL}/api/tasks`,
            payloadForApi
          );
          const newId = String(data.id || data._id || tempId);
          setTasks((prev) =>
            prev.map((t) =>
              t.id === tempId ? { ...t, id: newId } : t
            )
          );
          showSnackbar("Task created", "success");
        }
        closeDialog();
      } catch (e) {
        console.error("Failed to save task", e);
      }
    },
    [
      draftTask,
      editingTask,
      viewingUserId,
      currentUserId,
      closeDialog,
      columns,
      tasks,
      showSnackbar,
    ]
  );

  const handleDeleteTask = useCallback(
    async (task) => {
      const ownerKey = viewingUserId || currentUserId;
      if (!ownerKey) return;

      // cannot delete if assigned by someone else
      if (
        task.assignedById &&
        task.assignedById !== ownerKey
      ) {
        setConstraintError(
          "You cannot delete a task assigned by someone else."
        );
        return;
      }

      if (!window.confirm("Delete this card?")) return;

      try {
        await axios.delete(
          `${API_BASE_URL}/api/tasks/${task.id}`,
          {
            data: { userId: ownerKey },
          }
        );
        setTasks((prev) =>
          prev.filter((t) => t.id !== task.id)
        );
        showSnackbar("Task deleted", "success");
      } catch (e) {
        console.error("Failed to delete task", e);
      }
    },
    [viewingUserId, currentUserId, showSnackbar]
  );

  // list dialog handlers
  const openListDialog = () => {
    setNewListTitle("");
    setListDialogOpen(true);
  };
  const closeListDialog = () => {
    setListDialogOpen(false);
    setNewListTitle("");
  };

  const handleSaveList = async () => {
    const ownerKey = viewingUserId || currentUserId;
    if (!newListTitle.trim() || !ownerKey) return;

    try {
      const title = newListTitle.trim();
      const tempCol = {
        id: TITLE_TO_ID[title] || slugify(title),
        title,
        order: columns.length,
        _temp: true,
      };

      setColumns((prev) => [...prev, tempCol]);

      const { data } = await axios.post(
        `${API_BASE_URL}/api/tasks/columns`,
        {
          title,
          userId: ownerKey,
          order: tempCol.order,
        }
      );

      const realCol = {
        id: String(
          data.id ||
          data._id ||
          TITLE_TO_ID[data.title] ||
          slugify(data.title)
        ),
        title: data.title,
        order: data.order ?? tempCol.order,
      };

      setColumns((prev) =>
        prev.map((c) =>
          c._temp && c.title === tempCol.title ? realCol : c
        )
      );
    } catch (e) {
      console.error("Failed to create list", e);
      setColumns((prev) => prev.filter((c) => !c._temp));
    } finally {
      setListDialogOpen(false);
      setNewListTitle("");
    }
  };

  const handleDeleteColumn = useCallback(
    async (column) => {
      const ownerKey = viewingUserId || currentUserId;
      if (!ownerKey) return;

      const defaultIds = Object.values(COLUMN_IDS);
      if (defaultIds.includes(column.id)) return;

      if (
        !window.confirm(
          `Delete list "${column.title}"? Cards will move to "New".`
        )
      )
        return;

      try {
        await axios.delete(
          `${API_BASE_URL}/api/tasks/columns/${column.id}`,
          { data: { userId: ownerKey } }
        );
        setColumns((prev) =>
          prev.filter((c) => c.id !== column.id)
        );
        setTasks((prev) =>
          prev.map((t) =>
            t.status === column.id
              ? { ...t, status: COLUMN_IDS.NEW }
              : t
          )
        );
      } catch (e) {
        console.error("Failed to delete column", e);
      }
    },
    [viewingUserId, currentUserId]
  );

  // assign task handlers
  const openAssignDialog = () => setAssignDialogOpen(true);
  const closeAssignDialog = () => setAssignDialogOpen(false);

  const handleAssignSave = useCallback(
    async (assignPayload) => {
      const assigneeId = assignPayload.assigneeId;
      const managerId = currentUserId;
      if (!assigneeId || !managerId) return;

      const baseTask = {
        title: assignPayload.title,
        description: assignPayload.description || "",
        status: assignPayload.status || COLUMN_IDS.NEW,
        assigneeId,
        assigneeName: assignPayload.assigneeName || "",
        assignedById: managerId,
        assignedByName:
          assignPayload.assignedByName ||
          currentUser?.fullName ||
          currentUser?.name ||
          "",
        assignedDate:
          assignPayload.assignedDate || new Date().toISOString(),
        dueDate: assignPayload.dueDate || null,
        attachments: [],
      };

      let tempId;
      try {
        // on employee's board
        await axios.post(`${API_BASE_URL}/api/tasks`, {
          ...baseTask,
          userId: assigneeId,
        });

        // on manager's board
        tempId = generateId();
        if (viewingUserId === managerId) {
          setTasks((prev) => [
            ...prev,
            { ...baseTask, userId: managerId, id: tempId },
          ]);
        }

        const { data } = await axios.post(`${API_BASE_URL}/api/tasks`, {
          ...baseTask,
          userId: managerId,
        });
        const newId = String(data.id || data._id || tempId);

        if (viewingUserId === managerId) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === tempId ? { ...t, id: newId } : t
            )
          );
        }

        showSnackbar("Task assigned", "success");
      } catch (e) {
        console.error("Failed to assign task", e);
        if (tempId && viewingUserId === currentUserId) {
          setTasks((prev) => prev.filter((t) => t.id !== tempId));
        }
      } finally {
        setAssignDialogOpen(false);
      }
    },
    [currentUser, currentUserId, viewingUserId, showSnackbar]
  );

  const totalCards = filteredTasks.length;

  // View Board inline actions
  const openInlinePicker = () => {
    setShowBoardInline(true);
    setSelectedViewer(null);
  };

  const confirmOpenViewedBoard = () => {
    if (!selectedViewer) return;
    const id = selectedViewer._id || selectedViewer.id;
    if (!id) return;

    setViewingUserId(id);
    setViewingUserName(
      selectedViewer.fullName || selectedViewer.name || "User"
    );
    setShowTeamView(false);
    setShowBoardInline(false);
  };

  const closeInlinePickerAndRevert = () => {
    if (!currentUserId) {
      setShowBoardInline(false);
      return;
    }
    setViewingUserId(currentUserId);
    setViewingUserName(
      currentUser?.fullName || currentUser?.name || "Me"
    );
    setShowTeamView(false);
    setSelectedViewer(null);
    setShowBoardInline(false);
  };

  const headerBtnSx = {
    textTransform: "none",
    borderRadius: 999,
    bgcolor: "#ffffff",
    color: "#000000",
    border: "1px solid #000",
    "&:hover": { bgcolor: "#f9fafb" },
  };

  return (
    <Box sx={{ position: "relative", minHeight: "100vh", bgcolor: "#ffffff" }}>
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#000",
            px: 1,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                letterSpacing: 0.3,
                color: "#000",
              }}
            >
              {headingPrefix} -{" "}
              {viewingOwnBoard
                ? showTeamView
                  ? "My Team Tasks"
                  : "Taskboard"
                : "Taskboard"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#000" }}>
              {loading
                ? "Loading cards..."
                : `${totalCards} card${totalCards === 1 ? "" : "s"}`}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="contained"
              onClick={() =>
                viewingOwnBoard && setShowTeamView((v) => !v)
              }
              disabled={!viewingOwnBoard}
              sx={headerBtnSx}
              startIcon={<AssignmentIndIcon />}
              title={
                viewingOwnBoard
                  ? "Toggle My Team view"
                  : "Switch back to your board to use this"
              }
            >
              {showTeamView ? "Back to My Board" : "My Team Tasks"}
            </Button>

            {canViewOtherBoards &&
              (!showBoardInline ? (
                <Button
                  variant="contained"
                  onClick={openInlinePicker}
                  sx={headerBtnSx}
                  startIcon={<VisibilityIcon />}
                >
                  View Board
                </Button>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1,
                    py: 0.5,
                    borderRadius: 999,
                    border: "1px solid #d1d5db",
                    bgcolor: "#f3f4f6",
                    minWidth: { xs: 260, sm: 360 },
                  }}
                >
                  <Autocomplete
                    sx={{ flex: 1 }}
                    size="small"
                    options={employees}
                    value={selectedViewer}
                    onChange={(_, v) => setSelectedViewer(v)}
                    getOptionLabel={(opt) =>
                      opt.fullName || opt.name || ""
                    }
                    isOptionEqualToValue={(o, v) =>
                      (o._id || o.id) === (v?._id || v?.id)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder="Search employee…"
                      />
                    )}
                  />

                  <IconButton
                    size="small"
                    onClick={confirmOpenViewedBoard}
                    disabled={!selectedViewer}
                    sx={{ color: "#000" }}
                    title="Open board"
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>

                  <IconButton
                    size="small"
                    onClick={closeInlinePickerAndRevert}
                    sx={{ color: "#000" }}
                    title="Close and revert to my board"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}

            <Button
              variant="contained"
              onClick={openAssignDialog}
              sx={headerBtnSx}
              startIcon={<AssignmentIndIcon />}
            >
              Assign Task
            </Button>

            <Button
              variant="contained"
              onClick={() => openCreateDialog(COLUMN_IDS.NEW)}
              startIcon={<AddIcon />}
              sx={{
                textTransform: "none",
                borderRadius: 999,
                px: 2.5,
                bgcolor: "#111827",
                border: "1px solid #111827",
                "&:hover": { bgcolor: "#020617" },
              }}
            >
              New card
            </Button>
          </Stack>
        </Box>

        {loadError && (
          <Box mx={1}>
            <Alert severity="warning">{String(loadError)}</Alert>
          </Box>
        )}

        {constraintError && (
          <Box mx={1}>
            <Alert severity="error">{constraintError}</Alert>
          </Box>
        )}

        {/* board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable
            droppableId="board"
            direction="horizontal"
            type="COLUMN"
          >
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  overflowX: "auto",
                  pt: 1,
                  pb: 2,
                  px: 1,
                }}
              >
                {columns.map((column, index) => {
                  const isDefaultColumn = Object.values(
                    COLUMN_IDS
                  ).includes(column.id);
                  const isLimitedColumn =
                    column.id === COLUMN_IDS.PAUSED ||
                    column.id === COLUMN_IDS.CLOSED;
                  const visibleCount =
                    limitedVisibleCounts[column.id] ?? 10;

                  return (
                    <Draggable
                      key={column.id}
                      draggableId={String(column.id)}
                      index={index}
                    >
                      {(dragProvided) => (
                        <Box
                          ref={dragProvided.innerRef}
                          {...dragProvided.dragHandleProps}
                          sx={{ display: "flex" }}
                        >
                          <TaskColumn
                            column={column}
                            tasks={
                              tasksByColumn[column.id] || []
                            }
                            loading={loading}
                            onAddTask={openCreateDialog}
                            onEditTask={openEditDialog}
                            onDeleteTask={handleDeleteTask}
                            onDeleteColumn={handleDeleteColumn}
                            dragHandleProps={
                              dragProvided.dragHandleProps
                            }
                            isLimitedColumn={isLimitedColumn}
                            visibleCount={visibleCount}
                            onSeeMore={
                              isLimitedColumn
                                ? () =>
                                  setLimitedVisibleCounts(
                                    (prev) => ({
                                      ...prev,
                                      [column.id]:
                                        (prev[column.id] ||
                                          10) + 10,
                                    })
                                  )
                                : undefined
                            }
                            canDeleteColumn={!isDefaultColumn}
                          />
                        </Box>
                      )}
                    </Draggable>
                  );
                })}

                {provided.placeholder}

                <Paper
                  elevation={0}
                  sx={{
                    minWidth: 260,
                    maxWidth: 260,
                    borderRadius: 3,
                    bgcolor: "#ffffff",
                    color: "#111",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 1.5,
                    cursor: "pointer",
                    border: "1px dashed #9ca3af",
                  }}
                  onClick={openListDialog}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                  >
                    <AddIcon sx={{ fontSize: 18 }} />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500 }}
                    >
                      Add another list
                    </Typography>
                  </Stack>
                </Paper>
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      </Box>

      {/* dialogs */}
      <TaskDialog
        open={dialogOpen}
        draftTask={draftTask}
        editingTask={editingTask}
        columns={columns}
        onClose={closeDialog}
        onChangeField={handleDraftChange}
        onSave={handleSaveTask}
        error={dialogError}
      />

      <AssignTaskDialog
        open={assignDialogOpen}
        onClose={closeAssignDialog}
        onSave={handleAssignSave}
        employees={employees}
        currentUser={currentUser}
      />

      <Dialog
        open={listDialogOpen}
        onClose={closeListDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>New list</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            label="List title"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeListDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveList}>
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
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskBoard;
