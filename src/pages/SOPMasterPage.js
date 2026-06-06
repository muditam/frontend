import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { clearCachedData, getCachedData } from "../utils/apiCache";
import {
  Alert,
  Box,
  Button,
  Chip,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const SOPS_CACHE_TTL_MS = 5 * 60 * 1000;

const BRAND = {
  bg: "#f5f7fb",
  card: "#ffffff",
  border: "#e5eaf2",
  text: "#142033",
  sub: "#667085",
  primary: "#2563eb",
  primarySoft: "#eff6ff",
  success: "#16a34a",
  danger: "#dc2626",
  cash: "#16a34a",
  coin: "#7c3aed",
};

function getAuthHeaders() {
  try {
    const raw = sessionStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    return user ? { "x-session-user": JSON.stringify(user) } : {};
  } catch {
    return {};
  }
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN");
}

function initialForm() {
  return {
    name: "",
    value: "",
    rewardType: "cash", // cash | coin
    isActive: true,
  };
}

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    backgroundColor: "#fff",
  },
};

function getTypeMeta(type = "cash") {
  if (type === "coin") {
    return {
      label: "Coin",
      color: BRAND.coin,
      bg: "#f5f3ff",
      border: "#ddd6fe",
    };
  }

  return {
    label: "Cash",
    color: BRAND.cash,
    bg: "#ecfdf3",
    border: "#bbf7d0",
  };
}

export default function SOPMasterPage() {
  const headers = useMemo(() => getAuthHeaders(), []);

  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm());

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editingSop, setEditingSop] = useState(null);
  const [editForm, setEditForm] = useState(initialForm());

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnack = (message, severity = "success") => {
    setSnack({ open: true, message, severity });
  };

  const fetchSops = useCallback(async (forceFresh = false) => {
    setLoading(true);
    try {
      const cacheKey = "sops:list";
      if (forceFresh) {
        clearCachedData(cacheKey);
      }

      const list = await getCachedData(
        cacheKey,
        async () => {
          const res = await axios.get(`${API_BASE}/api/sops`, { headers });
          return res.data?.sops || [];
        },
        SOPS_CACHE_TTL_MS
      );

      setSops(list);
    } catch (error) {
      console.error("Error fetching SOPs:", error);
      showSnack(
        error?.response?.data?.message || "Failed to fetch SOPs",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchSops();
  }, [fetchSops]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showSnack("Please enter SOP name", "error");
      return;
    }

    if (form.value === "" || Number.isNaN(Number(form.value))) {
      showSnack(
        `Please enter valid ${form.rewardType === "cash" ? "cash" : "coin"} value`,
        "error"
      );
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${API_BASE}/api/sops`,
        {
          name: form.name.trim(),
          value: Number(form.value),
          rewardType: form.rewardType,
          isActive: form.isActive,
        },
        { headers }
      );

      setForm(initialForm());
      setCreateOpen(false);
      showSnack("SOP created successfully");
      clearCachedData("sops:");
      clearCachedData("incentives:");
      fetchSops(true);
    } catch (error) {
      console.error("Error creating SOP:", error);
      showSnack(
        error?.response?.data?.message || "Failed to create SOP",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (sop) => {
    setEditingSop(sop);
    setEditForm({
      name: sop.name || "",
      value: sop.value ?? sop.coin ?? "",
      rewardType: sop.rewardType || "cash",
      isActive: Boolean(sop.isActive),
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingSop?._id) return;

    if (!editForm.name.trim()) {
      showSnack("Please enter SOP name", "error");
      return;
    }

    if (editForm.value === "" || Number.isNaN(Number(editForm.value))) {
      showSnack(
        `Please enter valid ${editForm.rewardType === "cash" ? "cash" : "coin"} value`,
        "error"
      );
      return;
    }

    setEditSaving(true);
    try {
      await axios.put(
        `${API_BASE}/api/sops/${editingSop._id}`,
        {
          name: editForm.name.trim(),
          value: Number(editForm.value),
          rewardType: editForm.rewardType,
          isActive: editForm.isActive,
        },
        { headers }
      );

      setEditOpen(false);
      setEditingSop(null);
      showSnack("SOP updated successfully");
      clearCachedData("sops:");
      clearCachedData("incentives:");
      fetchSops(true);
    } catch (error) {
      console.error("Error updating SOP:", error);
      showSnack(
        error?.response?.data?.message || "Failed to update SOP",
        "error"
      );
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (sop) => {
    const ok = window.confirm(`Delete SOP "${sop.name}"?`);
    if (!ok) return;

    try {
      await axios.delete(`${API_BASE}/api/sops/${sop._id}`, { headers });
      showSnack("SOP deleted successfully");
      clearCachedData("sops:");
      clearCachedData("incentives:");
      fetchSops(true);
    } catch (error) {
      console.error("Error deleting SOP:", error);
      showSnack(
        error?.response?.data?.message || "Failed to delete SOP",
        "error"
      );
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", p: 3, background: BRAND.bg }}>
      <Stack spacing={3}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 4,
            border: `1px solid ${BRAND.border}`,
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: BRAND.text,
                  letterSpacing: -0.4,
                }}
              >
                SOP Master
              </Typography> 
            </Box>

            <Stack direction="row" spacing={1.5}> 

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setForm(initialForm());
                  setCreateOpen(true);
                }}
                sx={{
                  textTransform: "none",
                  borderRadius: 2.5,
                  minWidth: 140,
                  boxShadow: "none",
                }}
              >
                Create SOP
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: 3,
            borderRadius: 4,
            border: `1px solid ${BRAND.border}`,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={1.5}
            sx={{ mb: 2.5 }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: BRAND.text }}
              >
                SOP List
              </Typography> 
            </Box>

            <Chip
              label={`Total SOPs: ${sops.length}`}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Stack>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer
              sx={{
                border: `1px solid ${BRAND.border}`,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <Table sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                    <TableCell sx={{ fontWeight: 700, width: 80 }}>S No.</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>SOP Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cash / Coin Value</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Updated</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {sops.length ? (
                    sops.map((sop, index) => {
                      const typeMeta = getTypeMeta(sop.rewardType || "cash");

                      return (
                        <TableRow
                          key={sop._id}
                          hover
                          sx={{
                            "& td": {
                              borderBottom: `1px solid ${BRAND.border}`,
                            },
                          }}
                        >
                          <TableCell sx={{ color: BRAND.sub, fontWeight: 600 }}>
                            {index + 1}
                          </TableCell>

                          <TableCell sx={{ fontWeight: 600, color: BRAND.text }}>
                            {sop.name}
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={typeMeta.label}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                color: typeMeta.color,
                                backgroundColor: typeMeta.bg,
                                border: `1px solid ${typeMeta.border}`,
                              }}
                            />
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={sop.value ?? sop.coin ?? 0}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                backgroundColor: BRAND.primarySoft,
                                color: BRAND.primary,
                                border: "1px solid #bfdbfe",
                              }}
                            />
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={sop.isActive ? "Active" : "Inactive"}
                              color={sop.isActive ? "success" : "default"}
                              variant={sop.isActive ? "filled" : "outlined"}
                            />
                          </TableCell>

                          <TableCell>{formatDate(sop.updatedAt)}</TableCell>

                          <TableCell align="right">
                            <Stack
                              direction="row"
                              spacing={1}
                              justifyContent="flex-end"
                            >
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => openEditDialog(sop)}
                                sx={{
                                  textTransform: "none",
                                  borderRadius: 2,
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleDelete(sop)}
                                sx={{
                                  textTransform: "none",
                                  borderRadius: 2,
                                }}
                              >
                                Delete
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                        No SOPs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>

      <Dialog
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create SOP</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="SOP Name"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              sx={inputSx}
            />

            <Box>
              <Typography
                variant="body2"
                sx={{ color: BRAND.sub, fontWeight: 600, mb: 1 }}
              >
                Reward Type
              </Typography>

              <Stack direction="row" spacing={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.rewardType === "cash"}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, rewardType: "cash" }))
                      }
                    />
                  }
                  label="Cash"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.rewardType === "coin"}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, rewardType: "coin" }))
                      }
                    />
                  }
                  label="Coin"
                />
              </Stack>
            </Box>

            <TextField
              fullWidth
              label={form.rewardType === "cash" ? "Cash Value" : "Coin Value"}
              type="number"
              value={form.value}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, value: e.target.value }))
              }
              sx={inputSx}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setCreateOpen(false)}
            disabled={saving}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving}
            sx={{ textTransform: "none", boxShadow: "none", borderRadius: 2 }}
          >
            {saving ? "Saving..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => !editSaving && setEditOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit SOP</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="SOP Name"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, name: e.target.value }))
              }
              sx={inputSx}
            />

            <Box>
              <Typography
                variant="body2"
                sx={{ color: BRAND.sub, fontWeight: 600, mb: 1 }}
              >
                Reward Type
              </Typography>

              <Stack direction="row" spacing={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editForm.rewardType === "cash"}
                      onChange={() =>
                        setEditForm((prev) => ({ ...prev, rewardType: "cash" }))
                      }
                    />
                  }
                  label="Cash"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editForm.rewardType === "coin"}
                      onChange={() =>
                        setEditForm((prev) => ({ ...prev, rewardType: "coin" }))
                      }
                    />
                  }
                  label="Coin"
                />
              </Stack>
            </Box>

            <TextField
              fullWidth
              label={editForm.rewardType === "cash" ? "Cash Value" : "Coin Value"}
              type="number"
              value={editForm.value}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, value: e.target.value }))
              }
              sx={inputSx}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editForm.isActive}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setEditOpen(false)}
            disabled={editSaving}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={editSaving}
            sx={{ textTransform: "none", boxShadow: "none", borderRadius: 2 }}
          >
            {editSaving ? "Saving..." : "Update"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
          variant="filled"
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
