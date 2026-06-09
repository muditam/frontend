import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  IconButton,
  Typography,
  Select,
  Checkbox,
  FormControl,
  ListItemText,
  Drawer,
  TablePagination,
  InputLabel,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import { AddCircle, Delete, FileDownload, FilterList } from "@mui/icons-material";
import axios from "axios";
import { clearCachedData, getCachedData } from "../../utils/apiCache";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, ""); 

const api = axios.create({
  baseURL: API_BASE || "",
  withCredentials: true,
});

const TABLE_COLUMN_COUNT = 30;
const DEFAULT_ROWS_PER_PAGE = 30;
const MASTER_ROWS_PER_PAGE_OPTIONS = [10, 30, 50, 100];
const SKELETON_ROW_COUNT = 5;
const MASTER_LEADS_CACHE_TTL_MS = 60 * 1000;
 
const defaultFilters = {
  startDate: "",
  endDate: "",
  date: "",
  name: "",
  contactNumber: "",
  deliveryStatus: "",
  customerType: "",
  agentAssigned: [],
  leadStatus: [],
  salesStatus: [],
  reminder: "",
  healthExpertAssigned: "",
  orderId: "",
  rtFollowupReminder: "",
  rtFollowupStatus: "",
  retentionStatus: "",
  leadSource: [],
  enquiryFor: "",
  lastOrderDate: "",
};

const defaultNewLead = {
  date: "",
  time: "",
  name: "",
  contactNumber: "",
  leadSource: "",
  enquiryFor: "",
  customerType: "",
  agentAssigned: "",
  productPitched: [],
  leadStatus: "",
  salesStatus: "",
  nextFollowup: "",
  reminder: "",
  agentsRemarks: "",
  productsOrdered: [],
  dosageOrdered: "",
  amountPaid: "",
  modeOfPayment: "",
  deliveryStatus: "",
  healthExpertAssigned: "",
  orderId: "",
  dosageExpiring: "",
  rtNextFollowupDate: "",
  rtFollowupReminder: "",
  rtFollowupStatus: "",
  lastOrderDate: "",
  repeatDosageOrdered: "",
  retentionStatus: "",
  rtRemark: "",
};

const LeadTable = () => {
  const [leads, setLeads] = useState([]);
  const [salesAgents, setSalesAgents] = useState([]);
  const [retentionAgents, setRetentionAgents] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [validationErrors, setValidationErrors] = useState({});
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addingLead, setAddingLead] = useState(false);
  const [addLeadError, setAddLeadError] = useState("");
  const [applyingFilters, setApplyingFilters] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [newLead, setNewLead] = useState(defaultNewLead);

  const fetchLeads = useCallback(async (page, limit, activeFilters) => {
    setLoading(true);
    try {
      const normalizedFilters = activeFilters || {};
      const filtersKey = JSON.stringify(normalizedFilters);
      const data = await getCachedData(
        `master-leads:${page}:${limit}:${filtersKey}`,
        async () => {
          const response = await api.get("/api/leads", {
            params: {
              page,
              limit,
              view: "master-leads",
              filters: filtersKey,
            },
          });

          return response.data || {};
        },
        MASTER_LEADS_CACHE_TTL_MS
      );

      setLeads(data.leads || []);
      setTotalLeads(data.totalLeads || 0);
    } catch (error) {
      console.error("Failed to fetch leads", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployeesByRole = async (role, setState) => {
    try {
      const response = await api.get("/api/employees", {
        params: { role },
      });
      setState(response.data || []);
    } catch (error) {
      console.error(`Failed to fetch ${role} employees`, error);
    }
  };

  useEffect(() => {
    fetchLeads(currentPage, rowsPerPage, appliedFilters);
  }, [appliedFilters, currentPage, fetchLeads, rowsPerPage]);

  useEffect(() => {
    fetchEmployeesByRole("Sales Agent", setSalesAgents);
    fetchEmployeesByRole("Retention Agent", setRetentionAgents);
  }, []);

  const handleAddRow = async () => {
    setAddingLead(true);
    setAddLeadError("");

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split("T")[0];
    const formattedTime = currentDate.toLocaleTimeString("en-IN");

    const newLeadData = {
      ...newLead,
      date: formattedDate,
      time: formattedTime,
      __draft: true,
    };

    try {
      const response = await api.post("/api/leads", newLeadData);

      if (response.status === 201) {
        clearCachedData("master-leads:");
        setLeads((prev) => [response.data.lead, ...prev]);
        setTotalLeads((prev) => prev + 1);
        setNewLead(defaultNewLead);
      }
    } catch (error) {
      console.error("Error adding lead:", error);
      setAddLeadError(
        error.response?.data?.message ||
          "Unable to add lead. Please try again."
      );
    } finally {
      setAddingLead(false);
    }
  };

  const handleDeleteLead = async (id) => {
    try {
      await api.delete(`/api/leads/${id}`);
      clearCachedData("master-leads:");
      setLeads((prev) => prev.filter((lead) => lead._id !== id));
      setTotalLeads((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error deleting lead:", error);
    }
  };

  const calculateDosageExpiring = (days) => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + days);
    return currentDate.toISOString().split("T")[0];
  };

  const handleInputChange = async (e, index, field) => {
    const value = e.target.value;
    const updatedLeads = [...leads];
    const currentLead = updatedLeads[index];

    updatedLeads[index][field] = value;

    let updatePayload = {
      [field]: value,
    };

    if (field === "dosageOrdered") {
      const days = parseInt(String(value).split("-")[0], 10);
      const dosageExpiring = Number.isNaN(days) ? "" : calculateDosageExpiring(days);
      updatedLeads[index].dosageExpiring = dosageExpiring;
      updatePayload.dosageExpiring = dosageExpiring;
    }

    setLeads(updatedLeads);

    if (field === "contactNumber") {
      try {
        const response = await api.get("/api/leads/check-duplicate", {
          params: { contactNumber: value },
        });

        if (
          response.data.exists &&
          response.data.leadId &&
          response.data.leadId !== currentLead._id
        ) {
          setValidationErrors((prev) => ({
            ...prev,
            [index]: "This number is already registered",
          }));
          return;
        } else {
          setValidationErrors((prev) => ({
            ...prev,
            [index]: null,
          }));
        }
      } catch (error) {
        console.error("Error checking duplicate number:", error);
      }
    }

    const leadId = currentLead._id;
    if (!leadId) return;

    try {
      await api.put(`/api/leads/${leadId}`, updatePayload);
      clearCachedData("master-leads:");
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  };

  const handleSalesStatusChange = (e, index) => {
    const updatedLeads = [...leads];
    updatedLeads[index].salesStatus = e.target.value;
    setLeads(updatedLeads);
  };

  const handleCombinedChange = (event, index, field) => {
    handleSalesStatusChange(event, index);
    handleInputChange(event, index, field);
  };

  const calculateReminder = (nextFollowup) => {
    if (!nextFollowup) return "";

    const followupDate = new Date(nextFollowup);
    const today = new Date();

    const diffInDays = Math.ceil(
      (followupDate - today) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays < 0) return "Follow-up Missed";
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Tomorrow";
    return diffInDays > 1 ? "Later" : "";
  };

  const applyFilters = async () => {
    setApplyingFilters(true);

    try {
      const activeFilters = { ...filters };

      if (!activeFilters.startDate) delete activeFilters.startDate;
      if (!activeFilters.endDate) delete activeFilters.endDate;
      if (!activeFilters.lastOrderDate) delete activeFilters.lastOrderDate;

      setCurrentPage(1);
      setAppliedFilters(activeFilters);
    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      setApplyingFilters(false);
    }
  };

  const exportToCSV = () => {
    const exportUrl = API_BASE ? `${API_BASE}/export-leads` : "/export-leads";
    window.location.href = exportUrl;
  };

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage + 1);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  };

  const textFieldSx = {
    mb: 2,
    "& .MuiInputLabel-root": {
      top: "50%",
      transform: "translateY(-50%)",
      transition: "all 0.2s ease-in-out",
      fontSize: "0.85rem",
      paddingLeft: "8px",
    },
    "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled": {
      top: 0,
      color: "gray",
      transform: "translateY(-50%) translateX(8px)",
      paddingLeft: "8px",
      fontSize: "0.65rem",
    },
    "& .MuiOutlinedInput-root": {
      "& input": {
        padding: "4px !important",
      },
      "&.Mui-focused fieldset": { borderColor: "black" },
      "&:hover fieldset": { borderColor: "black" },
    },
  };

  const dateFieldSx = {
    marginBottom: 2,
    "& .MuiInputBase-input": { padding: "10px 12px" },
    "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled": {
      top: 0,
      color: "gray",
      transform: "translateY(-50%) translateX(8px)",
      paddingLeft: "8px",
      fontSize: "0.75rem",
    },
    "& .MuiOutlinedInput-root": {
      "& input": { padding: "8px !important" },
      "&.Mui-focused fieldset": { borderColor: "black" },
      "&:hover fieldset": { borderColor: "black" },
    },
  };

  const formControlSx = {
    mb: 2,
    "& .MuiInputLabel-root": {
      fontSize: "0.85rem",
      paddingLeft: "8px",
      top: "50%",
      transition: "all 0.2s ease-in-out",
      transform: "translateY(-50%)",
    },
    "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled": {
      top: 0,
      transform: "translateY(-50%) translateX(8px)",
      fontSize: "0.75rem",
      color: "gray",
    },
    "& .MuiOutlinedInput-root": {
      "& input": { padding: "4px !important" },
      "& .MuiSelect-select": { padding: "4px" },
      "&.Mui-focused fieldset": { borderColor: "black" },
      "&:hover fieldset": { borderColor: "black" },
    },
  };

  const styles = {
    tableHead: {
      backgroundColor: "#171717",
      color: "#fff",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      textAlign: "center",
      lineHeight: "14px",
      minHeight: "36px",
      height: "36px",
      borderBottom: "none",
      fontSize: "0.68rem",
      fontWeight: 700,
      letterSpacing: 0,
      padding: "10px 14px",
    },
    tableRow: {
      height: "54px",
      transition: "transform 0.16s ease, box-shadow 0.16s ease",
      "&:hover": {
        transform: "translateY(-1px)",
        "& .MuiTableCell-root": {
          backgroundColor: "#fffdf5",
          borderColor: "#f2d48a",
        },
      },
    },
  };

  const tableContainerSx = {
    maxHeight: "calc(100vh - 230px)",
    border: "1px solid #e7e2d5",
    borderRadius: 2,
    backgroundColor: "#f7f8fa",
    boxShadow: "0 14px 34px rgba(17, 24, 39, 0.08)",
    overflow: "auto",
    "& .MuiTable-root": {
      minWidth: 3200,
      borderCollapse: "separate",
      borderSpacing: "0 8px",
      padding: "0 10px 10px",
    },
    "& .MuiTableHead-root .MuiTableCell-root": {
      top: 0,
      zIndex: 2,
      backgroundColor: "#171717",
      borderBottom: "1px solid #2f2f2f",
    },
    "& .MuiTableHead-root .MuiTableCell-root:first-of-type": {
      borderRadius: "8px 0 0 8px",
    },
    "& .MuiTableHead-root .MuiTableCell-root:last-of-type": {
      borderRadius: "0 8px 8px 0",
    },
    "& .MuiTableBody-root .MuiTableCell-root": {
      backgroundColor: "#fff",
      borderTop: "1px solid #edf0f2",
      borderBottom: "1px solid #edf0f2",
      color: "#1f2937",
      fontSize: "0.72rem",
      padding: "8px 10px",
      textAlign: "center",
      whiteSpace: "nowrap",
    },
    "& .MuiTableBody-root .MuiTableCell-root:first-of-type": {
      borderLeft: "1px solid #edf0f2",
      borderRadius: "8px 0 0 8px",
    },
    "& .MuiTableBody-root .MuiTableCell-root:last-of-type": {
      borderRight: "1px solid #edf0f2",
      borderRadius: "0 8px 8px 0",
    },
    "& .MuiTableBody-root .MuiOutlinedInput-root": {
      minHeight: 34,
      borderRadius: "6px",
      backgroundColor: "#f9fafb",
      fontSize: "0.72rem",
    },
    "& .MuiTableBody-root .MuiOutlinedInput-notchedOutline": {
      borderColor: "#e5e7eb",
    },
    "& .MuiTableBody-root .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#d5a821",
    },
    "& .MuiTableBody-root .Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#171717 !important",
      borderWidth: "1px !important",
    },
    "& .MuiTableBody-root .MuiInputBase-input": {
      padding: "7px 9px",
    },
    "& .MuiTableBody-root .MuiSelect-select": {
      padding: "7px 28px 7px 9px",
      minWidth: 118,
      textAlign: "left",
    },
    "& .MuiTableBody-root .MuiIconButton-root": {
      width: 32,
      height: 32,
      backgroundColor: "#fff1f2",
      border: "1px solid #fecdd3",
      "&:hover": {
        backgroundColor: "#ffe4e6",
      },
    },
    "& .MuiSkeleton-root": {
      borderRadius: "6px",
    },
  };

  const primaryButtonSx = {
    backgroundColor: "#171717",
    borderRadius: "8px",
    boxShadow: "none",
    textTransform: "none",
    fontWeight: 700,
    "&:hover": {
      backgroundColor: "#2b2b2b",
      boxShadow: "0 8px 18px rgba(23, 23, 23, 0.16)",
    },
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f4f5f2", padding: { xs: 1.5, md: 2.5 } }}>
      <Box
        sx={{
          mb: 2,
          p: { xs: 1.5, md: 2 },
          borderRadius: 2,
          border: "1px solid #e7e2d5",
          backgroundColor: "#fff",
          boxShadow: "0 10px 28px rgba(17, 24, 39, 0.06)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: "#171717",
              letterSpacing: 0,
              lineHeight: 1.2,
            }}
          >
            Master Data - Leads
          </Typography>
          <Typography variant="body2" sx={{ color: "#6b7280", mt: 0.5 }}>
            {totalLeads.toLocaleString("en-IN")} leads
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Button
            variant="contained"
            startIcon={addingLead ? <CircularProgress color="inherit" size={18} /> : <AddCircle />}
            onClick={handleAddRow}
            sx={primaryButtonSx}
            disabled={addingLead}
          >
            Add Lead
          </Button>

          <Button
            variant="contained"
            startIcon={<FilterList />}
            onClick={() => setFilterOpen(true)}
            sx={primaryButtonSx}
          >
            Filter
          </Button>

          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={exportToCSV}
            sx={{
              borderRadius: "8px",
              borderColor: "#171717",
              color: "#171717",
              textTransform: "none",
              fontWeight: 700,
              "&:hover": {
                borderColor: "#171717",
                backgroundColor: "#fff7db",
              },
            }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {addLeadError ? (
        <Typography
          variant="body2"
          sx={{
            mb: 1.5,
            color: "#b91c1c",
            fontWeight: 600,
          }}
        >
          {addLeadError}
        </Typography>
      ) : null}

      <Drawer
        anchor="right"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        sx={{
          transition: "all 0.5s ease-in-out",
          "& .MuiDrawer-paper": {
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
            borderRadius: "10px 0 0 10px",
          },
        }}
      >
        <Box sx={{ width: 250, padding: 2 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              mb: 1,
              position: "sticky",
              top: 0,
              fontWeight: "bold",
              textAlign: "center",
              color: "#333",
              background: "white",
              zIndex: 10,
            }}
          >
            Filters
          </Typography>

          <Box
            sx={{
              height: "2px",
              backgroundColor: "#FFC107",
              mb: 2,
              borderRadius: "2px",
            }}
          />

          <Box sx={{ mb: 1 }}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  startDate: e.target.value
                    ? new Date(e.target.value).toISOString().split("T")[0]
                    : "",
                }))
              }
              InputLabelProps={{ shrink: true }}
              sx={dateFieldSx}
            />

            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  endDate: e.target.value
                    ? new Date(e.target.value).toISOString().split("T")[0]
                    : "",
                }))
              }
              InputLabelProps={{ shrink: true }}
              sx={dateFieldSx}
            />

            <TextField
              fullWidth
              label="Name"
              value={filters.name}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, name: e.target.value }))
              }
              sx={textFieldSx}
            />

            <TextField
              fullWidth
              label="Contact Number"
              value={filters.contactNumber}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  contactNumber: e.target.value,
                }))
              }
              sx={textFieldSx}
            />

            <TextField
              fullWidth
              type="date"
              label="Order Date"
              value={filters.lastOrderDate}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  lastOrderDate: e.target.value
                    ? new Date(e.target.value).toISOString().split("T")[0]
                    : "",
                }))
              }
              InputLabelProps={{ shrink: true }}
              sx={dateFieldSx}
            />

            <FormControl fullWidth sx={formControlSx}>
              <InputLabel>Expert Assigned</InputLabel>
              <Select
                multiple
                label="Expert Assigned"
                value={filters.agentAssigned}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    agentAssigned: e.target.value,
                  }))
                }
                renderValue={(selected) => selected.join(", ")}
              >
                {salesAgents.map((agent) => (
                  <MenuItem key={agent.fullName} value={agent.fullName}>
                    <Checkbox
                      checked={filters.agentAssigned.includes(agent.fullName)}
                    />
                    <ListItemText primary={agent.fullName} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={formControlSx}>
              <InputLabel>Lead Source</InputLabel>
              <Select
                multiple
                label="Lead Source"
                value={filters.leadSource}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    leadSource: e.target.value,
                  }))
                }
                renderValue={(selected) => selected.join(", ")}
              >
                {[
                  "Abandoned Cart",
                  "BiteSpeed",
                  "Business on Bot",
                  "Facebook Lead",
                  "Google Lead",
                  "Incoming Call",
                  "Lead Form",
                  "Online Store",
                  "Others",
                  "Rampwin",
                  "Reference",
                  "Whatsapp",
                  "Degpeg",
                ].map((source) => (
                  <MenuItem key={source} value={source}>
                    <Checkbox checked={filters.leadSource.includes(source)} />
                    <ListItemText primary={source} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={formControlSx}>
              <InputLabel>Lead Status</InputLabel>
              <Select
                multiple
                label="Lead Status"
                value={filters.leadStatus}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    leadStatus: e.target.value,
                  }))
                }
                renderValue={(selected) => selected.join(", ")}
              >
                {[
                  "Sales Done",
                  "CNP - Call Not Picked",
                  "Not Interested",
                  "Product Issue",
                  "Order from Other Source",
                  "Upsell",
                  "Fake Lead",
                  "Follow Up",
                  "Call Back",
                  "New",
                  "General Query",
                  "Invalid Number",
                ].map((status) => (
                  <MenuItem key={status} value={status}>
                    <Checkbox checked={filters.leadStatus.includes(status)} />
                    <ListItemText primary={status} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={formControlSx}>
              <InputLabel>Reminder</InputLabel>
              <Select
                label="Reminder"
                value={filters.reminder || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    reminder: e.target.value,
                  }))
                }
              >
                {["Follow-up Missed", "Today", "Tomorrow", "Later"].map(
                  (option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={formControlSx}>
              <InputLabel>RT-Followup Reminder</InputLabel>
              <Select
                label="RT-Followup Reminder"
                value={filters.rtFollowupReminder || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    rtFollowupReminder: e.target.value,
                  }))
                }
              >
                {["Follow-up Missed", "Today", "Tomorrow", "Later"].map(
                  (option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={formControlSx}>
              <InputLabel>Sales Status</InputLabel>
              <Select
                label="Sales Status"
                multiple
                value={filters.salesStatus}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    salesStatus: e.target.value,
                  }))
                }
                renderValue={(selected) => selected.join(", ")}
              >
                {["Sales Done", "Lost", "On Follow Up"].map((status) => (
                  <MenuItem key={status} value={status}>
                    <Checkbox checked={filters.salesStatus.includes(status)} />
                    <ListItemText primary={status} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {[
              {
                key: "deliveryStatus",
                label: "Delivery Status",
                options: ["Delivered", "RTO", "Undelivered"],
              },
              {
                key: "customerType",
                label: "Customer Type",
                options: ["Fresh", "Renewal", "Online Order"],
              },
              {
                key: "healthExpertAssigned",
                label: "Health Expert Assigned",
                options: retentionAgents.map((agent) => agent.fullName),
              },
              {
                key: "rtFollowupStatus",
                label: "Rt-Followup Status",
                options: [
                  "Good Results",
                  "No Result",
                  "Sales Done",
                  "Do Not Want to Continue",
                  "Order Confirm",
                  "Call Not Picked",
                  "Blood Test Suggested",
                  "Product Issue",
                  "Order from Other Source",
                  "Upsell",
                  "Follow Up Again",
                  "Call Back",
                  "Others",
                ],
              },
              {
                key: "retentionStatus",
                label: "Retention Status",
                options: ["Active", "Lost", "No-Call"],
              },
              {
                key: "enquiryFor",
                label: "Enquiery For",
                options: [
                  "KJF",
                  "SDP",
                  "VKR",
                  "L-Fx",
                  "S&S",
                  "CPV",
                  "HDP",
                  "PF",
                  "PGut",
                  "Shilajit",
                  "Kit",
                  "Blood Test",
                ],
              },
            ].map((field) => (
              <FormControl fullWidth sx={formControlSx} key={field.key}>
                <InputLabel>{field.label}</InputLabel>
                <Select
                  value={filters[field.key]}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  label={field.label}
                >
                  {field.options.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
          </Box>

          <Button
            variant="contained"
            fullWidth
            startIcon={applyingFilters ? <CircularProgress size={20} /> : null}
            disabled={applyingFilters}
            onClick={() => {
              applyFilters();
              setFilterOpen(false);
            }}
            sx={{
              marginBottom: 1,
              backgroundColor: "black",
              transition: "background-color 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: "#333",
              },
            }}
          >
            Apply Filters
          </Button>

          <Button
            variant="outlined"
            fullWidth
            sx={{
              marginBottom: 1,
              color: "black",
              borderColor: "black",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderColor: "#333",
                color: "#333",
              },
            }}
            onClick={() => {
              setFilters(defaultFilters);
              setAppliedFilters(defaultFilters);
              setCurrentPage(1);
            }}
          >
            Reset Filters
          </Button>
        </Box>
      </Drawer>

      <TableContainer component={Box} sx={tableContainerSx}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead sx={styles.tableHead}>
            <TableRow>
              <TableCell sx={styles.tableHead}>Delete</TableCell>
              <TableCell sx={styles.tableHead}>Date</TableCell>
              <TableCell sx={styles.tableHead}>Time</TableCell>
              <TableCell sx={styles.tableHead}>Name *</TableCell>
              <TableCell sx={styles.tableHead}>Contact No *</TableCell>
              <TableCell sx={styles.tableHead}>Lead Source *</TableCell>
              <TableCell sx={styles.tableHead}>Enquiry For *</TableCell>
              <TableCell sx={styles.tableHead}>Customer Type *</TableCell>
              <TableCell sx={styles.tableHead}>Expert Assigned *</TableCell>
              <TableCell sx={styles.tableHead}>Product Pitched</TableCell>
              <TableCell sx={styles.tableHead}>Lead Status</TableCell>
              <TableCell sx={styles.tableHead}>Sales Status</TableCell>
              <TableCell sx={styles.tableHead}>Next Followup</TableCell>
              <TableCell sx={styles.tableHead}>Reminder</TableCell>
              <TableCell sx={styles.tableHead}>Expert's Remarks</TableCell>
              <TableCell sx={styles.tableHead}>Order Date</TableCell>
              <TableCell sx={styles.tableHead}>Products Ordered</TableCell>
              <TableCell sx={styles.tableHead}>Dosage Ordered</TableCell>
              <TableCell sx={styles.tableHead}>Amount Paid</TableCell>
              <TableCell sx={styles.tableHead}>Mode of Payment</TableCell>
              <TableCell sx={styles.tableHead}>Delivery Status</TableCell>
              <TableCell sx={styles.tableHead}>Health Expert Assigned</TableCell>
              <TableCell sx={styles.tableHead}>Order ID</TableCell>
              <TableCell sx={styles.tableHead}>RT Next Followup Date</TableCell>
              <TableCell sx={styles.tableHead}>Dosage Expiring</TableCell>
              <TableCell sx={styles.tableHead}>RT-Followup Reminder</TableCell>
              <TableCell sx={styles.tableHead}>RT-Followup Status</TableCell>
              <TableCell sx={styles.tableHead}>Repeat Dosage Ordered</TableCell>
              <TableCell sx={styles.tableHead}>Retention Status</TableCell>
              <TableCell sx={styles.tableHead}>RT-Remark</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
                <TableRow key={`lead-skeleton-${rowIndex}`} sx={styles.tableRow}>
                  {Array.from({ length: TABLE_COLUMN_COUNT }).map((__, cellIndex) => (
                    <TableCell key={`lead-skeleton-${rowIndex}-${cellIndex}`}>
                      {cellIndex === 0 ? (
                        <Skeleton animation="wave" variant="circular" width={28} height={28} />
                      ) : (
                        <Skeleton
                          animation="wave"
                          variant="rounded"
                          width={cellIndex % 4 === 0 ? 132 : 96}
                          height={30}
                          sx={{ mx: "auto" }}
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              leads.map((lead, index) => (
                <TableRow key={lead._id} sx={styles.tableRow}>
                  <TableCell>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteLead(lead._id)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>

                  <TableCell>
                    <TextField
                      type="date"
                      value={lead.date || ""}
                      onChange={(e) => handleInputChange(e, index, "date")}
                    />
                  </TableCell>

                  <TableCell style={{ whiteSpace: "nowrap", minWidth: "150px" }}>
                    <TextField
                      value={lead.time || new Date().toLocaleTimeString("en-IN")}
                      disabled
                    />
                  </TableCell>

                  <TableCell style={{ whiteSpace: "nowrap", minWidth: "240px" }}>
                    <TextField
                      value={lead.name || ""}
                      onChange={(e) => handleInputChange(e, index, "name")}
                    />
                  </TableCell>

                  <TableCell style={{ whiteSpace: "nowrap", minWidth: "200px" }}>
                    <TextField
                      type="number"
                      value={lead.contactNumber || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "contactNumber")
                      }
                      error={Boolean(validationErrors[index])}
                      helperText={validationErrors[index]}
                      sx={{
                        flexGrow: 1,
                        "& input[type=number]": {
                          MozAppearance: "textfield",
                        },
                        "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button":
                          {
                            WebkitAppearance: "none",
                            margin: 0,
                          },
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.leadSource || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "leadSource")
                      }
                    >
                      {[
                        "Abandoned Cart",
                        "BiteSpeed",
                        "Business on Bot",
                        "Facebook Lead",
                        "Google Lead",
                        "Incoming Call",
                        "Lead Form",
                        "Online Store",
                        "Others",
                        "Rampwin",
                        "Reference",
                        "Whatsapp",
                        "Degpeg",
                      ].map((source) => (
                        <MenuItem key={source} value={source}>
                          {source}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.enquiryFor || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "enquiryFor")
                      }
                    >
                      {[
                        "KJF",
                        "SDP",
                        "VKR",
                        "L-Fx",
                        "S&S",
                        "CPV",
                        "HDP",
                        "PF",
                        "PGut",
                        "Shilajit",
                        "Kit",
                        "Blood Test",
                      ].map((item) => (
                        <MenuItem key={item} value={item}>
                          {item}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.customerType || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "customerType")
                      }
                    >
                      {["Fresh", "Renewal", "Online Order"].map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.agentAssigned || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "agentAssigned")
                      }
                      fullWidth
                    >
                      {salesAgents.map((agent) => (
                        <MenuItem key={agent._id} value={agent.fullName}>
                          {agent.fullName}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell>
                    <FormControl>
                      <Select
                        multiple
                        value={lead.productPitched || []}
                        onChange={(e) =>
                          handleInputChange(e, index, "productPitched")
                        }
                        renderValue={(selected) => selected.join(", ")}
                      >
                        {[
                          "KJF",
                          "SDP",
                          "VKR",
                          "L-Fx",
                          "S&S",
                          "CPV",
                          "HDP",
                          "PF",
                          "PGut",
                          "Shilajit",
                          "Kit",
                          "Blood Test",
                        ].map((option) => (
                          <MenuItem key={option} value={option}>
                            <Checkbox
                              checked={lead.productPitched?.includes(option)}
                            />
                            <ListItemText primary={option} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.leadStatus || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "leadStatus")
                      }
                    >
                      {[
                        "Sales Done",
                        "CNP - Call Not Picked",
                        "Not Interested",
                        "Product Issue",
                        "Order from Other Source",
                        "Upsell",
                        "Fake Lead",
                        "Follow Up",
                        "Call Back",
                        "New",
                        "General Query",
                        "Invalid Number",
                      ].map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.salesStatus || ""}
                      onChange={(e) =>
                        handleCombinedChange(e, index, "salesStatus")
                      }
                    >
                      {["Sales Done", "Lost", "On Follow Up"].map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell>
                    {lead.salesStatus === "On Follow Up" ? (
                      <TextField
                        type="date"
                        value={lead.nextFollowup || ""}
                        onChange={(e) =>
                          handleInputChange(e, index, "nextFollowup")
                        }
                      />
                    ) : (
                      <Typography>{lead.nextFollowup || ""}</Typography>
                    )}
                  </TableCell>

                  <TableCell
                    sx={{
                      color:
                        calculateReminder(lead.nextFollowup) === "Today"
                          ? "green"
                          : calculateReminder(lead.nextFollowup) === "Tomorrow"
                          ? "blue"
                          : calculateReminder(lead.nextFollowup) === "Follow-up Missed"
                          ? "red"
                          : "inherit",
                    }}
                  >
                    {lead.salesStatus === "On Follow Up"
                      ? calculateReminder(lead.nextFollowup)
                      : lead.salesStatus}
                  </TableCell>

                  <TableCell style={{ whiteSpace: "nowrap", minWidth: "250px" }}>
                    <TextField
                      value={lead.agentsRemarks || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "agentsRemarks")
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      type="date"
                      value={lead.lastOrderDate || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "lastOrderDate")
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <FormControl>
                      <Select
                        multiple
                        value={lead.productsOrdered || []}
                        onChange={(e) =>
                          handleInputChange(e, index, "productsOrdered")
                        }
                        renderValue={(selected) => selected.join(", ")}
                      >
                        {[
                          "KJF",
                          "SDP",
                          "VKR",
                          "L-Fx",
                          "S&S",
                          "CPV",
                          "HDP",
                          "PF",
                          "PGut",
                          "Shilajit",
                          "Kit",
                          "Blood Test",
                        ].map((option) => (
                          <MenuItem key={option} value={option}>
                            <Checkbox
                              checked={lead.productsOrdered?.includes(option)}
                            />
                            <ListItemText primary={option} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.dosageOrdered || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "dosageOrdered")
                      }
                    >
                      {[
                        "10-Days",
                        "20-Days",
                        "30-Days",
                        "60-Days",
                        "90-Days",
                      ].map((dosage) => (
                        <MenuItem key={dosage} value={dosage}>
                          {dosage}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell style={{ whiteSpace: "nowrap", minWidth: "160px" }}>
                    <TextField
                      type="number"
                      value={lead.amountPaid || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "amountPaid")
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.modeOfPayment || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "modeOfPayment")
                      }
                    >
                      {[
                        "Partial Paid",
                        "Razorpay",
                        "COD",
                        "UPI",
                        "Bank Transfer",
                      ].map((mode) => (
                        <MenuItem key={mode} value={mode}>
                          {mode}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.deliveryStatus || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "deliveryStatus")
                      }
                    >
                      {["Delivered", "RTO", "Undelivered"].map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.healthExpertAssigned || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "healthExpertAssigned")
                      }
                      fullWidth
                    >
                      {retentionAgents.map((expert) => (
                        <MenuItem key={expert._id} value={expert.fullName}>
                          {expert.fullName}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell style={{ whiteSpace: "nowrap", minWidth: "150px" }}>
                    <TextField
                      value={lead.orderId || ""}
                      onChange={(e) => handleInputChange(e, index, "orderId")}
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      type="date"
                      value={lead.rtNextFollowupDate || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "rtNextFollowupDate")
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      type="date"
                      disabled
                      value={lead.dosageExpiring || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "dosageExpiring")
                      }
                    />
                  </TableCell>

                  <TableCell
                    sx={{
                      color:
                        lead.rtFollowupReminder === "Today"
                          ? "green"
                          : lead.rtFollowupReminder === "Tomorrow"
                          ? "blue"
                          : lead.rtFollowupReminder === "Follow-up Missed"
                          ? "red"
                          : "inherit",
                    }}
                  >
                    {lead.rtFollowupReminder || ""}
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.rtFollowupStatus || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "rtFollowupStatus")
                      }
                    >
                      {[
                        "Good Results",
                        "No Result",
                        "Sales Done",
                        "Order Confirm",
                        "Do Not Want to Continue",
                        "Call Not Picked",
                        "Blood Test Suggested",
                        "Product Issue",
                        "Order from Other Source",
                        "Upsell",
                        "Follow Up Again",
                        "Call Back",
                        "Others",
                      ].map((status) => (
                        <MenuItem
                          key={status}
                          value={status}
                          style={{ whiteSpace: "nowrap", minWidth: "200px" }}
                        >
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.repeatDosageOrdered || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "repeatDosageOrdered")
                      }
                    >
                      {[
                        "10-Days",
                        "20-Days",
                        "30-Days",
                        "60-Days",
                        "90-Days",
                      ].map((dosage) => (
                        <MenuItem key={dosage} value={dosage}>
                          {dosage}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={lead.retentionStatus || ""}
                      onChange={(e) =>
                        handleInputChange(e, index, "retentionStatus")
                      }
                    >
                      {["Active", "Lost", "No-Call"].map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell style={{ whiteSpace: "nowrap", minWidth: "180px" }}>
                    <TextField
                      value={lead.rtRemark || ""}
                      onChange={(e) => handleInputChange(e, index, "rtRemark")}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalLeads}
        page={currentPage - 1}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={MASTER_ROWS_PER_PAGE_OPTIONS}
        sx={{
          mt: 1,
          borderRadius: 2,
          border: "1px solid #e7e2d5",
          backgroundColor: "#fff",
          boxShadow: "0 8px 18px rgba(17, 24, 39, 0.05)",
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
            color: "#4b5563",
            fontSize: "0.82rem",
          },
        }}
      />
    </Box>
  );
};

export default LeadTable;
