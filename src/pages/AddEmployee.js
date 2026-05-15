import React, { useState, useEffect, useCallback } from "react";
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
 createFilterOptions,
 Grid,
 Divider,
} from "@mui/material";
import {
 Visibility,
 VisibilityOff,
 WarningAmber,
 Edit,
 Delete,
 AdminPanelSettings,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";


const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
 baseURL: API_BASE,
 withCredentials: true,
});

const DEFAULT_ROLES = [
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


const DEFAULT_DEPARTMENTS = [
 "Sales",
 "Retention",
 "Finance",
 "Operations",
 "Human Resource",
 "Marketing",
 "Management",
 "Technology",
 "International",
];


const addableOptionFilter = createFilterOptions();


const getActorName = () => {
 const readFrom = (storage) => {
   const direct =
     storage.getItem("fullName") ||
     storage.getItem("name") ||
     storage.getItem("userName") ||
     storage.getItem("email");


   if (direct && direct !== "undefined" && direct !== "null") return direct;


   for (const k of Object.keys(storage)) {
     const raw = storage.getItem(k);
     if (!raw) continue;


     try {
       const obj = JSON.parse(raw);


       const name =
         obj?.fullName ||
         obj?.name ||
         obj?.user?.fullName ||
         obj?.user?.name ||
         obj?.employee?.fullName ||
         obj?.employee?.name;


       const email =
         obj?.email || obj?.user?.email || obj?.employee?.email;


       if (name) return name;
       if (email) return email;
     } catch (e) {
       // ignore non-json
     }
   }


   return "";
 };


 return readFrom(sessionStorage) || readFrom(localStorage) || "Unknown";
};

const sortEmployeesByName = (list = []) =>
  [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));

const mergeEmployeeById = (list = [], employee) => {
  if (!employee?._id) return sortEmployeesByName(list);
  const next = list.some((item) => item._id === employee._id)
    ? list.map((item) => (item._id === employee._id ? employee : item))
    : [...list, employee];
  return sortEmployeesByName(next);
};


// === DEFAULT PERMISSIONS (Menubar + Navbar) ===
const DEFAULT_PERMISSIONS = {
 menubar: {
   home: false,
   myTemplates: false,
   knowledgeBase: false,
   consultation: false,
   escalations: false,
   team: false,
   abandonedCart: false,
   myRTOs: false,
   myAssets: false,
   myGrowthPlan: false,
   allAnalyticsMenu: false,
   superAdminAnalytics: false,
   abandonedAnalytics: false,
   whatsaapChats: false,


   invoices: false,
   accessManagement: false,
   adminAccessRequests: false,
   deliveredSalesRecord: false,


   incentivesWallet: false,
   sops: false,
   RewardsAdminPage: false,


   orderConfirmationsMenu: false,
   orderConfirmationPage: false,
   orderAnalyticsPage: false,


   addEmployee: false,


   masterDataMenu: false,
   masterAllLeads: false,
   masterRetentionLeads: false,
   masterRetentionOrders: false,
   masterNewOrders: false,
   masterDuplicates: false,
   lostDataMenu: false,
   lostAcquisition: false,
   lostRetention: false,
   onlineOrders: false,
   unassignedDeliveredOrders: false,


   salesAgentMenu: false,
   salesMyLeads: false,
   salesMySales: false,


   retentionAgentMenu: false,
   retentionLeads: false,
   retentionSales: false,


   taskManagerMenu: false,
   taskBoard: false,
   myReporting: false,

   callingCenterMenu: false,
   callingCenterAgent: false,
   callingCenterManager: false,
   redcliffeMenu: false,
   redcliffeBooking: false,
   redcliffeDashboard: false,


   marketingMenu: false,
   cutPage: false,
   scriptPage: false,
   shootPage: false,
   editPage: false,
   postPage: false,


   OthervideoMenu: false,
   OthercutPage: false,
   OtherscriptPage: false,
   OthershootPage: false,
   OthereditPage: false,
   OtherpostPage: false,


   StaticCarouselMenu: false,
   StaticCarouselcutPage: false,
   StaticCarouselscriptPage: false,
   StaticCarouselshootPage: false,
   StaticCarouseleditPage: false,
   StaticCarouselpostPage: false,


   adsMenu: false,
   adscutPage: false,
   adsscriptPage: false,
   adsshootPage: false,
   adseditPage: false,
   adspostPage: false,


   financeOrderSummary: false,
   financePrepaidRemittanceMenu: false,
   financePrepaidRazorpay: false,
   financePrepaidPhonePe: false,
   financePrepaidEasebuzz: false,
   financePrepaidCashfree: false,
   financePrepaidBankTransfer: false,
   financeCodRemittanceMenu: false,
   financeCodBluedart: false,
   financeCodDTDC: false,
   financeCodDelhivery: false,
   financeCodShiprocket: false,
   financeRecordsMenu: false,
   financePurchaseRecords: false,
   financePaymentRecords: false,
   financeVendors: false,
   financeBankReconciliationMenu: false,
   bankCapital6389: false,
   bankAxis3361: false,
   bankCc1101: false,
   bankSbi8285: false,
   bankYesCcTejasv: false,
   bankYesCcAbhay: false,
   bankKotak: false,


   opsUndeliveredOrders: false,
   opsRtoDelivered: false,
   opsEmailUndelivered: false,
   opsOnlyOrderConfirmation: false,


   hrAddNewAssets: false,
   hrAssetAllotment: false,


   leaderboardMenu: false,
   leaderboardAll: false,
   leaderboardBloom: false,


   othersMenu: false,
   othersSwitchDashboards: false,
   othersScheduleCalls: false,
   othersAllProducts: false,
   otherswhatsaaptemplates: false,
   othersLeadMigration: false,
   othersDietTemplate: false,
   othersAllShopifyOrders: false,
   othersTransferRequests: false,
   othersBulkDataUpload: false,
   othersIncentiveCreation: false,


   globalShopifyMenu: false,
   globalShopifyOrders: false,
   globalAbandonedCart: false,
   globalRetentionMenu: false,
   globalRetentionLeads: false,
   globalRetentionSales: false,
 },


 navbar: {
   shopifySearch: false,
   drrPanel: false,


   incentiveIcon: false,
   bloomIcon: false,
   leaderboardIcon: false,
   bloodTestIcon: false,
   deliveryStatusIcon: false,
   cartIcon: false,
   campaignQuickCreate: false,


   taskBoardIcon: false,
   myReportingIcon: false,


   lmsSearch: false,
 },
};


const AddEmployee = () => {
 const navigate = useNavigate();
 const EMPTY_EMPLOYEE_DATA = {
   fullName: "",
   email: "",
   department: "",
   callerId: "",
   agentNumber: "",
   role: "",
   password: "",
   confirmPassword: "",
   status: "active",
   target: "",
   hasTeam: false,
   isDoctor: false,
   teamLeader: "",
   joiningDate: "",
   joiningSalary: "",
   currentSalary: "",
   languages: [],
   permissions: { ...DEFAULT_PERMISSIONS },
 };


 const [employees, setEmployees] = useState([]);
 const [open, setOpen] = useState(false);
 const [isEditMode, setIsEditMode] = useState(false);
 const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 const [employeeToDelete, setEmployeeToDelete] = useState(null);
 const [showPassword, setShowPassword] = useState(false);
 const [showConfirmPassword, setShowConfirmPassword] = useState(false);
 const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
 const [employeeData, setEmployeeData] = useState(EMPTY_EMPLOYEE_DATA);
 const [error, setError] = useState("");
 const [viewInactive, setViewInactive] = useState(false);
 const [allActiveEmployees, setAllActiveEmployees] = useState([]);


 const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
 const [permissionEmployee, setPermissionEmployee] = useState(null);
 const [roleFilter, setRoleFilter] = useState("");
 const [departmentFilter, setDepartmentFilter] = useState("");
 const [availableRoles, setAvailableRoles] = useState([]);
 const [availableDepartments, setAvailableDepartments] = useState([]);
 const [roleInputValue, setRoleInputValue] = useState("");
 const [departmentInputValue, setDepartmentInputValue] = useState("");


 const [permissionValues, setPermissionValues] = useState({
   ...DEFAULT_PERMISSIONS,
 });


 const statusOptions = ["active", "inactive"];
 const LANGUAGE_OPTIONS = ["English", "Hindi", "Kannada", "Telugu", "Tamil"];


 const fetchEmployees = useCallback(async () => {
   try {
     const response = await api.get("/api/employees");


     const uniqueRoles = [
       ...new Set(
         [...DEFAULT_ROLES, ...response.data.map((emp) => emp.role)].filter(
           Boolean
         )
       ),
     ].sort();
     setAvailableRoles(uniqueRoles);


     const uniqueDepartments = [
       ...new Set(
         [
           ...DEFAULT_DEPARTMENTS,
           ...response.data.map((emp) => emp.department),
         ].filter(Boolean)
       ),
     ].sort();
     setAvailableDepartments(uniqueDepartments);


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
 }, [viewInactive]);


 useEffect(() => {
   fetchEmployees();
 }, [fetchEmployees]);


 const handleChange = (e) => {
   const { name, value, type, checked } = e.target;
   const newValue = type === "checkbox" ? checked : value;


   setEmployeeData((prev) => ({
     ...prev,
     [name]: newValue,
   }));
 };


 const commitDepartmentInput = () => {
   const cleaned = String(departmentInputValue || "").trim();
   setEmployeeData((prev) => ({ ...prev, department: cleaned }));
   if (cleaned) {
     setAvailableDepartments((prev) => [...new Set([...prev, cleaned])].sort());
   }
 };


 const commitRoleInput = () => {
   const cleaned = String(roleInputValue || "").trim();
   setEmployeeData((prev) => ({ ...prev, role: cleaned }));
   if (cleaned) {
     setAvailableRoles((prev) => [...new Set([...prev, cleaned])].sort());
   }
 };


 const getEffectiveDepartment = () =>
   String(departmentInputValue || employeeData.department || "").trim();


const getEffectiveRole = () =>
  String(roleInputValue || employeeData.role || "").trim();

 const isTeamLeaderRole = /^(team leader|team-leader|teamleader)$/i.test(
   String(employeeData.role || "").trim()
 );

 const isSalesDepartment =
   (employeeData.department || "").trim().toLowerCase() === "sales";
 const isSalesTeamLeader = isSalesDepartment && isTeamLeaderRole;
 const isCoreOnlyRole = ["Manager", "Super Admin"].includes(employeeData.role);
 const shouldShowReportsTo = employeeData.role !== "Super Admin";


 const normalizeOptionValue = (value) => {
   if (typeof value === "string") return value.trim();
   if (value && typeof value === "object" && value.inputValue) {
     return String(value.inputValue).trim();
   }
   return "";
 };


 const withAddOption = (options, params, label) => {
   const filtered = addableOptionFilter(options, params);
   const typed = String(params.inputValue || "").trim();
   const exists = options.some(
     (option) => String(option || "").toLowerCase() === typed.toLowerCase()
   );


   if (typed && !exists) {
     filtered.push({
       inputValue: typed,
       label: `+ ${label}: ${typed}`,
     });
   }


   return filtered;
 };


 useEffect(() => {
   const coreOnly = ["Manager", "Super Admin"].includes(employeeData.role);


   setEmployeeData((prev) => ({
     ...prev,
     department: prev.department,
     languages: coreOnly ? [] : prev.languages,
     isDoctor: coreOnly ? false : prev.isDoctor,
   }));
 }, [employeeData.role]);


 useEffect(() => {
   if (!isSalesDepartment) {
     setEmployeeData((prev) => ({
       ...prev,
       callerId: "",
       agentNumber: "",
       languages: [],
       isDoctor: false,
       target: "",
     }));
   }
 }, [isSalesDepartment]);


 useEffect(() => {
   if (employeeData.isDoctor) {
     setEmployeeData((prev) => ({
       ...prev,
       target: "",
     }));
   }
 }, [employeeData.isDoctor]);


 const validateForm = () => {
   const {
     email,
     password,
     confirmPassword,
     callerId,
     agentNumber,
     target,
     joiningDate,
     joiningSalary,
     currentSalary,
   } = employeeData;
   const department = getEffectiveDepartment();
   const role = getEffectiveRole();


   const fullNameTrimmed = (employeeData.fullName || "").trim();


   if (
     !fullNameTrimmed ||
     !email ||
     !role ||
     !department ||
     (!isEditMode && !password)
   ) {
     setError(
       "Full Name, Email, Role, Department and Password are required."
     );
     return false;
   }


   if (!isEditMode && (!joiningDate || joiningSalary === "" || currentSalary === "")) {
     setError("Joining Date, Joining Salary and Current Salary are required for new employees.");
     return false;
   }


   if (!/^[a-zA-Z ]+$/.test(fullNameTrimmed)) {
     setError("Full Name should contain only alphabets and spaces.");
     return false;
   }


   if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
     setError("Invalid email format.");
     return false;
   }


   if (joiningSalary !== "" && !/^\d+(\.\d+)?$/.test(String(joiningSalary))) {
     setError("Joining salary must be a valid number.");
     return false;
   }

   if (currentSalary !== "" && !/^\d+(\.\d+)?$/.test(String(currentSalary))) {
     setError("Current salary must be a valid number.");
     return false;
   }


   if (callerId && !/^\d+$/.test(callerId)) {
       setError("Caller ID must be numeric.");
       return false;
   }
   if (agentNumber && !/^\d+$/.test(agentNumber)) {
       setError("Agent Number must be numeric.");
       return false;
   }


   if (isSalesDepartment && !employeeData.isDoctor && !isSalesTeamLeader) {
     if (target === "") {
       setError("Target is required for Sales department.");
       return false;
     }
     if (!/^\d+(\.\d+)?$/.test(String(target))) {
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
   const effectiveDepartment = getEffectiveDepartment();
   const effectiveRole = getEffectiveRole();
   const isSalesDepartmentForSubmit =
     effectiveDepartment.toLowerCase() === "sales";


   // Ensure latest typed values are committed even if input never lost focus.
   setEmployeeData((prev) => ({
     ...prev,
     department: effectiveDepartment,
     role: effectiveRole,
   }));


   if (!validateForm()) return;


   const fullNameTrimmed = (employeeData.fullName || "").trim();
   const payload = {
     ...employeeData,
     fullName: fullNameTrimmed,
     department: effectiveDepartment,
     role: effectiveRole,
     target:
       isSalesDepartmentForSubmit && !employeeData.isDoctor && !isSalesTeamLeader
         ? employeeData.target
         : 0,
     hasTeam: !!employeeData.hasTeam,
   };


   if (employeeData.joiningSalary !== "") {
     payload.joiningSalary = Number(employeeData.joiningSalary);
   } else {
     delete payload.joiningSalary;
   }

   if (employeeData.currentSalary !== "") {
     payload.currentSalary = Number(employeeData.currentSalary);
   } else {
     delete payload.currentSalary;
   }


   if (employeeData.joiningDate === "") {
     delete payload.joiningDate;
   }


   const config = {
     headers: { "x-agent-name": getActorName() },
   };


   try {
     if (isEditMode) {
       const response = await api.put(
         `/api/employees/${currentEmployeeId}`,
         payload,
         config
       );
       const savedEmployee = response?.data?.employee;
       if (savedEmployee?._id) {
         setEmployees((prev) => {
           const nextViewInactive = payload.status === "inactive";
           const matchingStatus = nextViewInactive
             ? savedEmployee.status === "inactive"
             : savedEmployee.status === "active";
           const baseList = prev.filter((item) => item._id !== savedEmployee._id);
           return matchingStatus
             ? mergeEmployeeById(baseList, savedEmployee)
             : sortEmployeesByName(baseList);
         });
         setAllActiveEmployees((prev) =>
           savedEmployee.status === "active"
             ? mergeEmployeeById(prev, savedEmployee)
             : sortEmployeesByName(prev.filter((item) => item._id !== savedEmployee._id))
         );
       }
     } else {
       await api.post("/api/employees", payload, config);
     }


     // Keep inactive/active view aligned with saved status.
     setViewInactive(payload.status === "inactive");
     await fetchEmployees();
     setOpen(false);
     setError("");
     setEmployeeData(EMPTY_EMPLOYEE_DATA);
     setRoleInputValue("");
     setDepartmentInputValue("");
     setCurrentEmployeeId(null);
     setIsEditMode(false);
   } catch (error) {
     console.error("Error submitting employee data:", error);


     if (error.response?.status === 403) {
       setError("Access Denied: Only Managers can perform this action.");
     } else if (error.response?.status === 401) {
       setError("Please login to continue.");
     } else {
       setError(
         error.response?.data?.message ||
           "Error occurred while saving employee data."
       );
     }
   }
 };


 const handleEdit = (employee) => {
   setEmployeeData({
     fullName: employee.fullName,
     email: employee.email,
     department: employee.department || "",
     callerId: employee.callerId,
     agentNumber: employee.agentNumber,
     role: employee.role,
     password: "",
     confirmPassword: "",
     status: employee.status,
     target: employee.target || "",
     hasTeam: !!employee.hasTeam,
     isDoctor: !!employee.isDoctor,
     teamLeader: employee.teamLeader?._id || "",
     languages: Array.isArray(employee.languages) ? employee.languages : [],
     joiningDate: employee.joiningDate
       ? new Date(employee.joiningDate).toISOString().split("T")[0]
       : "",
     joiningSalary:
       employee.joiningSalary !== null && employee.joiningSalary !== undefined
         ? String(employee.joiningSalary)
         : "",
     currentSalary:
       employee.currentSalary !== null && employee.currentSalary !== undefined
         ? String(employee.currentSalary)
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
   setRoleInputValue(employee.role || "");
   setDepartmentInputValue(employee.department || "");
   setCurrentEmployeeId(employee._id);
   setIsEditMode(true);
   setOpen(true);
 };


 const handleDelete = async (id) => {
   try {
     await api.delete(`/api/employees/${id}`, {
       headers: { "x-agent-name": getActorName() },
     });
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
     await api.put(
       `/api/employees/${permissionEmployee._id}`,
       { permissions: permissionValues },
       {
         headers: { "x-agent-name": getActorName() },
       }
     );
     await fetchEmployees();
     closePermissionDialog();
   } catch (error) {
     console.error("Error saving permissions:", error);
     alert("Error saving permissions. Please try again.");
   }
 };


 const filteredEmployees = employees.filter((emp) => {
   const roleMatch = roleFilter ? emp.role === roleFilter : true;
   const departmentMatch = departmentFilter
     ? (emp.department || "") === departmentFilter
     : true;
   return roleMatch && departmentMatch;
 });


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
             setEmployeeData(EMPTY_EMPLOYEE_DATA);
             setRoleInputValue("");
             setDepartmentInputValue("");
             setOpen(true);
           }}
         >
           Add Employee
         </Button>
         <Button
           variant="outlined"
           color="secondary"
           onClick={() => navigate("/organisation-tree")}
         >
           Organisation Tree
         </Button>


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


         <TextField
           select
           size="small"
           label="Filter by Department"
           value={departmentFilter}
           onChange={(e) => setDepartmentFilter(e.target.value)}
           sx={{ minWidth: 220 }}
         >
           <MenuItem value="">All Departments</MenuItem>
           {availableDepartments.map((department) => (
             <MenuItem key={department} value={department}>
               {department}
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
               "Department",
               "Reports To",
               "Joining Date",
               "Joining Salary",
               "Role",
               "Status",
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
                 backgroundColor: index % 2 === 0 ? "#ffffff" : "#fafafa",
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
                 {employee.department || "--"}
               </TableCell>
               <TableCell align="center" sx={{ padding: "8px 16px" }}>
                 {employee.teamLeader?.fullName || "--"}
               </TableCell>
               <TableCell align="center" sx={{ padding: "8px 16px" }}>
                 {employee.joiningDate
                   ? new Date(employee.joiningDate).toISOString().split("T")[0]
                   : "--"}
               </TableCell>
               <TableCell align="center" sx={{ padding: "8px 16px" }}>
                 {employee.joiningSalary !== undefined &&
                 employee.joiningSalary !== null
                   ? Number(employee.joiningSalary).toLocaleString()
                   : "--"}
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
                       employee.status === "active" ? "#C8E6C9" : "#FFCDD2",
                     color:
                       employee.status === "active" ? "#2E7D32" : "#C62828",
                   }}
                 >
                   {employee.status}
                 </Box>
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


           <Autocomplete
             freeSolo
             options={availableDepartments}
             value={employeeData.department || ""}
             inputValue={departmentInputValue}
             filterOptions={(options, params) =>
               withAddOption(options, params, "Department")
             }
             getOptionLabel={(option) =>
               typeof option === "string" ? option : option?.inputValue || ""
             }
             onChange={(_, value) => {
               const nextDepartment = normalizeOptionValue(value);
               setEmployeeData((prev) => ({
                 ...prev,
                 department: nextDepartment,
               }));
               setDepartmentInputValue(nextDepartment);
               if (nextDepartment) {
                 setAvailableDepartments((prev) =>
                   [...new Set([...prev, nextDepartment])].sort()
                 );
               }
             }}
             onInputChange={(_, value) => {
               setDepartmentInputValue(value);
               setEmployeeData((prev) => ({
                 ...prev,
                 department: String(value || ""),
               }));
             }}
             renderOption={(props, option) => (
               <li {...props}>
                 {typeof option === "string" ? option : option?.label || ""}
               </li>
             )}
             renderInput={(params) => (
               <TextField
                 {...params}
                 required
                 fullWidth
                 label="Department"
                 variant="filled"
                 onBlur={commitDepartmentInput}
                 InputLabelProps={{
                   sx: { "& .MuiFormLabel-asterisk": { color: "error.main" } },
                 }}
                 InputProps={{
                   ...params.InputProps,
                   disableUnderline: true,
                   sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                 }}
               />
             )}
           />


          {shouldShowReportsTo && (
             <Autocomplete
               options={allActiveEmployees.filter(
                 (employee) => employee._id !== currentEmployeeId
               )}
               value={
                 allActiveEmployees.find(
                   (employee) => employee._id === employeeData.teamLeader
                 ) || null
               }
               isOptionEqualToValue={(option, value) =>
                 option._id === value?._id
               }
               getOptionLabel={(option) => option?.fullName || ""}
               onChange={(_, value) =>
                 setEmployeeData((prev) => ({
                   ...prev,
                   teamLeader: value?._id || "",
                 }))
               }
               renderInput={(params) => (
                 <TextField
                   {...params}
                   fullWidth
                   label="Reports To"
                   variant="filled"
                   InputProps={{
                     ...params.InputProps,
                     disableUnderline: true,
                     sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                   }}
                 />
               )}
             />
           )}


           <TextField
             required={!isEditMode}
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
             required={!isEditMode}
             fullWidth
             label="Joining Salary"
             name="joiningSalary"
             type="number"
             value={employeeData.joiningSalary}
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


           <TextField
             required={!isEditMode}
             fullWidth
             label="Current Salary"
             name="currentSalary"
             type="number"
             value={employeeData.currentSalary}
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


           <Autocomplete
             freeSolo
             options={availableRoles}
             value={employeeData.role || ""}
             inputValue={roleInputValue}
             filterOptions={(options, params) =>
               withAddOption(options, params, "Role")
             }
             getOptionLabel={(option) =>
               typeof option === "string" ? option : option?.inputValue || ""
             }
             onChange={(_, value) => {
               const nextRole = normalizeOptionValue(value);
               setEmployeeData((prev) => ({
                 ...prev,
                 role: nextRole,
               }));
               setRoleInputValue(nextRole);
               if (nextRole) {
                 setAvailableRoles((prev) =>
                   [...new Set([...prev, nextRole])].sort()
                 );
               }
             }}
             onInputChange={(_, value) => {
               setRoleInputValue(value);
               setEmployeeData((prev) => ({
                 ...prev,
                 role: String(value || ""),
               }));
             }}
             renderOption={(props, option) => (
               <li {...props}>
                 {typeof option === "string" ? option : option?.label || ""}
               </li>
             )}
             renderInput={(params) => (
               <TextField
                 {...params}
                 required
                 fullWidth
                 label="Role"
                 variant="filled"
                 onBlur={commitRoleInput}
                 InputLabelProps={{
                   sx: { "& .MuiFormLabel-asterisk": { color: "error.main" } },
                 }}
                 InputProps={{
                   ...params.InputProps,
                   disableUnderline: true,
                   sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                 }}
               />
             )}
           />

           {!isCoreOnlyRole && (
             <Box
               sx={{
                 display: "flex",
                 alignItems: "center",
                 gap: 3,
                 pl: 1,
                 mt: -1,
                 mb: 1,
                 flexWrap: "wrap",
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
                 label="Has Team"
               />
               <Typography variant="caption" sx={{ color: "#64748b" }}>
                 Turn this on for Assistant Team Leads or agents who manage their own team.
               </Typography>
             </Box>
           )}


           {isSalesDepartment && (
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
                 label="Expert Number (IVR)"
                 name="agentNumber"
                 value={employeeData.agentNumber}
                 onChange={handleChange}
                 variant="filled"
                 InputProps={{
                   disableUnderline: true,
                   sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                 }}
               />
             </>
           )}


           {isSalesDepartment && !employeeData.isDoctor && !isSalesTeamLeader && (
             <TextField
               fullWidth
               required
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
           )}


           {isSalesDepartment && (
             <Autocomplete
               multiple
               freeSolo
               options={LANGUAGE_OPTIONS}
               value={employeeData.languages}
               onChange={(_, newValue) => {
                 const unique = [
                   ...new Set(newValue.map((v) => String(v).trim())),
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


           {isSalesDepartment && (
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
         Permissions – {permissionEmployee ? permissionEmployee.fullName : ""}
       </DialogTitle>
       <DialogContent dividers>
         <Grid container spacing={3}>
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
                 ["knowledgeBase", "Knowledge Base"],
                 ["consultation", "Consultation"],
                 ["escalations", "Escalations"],
                 ["team", "Team"],
                 ["abandonedCart", "Abandoned Cart"],
                 ["myRTOs", "MY RTOs"],
                 ["myAssets", "My Assets"],
                 ["myGrowthPlan", "Growth At Muditam"],
                 ["allAnalyticsMenu", "Analytics Menu"],
                 ["superAdminAnalytics", "Super Admin Analytics"],
                 ["abandonedAnalytics", "Abandoned Analytics"],
                 ["invoices", "Invoices"],
                 ["whatsaapChats", "WhatsApp Chats"],
                 ["accessManagement", "Access Management"],
                 ["adminAccessRequests", "Admin Access Requests"],
                 ["deliveredSalesRecord", "Delivered Sales Record"],
                 ["incentivesWallet", "Incentives Wallet"],
                 ["sops", "SOPs"],
                 ["RewardsAdminPage", "Rewards Admin"],
               ].map(([key, label]) => (
                 <FormControlLabel
                   key={key}
                   control={
                     <Checkbox
                       checked={!!permissionValues.menubar[key]}
                       onChange={() => handlePermissionToggle("menubar", key)}
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
                       onChange={() => handlePermissionToggle("menubar", key)}
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
                       onChange={() => handlePermissionToggle("menubar", key)}
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
                       onChange={() => handlePermissionToggle("menubar", key)}
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
               Task Manager & Calling
             </Typography>
             <Box sx={{ display: "flex", flexDirection: "column" }}>
               {[
                 ["taskManagerMenu", "Task Manager Menu"],
                 ["taskBoard", "Task Board"],
                 ["myReporting", "My Reporting"],
                 ["callingCenterMenu", "Calling Center Menu"],
                 ["callingCenterAgent", "Calling: Agent Console"],
                 ["callingCenterManager", "Calling: Manager Dashboard"],
                 ["redcliffeMenu", "Redcliffe Menu"],
                 ["redcliffeBooking", "Redcliffe: Booking"],
                 ["redcliffeDashboard", "Redcliffe: Dashboard"],
               ].map(([key, label]) => (
                 <FormControlLabel
                   key={key}
                   control={
                     <Checkbox
                       checked={!!permissionValues.menubar[key]}
                       onChange={() => handlePermissionToggle("menubar", key)}
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
               Marketing
             </Typography>
             <Box sx={{ display: "flex", flexDirection: "column" }}>
               {[
                 ["marketingMenu", "Marketing Menu"],
                 ["cutPage", "Cut Page"],
                 ["scriptPage", "Script Page"],
                 ["shootPage", "Shoot Page"],
                 ["editPage", "Edit Page"],
                 ["postPage", "Post Page"],
               ].map(([key, label]) => (
                 <FormControlLabel
                   key={key}
                   control={
                     <Checkbox
                       checked={!!permissionValues.menubar[key]}
                       onChange={() => handlePermissionToggle("menubar", key)}
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
               Other Video
             </Typography>
             <Box sx={{ display: "flex", flexDirection: "column" }}>
               {[
                 ["OthervideoMenu", "Other Video Menu"],
                 ["OthercutPage", "Cut Page"],
                 ["OtherscriptPage", "Script Page"],
                 ["OthershootPage", "Shoot Page"],
                 ["OthereditPage", "Edit Page"],
                 ["OtherpostPage", "Post Page"],
               ].map(([key, label]) => (
                 <FormControlLabel
                   key={key}
                   control={
                     <Checkbox
                       checked={!!permissionValues.menubar[key]}
                       onChange={() => handlePermissionToggle("menubar", key)}
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
               Static / Carousel
             </Typography>
             <Box sx={{ display: "flex", flexDirection: "column" }}>
               {[
                 ["StaticCarouselMenu", "Static / Carousel Menu"],
                 ["StaticCarouselcutPage", "Cut Page"],
                 ["StaticCarouselscriptPage", "Script Page"],
                 ["StaticCarouselshootPage", "Shoot Page"],
                 ["StaticCarouseleditPage", "Edit Page"],
                 ["StaticCarouselpostPage", "Post Page"],
               ].map(([key, label]) => (
                 <FormControlLabel
                   key={key}
                   control={
                     <Checkbox
                       checked={!!permissionValues.menubar[key]}
                       onChange={() => handlePermissionToggle("menubar", key)}
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
               Ads
             </Typography>
             <Box sx={{ display: "flex", flexDirection: "column" }}>
               {[
                 ["adsMenu", "Ads Menu"],
                 ["adscutPage", "Cut Page"],
                 ["adsscriptPage", "Script Page"],
                 ["adsshootPage", "Shoot Page"],
                 ["adseditPage", "Edit Page"],
                 ["adspostPage", "Post Page"],
               ].map(([key, label]) => (
                 <FormControlLabel
                   key={key}
                   control={
                     <Checkbox
                       checked={!!permissionValues.menubar[key]}
                       onChange={() => handlePermissionToggle("menubar", key)}
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
                 ["financePrepaidCashfree", "Prepaid: Cashfree"],
                 ["financePrepaidBankTransfer", "Prepaid: Bank Transfer"],
                 ["financeCodRemittanceMenu", "COD Remittance Menu"],
                 ["financeCodBluedart", "COD: Bluedart"],
                 ["financeCodDTDC", "COD: DTDC"],
                 ["financeCodDelhivery", "COD: Delhivery"],
                 ["financeCodShiprocket", "COD: Shiprocket"],
                 ["financeRecordsMenu", "Records Menu"],
                 ["financePurchaseRecords", "Purchase Records"],
                 ["financePaymentRecords", "Payment Records"],
                 ["financeVendors", "My Vendors"],
                 ["financeBankReconciliationMenu", "Bank Reconciliation Menu"],
                 ["bankCapital6389", "Bank - Capital 6389"],
                 ["bankAxis3361", "Axis - 3361"],
                 ["bankCc1101", "CC 1101"],
                 ["bankSbi8285", "SBI Current 8285"],
                 ["bankYesCcTejasv", "Yes CC - Tejasv"],
                 ["bankYesCcAbhay", "Yes CC - Abhay"],
                 ["bankKotak", "Bank - Kotak"],
               ].map(([key, label]) => (
                 <FormControlLabel
                   key={key}
                   control={
                     <Checkbox
                       checked={!!permissionValues.menubar[key]}
                       onChange={() => handlePermissionToggle("menubar", key)}
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
                 ["othersIncentiveCreation", "Incentive Creation"],
                 ["othersScheduleCalls", "Schedule Calls"],
                 ["othersAllProducts", "All Products"],
                 ["othersLeadMigration", "Leads Migrate"],
                 ["otherswhatsaaptemplates", "Whatsaap Template"],
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
                       onChange={() => handlePermissionToggle("menubar", key)}
                     />
                   }
                   label={label}
                 />
               ))}
             </Box>
           </Grid>


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
                       onChange={() => handlePermissionToggle("navbar", key)}
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
                 ["campaignQuickCreate", "Marketing Icon"],
               ].map(([key, label]) => (
                 <FormControlLabel
                   key={key}
                   control={
                     <Checkbox
                       checked={!!permissionValues.navbar[key]}
                       onChange={() => handlePermissionToggle("navbar", key)}
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
                       onChange={() => handlePermissionToggle("navbar", key)}
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
