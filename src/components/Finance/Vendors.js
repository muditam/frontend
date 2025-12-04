import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  Snackbar,
  Alert,
  Stack,
} from "@mui/material";


import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";


const API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/purchase-records/vendors";
function validateVendorForm(form, showSnackbar) {
  // --- Phone Number: 10 digits only ---
  if (form.phoneNumber && !/^\d{10}$/.test(form.phoneNumber)) {
    showSnackbar("Phone number must be exactly 10 digits", "warning");
    return false;
  }


  // --- GST Number: 15 characters (alphanumeric) ---
  if (form.hasGST && form.gstNumber.trim() !== "") {
    if (!/^[A-Z0-9]{15}$/.test(form.gstNumber.trim().toUpperCase())) {
      showSnackbar("GST Number must be 15 characters (A-Z, 0-9)", "warning");
      return false;
    }
  }


  return true;
}




export default function VendorList() {
  const [vendors, setVendors] = useState([]);
  const [filtered, setFiltered] = useState([]);


  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);


  const [search, setSearch] = useState("");


  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    hasGST: true,
    gstNumber: "",
  });


  const [editId, setEditId] = useState(null);


  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });


  const showSnackbar = (msg, severity = "info") =>
    setSnackbar({ open: true, message: msg, severity });


  const closeSnackbar = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));


  // ---------------------- Fetch Vendors ----------------------
  useEffect(() => {
    fetchVendors();
  }, []);


  async function fetchVendors() {
    try {
      const res = await fetch(`${API}?limit=5000`);
      const data = await res.json();


      const list = data.vendors || [];
      const sorted = list.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );


      setVendors(sorted);
      setFiltered(sorted);
    } catch (err) {
      console.error(err);
      showSnackbar("Failed to fetch vendors", "error");
    }
  }


  // ---------------------- Search Filter ----------------------
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(vendors);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        vendors.filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            (v.email || "").toLowerCase().includes(q) ||
            (v.phoneNumber || "").includes(q)
        )
      );
    }
  }, [search, vendors]);


  // ---------------------- Reset Form ----------------------
  function resetForm() {
    setForm({
      name: "",
      email: "",
      phoneNumber: "",
      hasGST: true,
      gstNumber: "",
    });
    setEditId(null);
    setIsEdit(false);
  }


  // ---------------------- Add Vendor ----------------------
  async function handleAddVendor() {
    if (!form.name.trim()) {
      return showSnackbar("Vendor name is required", "warning");
    }
      if (!validateVendorForm(form, showSnackbar)) return;


    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });


      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");


      const updated = [data.vendor, ...vendors];
      setVendors(updated);
      setFiltered(updated);


      showSnackbar("Vendor added successfully", "success");


      setDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      showSnackbar("Failed to add vendor", "error");
    }
  }


  // ---------------------- Open Edit Dialog ----------------------
  function openEditDialog(v) {
    setIsEdit(true);
    setEditId(v._id);
    setForm({
      name: v.name,
      email: v.email || "",
      phoneNumber: v.phoneNumber || "",
      hasGST: v.hasGST,
      gstNumber: v.gstNumber || "",
    });
    setDialogOpen(true);
  }


  // ---------------------- SAVE EDIT ----------------------
  async function handleUpdateVendor() {
    try {
      const res = await fetch(`${API}/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });


      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
     
  if (!validateVendorForm(form, showSnackbar)) return;


      const updatedList = vendors.map((v) =>
        v._id === editId ? data.vendor : v
      );


      setVendors(updatedList);
      setFiltered(updatedList);


      showSnackbar("Vendor updated successfully", "success");


      setDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      showSnackbar("Failed to update vendor", "error");
    }
  }


  // ---------------------- UI ----------------------
  return (
    <Box sx={{ px: 3, py: 2, background: "#f5f6f8", minHeight: "100vh" }}>
      {/* HEADER */}
      <Paper
        elevation={0}
        sx={{
          px: 3,
          py: 2,
          mb: 2,
          borderRadius: 2,
          border: "1px solid #e5e7eb",
          background: "#fff",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Vendor List
          </Typography>


          <Stack direction="row" spacing={2}>
            <TextField
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ width: 260 }}
            />


            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              sx={{
                background: "#000",
                textTransform: "none",
                borderRadius: 1.3,
                "&:hover": { background: "#222" },
              }}
            >
              Add Vendor
            </Button>
          </Stack>
        </Stack>
      </Paper>


      {/* TABLE */}
      <Paper sx={{ borderRadius: 2, border: "1px solid #e5e7eb" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ background: "#111827" }}>
              <TableCell sx={{ color: "#fff" }}>S.No.</TableCell>
              <TableCell sx={{ color: "#fff" }}>Name</TableCell>
              <TableCell sx={{ color: "#fff" }}>Email</TableCell>
              <TableCell sx={{ color: "#fff" }}>Phone</TableCell>
              <TableCell sx={{ color: "#fff" }}>GST</TableCell>
              <TableCell sx={{ color: "#fff" }}>GST Number</TableCell>
              <TableCell sx={{ color: "#fff" }}>Action</TableCell>
            </TableRow>
          </TableHead>


          <TableBody>
            {filtered.map((v, idx) => (
              <TableRow key={v._id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{v.name}</TableCell>
                <TableCell>{v.email || "-"}</TableCell>
                <TableCell>{v.phoneNumber || "-"}</TableCell>
                <TableCell>{v.hasGST ? "Yes" : "No"}</TableCell>
                <TableCell>{v.gstNumber || "-"}</TableCell>


                <TableCell>
                  <IconButton onClick={() => openEditDialog(v)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}


            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                  No vendors found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>


      {/* ADD / EDIT VENDOR DIALOG */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isEdit ? "Edit Vendor" : "Add Vendor"}
        </DialogTitle>


        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Vendor Name *"
              fullWidth
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
            />


            <Stack direction="row" spacing={2}>
              <TextField
                label="Email"
                fullWidth
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
              />


              <TextField
                label="Phone"
                fullWidth
                value={form.phoneNumber}
                inputProps={{ maxLength: 10 }}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    phoneNumber: e.target.value.replace(/\D/g, ""),
                  }))
                }
              />
            </Stack>


            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Switch
                  checked={form.hasGST}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, hasGST: e.target.checked }))
                  }
                />
                <Typography>Has GST?</Typography>
              </Stack>


              {form.hasGST && (
                <TextField
                  label="GST Number"
                  fullWidth
                  value={form.gstNumber}
                  inputProps={{ maxLength: 15 }}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      gstNumber: e.target.value.toUpperCase(),
                    }))
                  }
                />
              )}
            </Stack>
          </Stack>
        </DialogContent>


        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>


          <Button
            variant="contained"
            sx={{ background: "#000", "&:hover": { background: "#222" } }}
            onClick={isEdit ? handleUpdateVendor : handleAddVendor}
          >
            {isEdit ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>


      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}



