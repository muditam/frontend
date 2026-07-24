import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
 Box,
 Button,
 TextField,
 Typography,
 Grid,
 IconButton,
 MenuItem,
 Select,
 Checkbox,
 FormControlLabel,
 CircularProgress,
 Paper,
 Divider,
 Chip,
 Skeleton,
 Stack,
 Tooltip,
} from "@mui/material";
import { motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PersonIcon from "@mui/icons-material/Person";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import PlaceIcon from "@mui/icons-material/Place";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentIcon from "@mui/icons-material/Payment";
import DiscountIcon from "@mui/icons-material/Percent";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import axios from "axios";


// Flip animation variants using Framer Motion
const flipVariants = {
 hidden: { rotateY: 90, opacity: 0 },
 visible: { rotateY: 0, opacity: 1, transition: { duration: 0.35, ease: "easeOut" } },
};


const PRODUCT_ABBREVIATIONS = {
 "Karela Jamun Fizz": "KJF",
 "Sugar Defend Pro": "SDP",
 "Vasant Kusmakar Ras": "VKR",
 "Liver Fix": "L-Fx",
 "Stress & Sleep": "S&S",
 "Chandraprabha Vati": "CPV",
 "Heart Defend Pro": "HDP",
 "Performance Forever": "PF",
 "Power Gut": "PGut",
 "Shilajit with Gold": "Shilajit",
 "Diabetes Management Kit": "Kit",
};


const currency = (n) => {
 const num = Number(n || 0);
 return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const API_ORIGIN =
 (process.env.REACT_APP_API_BASE_URL || "https://muditamleads-14f32a10d7f7.herokuapp.com").replace(/\/+$/, "");

const getSessionUserHeaders = () => {
 return {};
};

const formatAddress = (address = {}) =>
 [
  address.address1,
  address.address2,
  address.city,
  address.province,
  address.country,
  address.zip,
 ]
  .filter(Boolean)
  .join(", ") || "N/A";

const futureProductOrderedText = (items = []) =>
 items
  .map((item) => PRODUCT_ABBREVIATIONS[item.title] || item.title || item.sku)
  .filter(Boolean)
  .join(", ") || "N/A";

const buildFutureOrderDetails = (futureOrder = {}) => ({
 orderId: "",
 customerName: futureOrder.customerName || "N/A",
 phone: futureOrder.phoneNumber || futureOrder.shippingAddress?.phone || "N/A",
 shippingAddress: formatAddress(futureOrder.shippingAddress),
 paymentStatus: futureOrder.paymentStatus || "",
 paymentMode: futureOrder.paymentMode || "",
 productOrdered: futureProductOrderedText(futureOrder.cartItems || []),
 orderDate: futureOrder.createdAt || new Date().toISOString(),
 totalPrice: futureOrder.orderTotal || 0,
 partialPaidAmount: futureOrder.partialPaidAmount || 0,
 transactionId: futureOrder.transactionId || "",
});


const OrderDetailsPopup = ({
 orderId,
 futureOrderId,
 futureOrderData,
 agentName,
 customerPhone = "",
 discount: propDiscount,
 discountType,
 paymentMethod: propPaymentMethod,
 upsellAmount: propUpsellAmount,
 transactionId: propTransactionId,
 onClose,
 zIndex = 3000,
}) => {
 const [orderDetails, setOrderDetails] = useState(null);
 const [partialPayment, setPartialPayment] = useState("");
 const [detailsConfirmed, setDetailsConfirmed] = useState(false);
 const [orderAdded, setOrderAdded] = useState(false);
 const [message, setMessage] = useState("");


 // Agent editing
 const [selectedAgent, setSelectedAgent] = useState(agentName);
 const [editingAgent, setEditingAgent] = useState(false);
 const [employeeSearch, setEmployeeSearch] = useState("");
 const [employeeResults, setEmployeeResults] = useState([]);
 const [allEmployees, setAllEmployees] = useState([]);


 // NEW fields
 const [dosageOrdered, setDosageOrdered] = useState("10-Days");
 const [selfRemark, setSelfRemark] = useState("");
 const [paymentMethod, setPaymentMethod] = useState(propPaymentMethod || "");
 const [upsellChecked, setUpsellChecked] = useState(!!propUpsellAmount);
 const [upsellAmount, setUpsellAmount] = useState(propUpsellAmount || "");
 const [isAdding, setIsAdding] = useState(false);


 const [discount, setDiscount] = useState(propDiscount || "");
 const isFutureOrderDetails = Boolean(futureOrderId);


 const asIntString = (v) => {
 if (v == null) return "";
 const n = Math.round(Number(v));
 return Number.isFinite(n) ? String(n) : "";
};


 useEffect(() => {
   const handleEsc = (event) => {
     if (event.key === "Escape") onClose?.();
   };
   window.addEventListener("keydown", handleEsc);
   return () => window.removeEventListener("keydown", handleEsc);
 }, [onClose]);


 // Fetch order details
 useEffect(() => {
   if (isFutureOrderDetails) {
     const data = buildFutureOrderDetails(futureOrderData || {});
     const savedDetails = futureOrderData?.orderDetails || {};
     setOrderDetails(data);
     setDosageOrdered(savedDetails.dosageOrdered || "10-Days");
     setSelfRemark(savedDetails.selfRemark || "");
     setUpsellChecked(Number(savedDetails.upsellAmount || 0) > 0);
     setUpsellAmount(savedDetails.upsellAmount || "");
     if (data.partialPaidAmount) setPartialPayment(asIntString(data.partialPaidAmount));
     if (data.paymentMode) setPaymentMethod(data.paymentMode);
     return;
   }

   const fetchOrderDetails = async () => {
     try {
       const response = await axios.get(
         `https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/order-details?orderId=${orderId}`
       );


       const data = response.data;
       setOrderDetails(data);


       // ✅ Auto-fill partial payment from API note_attributes (if present)
       if (data?.partialPaidAmount != null && String(data.partialPaidAmount).trim() !== "") {
         setPartialPayment(asIntString(data.partialPaidAmount));
       }


       // ✅ If API tells paymentMode Partial Paid, set it automatically
       if (data?.paymentMode === "Partial Paid") {
         setPaymentMethod("Partial Paid");
       }
     } catch (error) {
       console.error("Error fetching order details:", error);
     }
   };
   fetchOrderDetails();
 }, [orderId, isFutureOrderDetails, futureOrderData]);


 // Agent init
 useEffect(() => {
   let fallbackAgent = "N/A";
   if (typeof window !== "undefined") {
     let user = null;
     try {
       user = JSON.parse(localStorage.getItem("user"));
     } catch {}
     if (user?.fullName) fallbackAgent = user.fullName;
   }
   setSelectedAgent(agentName || fallbackAgent);
 }, [agentName]);


 // Fetch employee list once and filter client-side for smooth search
 useEffect(() => {
   const fetchEmployees = async () => {
     try {
       const response = await axios.get(
         "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees"
       );
       setAllEmployees(Array.isArray(response.data) ? response.data : []);
     } catch (error) {
       console.error("Error fetching employees:", error);
     }
   };
   fetchEmployees();
 }, []);


 const searchEmployees = (query) => {
   try {
     const q = String(query || "").trim().toLowerCase();
     const filtered = allEmployees.filter((emp) =>
       String(emp?.fullName || "")
         .toLowerCase()
         .includes(q)
     );
     setEmployeeResults(filtered);
   } catch (error) {
     console.error("Error searching employees:", error);
   }
 };


 const handleAgentSearchChange = (e) => {
   const value = e.target.value;
   const next = String(value || "");
   setEmployeeSearch(next);
   if (next.length >= 2) {
     searchEmployees(next);
   } else {
     setEmployeeResults([]);
   }
 };


 const handleSelectEmployee = (employee) => {
   setSelectedAgent(employee.fullName);
   setEditingAgent(false);
   setEmployeeSearch("");
   setEmployeeResults([]);
 };


 const mappedProductOrdered = useMemo(() => {
   if (!orderDetails) return "N/A";
   return PRODUCT_ABBREVIATIONS[orderDetails.productOrdered] || orderDetails.productOrdered;
 }, [orderDetails]);


 // ✅ total should NOT increase by partial payment
 const computedTotal = useMemo(() => {
   if (!orderDetails) return 0;
   if (upsellChecked && upsellAmount) return Number(upsellAmount);
   return Number(orderDetails.totalPrice || 0);
 }, [orderDetails, upsellChecked, upsellAmount]);


 // ✅ pending = total - paid (for partial), total (for COD), else 0
 const amountPending = useMemo(() => {
   if (!orderDetails) return 0;
   const total = Number(orderDetails.totalPrice || 0);
   const paid = Number(partialPayment || 0);


   if (paymentMethod === "Partial Paid") return Math.max(0, total - paid);
   if (paymentMethod === "COD") return total;
   return 0;
 }, [orderDetails, paymentMethod, partialPayment]);


 const paidChipColor =
   (orderDetails?.paymentStatus || "").toLowerCase() === "paid" ? "success" : "warning";


 const effectivePhone = useMemo(() => {
   const apiPhone = String(orderDetails?.phone || "").trim();
   if (apiPhone && apiPhone.toUpperCase() !== "N/A") return apiPhone;
   const fallbackPhone = String(customerPhone || "").trim();
   return fallbackPhone || "N/A";
 }, [customerPhone, orderDetails?.phone]);


 // Copy & confirm
 const handleConfirmAndCopy = async () => {
   if (!orderDetails) return;


   let detailsText = `Order Created
Order ID: ${orderDetails.orderId}
Customer Name: ${orderDetails.customerName}
Phone: ${effectivePhone}
Address: ${orderDetails.shippingAddress}
Payment Status: ${orderDetails.paymentStatus}
Product Ordered: ${orderDetails.productOrdered}
Order Date: ${orderDetails.orderDate}
Total Price: ${computedTotal}
Health Expert: ${selectedAgent?.trim() ? selectedAgent : "N/A"}
Discount: ${discountType === "percentage" ? `${discount}%` : `₹${discount}`}
Dosage Ordered: ${dosageOrdered}`;


   if (paymentMethod === "Partial Paid") {
     detailsText += `\nPartial Payment (Paid): ${asIntString(partialPayment || 0)}`;
     detailsText += `\nAmount Pending: ${amountPending}`;
   } else if (paymentMethod === "COD") {
     detailsText += `\nAmount Pending: ${amountPending}`;
   }


   const copyToClipboardSafely = async (text) => {
     try {
       if (navigator?.clipboard?.writeText) {
         await navigator.clipboard.writeText(text);
         return true;
       }
     } catch (_err) {
       // fallback below
     }
     try {
       const textArea = document.createElement("textarea");
       textArea.value = text;
       textArea.style.position = "fixed";
       textArea.style.opacity = "0";
       document.body.appendChild(textArea);
       textArea.focus();
       textArea.select();
       const ok = document.execCommand("copy");
       document.body.removeChild(textArea);
       return ok;
     } catch (_err) {
       return false;
     }
   };


   const copied = await copyToClipboardSafely(detailsText);
   if (copied) {
     setMessage("Data copied to clipboard. Details confirmed.");
     setDetailsConfirmed(true);
   } else {
     setMessage("Copy blocked by browser permissions. Please copy manually from details.");
     setDetailsConfirmed(false);
   }
 };


 // Add to my orders
 const handleAddToMyOrders = async () => {
   if (!orderDetails || orderAdded || isAdding) return;
   setIsAdding(true);
   try {
     if (isFutureOrderDetails) {
       await axios.patch(
         `${API_ORIGIN}/api/future-orders/${futureOrderId}/details`,
         {
           agentName: selectedAgent?.trim() ? selectedAgent : "N/A",
           dosageOrdered,
           selfRemark,
           paymentMethod,
           partialPayment: Number(partialPayment || 0),
           upsellAmount: upsellChecked ? Number(upsellAmount) : 0,
           discount: Number(discount || 0),
           discountType,
           transactionId: propTransactionId || orderDetails?.transactionId || "",
         },
         { headers: getSessionUserHeaders(), withCredentials: true }
       );
       setOrderAdded(true);
       setMessage("Order added successfully to My Sales.");
       return;
     }

     const payload = {
       customerName: orderDetails.customerName,
       phone: effectivePhone,
       shippingAddress: orderDetails.shippingAddress,
       paymentStatus: orderDetails.paymentStatus,
       productOrdered: mappedProductOrdered,
       orderDate: orderDetails.orderDate,
       orderId: orderDetails.orderId,
       totalPrice: computedTotal,
       agentName: selectedAgent?.trim() ? selectedAgent : "N/A",


       // ✅ for prepaid/cod it will become 0
       partialPayment: Number(partialPayment || 0),


       dosageOrdered,
       selfRemark,
       paymentMethod,
       upsellAmount: upsellChecked ? Number(upsellAmount) : 0,
       transactionId: propTransactionId || orderDetails?.transactionId || "",
     };


     await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/my-orders", payload);
     setOrderAdded(true);
     setMessage("Order added successfully to My Sales.");
   } catch (error) {
     console.error("Error adding order:", error);
     setMessage("Error adding order.");
   } finally {
     setIsAdding(false);
   }
 };


 const modalContent = (
   <motion.div
     variants={flipVariants}
     initial="hidden"
     animate="visible"
     style={{
       position: "fixed",
       inset: 0,
       background: "rgba(9, 18, 34, 0.62)",
       backdropFilter: "blur(2px)",
       zIndex,
       display: "flex",
       alignItems: "center",
       justifyContent: "center",
       padding: 16,
     }}
     onClick={() => onClose?.()}
   >
     <Paper
       elevation={6}
       sx={{
         position: "relative",
         width: "min(560px, 96vw)",
         maxHeight: "92vh",
         borderRadius: 3.5,
         overflow: "hidden",
         display: "flex",
         flexDirection: "column",
         border: "1px solid",
         borderColor: "rgba(43, 57, 88, 0.15)",
         boxShadow: "0 18px 48px rgba(9, 18, 34, 0.35)",
       }}
       onClick={(e) => e.stopPropagation()}
       onMouseDown={(e) => e.stopPropagation()}
     >
       {/* Header */}
       <Box
         sx={{
           px: 2.25,
           py: 1.6,
           bgcolor: "#f9fafc",
           borderBottom: "1px solid",
           borderColor: "divider",
           position: "sticky",
           top: 0,
           zIndex: 1,
         }}
       >
         <Stack direction="row" alignItems="center" justifyContent="space-between">
           <Stack direction="row" alignItems="center" spacing={1}>
             <ReceiptLongIcon fontSize="small" />
             <Typography variant="subtitle1" fontWeight={700}>
               Order Details
             </Typography>
             {orderDetails ? (
               <Chip
                 size="small"
                 color={paidChipColor}
                 label={(orderDetails.paymentStatus || "").toUpperCase()}
                 sx={{ ml: 1 }}
               />
             ) : (
               <Skeleton variant="rounded" width={70} height={22} sx={{ ml: 1 }} />
             )}
           </Stack>


           <Tooltip title="Close">
             <IconButton
               onClick={onClose}
               size="small"
               sx={{
                 border: "1px solid",
                 borderColor: "rgba(43, 57, 88, 0.2)",
                 bgcolor: "#fff",
                 "&:hover": { bgcolor: "#f5f7fb" },
               }}
             >
               <CloseIcon fontSize="small" />
             </IconButton>
           </Tooltip>
         </Stack>
       </Box>


       {/* Content */}
       <Box sx={{ p: 2, overflowY: "auto" }}>
         {!orderDetails ? (
           <Box>
             <Skeleton variant="rounded" height={80} sx={{ mb: 2 }} />
             <Skeleton variant="rounded" height={140} sx={{ mb: 2 }} />
             <Skeleton variant="rounded" height={160} sx={{ mb: 2 }} />
           </Box>
         ) : (
           <Stack spacing={2}>
             {/* Top summary */}
             <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
               <Grid container spacing={1.5}>
                 <Grid item xs={12}>
                   <Stack direction="row" alignItems="center" spacing={1}>
                     <Inventory2Icon fontSize="small" />
                     <Typography variant="subtitle2" color="text.secondary">
                       Order ID
                     </Typography>
                     <Typography variant="body2" fontWeight={700}>
                       {orderDetails.orderId}
                     </Typography>
                   </Stack>
                 </Grid>


                 <Grid item xs={12} sm={6}>
                   <Stack spacing={0.25}>
                     <Stack direction="row" spacing={1} alignItems="center">
                       <PersonIcon fontSize="small" />
                       <Typography variant="caption" color="text.secondary">
                         Customer
                       </Typography>
                     </Stack>
                     <Typography variant="body2" fontWeight={600}>
                       {orderDetails.customerName}
                     </Typography>
                   </Stack>
                 </Grid>


                 <Grid item xs={12} sm={6}>
                   <Stack spacing={0.25}>
                     <Stack direction="row" spacing={1} alignItems="center">
                       <LocalPhoneIcon fontSize="small" />
                       <Typography variant="caption" color="text.secondary">
                         Phone
                       </Typography>
                     </Stack>
                     <Typography variant="body2">{effectivePhone}</Typography>
                   </Stack>
                 </Grid>


                 <Grid item xs={12}>
                   <Stack spacing={0.25}>
                     <Stack direction="row" spacing={1} alignItems="center">
                       <PlaceIcon fontSize="small" />
                       <Typography variant="caption" color="text.secondary">
                         Shipping Address
                       </Typography>
                     </Stack>
                     <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                       {orderDetails.shippingAddress}
                     </Typography>
                   </Stack>
                 </Grid>
               </Grid>
             </Paper>


             {/* Configuration */}
             <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
               <Grid container spacing={1.5}>
                 {/* Discount */}
                 <Grid item xs={12} sm={6}>
                   <Stack spacing={0.5}>
                     <Stack direction="row" spacing={1} alignItems="center">
                       <DiscountIcon fontSize="small" />
                       <Typography variant="caption" color="text.secondary">
                         Discount ({discountType === "percentage" ? "%" : "₹"})
                       </Typography>
                     </Stack>
                     <TextField
                       variant="outlined"
                       size="small"
                       type="number"
                       value={String(discount ?? "")}
                       onChange={(e) => setDiscount(e.target.value)}
                       placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 200"}
                     />
                   </Stack>
                 </Grid>


                 {/* Payment method */}
                 <Grid item xs={12} sm={6}>
                   <Stack spacing={0.5}>
                     <Stack direction="row" spacing={1} alignItems="center">
                       <PaymentIcon fontSize="small" />
                       <Typography variant="caption" color="text.secondary">
                         Payment Method
                       </Typography>
                     </Stack>
                     <Select
                       fullWidth
                       size="small"
                       value={paymentMethod || ""}
                       onChange={(e) => setPaymentMethod(e.target.value)}
                       MenuProps={{
                         disablePortal: true,
                         PaperProps: { sx: { zIndex: zIndex + 2 } },
                       }}
                     >
                       {["Prepaid", "Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer", "PayPal"].map(
                         (option) => (
                           <MenuItem key={option} value={option}>
                             {option}
                           </MenuItem>
                         )
                       )}
                     </Select>
                   </Stack>
                 </Grid>


                 {/* ✅ show partial input whenever method is Partial Paid */}
                 {paymentMethod === "Partial Paid" && (
                   <Grid item xs={12} sm={6}>
                     <TextField
                       fullWidth
                       variant="outlined"
                       size="small"
                       type="number"
                       label="Partial Payment (Paid Amount)"
                       value={asIntString(partialPayment)}
                       onChange={(e) => setPartialPayment(e.target.value)}
                     />
                   </Grid>
                 )}


                 {/* Upsell */}
                 <Grid item xs={12} sm={6} display="flex" alignItems="center">
                   <FormControlLabel
                     control={
                       <Checkbox
                         checked={upsellChecked}
                         onChange={(e) => setUpsellChecked(e.target.checked)}
                       />
                     }
                     label="Upsell Order"
                   />
                 </Grid>


                 {upsellChecked && (
                   <Grid item xs={12} sm={6}>
                     <TextField
                       fullWidth
                       size="small"
                       label="Upsell Amount (₹)"
                       type="number"
                       value={upsellAmount || ""}
                       onChange={(e) => setUpsellAmount(e.target.value)}
                     />
                   </Grid>
                 )}


                 {/* Dosage */}
                 <Grid item xs={12} sm={6}>
                   <TextField
                     select
                     fullWidth
                     size="small"
                     label="Dosage Ordered"
                     value={dosageOrdered || ""}
                     onChange={(e) => setDosageOrdered(e.target.value)}
                     SelectProps={{
                       MenuProps: {
                         disablePortal: true,
                         PaperProps: { sx: { zIndex: zIndex + 2 } },
                       },
                     }}
                   >
                     {["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"].map((option) => (
                       <MenuItem key={option} value={option}>
                         {option}
                       </MenuItem>
                     ))}
                   </TextField>
                 </Grid>


                 {/* Remark */}
                 <Grid item xs={12} sm={6}>
                     <TextField
                       fullWidth
                       size="small"
                       label="Self Remark"
                       value={selfRemark || ""}
                       onChange={(e) => setSelfRemark(e.target.value)}
                       onClick={(e) => e.stopPropagation()}
                       onMouseDown={(e) => e.stopPropagation()}
                     />
                   </Grid>


                 {/* Agent */}
                 <Grid item xs={12}>
                   <Stack direction="row" alignItems="center" spacing={1}>
                     <Typography variant="caption" color="text.secondary">
                       Expert
                     </Typography>
                     <Typography variant="body2" fontWeight={600}>
                       {selectedAgent}
                     </Typography>
                     <Tooltip title="Change expert">
                       <IconButton size="small" onClick={() => setEditingAgent(true)}>
                         <EditIcon fontSize="small" />
                       </IconButton>
                     </Tooltip>
                   </Stack>


                   {editingAgent && (
                     <Box sx={{ mt: 1 }}>
                       <TextField
                         fullWidth
                         size="small"
                         value={employeeSearch}
                         onChange={handleAgentSearchChange}
                         placeholder="Search employee..."
                         onClick={(e) => e.stopPropagation()}
                         onMouseDown={(e) => e.stopPropagation()}
                       />
                       {employeeResults.length > 0 && (
                         <Paper
                           variant="outlined"
                           sx={{ borderRadius: 1, mt: 1, maxHeight: 160, overflowY: "auto" }}
                         >
                           {employeeResults.map((emp) => (
                             <Box
                               key={emp._id}
                               sx={{ p: 1, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                               onClick={() => handleSelectEmployee(emp)}
                             >
                               {emp.fullName}
                             </Box>
                           ))}
                         </Paper>
                       )}
                     </Box>
                   )}
                 </Grid>
               </Grid>
             </Paper>


             {/* Financial Summary */}
             <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
               <Grid container spacing={1}>
                 <Grid item xs={6}>
                   <Typography variant="body2" color="text.secondary">
                     Product
                   </Typography>
                 </Grid>
                 <Grid item xs={6}>
                   <Typography variant="body2" textAlign="right" fontWeight={600}>
                     {mappedProductOrdered}
                   </Typography>
                 </Grid>


                 <Grid item xs={6}>
                   <Typography variant="body2" color="text.secondary">
                     Total Price
                   </Typography>
                 </Grid>
                 <Grid item xs={6}>
                   <Typography variant="body2" textAlign="right" fontWeight={700}>
                     ₹{currency(computedTotal)}
                   </Typography>
                 </Grid>


                 {(paymentMethod === "Partial Paid" || paymentMethod === "COD") && (
                   <>
                     <Grid item xs={12}>
                       <Divider sx={{ my: 0.5 }} />
                     </Grid>
                     <Grid item xs={6}>
                       <Typography variant="body2" color="text.secondary">
                         Amount Pending
                       </Typography>
                     </Grid>
                     <Grid item xs={6}>
                       <Typography variant="body2" textAlign="right" fontWeight={700}>
                         ₹{currency(amountPending)}
                       </Typography>
                     </Grid>
                   </>
                 )}
               </Grid>
             </Paper>


             {/* Actions */}
             <Stack direction="row" gap={1} justifyContent="space-between" alignItems="center" sx={{ pt: 1 }}>
               <Button
                 variant="contained"
                 size="small"
                 disabled={detailsConfirmed}
                 onClick={handleConfirmAndCopy}
                 startIcon={<ContentCopyIcon />}
               >
                 {detailsConfirmed ? "Details Confirmed" : "Confirm & Copy"}
               </Button>


               {detailsConfirmed && (
                 <Button
                   variant="contained"
                   size="small"
                   onClick={handleAddToMyOrders}
                   color="secondary"
                   startIcon={orderAdded ? <DoneAllIcon /> : <AddShoppingCartIcon />}
                   disabled={orderAdded || isAdding}
                 >
                   {isAdding ? (
                     <CircularProgress size={18} sx={{ color: "#fff" }} />
                   ) : orderAdded ? (
                     "Added"
                   ) : (
                     "Add to My Orders"
                   )}
                 </Button>
               )}
             </Stack>


             {message && (
               <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", display: "block" }}>
                 {message}
               </Typography>
             )}


             {orderAdded && (
               <Button variant="text" size="small" fullWidth onClick={onClose} sx={{ mt: 0.5 }} startIcon={<CloseIcon />}>
                 Close
               </Button>
             )}
           </Stack>
         )}
       </Box>
     </Paper>
   </motion.div>
 );


 if (typeof document === "undefined") return null;
 return createPortal(modalContent, document.body);
};


export default OrderDetailsPopup;
