import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";

const VendorRecordsPage = () => {
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("ALL");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [openAddVendor, setOpenAddVendor] = useState(false);

  const [vendorForm, setVendorForm] = useState({
    name: "",
    email: "",
    phone: "",
    hasGST: false,
    gstNumber: "",
  });

  // -----------------------------
  // LOAD VENDORS
  // -----------------------------
  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/vendors"
      );
      setVendors(res.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // VENDOR FILTER OPTIONS
  // -----------------------------
  const vendorNameOptions = useMemo(() => {
    const names = vendors.map((v) => v.name).filter(Boolean);
    return ["ALL", ...Array.from(new Set(names))];
  }, [vendors]);

  // -----------------------------
  // FILTERED DATA (Vendor + Search)
  // -----------------------------
  const filteredVendors = useMemo(() => {
    let data = vendors;

    if (selectedVendor !== "ALL") {
      data = data.filter((v) => v.name === selectedVendor);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (v) =>
          v.name.toLowerCase().includes(term) ||
          (v.email || "").toLowerCase().includes(term) ||
          (v.phone || "").toLowerCase().includes(term) ||
          (v.gstNumber || "").toLowerCase().includes(term)
      );
    }

    return data;
  }, [vendors, searchTerm, selectedVendor]);

  // -----------------------------
  // PAGINATION
  // -----------------------------
  const handleChangePage = (_e, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const paginatedVendors = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredVendors.slice(start, start + rowsPerPage);
  }, [filteredVendors, page, rowsPerPage]);

  // -----------------------------
  // ADD VENDOR
  // -----------------------------
  const resetVendorForm = () => {
    setVendorForm({
      name: "",
      email: "",
      phone: "",
      hasGST: false,
      gstNumber: "",
    });
  };

  const handleAddVendor = async () => {
    if (!vendorForm.name.trim()) {
      setErrorMsg("Vendor name is required");
      return;
    }

    try {
      const res = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/vendors",
        vendorForm
      );
      setVendors((prev) => [res.data, ...prev]);
      setSuccessMsg("Vendor added successfully");
      setOpenAddVendor(false);
      resetVendorForm();
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.error;

      if (status === 409) {
        setErrorMsg(msg || "GST number already exists");
      } else {
        setErrorMsg("Failed to add vendor");
      }
    }
  };

  // -----------------------------
  // DELETE VENDOR
  // -----------------------------
  const handleDeleteVendor = async (vendor) => {
    const yes = window.confirm(`Delete vendor "${vendor.name}"?`);
    if (!yes) return;

    try {
      await axios.delete(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/vendors/${vendor._id}`
      );

      setVendors((prev) => prev.filter((v) => v._id !== vendor._id));
      setSuccessMsg("Vendor deleted");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete vendor");
    }
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        Vendors
      </Typography>

      {/* TOP BAR */}
      <Stack
        direction="row"
        spacing={2}
        mb={3}
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={2}>
          <TextField
            label="Search Vendor"
            size="small"
            sx={{ width: 250 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <TextField
            select
            label="Filter by Vendor"
            size="small"
            sx={{ width: 220 }}
            value={selectedVendor}
            onChange={(e) => {
              setSelectedVendor(e.target.value);
              setPage(0);
            }}
          >
            {vendorNameOptions.map((name) => (
              <MenuItem key={name} value={name}>
                {name === "ALL" ? "All Vendors" : name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddVendor(true)}
        >
          Add Vendor
        </Button>
      </Stack>

      {/* TABLE */}
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>S.No.</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>GST</TableCell>
                <TableCell>GST Number</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}

              {!loading && paginatedVendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No vendors found
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                paginatedVendors.map((row, i) => (
                  <TableRow key={row._id}>
                    <TableCell>{page * rowsPerPage + i + 1}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email || "-"}</TableCell>
                    <TableCell>{row.phone || "-"}</TableCell>
                    <TableCell>{row.hasGST ? "Yes" : "No"}</TableCell>
                    <TableCell>{row.gstNumber || "-"}</TableCell>
                    <TableCell>
                      <Tooltip title="Delete Vendor">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteVendor(row)}
                        >
                          <DeleteIcon color="error" fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredVendors.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      {/* ADD VENDOR DIALOG */}
      <Dialog open={openAddVendor} onClose={() => setOpenAddVendor(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Vendor</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Vendor Name"
              value={vendorForm.name}
              onChange={(e) =>
                setVendorForm((prev) => ({ ...prev, name: e.target.value }))
              }
              required
              fullWidth
            />
            <TextField
              label="Email"
              value={vendorForm.email}
              onChange={(e) =>
                setVendorForm((prev) => ({ ...prev, email: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Phone"
              value={vendorForm.phone}
              onChange={(e) =>
                setVendorForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={vendorForm.hasGST}
                  onChange={(e) =>
                    setVendorForm((prev) => ({
                      ...prev,
                      hasGST: e.target.checked,
                      gstNumber: e.target.checked ? prev.gstNumber : "",
                    }))
                  }
                />
              }
              label="Has GST"
            />
            <TextField
              label="GST Number"
              value={vendorForm.gstNumber}
              onChange={(e) =>
                setVendorForm((prev) => ({
                  ...prev,
                  gstNumber: e.target.value,
                }))
              }
              disabled={!vendorForm.hasGST}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenAddVendor(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddVendor}>
            Save Vendor
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBARS */}
      <Snackbar open={!!errorMsg} autoHideDuration={4000} onClose={() => setErrorMsg("")}>
        <Alert severity="error">{errorMsg}</Alert>
      </Snackbar>

      <Snackbar open={!!successMsg} autoHideDuration={3000} onClose={() => setSuccessMsg("")}>
        <Alert severity="success">{successMsg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default VendorRecordsPage;
