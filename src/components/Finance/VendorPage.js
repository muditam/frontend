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
  Divider,
  LinearProgress,
  Switch,
  InputAdornment,
  Autocomplete, // Added for the searchable name filter
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import ReceiptIcon from "@mui/icons-material/Receipt";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import axios from "axios";


const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
};


const VendorRecordsPage = () => {
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("ALL");


  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");


  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);


  const [openAddVendor, setOpenAddVendor] = useState(false);


  const [vendorForm, setVendorForm] = useState({
    name: "",
    email: "",
    phone: "",
    hasGST: false,
    gstNumber: "",
  });


  useEffect(() => {
    loadVendors();
  }, []);


  const loadVendors = async () => {
    try {
      setLoading(true);
      const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/vendors");
      setVendors(res.data || []);
    } catch (err) {
      setErrorMsg("Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  };


  const vendorNameOptions = useMemo(() => {
    const names = vendors.map((v) => v.name).filter(Boolean);
    return ["ALL", ...Array.from(new Set(names))];
  }, [vendors]);


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


  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };


  const paginatedVendors = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredVendors.slice(start, start + rowsPerPage);
  }, [filteredVendors, page, rowsPerPage]);


  const resetVendorForm = () => {
    setVendorForm({ name: "", email: "", phone: "", hasGST: false, gstNumber: "" });
  };


  const handleAddVendor = async () => {
    if (!vendorForm.name.trim()) return setErrorMsg("Vendor name is required");
    if (vendorForm.email && !validateEmail(vendorForm.email)) return setErrorMsg("Invalid email format");
    if (vendorForm.hasGST && !vendorForm.gstNumber.trim()) return setErrorMsg("GST Number required");


    try {
      const res = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/vendors", vendorForm);
      setVendors((prev) => [res.data, ...prev]);
      setSuccessMsg("Vendor added successfully");
      setOpenAddVendor(false);
      resetVendorForm();
    } catch (err) {
      const status = err?.response?.status;
      setErrorMsg(status === 409 ? err?.response?.data?.error : "Failed to add vendor");
    }
  };


  const handleDeleteVendor = async (vendor) => {
    const yes = window.confirm(`Delete vendor "${vendor.name}"?`);
    if (!yes) return;
    try {
      await axios.delete(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/vendors/${vendor._id}`);
      setVendors((prev) => prev.filter((v) => v._id !== vendor._id));
      setSuccessMsg("Vendor deleted");
    } catch (err) { setErrorMsg("Failed to delete vendor"); }
  };


  return (
    <Box p={3} sx={{ backgroundColor: "#fbfbfb", minHeight: "100vh" }}>

      {/* HEADER SECTION */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        mb={3}
      >
        <Box sx={{ color: "black" }}>
          <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
            VENDOR MANAGEMENT
          </Typography>
        </Box>


        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddVendor(true)}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            px: 3,
            py: 1,
            backgroundColor: "black",
            color: "white",
            "&:hover": {
              backgroundColor: "#333",
            }
          }}
        >
          Add Vendor
        </Button>
      </Stack>


      {/* FILTER SECTION */}
      <Card variant="outlined" sx={{ p: 2.5, mb: 3, backgroundColor: "#fff", borderRadius: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" useFlexGap>
          <TextField
            label="Search All Fields"
            size="small"
            variant="outlined"
            placeholder="Type to search..."
            sx={{ width: 280 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />


          {/* Searchable Autocomplete Filter */}
          <Autocomplete
            size="small"
            options={vendorNameOptions}
            value={selectedVendor}
            getOptionLabel={(option) => (option === "ALL" ? "All Vendors" : option)}
            onChange={(_, newValue) => {
              setSelectedVendor(newValue || "ALL");
              setPage(0);
            }}
            sx={{ width: 280 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by Name"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <FilterListIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />


          <Button
            variant="text"
            color="inherit"
            onClick={() => { setSearchTerm(""); setSelectedVendor("ALL"); }}
            sx={{ textTransform: "none", fontWeight: 600, color: "text.secondary" }}
          >
            Reset Filters
          </Button>
        </Stack>
      </Card>


      {/* TABLE SECTION */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", position: "relative" }}>
        {loading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0 }} />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#000" }}>
                {["S.No.", "Name", "Email", "Phone", "GST Status", "GST Number", "Actions"].map((head) => (
                  <TableCell key={head} sx={{ color: "#fff", fontWeight: 700, py: 2 }}>
                    {head.toUpperCase()}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>


            <TableBody>
              {paginatedVendors.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No vendors found matching your criteria.
                  </TableCell>
                </TableRow>
              )}


              {paginatedVendors.map((row, i) => (
                <TableRow key={row._id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{page * rowsPerPage + i + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                  <TableCell>{row.email || "-"}</TableCell>
                  <TableCell>{row.phone || "-"}</TableCell>
                  <TableCell>
                    <Box sx={{
                      display: 'inline-block',
                      px: 1.5, py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: row.hasGST ? '#e8f5e9' : '#f5f5f5',
                      color: row.hasGST ? '#2e7d32' : '#757575'
                    }}>
                      {row.hasGST ? "GST REGISTERED" : "NO GST"}
                    </Box>
                  </TableCell>
                  <TableCell>{row.gstNumber || "-"}</TableCell>
                  <TableCell>
                    <Tooltip title="Delete Vendor">
                      <IconButton size="small" onClick={() => handleDeleteVendor(row)}>
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
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Card>


      {/* BEAUTIFUL ADD VENDOR DIALOG */}
      <Dialog
        open={openAddVendor}
        onClose={() => setOpenAddVendor(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, px: 1, pb: 1, boxShadow: '0px 10px 30px rgba(0,0,0,0.1)' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, pt: 3 }}>
          Add Vendor
        </DialogTitle>
        <Divider variant="middle" sx={{ mb: 2 }} />


        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={3}>
            <TextField
              label="Vendor Name *"
              placeholder="Full legal name"
              fullWidth
              variant="outlined"
              value={vendorForm.name}
              onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><PersonOutlineIcon color="action" /></InputAdornment>
                ),
              }}
            />


            <Stack direction="row" spacing={2}>
              <TextField
                label="Phone"
                fullWidth
                value={vendorForm.phone}
                onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><LocalPhoneIcon color="action" /></InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Email"
                fullWidth
                value={vendorForm.email}
                onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                error={vendorForm.email !== "" && !validateEmail(vendorForm.email)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><MailOutlineIcon color="action" /></InputAdornment>
                  ),
                }}
              />
            </Stack>


            <Stack direction="row" alignItems="center" sx={{ pl: 0.5 }}>
              <Switch
                color="primary"
                checked={vendorForm.hasGST}
                onChange={(e) => setVendorForm({ ...vendorForm, hasGST: e.target.checked })}
              />
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Has GST Registration?
              </Typography>
            </Stack>


            {vendorForm.hasGST && (
              <TextField
                label="GST Number"
                placeholder="15-digit GSTIN"
                fullWidth
                required
                variant="outlined"
                value={vendorForm.gstNumber}
                onChange={(e) => setVendorForm({ ...vendorForm, gstNumber: e.target.value })}
                sx={{
                  animation: 'fadeIn 0.3s ease-in-out',
                  '@keyframes fadeIn': {
                    from: { opacity: 0, transform: 'translateY(-10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><ReceiptIcon color="primary" /></InputAdornment>
                  ),
                }}
              />
            )}
          </Stack>
        </DialogContent>


        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAddVendor(false)} sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddVendor}
            sx={{
              px: 4, py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              boxShadow: '0px 4px 10px rgba(25, 118, 210, 0.3)'
            }}
          >
            Save Vendor
          </Button>
        </DialogActions>
      </Dialog>


      {/* NOTIFICATIONS */}
      <Snackbar open={!!errorMsg} autoHideDuration={4000} onClose={() => setErrorMsg("")}>
        <Alert severity="error" variant="filled" onClose={() => setErrorMsg("")}>{errorMsg}</Alert>
      </Snackbar>
      <Snackbar open={!!successMsg} autoHideDuration={3000} onClose={() => setSuccessMsg("")}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessMsg("")}>{successMsg}</Alert>
      </Snackbar>
    </Box>
  );
};


export default VendorRecordsPage;

