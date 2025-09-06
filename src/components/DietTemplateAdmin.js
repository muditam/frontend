import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Menu, MenuItem, Select, Stack, Table, TableHead, TableRow,
  TableCell, TableBody, TextField, Typography, Paper, Tooltip, Divider
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";

const API_BASE = "http://localhost:5001"; // ✅ fixed triple slash issue

const MEALS = ["Breakfast", "Lunch", "Snacks", "Dinner"];
const FORTNIGHT_DAYS = 14;

const emptyFortnight = () =>
  MEALS.reduce((acc, meal) => {
    acc[meal] = Array(FORTNIGHT_DAYS).fill("");
    return acc;
  }, {});

const defaultMonthly = () => ({
  Breakfast: { title: "Breakfast Options (Select any one)", time: "8am-9am", options: [""] },
  "Mid-Morning Snack": { title: "Mid-Morning Snack Options", time: "10:30am-11:30am", options: [""] },
  Lunch: { title: "Lunch Options (Select any one)", time: "1pm-2pm", options: [""] },
  "Evening Snack": { title: "Evening Snack Options (Select any one)", time: "4pm-5pm", options: [""] },
  Dinner: { title: "Dinner Options (Select any one)", time: "7pm-8pm", options: [""] },
});

export default function DietTemplatesAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("published");

  const [createMenuEl, setCreateMenuEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formType, setFormType] = useState("weekly-14"); // weekly-14 | monthly-options

  // shared meta
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("draft"); // draft | published

  // weekly body
  const [fortnight, setFortnight] = useState(emptyFortnight());

  // monthly body
  const [monthly, setMonthly] = useState(defaultMonthly());

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
      await axios.post(`${API_BASE}/api/diet-templates`, {
        name: name.trim(),
        type: formType,
        category: category || null,
        tags: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : [],
        status,
        body,
      });
      setDialogOpen(false);
      fetchRows();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to save template");
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Diet Templates</Typography>
        <Box>
          <Button
            variant="outlined"
            sx={{ mr: 1 }}
            onClick={() => { setTypeFilter(""); setStatusFilter(""); }}
          >
            Clear Filters
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={(e) => setCreateMenuEl(e.currentTarget)}
            sx={{
              backgroundColor: "black",
              "&:hover": { backgroundColor: "#222" },
              borderRadius: 2,
              px: 3
            }}
          >
            Create New Template
          </Button>
          <Menu
            anchorEl={createMenuEl}
            open={Boolean(createMenuEl)}
            onClose={() => setCreateMenuEl(null)}
          >
            <MenuItem onClick={() => { openCreate("weekly-14"); setCreateMenuEl(null); }}>
              Weekly Template (14 Days)
            </MenuItem>
            <MenuItem onClick={() => { openCreate("monthly-options"); setCreateMenuEl(null); }}>
              Monthly Template (Options)
            </MenuItem>
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
              <TableCell>Version</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r._id} hover>
                <TableCell><b>{r.name}</b></TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell>{r.category || "—"}</TableCell>
                <TableCell>
                  {(r.tags || []).map(t => (
                    <Chip key={t} size="small" label={t} sx={{ mr: .5, mb: .5 }} />
                  ))}
                </TableCell>
                <TableCell>
                  <Chip
                    label={r.status}
                    color={r.status === "published" ? "success" : r.status === "draft" ? "warning" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell>{r.version}</TableCell>
                <TableCell>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}</TableCell>
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
          {`Create ${formType === "weekly-14" ? "Weekly (14-day)" : "Monthly (Options)"} Template`}
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
                      <TableCell key={i} align="center" sx={{ fontWeight: 700, minWidth: 160, backgroundColor: "#f5f5f5" }}>
                        Day {i + 1}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MEALS.map(meal => (
                    <TableRow key={meal}>
                      <TableCell sx={{ fontWeight: 600 }}>{meal}</TableCell>
                      {Array.from({ length: FORTNIGHT_DAYS }, (_, i) => (
                        <TableCell key={i} align="center">
                          <TextField
                            size="small"
                            value={fortnight[meal][i]}
                            onChange={(e) => setCell(meal, i, e.target.value)}
                            placeholder={`${meal}...`}
                            sx={{ minWidth: 160 }}
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
              {Object.keys(monthly).map(slot => {
                const s = monthly[slot];
                return (
                  <Paper key={slot} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
                      <TextField
                        size="small"
                        label={`${slot} Title`}
                        value={s.title}
                        onChange={(e) => setMonthlyField(slot, "title", e.target.value)}
                        fullWidth
                      />
                      <TextField
                        size="small"
                        label="Time"
                        value={s.time}
                        onChange={(e) => setMonthlyField(slot, "time", e.target.value)}
                        sx={{ minWidth: 180 }}
                      />
                    </Stack>
                    <Box sx={{ mt: 2 }}>
                      {s.options.map((opt, idx) => (
                        <Stack key={idx} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={opt}
                            placeholder={`Option ${idx + 1}`}
                            onChange={(e) => setMonthlyOption(slot, idx, e.target.value)}
                          />
                          <Tooltip title="Remove Option">
                            <IconButton size="small" onClick={() => removeMonthlyOption(slot, idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ))}
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => addMonthlyOption(slot)}
                      >
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
          <Button
            variant="contained"
            onClick={onSave}
            disabled={!canSave}
            sx={{
              backgroundColor: "black",
              "&:hover": { backgroundColor: "#222" },
              borderRadius: 2,
              px: 3
            }}
          >
            Save Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
