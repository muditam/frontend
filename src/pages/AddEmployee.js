import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  Grid,
  Divider,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  WarningAmber,
  Edit,
  Delete,
  AdminPanelSettings, // NEW
} from "@mui/icons-material";
import axios from "axios";

// === DEFAULT PERMISSIONS (Menubar + Navbar) ===
const DEFAULT_PERMISSIONS = {
  menubar: {
    // Core (visible in MenuBar)
    home: true,
    myTemplates: true,
    consultation: true,
    escalations: true,
    team: true,
    abandonedCart: true,
    myRTOs: true,
    myAssets: true,
    myGrowthPlan: true,

    invoices: true,
    accessManagement: true,
    adminAccessRequests: true,
    deliveredSalesRecord: true,

    // Order confirmations & abandoned
    orderConfirmationsMenu: true,
    orderConfirmationPage: true,
    orderAnalyticsPage: true,

    // Manager / Master Data
    addEmployee: true,

    masterDataMenu: true,
    masterAllLeads: true,
    masterRetentionLeads: true,
    masterRetentionOrders: true,
    masterNewOrders: true,
    masterDuplicates: true,
    lostDataMenu: true,
    lostAcquisition: true,
    lostRetention: true,
    onlineOrders: true,
    unassignedDeliveredOrders: true,

    // Sales Agent section
    salesAgentMenu: true,
    salesMyLeads: true,
    salesMySales: true,

    // Retention Agent section
    retentionAgentMenu: true,
    retentionLeads: true,
    retentionSales: true,

    // Task Manager
    taskManagerMenu: true,
    taskBoard: true,
    myReporting: true,

    // Smartflo
    smartfloMenu: true,
    smartfloCallLogs: true,
    smartfloDataAnalytics: true,

    // Finance – Orders / Remittance / Records
    financeOrderSummary: true,
    financePrepaidRemittanceMenu: true,
    financePrepaidRazorpay: true,
    financePrepaidPhonePe: true,
    financePrepaidEasebuzz: true,
    financePrepaidBankTransfer: true,
    financeRtoSheet: true,
    financeCodRemittanceMenu: true,
    financeCodBluedart: true,
    financeCodDTDC: true,
    financeCodDelhivery: true,
    financeCodShiprocket: true,
    financeRecordsMenu: true,
    financePurchaseRecords: true,
    financePaymentRecords: true,
    financeVendors: true,
    financeBankReconciliationMenu: true,
    bankCapital6389: true,
    bankAxis3361: true,
    bankCc1101: true,
    bankSbi8285: true,
    bankYesCcTejasv: true,
    bankYesCcAbhay: true,

    // Operations
    opsUndeliveredOrders: true,
    opsRtoDelivered: true,
    opsEmailUndelivered: true,
    opsOnlyOrderConfirmation: true,

    // HR / Assets
    hrAddNewAssets: true,
    hrAssetAllotment: true,

    // Leaderboard
    leaderboardMenu: true,
    leaderboardAll: true,
    leaderboardBloom: true,

    // Others (Manager)
    othersMenu: true,
    othersSwitchDashboards: true,
    othersScheduleCalls: true,
    othersAllProducts: true,
    othersLeadMigration: true,
    othersDietTemplate: true,
    othersAllShopifyOrders: true,
    othersTransferRequests: true,
    othersBulkDataUpload: true,

    // International Agent
    globalShopifyMenu: true,
    globalShopifyOrders: true,
    globalAbandonedCart: true,
    globalRetentionMenu: true,
    globalRetentionLeads: true,
    globalRetentionSales: true,
  },

  navbar: {
    // Topbar center (matches NavbarWithSearch canNav keys)
    shopifySearch: true,
    drrPanel: true, // controls DRR + Target block

    // Topbar icons (left of LMS search)
    incentiveIcon: true,
    bloomIcon: true,
    leaderboardIcon: true,
    bloodTestIcon: true,
    deliveryStatusIcon: true,
    cartIcon: true,

    // Task shortcuts (for managers/others)
    taskBoardIcon: true,
    myReportingIcon: true,

    // Right search
    lmsSearch: true,
  },
};

const AddEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [employeeData, setEmployeeData] = useState({
    fullName: "",
    email: "",
    callerId: "",
    agentNumber: "",
    role: "",
    password: "",
    confirmPassword: "",
    async: 1,
    status: "active",
    target: "",
    hasTeam: false,
    isDoctor: false,
    teamLeader: "",
    joiningDate: "",
    languages: [],
    permissions: { ...DEFAULT_PERMISSIONS }, // NEW
  });
  const [error, setError] = useState("");
  const [viewInactive, setViewInactive] = useState(false);
  const [allActiveEmployees, setAllActiveEmployees] = useState([]);

  // Permission dialog state
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [permissionEmployee, setPermissionEmployee] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [availableRoles, setAvailableRoles] = useState([]);

  const [permissionValues, setPermissionValues] = useState({
    ...DEFAULT_PERMISSIONS,
  });

  const roles = [
    "Manager",
    "Sales Agent",
    "Retention Agent",
    "Finance",
    "Operations",
    "Human Resource",
    "Marketing",
    "Super Admin",
    "Developer",
    "International Agent",
  ];
  const statusOptions = ["active", "inactive"];
  const LANGUAGE_OPTIONS = ["English", "Hindi", "Kannada", "Telugu", "Tamil"];

  useEffect(() => {
    fetchEmployees();
  }, [viewInactive]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees"
      );

      const uniqueRoles = [
        ...new Set(
          response.data
            .map((emp) => emp.role)
            .filter(Boolean)
        ),
      ].sort();
      setAvailableRoles(uniqueRoles);

      const fetchedEmployees = response.data
        .filter((emp) =>
          viewInactive ? emp.status === "inactive" : emp.status === "active"
        )
        .sort((a, b) => a.fullName.localeCompare(b.fullName));

      setEmployees(fetchedEmployees);

      const activeEmployees = response.data
        .filter((emp) => emp.status === "active")
        .sort((a, b) => a.fullName.localeCompare(b.fullName));

      setAllActiveEmployees(activeEmployees);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    const newValue = type === "checkbox" ? checked : value;

    setEmployeeData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };


  const isAgentRole = ["Sales Agent", "Retention Agent"].includes(
    employeeData.role
  );
  const isCoreOnlyRole = ["Manager", "Super Admin"].includes(employeeData.role); // hide everything except name,email,role,passwords

  useEffect(() => {
    const agentRole = ["Sales Agent", "Retention Agent"].includes(
      employeeData.role
    );
    const coreOnly = ["Manager", "Super Admin"].includes(employeeData.role);

    setEmployeeData((prev) => ({
      ...prev,
      // hide TL for Manager/Super Admin
      teamLeader: coreOnly ? "" : prev.teamLeader,
      // clear agent-only fields when not agent
      callerId: agentRole ? prev.callerId : "",
      agentNumber: agentRole ? prev.agentNumber : "",
      joiningDate: agentRole ? prev.joiningDate : "",
      target: agentRole ? prev.target : "",
      // clear optional fields when core-only role selected
      languages: coreOnly ? [] : prev.languages,
      hasTeam: coreOnly ? false : prev.hasTeam,
      isDoctor: coreOnly ? false : prev.isDoctor,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeData.role]);

  const validateForm = () => {
    const {
      email,
      role,
      password,
      confirmPassword,
      callerId,
      agentNumber,
      target,
      joiningDate,
    } = employeeData;

    // 🔹 Always work with trimmed name
    const fullNameTrimmed = (employeeData.fullName || "").trim();

    if (!fullNameTrimmed || !email || !role || (!isEditMode && !password)) {
      setError("Full Name, Email, Role, and Password are required.");
      return false;
    }

    // 🔹 Validate trimmed name (allows spaces in between)
    if (!/^[a-zA-Z ]+$/.test(fullNameTrimmed)) {
      setError("Full Name should contain only alphabets and spaces.");
      return false;
    }

    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setError("Invalid email format.");
      return false;
    }

    // only for Sales/Retention
    if (isAgentRole) {
      if (!callerId || !agentNumber || target === "" || !joiningDate) {
        setError(
          "Joining Date, Caller ID, Agent Number and Target are required for agents."
        );
        return false;
      }
      if (!/^\d+$/.test(callerId)) {
        setError("Caller ID must be numeric.");
        return false;
      }
      if (!/^\d+$/.test(agentNumber)) {
        setError("Agent Number must be numeric.");
        return false;
      }
      if (!/^\d+$/.test(String(target))) {
        setError("Target must be a number.");
        return false;
      }
    }

    if (!isEditMode && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return false;
    }
    if (!isEditMode && password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    setError("");
    return true;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const fullNameTrimmed = (employeeData.fullName || "").trim();

    // 🔹 Ensure clean name before sending
    const payload = {
      ...employeeData,
      fullName: fullNameTrimmed,
    };

    try {
      if (isEditMode) {
        await axios.put(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees/${currentEmployeeId}`,
          payload
        );
      } else {
        await axios.post(
          "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees",
          payload
        );
      }
      fetchEmployees();
      setOpen(false);
      setEmployeeData({
        fullName: "",
        email: "",
        callerId: "",
        agentNumber: "",
        role: "",
        password: "",
        confirmPassword: "",
        async: 1,
        status: "active",
        target: "",
        hasTeam: false,
        isDoctor: false,
        teamLeader: "",
        joiningDate: "",
        languages: [],
        permissions: { ...DEFAULT_PERMISSIONS }, // reset
      });
    } catch (error) {
      console.error("Error submitting employee data:", error);
      setError("Error occurred while saving employee data.");
    }
  };


  const handleEdit = (employee) => {
    setEmployeeData({
      fullName: employee.fullName,
      email: employee.email,
      callerId: employee.callerId,
      agentNumber: employee.agentNumber,
      role: employee.role,
      password: "",
      confirmPassword: "",
      async: 1,
      status: employee.status,
      target: employee.target || "",
      hasTeam: employee.hasTeam || false,
      isDoctor: !!employee.isDoctor,
      teamLeader: employee.teamLeader?._id || "",
      languages: Array.isArray(employee.languages) ? employee.languages : [],
      joiningDate: employee.joiningDate
        ? new Date(employee.joiningDate).toISOString().split("T")[0]
        : "",
      permissions: employee.permissions
        ? {
          menubar: {
            ...DEFAULT_PERMISSIONS.menubar,
            ...(employee.permissions.menubar || {}),
          },
          navbar: {
            ...DEFAULT_PERMISSIONS.navbar,
            ...(employee.permissions.navbar || {}),
          },
        }
        : { ...DEFAULT_PERMISSIONS },
    });
    setCurrentEmployeeId(employee._id);
    setIsEditMode(true);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees/${id}`
      );
      fetchEmployees();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  const confirmDelete = (id) => {
    setEmployeeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleToggleViewInactive = () => {
    setViewInactive(!viewInactive);
  };

  // Permission dialog handlers
  const openPermissionDialog = (employee) => {
    const perms = employee.permissions
      ? {
        menubar: {
          ...DEFAULT_PERMISSIONS.menubar,
          ...(employee.permissions.menubar || {}),
        },
        navbar: {
          ...DEFAULT_PERMISSIONS.navbar,
          ...(employee.permissions.navbar || {}),
        },
      }
      : { ...DEFAULT_PERMISSIONS };

    setPermissionEmployee(employee);
    setPermissionValues(perms);
    setPermissionDialogOpen(true);
  };

  const closePermissionDialog = () => {
    setPermissionDialogOpen(false);
    setPermissionEmployee(null);
  };

  const handlePermissionToggle = (section, key) => {
    setPermissionValues((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: !prev[section][key],
      },
    }));
  };

  const handleSavePermissions = async () => {
    if (!permissionEmployee?._id) return;
    try {
      await axios.put(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees/${permissionEmployee._id}`,
        {
          permissions: permissionValues,
        }
      );
      await fetchEmployees();
      closePermissionDialog();
    } catch (error) {
      console.error("Error saving permissions:", error);
      alert("Error saving permissions. Please try again.");
    }
  };

  const filteredEmployees = roleFilter
    ? employees.filter((emp) => emp.role === roleFilter)
    : employees;


  return (
    <Box sx={{ maxWidth: 800, margin: "auto", mt: 5, padding: 3 }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ textAlign: "center", color: "#000000", fontWeight: "bold" }}
      >
        Employee Management
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setIsEditMode(false);
              setEmployeeData({
                fullName: "",
                email: "",
                callerId: "",
                agentNumber: "",
                role: "",
                password: "",
                confirmPassword: "",
                async: 1,
                status: "active",
                target: "",
                hasTeam: false,
                isDoctor: false,
                teamLeader: "",
                joiningDate: "",
                languages: [],
                permissions: { ...DEFAULT_PERMISSIONS },
              });
              setOpen(true);
            }}
          >
            Add Employee
          </Button>

          {/* 👇 Filter by Role – left side of View Inactive button */}
          <TextField
            select
            size="small"
            label="Filter by Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Roles</MenuItem>
            {availableRoles.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Button variant="outlined" onClick={handleToggleViewInactive}>
          {viewInactive ? "Hide Inactive Employees" : "View Inactive Employees"}
        </Button>
      </Box>


      <TableContainer
        component={Paper}
        sx={{ mt: 5, borderRadius: 2, boxShadow: 3 }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
              {[
                "Full Name",
                "Email",
                "Caller ID (IVR)",
                "Agent Number (IVR)",
                "Role",
                "Status",
                "Target",
                "Async",
                "Actions",
              ].map((head) => (
                <TableCell
                  key={head}
                  sx={{
                    fontWeight: "bold",
                    textAlign: "center",
                    color: "#333",
                  }}
                >
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.map((employee, index) => (
              <TableRow
                key={employee._id}
                sx={{
                  backgroundColor:
                    index % 2 === 0 ? "#ffffff" : "#fafafa",
                  transition: "all 0.2s",
                  "&:hover": { backgroundColor: "#f1f1f1" },
                }}
              >
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.fullName}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.email}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.callerId}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.agentNumber}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.role}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  <Box
                    sx={{
                      display: "inline-block",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: "0.75rem",
                      backgroundColor:
                        employee.status === "active"
                          ? "#C8E6C9"
                          : "#FFCDD2",
                      color:
                        employee.status === "active"
                          ? "#2E7D32"
                          : "#C62828",
                    }}
                  >
                    {employee.status}
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.target || 0}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.async}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  <IconButton
                    color="primary"
                    onClick={() => handleEdit(employee)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => confirmDelete(employee._id)}
                  >
                    <Delete />
                  </IconButton>
                  {/* Permission icon */}
                  <IconButton
                    color="secondary"
                    onClick={() => openPermissionDialog(employee)}
                    title="Manage Permissions"
                    sx={{ ml: 0.5 }}
                  >
                    <AdminPanelSettings />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Employee Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle
          sx={{
            backgroundColor: "transparent",
            color: "#1976d2",
            fontWeight: "bold",
            textAlign: "center",
            fontSize: "1.5rem",
            pb: 1,
          }}
        >
          {isEditMode ? "Edit Employee" : "Add New Employee"}
          <Box
            sx={{
              height: "4px",
              backgroundColor: "#FFD700",
              width: "100%",
              mt: 1,
              borderRadius: "2px",
            }}
          />
        </DialogTitle>
        <DialogContent sx={{ p: 4, backgroundColor: "#f9f9f9" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* 1 Full Name (required) */}
            <TextField
              required
              fullWidth
              label="Full Name"
              name="fullName"
              value={employeeData.fullName}
              onChange={handleChange}
              variant="filled"
              InputLabelProps={{
                sx: { "& .MuiFormLabel-asterisk": { color: "error.main" } },
              }}
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
            />
            {/* 2 Email (required) */}
            <TextField
              required
              fullWidth
              label="Email"
              name="email"
              value={employeeData.email}
              onChange={handleChange}
              variant="filled"
              InputLabelProps={{
                sx: { "& .MuiFormLabel-asterisk": { color: "error.main" } },
              }}
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
            />
            {/* 3 Role (required) */}
            <TextField
              required
              select
              fullWidth
              label="Role"
              name="role"
              value={employeeData.role}
              onChange={handleChange}
              variant="filled"
              InputLabelProps={{
                sx: { "& .MuiFormLabel-asterisk": { color: "error.main" } },
              }}
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
            >
              {roles.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>

            {/* Team Leader (hidden for Manager/Super Admin) */}
            {!isCoreOnlyRole &&
              employeeData.role !== "Manager" &&
              employeeData.role !== "Super Admin" && (
                <TextField
                  select
                  fullWidth
                  label="Team Leader"
                  name="teamLeader"
                  value={employeeData.teamLeader}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    disableUnderline: true,
                    sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                  }}
                >
                  {allActiveEmployees.map((employee) => (
                    <MenuItem key={employee._id} value={employee._id}>
                      {employee.fullName}
                    </MenuItem>
                  ))}
                </TextField>
              )}

            {/* Agent-only fields directly below Team Leader (Sales/Retention only) */}
            {!isCoreOnlyRole && isAgentRole && (
              <>
                <TextField
                  fullWidth
                  label="Caller ID (IVR)"
                  name="callerId"
                  value={employeeData.callerId}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    disableUnderline: true,
                    sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                  }}
                />
                <TextField
                  fullWidth
                  label="Agent Number (IVR)"
                  name="agentNumber"
                  value={employeeData.agentNumber}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    disableUnderline: true,
                    sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                  }}
                />
                <TextField
                  fullWidth
                  label="Joining Date"
                  name="joiningDate"
                  type="date"
                  value={employeeData.joiningDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  variant="filled"
                  InputProps={{
                    disableUnderline: true,
                    sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                  }}
                />
                <TextField
                  fullWidth
                  label="Target"
                  name="target"
                  type="number"
                  value={employeeData.target}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    disableUnderline: true,
                    sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                  }}
                />
              </>
            )}

            {/* Languages */}
            {!isCoreOnlyRole && (
              <Autocomplete
                multiple
                freeSolo
                options={LANGUAGE_OPTIONS}
                value={employeeData.languages}
                onChange={(_, newValue) => {
                  const unique = [
                    ...new Set(
                      newValue.map((v) => String(v).trim())
                    ),
                  ].filter(Boolean);
                  setEmployeeData((prev) => ({
                    ...prev,
                    languages: unique,
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="filled"
                    label="Employee Languages"
                    placeholder="Type and press Enter"
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                    }}
                  />
                )}
              />
            )}

            {/* Checkboxes */}
            {!isCoreOnlyRole && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  pl: 1,
                  mt: -1,
                  mb: 1,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!employeeData.hasTeam}
                      onChange={handleChange}
                      name="hasTeam"
                      color="primary"
                    />
                  }
                  label="Have a Team?"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!employeeData.isDoctor}
                      onChange={handleChange}
                      name="isDoctor"
                      color="primary"
                    />
                  }
                  label="Is a Doctor"
                />
              </Box>
            )}

            {/* Status */}
            {!isCoreOnlyRole && (
              <TextField
                select
                fullWidth
                label="Status"
                name="status"
                value={employeeData.status}
                onChange={handleChange}
                variant="filled"
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                }}
              >
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Async */}
            {!isCoreOnlyRole && (
              <TextField
                fullWidth
                label="Async"
                name="async"
                value={employeeData.async}
                disabled
                variant="filled"
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    backgroundColor: "#f1f1f1",
                    borderRadius: 1,
                    px: 1,
                  },
                }}
              />
            )}

            {/* Passwords only when adding (required, red asterisk) */}
            {!isEditMode && (
              <>
                <TextField
                  required
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  name="password"
                  value={employeeData.password}
                  onChange={handleChange}
                  variant="filled"
                  InputLabelProps={{
                    sx: { "& .MuiFormLabel-asterisk": { color: "error.main" } },
                  }}
                  InputProps={{
                    disableUnderline: true,
                    sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  required
                  fullWidth
                  type={showConfirmPassword ? "text" : "password"}
                  label="Confirm Password"
                  name="confirmPassword"
                  value={employeeData.confirmPassword}
                  onChange={handleChange}
                  variant="filled"
                  InputLabelProps={{
                    sx: { "& .MuiFormLabel-asterisk": { color: "error.main" } },
                  }}
                  InputProps={{
                    disableUnderline: true,
                    sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          edge="end"
                        >
                          {showConfirmPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: "center",
            p: 2,
            flexDirection: "column",
            gap: 2,
          }}
        >
          {error && (
            <Typography color="error" textAlign="center">
              {error}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              onClick={() => setOpen(false)}
              variant="outlined"
              color="secondary"
              sx={{ borderRadius: 2, px: 2 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              sx={{ borderRadius: 2, px: 2 }}
            >
              {isEditMode ? "Update" : "Save"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1} color="error.main">
            <WarningAmber fontSize="medium" />
            Confirm Deletion
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="textSecondary">
            Are you sure you want to delete this employee?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 2, pb: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleDelete(employeeToDelete)}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permission Dialog */}
      <Dialog
        open={permissionDialogOpen}
        onClose={closePermissionDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            textAlign: "center",
            fontSize: "1.3rem",
          }}
        >
          Permissions –{" "}
          {permissionEmployee ? permissionEmployee.fullName : ""}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* LEFT: MenuBar permissions */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                Sidebar (MenuBar)
              </Typography>
              <Divider sx={{ mb: 1 }} />

              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Core
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["home", "Home"],
                  ["myTemplates", "My Templates"],
                  ["consultation", "Consultation"],
                  ["escalations", "Escalations"],
                  ["team", "Team"],
                  ["abandonedCart", "Abandoned Cart"],
                  ["myRTOs", "MY RTOs"],
                  ["myAssets", "My Assets"],
                  ["myGrowthPlan", "Growth At Muditam"],
                  ["invoices", "Invoices"],
                  ["accessManagement", "Access Management"],
                  ["adminAccessRequests", "Admin Access Requests"],
                  ["deliveredSalesRecord", "Delivered Sales Record"],
                ].map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={!!permissionValues.menubar[key]}
                        onChange={() =>
                          handlePermissionToggle("menubar", key)
                        }
                      />
                    }
                    label={label}
                  />
                ))}
              </Box>

              <Typography
                variant="caption"
                sx={{ fontWeight: 600, mt: 1 }}
              >
                Order & Data
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["orderConfirmationsMenu", "Order Confirmations Menu"],
                  ["orderConfirmationPage", "Order Confirmation Page"],
                  ["orderAnalyticsPage", "Order Analytics Page"],
                  ["onlineOrders", "Online Orders"],
                  ["unassignedDeliveredOrders", "Unassigned Delivered Orders"],
                ].map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={!!permissionValues.menubar[key]}
                        onChange={() =>
                          handlePermissionToggle("menubar", key)
                        }
                      />
                    }
                    label={label}
                  />
                ))}
              </Box>

              <Typography
                variant="caption"
                sx={{ fontWeight: 600, mt: 1 }}
              >
                Manager / Master Data
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["addEmployee", "Add Employee"],
                  ["masterDataMenu", "Master Data Menu"],
                  ["masterAllLeads", "Master: All Leads"],
                  ["masterRetentionLeads", "Master: Retention Leads"],
                  ["masterRetentionOrders", "Master: Retention Orders"],
                  ["masterNewOrders", "Master: Acquisition Orders"],
                  ["masterDuplicates", "Master: Duplicate Data"],
                  ["lostDataMenu", "Lost Data Menu"],
                  ["lostAcquisition", "Lost: Acquisition"],
                  ["lostRetention", "Lost: Retention"],
                ].map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={!!permissionValues.menubar[key]}
                        onChange={() =>
                          handlePermissionToggle("menubar", key)
                        }
                      />
                    }
                    label={label}
                  />
                ))}
              </Box>

              <Typography
                variant="caption"
                sx={{ fontWeight: 600, mt: 1 }}
              >
                Sales & Retention Sections
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["salesAgentMenu", "Sales Agent Menu"],
                  ["salesMyLeads", "Sales: My Leads"],
                  ["salesMySales", "Sales: My Sales"],
                  ["retentionAgentMenu", "Retention Agent Menu"],
                  ["retentionLeads", "Retention: Leads"],
                  ["retentionSales", "Retention: Sales"],
                ].map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={!!permissionValues.menubar[key]}
                        onChange={() =>
                          handlePermissionToggle("menubar", key)
                        }
                      />
                    }
                    label={label}
                  />
                ))}
              </Box>

              <Typography
                variant="caption"
                sx={{ fontWeight: 600, mt: 1 }}
              >
                Task Manager & Smartflo
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["taskManagerMenu", "Task Manager Menu"],
                  ["taskBoard", "Task Board"],
                  ["myReporting", "My Reporting"],
                  ["smartfloMenu", "Smartflo Menu"],
                  ["smartfloCallLogs", "Smartflo: Call Logs"],
                  ["smartfloDataAnalytics", "Smartflo: Data Analytics"],
                ].map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={!!permissionValues.menubar[key]}
                        onChange={() =>
                          handlePermissionToggle("menubar", key)
                        }
                      />
                    }
                    label={label}
                  />
                ))}
              </Box>

              <Typography
                variant="caption"
                sx={{ fontWeight: 600, mt: 1 }}
              >
                Finance
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["financeOrderSummary", "Order Summary"],
                  ["financePrepaidRemittanceMenu", "Prepaid Remittance Menu"],
                  ["financePrepaidRazorpay", "Prepaid: Razorpay"],
                  ["financePrepaidPhonePe", "Prepaid: PhonePe"],
                  ["financePrepaidEasebuzz", "Prepaid: Easebuzz"],
                  ["financePrepaidBankTransfer", "Prepaid: Bank Transfer"],
                  ["financeRtoSheet", "RTO Sheet"],
                  ["financeCodRemittanceMenu", "COD Remittance Menu"],
                  ["financeCodBluedart", "COD: Bluedart"],
                  ["financeCodDTDC", "COD: DTDC"],
                  ["financeCodDelhivery", "COD: Delhivery"],
                  ["financeCodShiprocket", "COD: Shiprocket"],
                  ["financeRecordsMenu", "Records Menu"],
                  ["financePurchaseRecords", "Purchase Records"],
                  ["financePaymentRecords", "Payment Records"],
                  ["financeVendors", "My Vendors"],
                  [
                    "financeBankReconciliationMenu",
                    "Bank Reconciliation Menu",
                  ],
                  ["bankCapital6389", "Bank - Capital 6389"],
                  ["bankAxis3361", "Axis - 3361"],
                  ["bankCc1101", "CC 1101"],
                  ["bankSbi8285", "SBI Current 8285"],
                  ["bankYesCcTejasv", "Yes CC - Tejasv"],
                  ["bankYesCcAbhay", "Yes CC - Abhay"],
                ].map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={!!permissionValues.menubar[key]}
                        onChange={() =>
                          handlePermissionToggle("menubar", key)
                        }
                      />
                    }
                    label={label}
                  />
                ))}
              </Box>

              <Typography
                variant="caption"
                sx={{ fontWeight: 600, mt: 1 }}
              >
                Operations / HR / Leaderboard / Others
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["opsUndeliveredOrders", "Ops: Undelivered Orders"],
                  ["opsRtoDelivered", "Ops: RTO Delivered"],
                  ["opsEmailUndelivered", "Ops: Email Undelivered"],
                  ["opsOnlyOrderConfirmation", "Ops: Only Order Confirmation"],
                  ["hrAddNewAssets", "HR: Add New Assets"],
                  ["hrAssetAllotment", "HR: Asset Allotment"],
                  ["leaderboardMenu", "Leaderboard Menu"],
                  ["leaderboardAll", "All Leaderboard"],
                  ["leaderboardBloom", "Bloom Leaderboard"],
                  ["othersMenu", "Others Menu"],
                  ["othersSwitchDashboards", "Switch Dashboards"],
                  ["othersScheduleCalls", "Schedule Calls"],
                  ["othersAllProducts", "All Products"],
                  ["othersLeadMigration", "Leads Migrate"],
                  ["othersDietTemplate", "Diet Plan Builder"],
                  ["othersAllShopifyOrders", "All Shopify Orders"],
                  ["othersTransferRequests", "Lead Transfer Requests"],
                  ["othersBulkDataUpload", "Bulk Data Upload"],
                  ["globalShopifyMenu", "Global Shopify Menu"],
                  ["globalShopifyOrders", "Global Shopify Orders"],
                  ["globalAbandonedCart", "Global Abandoned Cart"],
                  ["globalRetentionMenu", "Global Retention Menu"],
                  ["globalRetentionLeads", "Global Retention Leads"],
                  ["globalRetentionSales", "Global Retention Sales"],
                ].map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={!!permissionValues.menubar[key]}
                        onChange={() =>
                          handlePermissionToggle("menubar", key)
                        }
                      />
                    }
                    label={label}
                  />
                ))}
              </Box>
            </Grid>

            {/* RIGHT: Navbar permissions */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                Topbar (Navbar)
              </Typography>
              <Divider sx={{ mb: 1 }} />

              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Center Search & Target
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["shopifySearch", "Shopify Customer Search"],
                  ["drrPanel", "DRR + Target Panel"],
                ].map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={!!permissionValues.navbar[key]}
                        onChange={() =>
                          handlePermissionToggle("navbar", key)
                        }
                      />
                    }
                    label={label}
                  />
                ))}
              </Box>

              <Typography
                variant="caption"
                sx={{ fontWeight: 600, mt: 1 }}
              >
                Quick Action Icons
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["incentiveIcon", "Incentive Structure Icon"],
                  ["bloomIcon", "Bloom Leaderboard Icon"],
                  ["leaderboardIcon", "Leaderboard Icon"],
                  ["bloodTestIcon", "Blood Test Pincode Check"],
                  ["deliveryStatusIcon", "Delivery Status Checker"],
                  ["cartIcon", "Cart Icon (Shopify Orders)"],
                ].map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={!!permissionValues.navbar[key]}
                        onChange={() =>
                          handlePermissionToggle("navbar", key)
                        }
                      />
                    }
                    label={label}
                  />
                ))}
              </Box>

              <Typography
                variant="caption"
                sx={{ fontWeight: 600, mt: 1 }}
              >
                Task Shortcuts
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["taskBoardIcon", "Task Manager Shortcut Icon"],
                  ["myReportingIcon", "My Reporting Shortcut Icon"],
                ].map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={!!permissionValues.navbar[key]}
                        onChange={() =>
                          handlePermissionToggle("navbar", key)
                        }
                      />
                    }
                    label={label}
                  />
                ))}
              </Box>

              <Typography
                variant="caption"
                sx={{ fontWeight: 600, mt: 1 }}
              >
                LMS Search
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!permissionValues.navbar.lmsSearch}
                      onChange={() =>
                        handlePermissionToggle("navbar", "lmsSearch")
                      }
                    />
                  }
                  label="LMS Search Box"
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
          <Button variant="outlined" onClick={closePermissionDialog}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSavePermissions}>
            Save Permissions
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddEmployee;
