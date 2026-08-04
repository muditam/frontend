import React, { useRef, useState, useEffect } from "react";
import {
 AppBar,
 Toolbar,
 TextField,
 Box,
 Typography,
 List,
 ListItem,
 ListItemText,
 ClickAwayListener,
 Drawer,
 IconButton,
 Collapse,
 InputAdornment,
 Dialog,
 DialogContent,
 Button,
 DialogTitle,
 DialogActions,
 Grid,
 Divider,
 Chip,
 Table,
 Slide,
 TableCell,
 TableBody,
 TableHead,
 TableRow,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import { getRemainingWorkingDays } from "../../utils/workingDays";
import MenuBar from "./MenuBar";
import { useNavigate, useLocation } from "react-router-dom";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import CartDrawer from "../../ShopifyOrders/CartDrawer";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CloseIcon from "@mui/icons-material/Close";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { Syringe } from "lucide-react";
import pincodeData from "../../LeadConsultation/ProcessTracker/pincodeData";
import DeliveryStatusChecker from "./DeliveryStatusChecker";
import LeaderboardPopover from "./LeaderboardPopover";
import DownloadIcon from "@mui/icons-material/Download";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CampaignIcon from "@mui/icons-material/Campaign";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { Flower2 } from "lucide-react";
import Bloomleader from "./Bloomleader";
import MarketingQuickCreateDialog from "../../Marketing/MarketingQuickCreateDialog";


const SlideDown = React.forwardRef(function Transition(props, ref) {
 return <Slide direction="down" ref={ref} {...props} />;
});


const getAvatarUrl = (name) =>
 `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
   name
 )}&backgroundType=gradientLinear&radius=50`;

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const SWITCH_API_BASE = "/api/switch-dashboard";
const PRIMARY_SWITCH_API_BASE = SWITCH_API_BASE;

const readJsonStorage = (storage, key, fallback = null) => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeIdentity = (user = {}) => ({
  id: String(user?._id || user?.id || "").trim(),
  email: String(user?.email || "").trim().toLowerCase(),
});

const isSameUser = (a, b) => {
  const left = normalizeIdentity(a);
  const right = normalizeIdentity(b);
  if (left.id && right.id) return left.id === right.id;
  if (left.email && right.email) return left.email === right.email;
  return false;
};

const clearSwitchMarkers = () => {
  sessionStorage.removeItem("originalUser");
  sessionStorage.removeItem("switchMeta");
};

const getSessionUserHeaders = () => {
  return {};
};


const NavbarWithSearch = () => {
 const [query, setQuery] = useState("");
 const [results, setResults] = useState([]);
 const [showResults, setShowResults] = useState(false);
 const [shopifyQuery, setShopifyQuery] = useState("");
 const [customerData, setCustomerData] = useState(null);
 const [showCustomerDetails, setShowCustomerDetails] = useState(false);
 const [showOrders, setShowOrders] = useState(false);
 const [showAllOrders, setShowAllOrders] = useState(false);
 const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
 const [menuOpen, setMenuOpen] = useState(false);
 const [expandedOrderIds, setExpandedOrderIds] = useState([]);
 const [target, setTarget] = useState(0);
 const [salesProgress, setSalesProgress] = useState(0);
 const [bloodTestDialog, setBloodTestDialog] = useState(false);
 const [pincode, setPincode] = useState("");
 const [availableLabs, setAvailableLabs] = useState([]);
 const [checkClicked, setCheckClicked] = useState(false);
 const [incentiveOpen, setIncentiveOpen] = useState(false);
 const leaderboardAnchorRef = useRef(null);
 const [leaderboardOpen, setLeaderboardOpen] = useState(false);
 const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
 const [bloomOpen, setBloomOpen] = useState(false);
 const [marketingQuickCreateOpen, setMarketingQuickCreateOpen] = useState(false);
 const [revertLoading, setRevertLoading] = useState(false);


 const navigate = useNavigate();
 const location = useLocation();


 const user = readJsonStorage(sessionStorage, "user", null);
 const originalUser = readJsonStorage(sessionStorage, "originalUser", null);
 const isImpersonating = !!(user && originalUser && !isSameUser(user, originalUser));

 useEffect(() => {
   if (user && originalUser && isSameUser(user, originalUser)) {
     clearSwitchMarkers();
   }
 }, [user, originalUser]);

 useEffect(() => {
   if (location.pathname) {
     setRevertLoading(false);
   }
 }, [location.pathname]);


 // 🔐 Navbar permissions
 const navPerms = user?.permissions?.navbar || {};
 const canNav = (key) => !!navPerms[key];


 const openBloodTestDialog = () => {
   setPincode("");
   setAvailableLabs([]);
   setCheckClicked(false);
   setBloodTestDialog(true);
 };
 const closeBloodTestDialog = () => setBloodTestDialog(false);


 const handlePincodeChange = (e) => setPincode(e.target.value);


 const workingDaysLeft = getRemainingWorkingDays();
 const dailySalesRequired =
   workingDaysLeft > 0 && target - salesProgress > 0
     ? Math.ceil((target - salesProgress) / workingDaysLeft)
     : 0;


 const checkLabs = () => {
   setCheckClicked(true);
   const labs = [];
   const pin = pincode.trim();
   if (!pin) {
     setAvailableLabs([]);
     return;
   }
   if (pincodeData.Redcliff.includes(pin)) labs.push("Redcliff");
   if (pincodeData.Lalpathlab.includes(pin)) labs.push("Lalpathlab");
   if (pincodeData.Redcliff.includes(pin)) labs.push("Healthians");
   setAvailableLabs(labs);
 };


 const handleSearch = async (e) => {
   const value = e.target.value;
   setQuery(value);


   if (value.trim() === "") {
     setResults([]);
     setShowResults(false);
     return;
   }


   try {
     const response = await axios.get(
       "https://muditamleads-14f32a10d7f7.herokuapp.com/api/search",
       { params: { query: value } }
     );
     setResults(response.data);
     setShowResults(true);
   } catch (error) {
     console.error("Error fetching search results:", error);
   }
 };


 const handleClickAway = () => {
   setShowResults(false);
 };


 const handleShopifyInputChange = (e) => {
   setShopifyQuery(e.target.value);
 };


 useEffect(() => {
   async function fetchTarget() {
     if (!user) return;
     try {
       const response = await axios.get(
         "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees",
         {
           params: {
             fullName: user.fullName,
             email: user.email,
           },
         }
       );
       if (response.data && response.data[0]) {
         setTarget(response.data[0].target || 0);
       }
     } catch (error) {
       console.error("Error fetching employee target:", error);
     }
   }
   fetchTarget();
 }, [user]);


 useEffect(() => {
   async function fetchSalesProgress() {
     if (!user) return;
     try {
       const response = await axios.get(
         "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/progress",
         {
           params: { name: user.fullName },
         }
       );
       setSalesProgress(response.data.total || 0);
     } catch (error) {
       console.error("Error fetching retention sales progress:", error);
     }
   }
   fetchSalesProgress();
 }, [user]);


 // Early return after hooks
 if (location.pathname === "/login") {
   return null;
 }


 const executeShopifySearch = async () => {
   if (!shopifyQuery.trim()) {
     setCustomerData(null);
     setShowCustomerDetails(false);
     return;
   }


   try {
     const response = await axios.get(
       "https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/customerDetails",
       {
         params: { q: shopifyQuery },
       }
     );
     setCustomerData(response.data.customer);
     setShowCustomerDetails(true);
     setShowOrders(false);
     setShowAllOrders(false);
   } catch (error) {
     console.error("Error fetching Shopify customer details:", error);
   }
 };


 const handleShopifyClickAway = () => {
   setShowCustomerDetails(false);
 };


 const toggleOrders = () => {
   setShowOrders((prev) => !prev);
 };


 const toggleShowAllOrders = () => {
   setShowAllOrders((prev) => !prev);
 };


 const toggleMenu = (open) => () => {
   setMenuOpen(open);
 };


 const toggleAddress = (orderId) => {
   setExpandedOrderIds((prev) =>
     prev.includes(orderId)
       ? prev.filter((id) => id !== orderId)
       : [...prev, orderId]
   );
 };


 const handleDownloadOrders = async () => {
   try {
     const response = await axios.get(
       "http://localhost:5001/api/myorders/download",
       { responseType: "blob" }
     );


     // Create a URL and trigger download
     const url = window.URL.createObjectURL(new Blob([response.data]));
     const link = document.createElement("a");
     link.href = url;
     link.setAttribute("download", "myorders.csv");
     document.body.appendChild(link);
     link.click();
     link.remove();
     window.URL.revokeObjectURL(url);
   } catch (error) {
     alert("Error downloading orders. Please try again.");
     console.error(error);
   }
 };


 const toggleCartDrawer = (open) => () => setCartDrawerOpen(open);


 const smallFont = { fontSize: "0.8rem" };


 // Task icons permissions
 const showTaskBoardIcon = canNav("taskBoardIcon", false);
 const showMyReportingIcon = canNav("myReportingIcon", false);
 const showTaskIcons = showTaskBoardIcon || showMyReportingIcon;

 const handleGlobalRevert = async () => {
   const restoreOriginalLocally = () => {
     const originalStr = sessionStorage.getItem("originalUser");
     if (!originalStr) return false;
     try {
       const original = JSON.parse(originalStr);
       sessionStorage.setItem("user", JSON.stringify(original));
       clearSwitchMarkers();
       navigate("/switch-dashboard", { replace: true });
       return true;
     } catch {
       clearSwitchMarkers();
       return false;
     }
   };

   try {
     setRevertLoading(true);

     let data;
      try {
        ({ data } = await axios.post(
          `${API_BASE_URL}${PRIMARY_SWITCH_API_BASE}/revert`,
          {},
          { withCredentials: true, headers: getSessionUserHeaders() }
        ));
      } catch (err) {
        const status = err?.response?.status;
        if (status === 400) {
          if (restoreOriginalLocally()) return;
        } else if (status === 401) {
          if (restoreOriginalLocally()) return;
          throw err;
        } else {
          throw err;
        }
      }

      if (data?.user) {
        sessionStorage.setItem(
          "user",
          JSON.stringify({ ...data.user, _id: data.user._id || data.user.id })
        );
      } else {
        if (restoreOriginalLocally()) return;
      }
      clearSwitchMarkers();
      navigate("/switch-dashboard", { replace: true });
   } catch (error) {
     console.error("Error while reverting impersonation:", error);
   } finally {
     setRevertLoading(false);
   }
 };


 return (
   <>
     <AppBar
       position="static"
       sx={{
         backgroundColor: "#000000",
       }}
     >
       <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
         {/* Left side: Menu Icon and Title */}
         <Box sx={{ display: "flex", alignItems: "center" }}>
           <IconButton
             edge="start"
             color="inherit"
             onClick={toggleMenu(true)}
             sx={{ mr: 2 }}
           >
             <MenuIcon sx={{ fontSize: "2.3rem" }} />
           </IconButton>
           <Box
             component="img"
             src="https://cdn.shopify.com/s/files/1/0734/7155/7942/files/new_logo_orange_leaf_1_4e0e0f89-08a5-4264-9d2b-0cfe9535d553.png?v=1727508866"
             alt="Muditam Logo"
             onClick={() => navigate("/")}
             onKeyDown={(e) => {
               if (e.key === "Enter" || e.key === " ") {
                 e.preventDefault();
                 navigate("/");
               }
             }}
             role="button"
             tabIndex={0}
             sx={{ height: 40, ml: 1, cursor: "pointer" }}
           />
         </Box>


         {/* Center: Shopify Customer Search Bar */}
         {user && canNav("shopifySearch") && (
           <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
             <Box sx={{ position: "relative", width: 300 }}>
               <ClickAwayListener onClickAway={handleShopifyClickAway}>
                 <div>
                   <TextField
                     fullWidth
                     variant="outlined"
                     placeholder="Search On Shopify"
                     value={shopifyQuery}
                     onChange={handleShopifyInputChange}
                     sx={{
                       backgroundColor: "#fff",
                       borderRadius: 2,
                       "& .MuiInputBase-input": {
                         padding: "8px 12px",
                         ...smallFont,
                       },
                     }}
                     InputProps={{
                       endAdornment: (
                         <InputAdornment position="end">
                           <IconButton
                             onClick={executeShopifySearch}
                             sx={{ color: "#1976d2" }}
                           >
                             <SearchIcon sx={{ color: "gray" }} />
                           </IconButton>
                         </InputAdornment>
                       ),
                     }}
                   />
                   {showCustomerDetails && (
                     <List
                       sx={{
                         position: "absolute",
                         top: "100%",
                         left: 0,
                         right: 0,
                         bgcolor: "#f5f5f5",
                         border: "1px solid #ccc",
                         borderRadius: "4px",
                         maxHeight: 290,
                         overflowY: "auto",
                         zIndex: 10,
                         color: "black",
                       }}
                     >
                       {customerData ? (
                         <React.Fragment>
                           <ListItem
                             button
                             onClick={toggleOrders}
                             sx={{ py: 1, ...smallFont }}
                           >
                             <ListItemText
                               primary={`${customerData.name}`}
                               secondary={
                                 <>
                                   <span>
                                     Total Orders: {customerData.totalOrders} | Total
                                     Spent: ₹{customerData.totalSpent}
                                   </span>
                                   <br />
                                   <span>
                                     Customer No: {customerData.phone || "N/A"}
                                   </span>
                                   <br />
                                   <span>
                                     Last Order:{" "}
                                     {customerData.lastOrderDate
                                       ? new Date(
                                         customerData.lastOrderDate
                                       ).toLocaleString()
                                       : "N/A"}{" "}
                                     | Payment Status:{" "}
                                     {customerData.lastOrderPaymentStatus || "N/A"}
                                   </span>
                                 </>
                               }
                               primaryTypographyProps={{ style: smallFont }}
                               secondaryTypographyProps={{ style: smallFont }}
                             />
                             {showOrders ? (
                               <ExpandLessIcon fontSize="small" />
                             ) : (
                               <ExpandMoreIcon fontSize="small" />
                             )}
                           </ListItem>


                           <Collapse in={showOrders} timeout="auto" unmountOnExit>
                             <List component="div" disablePadding>
                               {customerData.orders && customerData.orders.length > 0 ? (
                                 <>
                                   {customerData.orders.slice(0, 4).map((order) => (
                                     <ListItem
                                       key={order.id}
                                       sx={{ pl: 3, py: 0.5, ...smallFont }}
                                     >
                                       <ListItemText
                                         primary={`Order ${order.name || order.id} | Total Amount: ₹${order.totalAmount || 0
                                           }`}
                                         secondary={
                                           <>
                                             <span>
                                               {new Date(order.created_at).toLocaleString()} | Items:{" "}
                                               {order.itemCount} | {order.deliveryStatus} | Shipment:{" "}
                                               {order.shipmentStatus || "N/A"}
                                             </span>
                                             <br />
                                             <span>
                                               Customer No:{" "}
                                               {order.customerPhone ||
                                                 customerData.phone ||
                                                 "N/A"}{" "}
                                               | Tracking ID:{" "}
                                               {order.trackingNumber || "N/A"}
                                             </span>
                                             <br />
                                             {order.lineItems.map((item, idx) => (
                                               <span key={idx}>
                                                 {item.title} - {item.variant} (₹
                                                 {item.amountPaid}){" "}
                                               </span>
                                             ))}
                                             <br />
                                             <Box
                                               onClick={() => toggleAddress(order.id)}
                                               sx={{
                                                 cursor: "pointer",
                                                 color: "#1976d2",
                                                 mt: 1,
                                                 display: "flex",
                                                 alignItems: "center",
                                               }}
                                             >
                                               {expandedOrderIds.includes(order.id) ? (
                                                 <>
                                                   Show Less Address{" "}
                                                   <ExpandLessIcon
                                                     fontSize="small"
                                                     sx={{ ml: 0.5 }}
                                                   />
                                                 </>
                                               ) : (
                                                 <>
                                                   Show Address{" "}
                                                   <ExpandMoreIcon
                                                     fontSize="small"
                                                     sx={{ ml: 0.5 }}
                                                   />
                                                 </>
                                               )}
                                             </Box>
                                             <Collapse
                                               in={expandedOrderIds.includes(order.id)}
                                               timeout="auto"
                                               unmountOnExit
                                             >
                                               <Typography
                                                 sx={{
                                                   mt: 1,
                                                   ...smallFont,
                                                 }}
                                               >
                                                 {order.shippingAddress ||
                                                   "No shipping address found"}
                                               </Typography>
                                             </Collapse>
                                           </>
                                         }
                                         primaryTypographyProps={{
                                           style: smallFont,
                                         }}
                                         secondaryTypographyProps={{
                                           style: smallFont,
                                         }}
                                       />
                                     </ListItem>
                                   ))}


                                   {customerData.orders.length > 4 && (
                                     <ListItem
                                       button
                                       onClick={toggleShowAllOrders}
                                       sx={{ pl: 3, ...smallFont }}
                                     >
                                       <ListItemText
                                         primary={
                                           showAllOrders
                                             ? "Show less orders"
                                             : `${customerData.orders.length - 4} more orders`
                                         }
                                       />
                                     </ListItem>
                                   )}


                                   {showAllOrders &&
                                     customerData.orders.slice(4).map((order) => (
                                       <ListItem
                                         key={order.id}
                                         sx={{ pl: 3, py: 0.5, ...smallFont }}
                                       >
                                         <ListItemText
                                           primary={`Order ${order.name || order.id}`}
                                           secondary={
                                             <>
                                               <span>
                                                 {new Date(order.created_at).toLocaleString()} | Items:{" "}
                                                 {order.itemCount} | {order.deliveryStatus} | Shipment:{" "}
                                                 {order.shipmentStatus || "N/A"}
                                               </span>
                                               <br />
                                               <span>
                                                 Customer No:{" "}
                                                 {order.customerPhone ||
                                                   customerData.phone ||
                                                   "N/A"}{" "}
                                                 | Tracking ID:{" "}
                                                 {order.trackingNumber || "N/A"}
                                               </span>
                                               <br />
                                               {order.lineItems.map((item, idx) => (
                                                 <span key={idx}>
                                                   {item.title} - {item.variant} (₹
                                                   {item.amountPaid}){" "}
                                                 </span>
                                               ))}
                                             </>
                                           }
                                           primaryTypographyProps={{
                                             style: smallFont,
                                           }}
                                           secondaryTypographyProps={{
                                             style: smallFont,
                                           }}
                                         />
                                       </ListItem>
                                     ))}
                                 </>
                               ) : (
                                 <ListItem sx={{ pl: 3, py: 1, ...smallFont }}>
                                   <ListItemText primary="No orders found." />
                                 </ListItem>
                               )}
                             </List>
                           </Collapse>
                         </React.Fragment>
                       ) : (
                         <ListItem>
                           <ListItemText
                             primary="Customer does not exist."
                             sx={smallFont}
                           />
                         </ListItem>
                       )}
                     </List>
                   )}
                 </div>
               </ClickAwayListener>
             </Box>
           </Box>
         )}


         {/* DRR + Target block */}
         {user && canNav("drrPanel") && (
           <Box
             sx={{
               mx: 2,
               p: 1,
               bgcolor: "#000",
               borderRadius: 2,
               minWidth: 130,
               display: "flex",
               alignItems: "center",
               justifyContent: "center",
             }}
           >
             <Typography
               variant="caption"
               sx={{
                 color: "#fff",
                 fontSize: "0.8rem",
                 fontWeight: 500,
                 letterSpacing: "0.5px",
                 display: "flex",
                 alignItems: "center",
               }}
             >
               DRR:
               <span
                 style={{
                   marginLeft: 5,
                   color: "#19d444",
                   fontWeight: 700,
                 }}
               >
                 {dailySalesRequired > 0 ? `₹${dailySalesRequired}` : "₹0"}
               </span>
             </Typography>


             <Divider
               orientation="vertical"
               flexItem
               sx={{ mx: 1, borderColor: "#444" }}
             />


             <Typography
               variant="caption"
               sx={{
                 color: "#fff",
                 fontSize: "1rem",
                 fontWeight: 500,
                 letterSpacing: "0.5px",
                 display: "flex",
                 alignItems: "center",
               }}
             >
               Target: ({Math.floor(salesProgress)}/{Math.floor(target)})
               <span
                 style={{
                   marginLeft: 8,
                   color: "#f7c942",
                   fontWeight: 700,
                 }}
               >
                 {target > 0
                   ? `${Math.floor((salesProgress / target) * 100)}%`
                   : "0%"}
               </span>
             </Typography>
           </Box>
         )}


         {/* Right side: Icons and LMS Search */}
         <Box sx={{ display: "flex", alignItems: "center" }}>
           {user && canNav("incentiveIcon") && (
             <IconButton
               onClick={() => setIncentiveOpen(true)}
               sx={{
                 mr: 1,
                 color: "#fff",
                 "&:hover": { color: "#fff", bgcolor: "#e0e0e0" },
               }}
               title="View Incentive Structure"
             >
               <RocketLaunchIcon />
             </IconButton>
           )}


           {user && canNav("bloomIcon") && (
             <IconButton
               onClick={() => setBloomOpen(true)}
               sx={{
                 mr: 0.5,
                 color: "#fff",
                 borderRadius: "50%",
                 p: 1.1,
                 "&:hover": { bgcolor: "#fff", color: "#e0e0e0" },
               }}
               title="View Bloom Leaderboard"
             >
               <Flower2 />
             </IconButton>
           )}


           {user && canNav("leaderboardIcon") && (
             <IconButton
               ref={leaderboardAnchorRef}
               onClick={() => setLeaderboardOpen(true)}
               sx={{
                 mr: 0.5,
                 color: "#fff",
                 borderRadius: "50%",
                 p: 1.1,
                 "&:hover": { bgcolor: "#fff", color: "#e0e0e0" },
               }}
               title="View Leaderboard"
             >
               <EmojiEventsIcon />
             </IconButton>
           )}


           <Bloomleader
             open={bloomOpen}
             anchorEl={leaderboardAnchorRef.current}
             onClose={() => setBloomOpen(false)}
           />


           <LeaderboardPopover
             open={leaderboardOpen}
             anchorEl={leaderboardAnchorRef.current}
             onClose={() => setLeaderboardOpen(false)}
           />


           {user && canNav("campaignQuickCreate") && (
             <IconButton
               onClick={() => setMarketingQuickCreateOpen(true)}
               sx={{
                 mr: 0.5,
                 color: "#fff",
                 borderRadius: "50%",
                 p: 1.1,
                 "&:hover": { bgcolor: "#e0e0e0" },
               }}
               title="Quick Create Marketing Item"
             >
               <CampaignIcon />
             </IconButton>
           )}


           <MarketingQuickCreateDialog
             open={marketingQuickCreateOpen}
             onClose={() => setMarketingQuickCreateOpen(false)}
             onCreated={() => {
               setMarketingQuickCreateOpen(false);
             }}
           />


           {user && canNav("bloodTestIcon") && (
             <IconButton
               color="error"
               onClick={openBloodTestDialog}
               sx={{
                 mr: 0.5,
                 color: "#fff",
                 borderRadius: "50%",
                 p: 1.1,
                 "&:hover": { bgcolor: "#e0e0e0" },
               }}
               title="Blood Test Pincode Check"
             >
               <Syringe />
             </IconButton>
           )}


           {user && canNav("deliveryStatusIcon") && (
             <IconButton
               onClick={() => setDeliveryDialogOpen(true)}
               sx={{
                 mr: 0.5,
                 color: "#fff",
                 borderRadius: "50%",
                 p: 1.1,
                 "&:hover": { bgcolor: "#e0e0e0" },
               }}
               title="Delivery Status Checker"
             >
               <LocalShippingIcon />
             </IconButton>
           )}




            <IconButton
               sx={{
                 mr: 1,
                 color: "#fff",
                 "&:hover": { color: "#fff", bgcolor: "#e0e0e0" }
               }}
               title="Download All Orders (CSV)"
               onClick={handleDownloadOrders}
             >
               <DownloadIcon />
             </IconButton>
           {user && canNav("cartIcon") && (
             <IconButton
               color="inherit"
               onClick={toggleCartDrawer(true)}
               sx={{ "&:hover": { backgroundColor: "#e0e0e0" } }}
             >
               <ShoppingCartIcon />
             </IconButton>
           )}


           {user && showTaskIcons && (
             <>
               {showTaskBoardIcon && (
                 <IconButton
                   color="inherit"
                   onClick={() => navigate("/task-board")}
                   sx={{
                     ml: 1,
                     "&:hover": { backgroundColor: "#e0e0e0" },
                   }}
                   title="Task Manager"
                 >
                   <CheckBoxIcon />
                 </IconButton>
               )}


               {showMyReportingIcon && (
                 <IconButton
                   color="inherit"
                   onClick={() => navigate("/my-reporting")}
                   sx={{
                     ml: 0.5,
                     "&:hover": { backgroundColor: "#e0e0e0" },
                   }}
                   title="My Reporting"
                 >
                   <AssessmentIcon />
                 </IconButton>
               )}
             </>
           )}


           {user && canNav("lmsSearch") && (
             <Box sx={{ position: "relative", width: 200, ml: 2 }}>
               <ClickAwayListener onClickAway={handleClickAway}>
                 <div>
                   <TextField
                     fullWidth
                     variant="outlined"
                     placeholder="LMS Search"
                     value={query}
                     onChange={handleSearch}
                     sx={{
                       backgroundColor: "#fff",
                       borderRadius: 2,
                       "& .MuiInputBase-input": {
                         textAlign: "left",
                         ...smallFont,
                       },
                     }}
                   />
                   {showResults && results.length > 0 && (
                     <List
                       sx={{
                         position: "absolute",
                         top: "100%",
                         left: 0,
                         right: 0,
                         bgcolor: "#f5f5f5",
                         border: "1px solid #ccc",
                         borderRadius: "4px",
                         maxHeight: 200,
                         overflowY: "auto",
                         zIndex: 10,
                         color: "black",
                       }}
                     >
                       {results.map((item) => (
                         <ListItem
                           key={item._id}
                           button
                           onClick={() => {
                             navigate(`/lead/${item._id}`);
                             handleClickAway();
                           }}
                           sx={{
                             ...smallFont,
                             backgroundColor:
                               item.source === "customer"
                                 ? "#ffe5e5"
                                 : "inherit",
                           }}
                         >
                           <ListItemText
                             primary={`${item.name || "No Name"} (${item.contactNumber
                               }) (${item.agentAssigned}) [${item.healthExpertAssigned
                               }]${item.hasOpenEscalation ? " ? " : ""
                               }`}
                             primaryTypographyProps={{ style: smallFont }}
                           />
                         </ListItem>
                       ))}
                     </List>
                   )}
                 </div>
               </ClickAwayListener>
             </Box>
           )}
         </Box>
       </Toolbar>
     </AppBar>

     {isImpersonating && originalUser && (
       <Box
         sx={{
           px: 2,
           py: 1,
           backgroundColor: "#FFF3CD",
           border: "1px solid #FFEEBA",
         }}
       >
         <Box
           sx={{
             maxWidth: 1280,
             mx: "auto",
             display: "flex",
             alignItems: "center",
             justifyContent: { xs: "center", md: "space-between" },
             flexDirection: { xs: "column", md: "row" },
             gap: 1.5,
           }}
         >
           <Typography
             sx={{
               fontSize: 14,
               color: "#856404",
               textAlign: { xs: "center", md: "left" },
             }}
           >
             You are viewing dashboard as{" "}
             <strong>{user?.fullName || "another user"}</strong>. Logged in as{" "}
             <strong>{originalUser.fullName || originalUser.email}</strong>. Click
             to return to your own dashboard.
           </Typography>

           <Button
             variant="contained"
             size="small"
             onClick={handleGlobalRevert}
             disabled={revertLoading}
             sx={{
               textTransform: "none",
               backgroundColor: "#856404",
               "&:hover": { backgroundColor: "#704f07" },
               alignSelf: { xs: "center", md: "auto" },
               minWidth: { xs: "auto", md: 260 },
             }}
           >
             {revertLoading
               ? "Returning..."
               : `Back to ${originalUser.fullName || "my"} dashboard`}
           </Button>
         </Box>
       </Box>
     )}
     {/* Delivery Status Dialog */}
     <Dialog
       open={deliveryDialogOpen}
       onClose={() => setDeliveryDialogOpen(false)}
       maxWidth="sm"
       fullWidth
       PaperProps={{
         sx: {
           borderRadius: 2,
           p: 2,
           background: "#fff",
         },
       }}
     >
       <DialogContent>
         <DeliveryStatusChecker
           onClose={() => setDeliveryDialogOpen(false)}
         />
       </DialogContent>
     </Dialog>


     {/* Blood Test Dialog */}
     <Dialog
       open={bloodTestDialog}
       onClose={closeBloodTestDialog}
       maxWidth="xs"
       fullWidth
       PaperProps={{
         sx: {
           borderRadius: 2,
           width: 400,
           p: 0,
           background: "#fff",
           boxShadow: "0 6px 24px 0 rgba(110,49,49,0.12)",
           position: "relative",
         },
       }}
     >
       {/* Cross (X) Button in top right */}
       <IconButton
         aria-label="close"
         onClick={closeBloodTestDialog}
         sx={{
           position: "absolute",
           right: 10,
           top: 10,
           color: "#333",
           zIndex: 10,
         }}
       >
         <CloseIcon />
       </IconButton>


       <Box
         sx={{
           display: "flex",
           flexDirection: "column",
           alignItems: "center",
           pt: 3,
           pb: 1,
         }}
       >
         <Syringe style={{ fontSize: "1.5rem", color: "#000" }} />
         <DialogTitle
           sx={{
             textAlign: "center",
             pb: 0,
             fontWeight: 600,
             fontSize: "1.2rem",
           }}
         >
           Blood Test Availability
         </DialogTitle>
         <Box
           sx={{
             height: 3,
             borderRadius: "20px",
             backgroundColor: "#FFD700",
             width: "90%",
           }}
         />
       </Box>
       <DialogContent sx={{ pt: 1 }}>
         <Typography
           variant="body2"
           sx={{ textAlign: "center", color: "#6a6868", fontSize: "14px" }}
         >
           Enter your pincode to check which labs are available for home blood
           test collection.
         </Typography>
         <TextField
           fullWidth
           label="Enter Pincode"
           value={pincode}
           onChange={handlePincodeChange}
           variant="outlined"
           margin="normal"
           inputProps={{
             maxLength: 6,
             inputMode: "numeric",
             pattern: "[0-9]*",
           }}
           sx={{
             background: "#fafbfc",
             borderRadius: 2,
             "& .MuiInputLabel-root": {
               top: "50%",
               transform: "translateY(-50%)",
               transition: "all 0.2s ease-in-out",
               fontSize: "0.85rem",
               paddingLeft: "8px",
             },
             "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled":
             {
               top: 0,
               color: "gray",
               transform: "translateY(-50%) translateX(8px)",
               paddingLeft: "8px",
               fontSize: "0.75rem",
             },
             "& .MuiOutlinedInput-root": {
               "& input": {
                 padding: "8px !important",
               },
               "&.Mui-focused fieldset": { borderColor: "black" },
               "&:hover fieldset": { borderColor: "black" },
             },
           }}
         />
         <Button
           variant="contained"
           fullWidth
           sx={{
             mt: 1,
             borderRadius: 1.5,
             backgroundColor: "black",
             color: "white",
             mb: 2,
           }}
           onClick={checkLabs}
           size="medium"
         >
           Check
         </Button>
         {checkClicked && (
           <Box
             sx={{
               mt: 1,
               minHeight: 30,
               display: "flex",
               flexDirection: "column",
               alignItems: "center",
             }}
           >
             {availableLabs.length === 0 ? (
               <Typography
                 color="error"
                 sx={{ fontWeight: 500, fontSize: "15px" }}
               >
                 No labs available for this pincode.
               </Typography>
             ) : (
               <>
                 <Typography
                   sx={{
                     fontWeight: 500,
                     color: "#222",
                     fontSize: "15px",
                   }}
                 >
                   Available Lab
                   {availableLabs.length > 1 ? "s" : ""}:
                 </Typography>
                 <Grid
                   container
                   spacing={1}
                   sx={{
                     mt: 0.5,
                     width: "100%",
                     justifyContent: "center",
                     display: "flex",
                   }}
                 >
                   {availableLabs.map((lab, idx) => (
                     <Grid item xs={3.5} key={lab}>
                       <Chip
                         label={lab}
                         sx={{
                           width: "100%",
                           bgcolor: "#e3f2fd",
                           color: "#0351a6",
                           fontSize: "14px",
                           borderRadius: "1rem",
                         }}
                       />
                     </Grid>
                   ))}
                 </Grid>
               </>
             )}
           </Box>
         )}
       </DialogContent>
     </Dialog>


     {/* Incentive Dialog */}
     <Dialog
       open={incentiveOpen}
       TransitionComponent={SlideDown}
       onClose={() => setIncentiveOpen(false)}
       maxWidth="sm"
       fullWidth
       PaperProps={{
         sx: {
           borderRadius: 2,
           mt: 3,
           boxShadow: "0 10px 36px 0 rgba(0,0,0,0.22)",
           background: "#fff",
         },
       }}
     >
       <DialogTitle
         sx={{
           textAlign: "center",
           fontWeight: "bold",
           fontSize: "1.3rem",
           color: "#222",
         }}
       >
         Incentive Structure
       </DialogTitle>
       <Box
         sx={{
           height: 3,
           borderRadius: "20px",
           backgroundColor: "#FFD700",
           ml: 2,
           mr: 2,
         }}
       />
       <DialogContent>
         <Table>
           <TableHead>
             <TableRow>
               <TableCell
                 sx={{
                   fontWeight: "bold",
                   fontSize: 15,
                   color: "#000",
                   textAlign: "center",
                 }}
               >
                 Slab (Monthly Sales)
               </TableCell>
               <TableCell
                 sx={{
                   fontWeight: "bold",
                   fontSize: 15,
                   color: "#000",
                   textAlign: "center",
                 }}
               >
                 Reward Rate
               </TableCell>
               <TableCell
                 sx={{
                   fontWeight: "bold",
                   fontSize: 15,
                   color: "#000",
                   textAlign: "center",
                 }}
               >
                 Monthly Incentive (₹)
               </TableCell>
               <TableCell
                 sx={{
                   fontWeight: "bold",
                   fontSize: 15,
                   color: "#000",
                   textAlign: "center",
                 }}
               >
                 Annual Incentive (₹)
               </TableCell>
             </TableRow>
           </TableHead>
           <TableBody>
             {[
               {
                 slab: "0 – 2L",
                 rate: "1%",
                 monthly: "0 – 2,000",
                 annual: "0 – 24,000",
               },
               {
                 slab: "2L – 3L",
                 rate: "2.50%",
                 monthly: "5,000 – 7,500",
                 annual: "60,000 – 90,000",
               },
               {
                 slab: "3L – 4L",
                 rate: "3.50%",
                 monthly: "10,500 – 14,000",
                 annual: "1,26,000 – 1,68,000",
               },
               {
                 slab: "4L – 5L",
                 rate: "5.00%",
                 monthly: "20,000 – 25,000",
                 annual: "2,40,000 – 3,00,000",
               },
               {
                 slab: "5L – 6L",
                 rate: "6.00%",
                 monthly: "30,000 – 36,000",
                 annual: "3,60,000 – 4,32,000",
               },
               {
                 slab: "6L – 8L",
                 rate: "7.00%",
                 monthly: "42,000 – 56,000",
                 annual: "5,04,000 – 6,72,000",
               },
             ].map((row) => (
               <TableRow key={row.slab}>
                 <TableCell align="center">{row.slab}</TableCell>
                 <TableCell align="center">{row.rate}</TableCell>
                 <TableCell align="center">{row.monthly}</TableCell>
                 <TableCell align="center">{row.annual}</TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </DialogContent>
       <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
         <Button
           onClick={() => setIncentiveOpen(false)}
           variant="contained"
           sx={{
             bgcolor: "#000",
             color: "#fff",
             borderRadius: 2,
             textTransform: "none",
             px: 4,
             "&:hover": { bgcolor: "#111" },
           }}
         >
           Close
         </Button>
       </DialogActions>
     </Dialog>


     {/* Sidebar Drawer */}
     <Drawer
       anchor="left"
       position="absolute"
       open={menuOpen}
       onClose={toggleMenu(false)}
       PaperProps={{
         sx: {
           mt: "64px",
         },
       }}
     >
       <MenuBar toggleDrawer={toggleMenu(false)} />
     </Drawer>


     {/* Cart Drawer */}
     <Drawer
       anchor="right"
       open={cartDrawerOpen}
       onClose={toggleCartDrawer(false)}
     >
       <CartDrawer closeDrawer={toggleCartDrawer(false)} />
     </Drawer>
   </>
 );
};


export default NavbarWithSearch;
