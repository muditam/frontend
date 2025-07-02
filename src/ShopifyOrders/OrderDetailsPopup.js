import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import { motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import axios from "axios";

// Flip animation variants using Framer Motion
const flipVariants = {
  hidden: { rotateY: 90, opacity: 0 },
  visible: { rotateY: 0, opacity: 1, transition: { duration: 0.4 } },
};

const OrderDetailsPopup = ({ orderId,
  agentName,
  discount: propDiscount,
  discountType,
  paymentMethod: propPaymentMethod,
  upsellAmount: propUpsellAmount,
  onClose,
 }) => { 
  const [orderDetails, setOrderDetails] = useState(null);
  const [partialPayment, setPartialPayment] = useState("");
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [orderAdded, setOrderAdded] = useState(false);
  const [message, setMessage] = useState("");
  // For agent editing
  const [selectedAgent, setSelectedAgent] = useState(agentName);
  const [editingAgent, setEditingAgent] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeResults, setEmployeeResults] = useState([]);
  // NEW fields: Dosage Ordered, Self Remark, and Payment Method
  const [dosageOrdered, setDosageOrdered] = useState("10-Days");
  const [selfRemark, setSelfRemark] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(propPaymentMethod || "");
  const [upsellChecked, setUpsellChecked] = useState(!!propUpsellAmount);
  const [upsellAmount, setUpsellAmount] = useState(propUpsellAmount || "");
  const [isAdding, setIsAdding] = useState(false);

  const [discount, setDiscount] = useState(propDiscount || "");

  const agent = selectedAgent || agentName || "N/A";

  useEffect(() => {
    // Fetch order details from Shopify when component mounts.
    const fetchOrderDetails = async () => {
      try {
        const response = await axios.get(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/order-details?orderId=${orderId}`
        );
        // Expected response structure:
        // { customerName, phone, shippingAddress, paymentStatus, productOrdered, orderDate, orderId, totalPrice }
        setOrderDetails(response.data);
      } catch (error) {
        console.error("Error fetching order details:", error);
      }
    };
    fetchOrderDetails();
  }, [orderId]);

  useEffect(() => {
  if (!agentName && typeof window !== "undefined") {
    const user = JSON.parse(localStorage.getItem("user"));
    setSelectedAgent(user?.fullName || "N/A");
  } else {
    setSelectedAgent(agentName);
  }
}, [agentName]);

useEffect(() => {
  if (propPaymentMethod) setPaymentMethod(propPaymentMethod);
  if (propUpsellAmount) {
    setUpsellChecked(true);
    setUpsellAmount(propUpsellAmount);
  }
  if (propDiscount) setDiscount(propDiscount);
}, [propPaymentMethod, propUpsellAmount, propDiscount]);



  // Employee search: fetch all employees and filter client-side
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
    Total Price: ${upsellChecked
        ? upsellAmount
        : orderDetails.totalPrice}
    Health Expert: ${agent}
    Discount: ${discountType === "percentage" ? `${discount}%` : `₹${discount}`}
    Dosage Ordered: ${dosageOrdered}`;

    if (orderDetails.paymentStatus === "pending") { 
      detailsText += `\nPartial Payment: ${partialPayment}`;
    }
    if (paymentMethod === "Partial Paid") {
      detailsText += `\nAmount Pending: ${Number(orderDetails.totalPrice)}`;
    } else if (paymentMethod === "COD") {
      detailsText += `\nAmount Pending: ${orderDetails.totalPrice}`;
    }
    // Do not include upsell amount in the copied text
    navigator.clipboard.writeText(detailsText);
    setMessage("Data copied to clipboard. Details confirmed.");
    setDetailsConfirmed(true);
  };

  // Define mapping object for product abbreviations
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

  const mappedProductOrdered = orderDetails
    ? (productAbbreviations[orderDetails.productOrdered] || orderDetails.productOrdered)
    : "N/A";


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
      totalPrice: upsellChecked ? Number(upsellAmount) : Number(orderDetails.totalPrice),
      agentName: agent, 
      partialPayment: partialPayment,
      dosageOrdered,
      selfRemark,
      paymentMethod,
      upsellAmount: upsellChecked ? Number(upsellAmount) : 0,
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



  return (
    <motion.div
      variants={flipVariants}
      initial="hidden"
      animate="visible"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 1500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Box
        sx={{
          position: "relative",
          backgroundColor: "#fff",
          padding: "16px",
          borderRadius: "8px",
          boxShadow: "0px 4px 20px rgba(0,0,0,0.3)",
          maxWidth: 380,
          width: "90%",
        }}
        onClick={(e) => e.stopPropagation()} // Prevent inner box click propagation.
      >
        {/* Render the Close IconButton only if the order has been added */}
        {orderAdded && (
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              color: "#000",
            }}
          >
            <CloseIcon />
          </IconButton>
        )}

        <Box sx={{ pt: 2 }}>
          {orderDetails ? (
            <Grid container spacing={1}>
              <Grid item xs={12} sx={{ textAlign: "center", mb: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: "bold", color: "#000" }}
                >
                  Order Created - ID: {orderDetails.orderId}
                </Typography>
              </Grid>
              <Grid item xs={5}>
                <Typography variant="caption" color="textSecondary">
                  Customer:
                </Typography>
              </Grid>
              <Grid item xs={7}>
                <Typography variant="body2">
                  {orderDetails.customerName}
                </Typography>
              </Grid>
              <Grid item xs={5}>
                <Typography variant="caption" color="textSecondary">
                  Phone:
                </Typography>
              </Grid>
              <Grid item xs={7}>
                <Typography variant="body2">{orderDetails.phone}</Typography>
              </Grid>
              <Grid item xs={5}>
                <Typography variant="caption" color="textSecondary">
                  Address:
                </Typography>
              </Grid>
              <Grid item xs={7}>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {orderDetails.shippingAddress}
                </Typography>
              </Grid>
              {/* New: Total Price row */}
              <Grid item xs={5}>
                <Typography variant="caption" color="textSecondary">
                  Total Price:
                </Typography>
              </Grid>
              <Grid item xs={7}>
                <Typography variant="body2">
                  {paymentMethod === "Partial Paid"
                    ? (Number(orderDetails.totalPrice) + Number(partialPayment || 0)).toLocaleString()
                    : upsellChecked
                    ? Number(upsellAmount).toLocaleString()
                    : Number(orderDetails.totalPrice).toLocaleString()}
                </Typography>
              </Grid>
              {/* New: Amount Pending row */}
              {(paymentMethod === "Partial Paid" || paymentMethod === "COD") && (
                <>
                  <Grid item xs={5}>
                    <Typography variant="caption" color="textSecondary">
                      Amount Pending:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">
                      {paymentMethod === "Partial Paid"
                        ? Number(orderDetails.totalPrice)
                        : orderDetails.totalPrice}
                    </Typography>
                  </Grid>
                </>
              )}
              <Grid item xs={5}>
                <Typography variant="caption" color="textSecondary">
                  Discount:
                </Typography>
              </Grid>
              <Grid item xs={7}>
                <TextField
                  variant="outlined"
                  size="small"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  sx={{ p: 0 }}
                />
              </Grid>
              <Grid item xs={5}>
                <Typography variant="caption" color="textSecondary">
                  Payment:
                </Typography>
              </Grid>
              <Grid item xs={7}>
                <Select
                  fullWidth
                  size="small"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  MenuProps={{
                    container: document.body, 
                    disablePortal: true,       
                    PaperProps: {
                      style: {
                        zIndex: 2000,          
                      },
                    },
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
              </Grid>
              {orderDetails.paymentStatus === "pending" && (
                <>
                  <Grid item xs={5}>
                    <Typography variant="caption" color="textSecondary">
                      Partial:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <TextField
                      variant="outlined"
                      size="small"
                      type="number"
                      value={partialPayment}
                      onChange={(e) => setPartialPayment(e.target.value)}
                      sx={{ p: 0 }}
                    />
                  </Grid>
                </>
              )}
              {/* NEW: Upsell Checkbox */}
              <Grid item xs={12}>
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
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Upsell Amount"
                    type="number"
                    value={upsellAmount}
                    onChange={(e) => setUpsellAmount(e.target.value)}
                  />
                </Grid>
              )}
              {/* NEW: Dosage Ordered Dropdown */}
              <Grid item xs={5}>
                <Typography variant="caption" color="textSecondary">
                  Dosage Ordered:
                </Typography>
              </Grid>
              <Grid item xs={7}>
                <Select
                  fullWidth
                  size="small"
                  value={dosageOrdered}
                  onChange={(e) => setDosageOrdered(e.target.value)}
                  MenuProps={{
                    container: document.body, 
                    disablePortal: true,     
                    PaperProps: {
                      style: {
                        zIndex: 2000,          
                      },
                    },
                  }}
                >
                  {["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"].map(
                    (option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    )
                  )}
                </Select>
              </Grid>
              {/* NEW: Self Remark Input */}
              <Grid item xs={5}>
                <Typography variant="caption" color="textSecondary">
                  Self Remark:
                </Typography>
              </Grid>
              <Grid item xs={7}>
                <TextField
                  fullWidth
                  size="small"
                  value={selfRemark}
                  onChange={(e) => setSelfRemark(e.target.value)}
                />
              </Grid>
              <Grid item xs={5}>
                <Typography variant="caption" color="textSecondary">
                  Agent:
                </Typography>
              </Grid>
              <Grid item xs={7} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="body2">{selectedAgent}</Typography>
                <IconButton size="small" onClick={() => setEditingAgent(true)}>
                  <EditIcon fontSize="small" sx={{ color: "#000" }} />
                </IconButton>
              </Grid>
              {editingAgent && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    value={employeeSearch}
                    onChange={handleAgentSearchChange}
                    placeholder="Search employee..."
                  />
                  {employeeResults.length > 0 && (
                    <Box
                      sx={{
                        border: "1px solid #ccc",
                        borderRadius: 1,
                        mt: 1,
                        maxHeight: 100,
                        overflowY: "auto",
                      }}
                    >
                      {employeeResults.map((emp) => (
                        <Box
                          key={emp._id}
                          sx={{ p: 1, cursor: "pointer" }}
                          onClick={() => handleSelectEmployee(emp)}
                        >
                          {emp.fullName}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Grid>
              )}
            </Grid>
          ) : (
            <Typography variant="body2" align="center">
              Loading...
            </Typography>
          )}

          <Box sx={{ mt: 2, display: "flex", gap: 1, justifyContent: "space-between" }}>
            <Button
              variant="contained"
              size="small"
              disabled={detailsConfirmed}
              onClick={handleConfirmAndCopy}
              sx={{ backgroundColor: "#000", color: "#fff" }}
              startIcon={<ContentCopyIcon />}
            >
              {detailsConfirmed ? "Details Confirmed" : "Confirm & Copy"}
            </Button>

            {detailsConfirmed && (
              <Button
                variant="contained"
                size="small"
                onClick={handleAddToMyOrders}
                sx={{ backgroundColor: "#000", color: "#fff", minWidth: 120 }}
                disabled={orderAdded || isAdding}
              >
                {isAdding ? (
                  <CircularProgress size={18} sx={{ color: "#fff" }} />
                ) : orderAdded ? (
                  "Added"
                ) : (
                  "+ My Orders"
                )}
              </Button>
            )}
          </Box>

          {message && (
            <Typography variant="caption" sx={{ mt: 1, textAlign: "center", display: "block" }}>
              {message}
            </Typography>
          )}

          {/* Render the Close Button only if the order has been added */}
          {orderAdded && (
            <Button variant="text" size="small" fullWidth onClick={onClose} sx={{ mt: 1, color: "#000" }}>
              Close
            </Button>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

export default OrderDetailsPopup;
