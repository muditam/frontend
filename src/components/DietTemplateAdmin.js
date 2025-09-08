import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Menu, MenuItem, Select, Stack, Table, TableHead, TableRow,
  TableCell, TableBody, TextField, Typography, Paper, Tooltip, Divider, InputAdornment
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close"; 
import ContentCopyIcon from "@mui/icons-material/ContentCopy";  
import axios from "axios"; 

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";    

const MEALS = ["Breakfast", "Lunch", "Snacks", "Dinner"]; 
const FORTNIGHT_DAYS = 14;

// ▶ Weekly meal times to show under each meal name
const WEEKLY_TIMES = {
  Breakfast: "8am-9am",
  Lunch: "1pm-2pm",
  Snacks: "4pm-5pm",
  Dinner: "7pm-8pm",
};

const emptyFortnight = () =>
  MEALS.reduce((acc, meal) => {
    acc[meal] = Array(FORTNIGHT_DAYS).fill("");
    return acc;
  }, {});

// ▶ Monthly default WITHOUT Mid-Morning Snack
const defaultMonthly = () => ({
  Breakfast: { title: "Breakfast Options (Select any one)", time: "8am-9am", options: [""] },
  Lunch: { title: "Lunch Options (Select any one)", time: "1pm-2pm", options: [""] },
  "Evening Snack": { title: "Evening Snack Options (Select any one)", time: "4pm-5pm", options: [""] },
  Dinner: { title: "Dinner Options (Select any one)", time: "7pm-8pm", options: [""] },
});

export default function DietTemplatesAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [createMenuEl, setCreateMenuEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formType, setFormType] = useState("weekly-14"); // weekly-14 | monthly-options
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // shared meta
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("draft"); // draft | published | archived

  // weekly body
  const [fortnight, setFortnight] = useState(emptyFortnight());

  // monthly body
  const [monthly, setMonthly] = useState(defaultMonthly());

  // VIEW-ONLY POPUP
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, name: "" });

  // DUPLICATE dialog state
  const [dupState, setDupState] = useState({
    open: false,
    src: null,          // source row object
    newName: "",
    loading: false,
  });


  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/diet-templates`, {
        params: {
          type: typeFilter || undefined,
          status: statusFilter || undefined,
        },
      });
      setRows(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [typeFilter, statusFilter]);

  const resetForm = () => {
    setName("");
    setCategory("");
    setTags("");
    setStatus("draft");
    setFortnight(emptyFortnight());
    setMonthly(defaultMonthly());
    setIsEditing(false);
    setEditingId(null);
  };

  const openCreate = (t) => {
    setFormType(t);
    resetForm();
    setDialogOpen(true);
  };

  const setCell = (meal, dayIdx, value) => {
    setFortnight(prev => {
      const next = { ...prev, [meal]: [...prev[meal]] };
      next[meal][dayIdx] = value;
      return next;
    });
  };

  // --- Monthly handlers ---
  const setMonthlyField = (slot, field, value) => {
    setMonthly(prev => ({ ...prev, [slot]: { ...prev[slot], [field]: value } }));
  };
  const setMonthlyOption = (slot, idx, value) => {
    setMonthly(prev => {
      const list = [...prev[slot].options];
      list[idx] = value;
      return { ...prev, [slot]: { ...prev[slot], options: list } };
    });
  };
  const addMonthlyOption = (slot) => {
    setMonthly(prev => {
      const list = [...prev[slot].options, ""];
      return { ...prev, [slot]: { ...prev[slot], options: list } };
    });
  };
  const removeMonthlyOption = (slot, idx) => {
    setMonthly(prev => {
      const list = prev[slot].options.filter((_, i) => i !== idx);
      return { ...prev, [slot]: { ...prev[slot], options: list } };
    });
  };

  const body = useMemo(() => {
    return formType === "weekly-14" ? { fortnight } : { monthly };
  }, [formType, fortnight, monthly]);

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (formType === "weekly-14") {
      return MEALS.some(m => fortnight[m].some(v => (v || "").trim()));
    }
    return Object.values(monthly).some(s => s.options.some(o => (o || "").trim()));
  }, [name, formType, fortnight, monthly]);

  const onSave = async () => {
    if (!canSave) return;
    try {
      if (isEditing && editingId) {
        await axios.put(`${API_BASE}/api/diet-templates/${editingId}`, {
          name: name.trim(),
          type: formType,
          category: category || null,
          tags: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : [],
          status,
          body,
        });
      } else {
        await axios.post(`${API_BASE}/api/diet-templates`, {
          name: name.trim(),
          type: formType,
          category: category || null,
          tags: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : [],
          status,
          body,
        });
      }
      setDialogOpen(false);
      fetchRows();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to save template");
    }
  };

  const handleEdit = (e, row) => {
    e.stopPropagation(); // prevent row click → view
    // Prefill the form
    setIsEditing(true);
    setEditingId(row._id);
    setFormType(row.type);
    setName(row.name || "");
    setCategory(row.category || "");
    setTags((row.tags || []).join(", "));
    setStatus(row.status || "draft");

    if (row.type === "weekly-14") {
      // Ensure structure integrity
      const f = row.body?.fortnight || emptyFortnight();
      const normalized = {};
      MEALS.forEach(m => {
        const arr = Array.isArray(f[m]) ? f[m].slice(0, 14) : Array(14).fill("");
        while (arr.length < 14) arr.push("");
        normalized[m] = arr;
      });
      setFortnight(normalized);
    } else {
      const m = row.body?.monthly || defaultMonthly();
      // Keep only the four slots we use
      const clean = defaultMonthly();
      ["Breakfast", "Lunch", "Evening Snack", "Dinner"].forEach(slot => {
        if (m[slot]) clean[slot] = {
          title: m[slot].title || clean[slot].title,
          time: m[slot].time || clean[slot].time,
          options: Array.isArray(m[slot].options) && m[slot].options.length ? m[slot].options : [""],
        };
      });
      setMonthly(clean);
    }
    setDialogOpen(true);
  };

  const openDuplicate = (e, row) => {
    e.stopPropagation();
    setDupState({
      open: true,
      src: row,
      newName: `${row.name} (Copy)`,
      loading: false,
    });
  };

  const confirmDuplicate = async () => {
    if (!dupState.newName.trim() || !dupState.src) return;
    setDupState(s => ({ ...s, loading: true }));
    try {
      // Ensure we have full body; if missing, fetch once
      let src = dupState.src;
      if (!src.body) {
        const { data } = await axios.get(`${API_BASE}/api/diet-templates/${src._id}`);
        src = data;
      }
      const payload = {
        name: dupState.newName.trim(),
        type: src.type,
        category: src.category || null,
        tags: Array.isArray(src.tags) ? src.tags : [],
        status: "draft",            // keep duplicates as draft
        body: src.body,             // deep copy not required; server stores new doc
      };
      await axios.post(`${API_BASE}/api/diet-templates`, payload);
      setDupState({ open: false, src: null, newName: "", loading: false });
      fetchRows();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to duplicate template");
      setDupState(s => ({ ...s, loading: false }));
    }
  };


  const handleDelete = (e, row) => {
    e.stopPropagation();
    setDeleteConfirm({ open: true, id: row._id, name: row.name });
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_BASE}/api/diet-templates/${deleteConfirm.id}`);
      setDeleteConfirm({ open: false, id: null, name: "" });
      // If you deleted what you were viewing, close view
      if (selectedRow && selectedRow._id === deleteConfirm.id) setViewOpen(false);
      fetchRows();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to delete template");
    }
  };

  // ——— UI helpers (black-first styling) ———
  const blackContained = {
    backgroundColor: "black",
    color: "white",
    "&:hover": { backgroundColor: "#222" },
    borderRadius: 8,
  };
  const blackOutlined = {
    borderColor: "black",
    color: "black",
    "&:hover": { borderColor: "#222", backgroundColor: "rgba(0,0,0,0.04)" },
    borderRadius: 8,
  };

  const openView = (row) => {
    setSelectedRow(row);
    setViewOpen(true);
  };

  return (
    <Box sx={{ p: 3, backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Diet Templates</Typography>
        <Box>
          <Button variant="outlined" sx={{ ...blackOutlined, mr: 1 }} onClick={() => { setTypeFilter(""); setStatusFilter(""); }}>Clear Filters</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={(e) => setCreateMenuEl(e.currentTarget)} sx={{ ...blackContained, px: 3 }}>Create New Template</Button>
          <Menu anchorEl={createMenuEl} open={Boolean(createMenuEl)} onClose={() => setCreateMenuEl(null)}>
            <MenuItem onClick={() => { openCreate("weekly-14"); setCreateMenuEl(null); }}>Weekly Template (14 Days)</MenuItem>
            <MenuItem onClick={() => { openCreate("monthly-options"); setCreateMenuEl(null); }}>Monthly Template (Options)</MenuItem>
          </Menu>
        </Box>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Select size="small" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} displayEmpty sx={{ minWidth: 180 }}>
          <MenuItem value="">All Types</MenuItem>
          <MenuItem value="weekly-14">Weekly (14)</MenuItem>
          <MenuItem value="monthly-options">Monthly (Options)</MenuItem>
        </Select>
        <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} displayEmpty sx={{ minWidth: 180 }}>
          <MenuItem value="">Any Status</MenuItem>
          <MenuItem value="published">Published</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="archived">Archived</MenuItem>
        </Select>
      </Stack>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="center" sx={{ width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r._id}
                hover
                onClick={() => openView(r)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell onClick={(e) => { e.stopPropagation(); openView(r); }}>
                  <b style={{ textDecoration: "underline" }}>{r.name}</b>
                </TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell>{r.category || "—"}</TableCell>
                <TableCell>
                  {(r.tags || []).map(t => (
                    <Chip key={t} size="small" label={t} sx={{ mr: .5, mb: .5 }} />
                  ))}
                </TableCell>
                <TableCell>
                  <Chip label={r.status} color={r.status === "published" ? "success" : r.status === "draft" ? "warning" : "default"} size="small" />
                </TableCell>
                <TableCell>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}</TableCell>
                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, whiteSpace: "nowrap" }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={(e) => handleEdit(e, r)} aria-label="Edit template">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={(e) => handleDelete(e, r)} aria-label="Delete template" sx={{ color: "crimson" }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicate">
                      <IconButton size="small" onClick={(e) => openDuplicate(e, r)} aria-label="Duplicate template">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && !loading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography align="center" sx={{ py: 2, opacity: 0.6 }}>No templates found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isEditing ? `Edit Template` : `Create ${formType === "weekly-14" ? "Weekly (14-day)" : "Monthly (Options)"} Template`}
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: "#fafafa" }}>
          {/* Meta */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
            <TextField label="Template Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" />
            <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} fullWidth size="small" />
            <TextField label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} fullWidth size="small" />
            <Select size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
          </Stack>
          <Divider sx={{ mb: 3 }} />

          {/* Body */}
          {formType === "weekly-14" ? (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#f5f5f5" }}>Meal</TableCell>
                    {Array.from({ length: FORTNIGHT_DAYS }, (_, i) => (
                      <TableCell key={i} align="center" sx={{ fontWeight: 700, minWidth: 220, backgroundColor: "#f5f5f5" }}>
                        Day {i + 1}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MEALS.map(meal => (
                    <TableRow key={meal}>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>{meal}</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            ({WEEKLY_TIMES[meal]})
                          </Typography>
                        </Box>
                      </TableCell>
                      {Array.from({ length: FORTNIGHT_DAYS }, (_, i) => (
                        <TableCell key={i} align="center">
                          <TextField
                            size="small"
                            multiline
                            minRows={2}
                            value={fortnight[meal][i]}
                            onChange={(e) => setCell(meal, i, e.target.value)}
                            placeholder={`${meal}...`}
                            sx={{ minWidth: 220 }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <>
              {Object.keys(monthly).map((slot) => {
                const s = monthly[slot];
                return (
                  <Paper key={slot} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, borderColor: "#00000022" }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700}>{slot}</Typography>
                      <TextField
                        size="small"
                        value={s.time}
                        onChange={(e) => setMonthlyField(slot, "time", e.target.value)}
                        placeholder="8am-9am"
                        sx={{ width: 140 }}
                        inputProps={{ style: { textAlign: "center" } }}
                        InputProps={{
                          startAdornment: (<InputAdornment position="start"></InputAdornment>),
                          endAdornment: (<InputAdornment position="end"></InputAdornment>),
                        }}
                      />
                    </Stack>
                    <Box>
                      {s.options.map((opt, idx) => (
                        <Stack key={idx} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Tooltip title="Remove option">
                            <span>
                              <IconButton size="small" onClick={() => removeMonthlyOption(slot, idx)} sx={{ color: "black" }} aria-label={`Delete option ${idx + 1}`}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <TextField
                            size="small"
                            fullWidth
                            value={opt}
                            placeholder={`Option ${idx + 1}`}
                            onChange={(e) => setMonthlyOption(slot, idx, e.target.value)}
                          />
                        </Stack>
                      ))}
                      <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => addMonthlyOption(slot)} sx={{ ...blackOutlined }}>
                        Add Option
                      </Button>
                    </Box>
                  </Paper>
                );
              })}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: "black" }}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={!canSave} sx={{ ...blackContained, px: 3 }}>
            {isEditing ? "Update Template" : "Save Template"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW-ONLY DIALOG */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>View Template</span>
          <IconButton onClick={() => setViewOpen(false)} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {!selectedRow ? (
            <Typography>Loading…</Typography>
          ) : (
            <Stack spacing={1}>
              <Typography><b>Name:</b> {selectedRow.name}</Typography>
              <Typography><b>Type:</b> {selectedRow.type}</Typography>
              <Typography><b>Status:</b> {selectedRow.status}</Typography>
              <Typography><b>Category:</b> {selectedRow.category || "—"}</Typography>
              <Typography><b>Tags:</b> {(selectedRow.tags || []).join(", ") || "—"}</Typography>
              <Typography><b>Version:</b> {selectedRow.version}</Typography>
              <Divider sx={{ my: 1 }} />
              {selectedRow.type === "weekly-14" ? (
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Meal</TableCell>
                        {Array.from({ length: 14 }, (_, i) => (
                          <TableCell key={i} align="center">Day {i + 1}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {MEALS.map(m => (
                        <TableRow key={m}>
                          <TableCell sx={{ fontWeight: 600 }}>
                            <Box>
                              <Typography sx={{ fontWeight: 600 }}>{m}</Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                ({WEEKLY_TIMES[m]})
                              </Typography>
                            </Box>
                          </TableCell>
                          {Array.from({ length: 14 }, (_, i) => (
                            <TableCell key={i} align="center">
                              {(selectedRow.body?.fortnight?.[m]?.[i] || "").trim() || "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {["Breakfast", "Lunch", "Evening Snack", "Dinner"].map(slot => {
                    const s = selectedRow.body?.monthly?.[slot];
                    if (!s) return null;
                    return (
                      <Paper key={slot} variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700}>{slot} • <span style={{ fontWeight: 400 }}>{s.time}</span></Typography>
                        <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18 }}>
                          {(s.options || []).map((o, idx) => <li key={idx}>{o}</li>)}
                        </ul>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)} sx={{ color: "black" }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null, name: "" })}>
        <DialogTitle>Delete Template?</DialogTitle>
        <DialogContent dividers>
          <Typography>Are you sure you want to delete <b>{deleteConfirm.name}</b>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null, name: "" })} sx={{ color: "black" }}>Cancel</Button>
          <Button onClick={confirmDelete} sx={{ ...blackContained }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dupState.open}
        onClose={() => setDupState({ open: false, src: null, newName: "", loading: false })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Duplicate Template</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Enter a name for the duplicate of <b>{dupState.src?.name}</b>.
            </Typography>
            <TextField
              autoFocus
              size="small"
              label="New Template Name"
              value={dupState.newName}
              onChange={(e) => setDupState(s => ({ ...s, newName: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && dupState.newName.trim() && !dupState.loading) confirmDuplicate();
              }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDupState({ open: false, src: null, newName: "", loading: false })}
            sx={{ color: "black" }}
            disabled={dupState.loading}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDuplicate}
            disabled={!dupState.newName.trim() || dupState.loading}
            sx={{ backgroundColor: "black", color: "white", "&:hover": { backgroundColor: "#222" } }}
          >
            {dupState.loading ? "Creating..." : "Create Duplicate"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
