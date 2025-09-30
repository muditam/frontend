import React, { useEffect, useState, useMemo } from "react";
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

const currency = (n) => {
  const num = Number(n || 0);
  return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const OrderDetailsPopup = ({
  orderId,
  agentName,
  discount: propDiscount,
  discountType,
  paymentMethod: propPaymentMethod,
  upsellAmount: propUpsellAmount,
  transactionId: propTransactionId,
  onClose,
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

  // NEW fields
  const [dosageOrdered, setDosageOrdered] = useState("10-Days");
  const [selfRemark, setSelfRemark] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(propPaymentMethod || "");
  const [upsellChecked, setUpsellChecked] = useState(!!propUpsellAmount);
  const [upsellAmount, setUpsellAmount] = useState(propUpsellAmount || "");
  const [isAdding, setIsAdding] = useState(false);

  const [discount, setDiscount] = useState(propDiscount || "");

  // Fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await axios.get(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/order-details?orderId=${orderId}`
        );
        setOrderDetails(response.data);
      } catch (error) {
        console.error("Error fetching order details:", error);
      }
    };
    fetchOrderDetails();
  }, [orderId]);

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

  // Sync prop changes
  useEffect(() => {
    if (propPaymentMethod) setPaymentMethod(propPaymentMethod);
    if (propUpsellAmount) {
      setUpsellChecked(true);
      setUpsellAmount(propUpsellAmount);
    }
    if (propDiscount) setDiscount(propDiscount);
  }, [propPaymentMethod, propUpsellAmount, propDiscount]);

  // Employee search (client filter)
  const searchEmployees = async (query) => {
    try {
      const response = await axios.get(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees`
      );
      const filtered = response.data.filter((emp) =>
        emp.fullName.toLowerCase().includes(query.toLowerCase())
      );
      setEmployeeResults(filtered);
    } catch (error) {
      console.error("Error searching employees:", error);
    }
  };

  const handleAgentSearchChange = (e) => {
    const value = e.target.value;
    setEmployeeSearch(value);
    if (value.length >= 2) {
      searchEmployees(value);
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

  // Abbreviations
  const productAbbreviations = {
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

  const mappedProductOrdered = useMemo(() => {
    if (!orderDetails) return "N/A";
    return productAbbreviations[orderDetails.productOrdered] || orderDetails.productOrdered;
  }, [orderDetails]);

  // Totals helpers
  const computedTotal = useMemo(() => {
    if (!orderDetails) return 0;
    if (paymentMethod === "Partial Paid") {
      return Number(orderDetails.totalPrice) + Number(partialPayment || 0);
    }
    if (upsellChecked && upsellAmount) {
      return Number(upsellAmount);
    }
    return Number(orderDetails.totalPrice);
  }, [orderDetails, paymentMethod, partialPayment, upsellChecked, upsellAmount]);

  const amountPending = useMemo(() => {
    if (!orderDetails) return 0;
    if (paymentMethod === "Partial Paid") return Number(orderDetails.totalPrice);
    if (paymentMethod === "COD") return Number(orderDetails.totalPrice);
    return 0;
  }, [orderDetails, paymentMethod]);

  const paidChipColor = (orderDetails?.paymentStatus || "").toLowerCase() === "paid" ? "success" : "warning";

  // Copy & confirm
  const handleConfirmAndCopy = () => {
    if (!orderDetails) return;
    let detailsText = `Order Created
Order ID: ${orderDetails.orderId}
Customer Name: ${orderDetails.customerName}
Phone: ${orderDetails.phone}
Address: ${orderDetails.shippingAddress}
Payment Status: ${orderDetails.paymentStatus}
Product Ordered: ${orderDetails.productOrdered}
Order Date: ${orderDetails.orderDate}
Total Price: ${computedTotal}
Health Expert: ${selectedAgent?.trim() ? selectedAgent : "N/A"}
Discount: ${discountType === "percentage" ? `${discount}%` : `₹${discount}`}
Dosage Ordered: ${dosageOrdered}`;

    if (orderDetails.paymentStatus === "pending") {
      detailsText += `\nPartial Payment: ${partialPayment || 0}`;
    }
    if (paymentMethod === "Partial Paid") {
      detailsText += `\nAmount Pending: ${Number(orderDetails.totalPrice)}`;
    } else if (paymentMethod === "COD") {
      detailsText += `\nAmount Pending: ${orderDetails.totalPrice}`;
    }
    navigator.clipboard.writeText(detailsText);
    setMessage("Data copied to clipboard. Details confirmed.");
    setDetailsConfirmed(true);
  };

  // Add to my orders
  const handleAddToMyOrders = async () => {
    if (!orderDetails || orderAdded || isAdding) return;
    setIsAdding(true);
    try {
      const payload = {
        customerName: orderDetails.customerName,
        phone: orderDetails.phone,
        shippingAddress: orderDetails.shippingAddress,
        paymentStatus: orderDetails.paymentStatus,
        productOrdered: mappedProductOrdered,
        orderDate: orderDetails.orderDate,
        orderId: orderDetails.orderId,
        totalPrice: computedTotal,
        agentName: selectedAgent?.trim() ? selectedAgent : "N/A",
        partialPayment: partialPayment,
        dosageOrdered,
        selfRemark,
        paymentMethod,
        upsellAmount: upsellChecked ? Number(upsellAmount) : 0,
        transactionId: propTransactionId,
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

  // ————————————————— UI —————————————————

  return (
    <motion.div
      variants={flipVariants}
      initial="hidden"
      animate="visible"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 2100, // stays above other MUI dialogs
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Paper
        elevation={6}
        sx={{
          position: "relative",
          width: "min(520px, 96vw)",
          maxHeight: "92vh",
          borderRadius: 3,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: "background.paper",
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

            {/* Close only after added */}
            {orderAdded && (
              <Tooltip title="Close">
                <IconButton onClick={onClose}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            )}
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
              {/* Top summary: Order & Customer */}
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
                      <Typography variant="body2">{orderDetails.phone}</Typography>
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

              {/* Order configuration: discount, payment, upsell, dosage, remark, agent */}
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
                          container: document.body,
                          disablePortal: true,
                          PaperProps: { style: { zIndex: 2200 } },
                        }}
                      >
                        {["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer", "PayPal"].map(
                          (option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          )
                        )}
                      </Select>
                    </Stack>
                  </Grid>

                  {/* Partial payment only when pending */}
                  {orderDetails.paymentStatus === "pending" && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        type="number"
                        label="Partial Payment"
                        value={String(partialPayment)}
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
                          container: document.body,
                          disablePortal: true,
                          PaperProps: { style: { zIndex: 2200 } },
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
                    />
                  </Grid>

                  {/* Agent */}
                  <Grid item xs={12}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Agent
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedAgent}
                      </Typography>
                      <Tooltip title="Change agent">
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
                        />
                        {employeeResults.length > 0 && (
                          <Paper
                            variant="outlined"
                            sx={{
                              borderRadius: 1,
                              mt: 1,
                              maxHeight: 160,
                              overflowY: "auto",
                            }}
                          >
                            {employeeResults.map((emp) => (
                              <Box
                                key={emp._id}
                                sx={{
                                  p: 1,
                                  cursor: "pointer",
                                  "&:hover": { bgcolor: "action.hover" },
                                }}
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
              <Stack
                direction="row"
                gap={1}
                justifyContent="space-between"
                alignItems="center"
                sx={{ pt: 1 }}
              >
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
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textAlign: "center", display: "block" }}
                >
                  {message}
                </Typography>
              )}

              {/* Close button only after order added (kept from your logic) */}
              {orderAdded && (
                <Button
                  variant="text"
                  size="small"
                  fullWidth
                  onClick={onClose}
                  sx={{ mt: 0.5 }}
                  startIcon={<CloseIcon />}
                >
                  Close
                </Button> 
              )} 
            </Stack>   
          )}
        </Box>
      </Paper>
    </motion.div>
  );
};

export default OrderDetailsPopup;


