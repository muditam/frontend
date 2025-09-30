import React, { useState, useEffect } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Typography,
  Select,
  MenuItem,
  Checkbox,
  FormControl,
  ListItemText,
  Button,
  Drawer,
  Divider,
  TablePagination,
  CircularProgress,
  InputLabel,
} from "@mui/material";
import axios from "axios";

const ORDER_FIELDS = new Set([
  "orderDate",
  "productOrdered",
  "dosageOrdered",
  "totalPrice",
  "paymentMethod",
  "partialPayment",
  "selfRemark",
  "shipmentStatus",
  "orderId",
]);

const SalesMySales = () => {
  const [sales, setSales] = useState([]);
  const [agentAssignedName, setAgentAssignedName] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    name: "",
    contactNumber: "",
    productsOrdered: [],
    dosageOrdered: "",
    salesStatus: "",
    amountFrom: "",
    amountTo: "",
    modeOfPayment: "",
  });
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user && !agentAssignedName) {
      setAgentAssignedName(user.fullName);
    }
    if (agentAssignedName) {
      fetchSales(agentAssignedName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, rowsPerPage, agentAssignedName]);

  const fetchSales = async (agentAssignedName) => {
    setLoading(true);
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/merged-sales", {
        params: {
          agentAssignedName,
          page: currentPage + 1,
          limit: rowsPerPage,
        },
      });

      const { sales: updatedSales, totalSales = 0 } = response.data;
      setSales(updatedSales);
      setTotalSales(totalSales);
    } catch (error) {
      console.error("Failed to fetch merged sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const dropdownOptions = [
    {
      key: "salesStatus",
      label: "Sales Status",
      options: ["Sales Done", "On Follow Up", "Lost"],
    },
    {
      key: "modeOfPayment",
      label: "Mode of Payment",
      options: ["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"],
    },
    {
      key: "dosageOrdered",
      label: "Dosage Ordered",
      options: ["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"],
    },
    {
      key: "productsOrdered",
      label: "Products Ordered",
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
      multiple: true,
    },
  ];

  const calculateDosageExpiring = (days) => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + days);
    return currentDate.toISOString().split("T")[0];
  };

  // Decides whether a field edit belongs to Lead or to MyOrder
  const getTargetForField = (sale, field) => {
    // Order-backed fields -> use myOrderData._id if available
    if (ORDER_FIELDS.has(field) && sale.myOrderData?._id) {
      return { targetId: sale.myOrderData._id, source: "order" };
    }
    // Else edit lead row using sale._id
    return { targetId: sale._id, source: "lead" };
  };

  const handleInputChange = async (e, index, field) => {
    const value = e?.target?.value ?? e;

    const updatedSales = [...sales];
    const row = { ...updatedSales[index] };

    // Update local state carefully (for nested myOrderData vs lead fields)
    if (ORDER_FIELDS.has(field)) {
      // Update nested order data in-place if present; else fall back to lead-like copy
      if (!row.myOrderData) row.myOrderData = {};
      if (field === "orderDate") row.myOrderData.orderDate = value;
      else if (field === "productOrdered") row.myOrderData.productOrdered = value;
      else if (field === "dosageOrdered") row.myOrderData.dosageOrdered = value;
      else if (field === "totalPrice") row.myOrderData.totalPrice = value;
      else if (field === "paymentMethod") row.myOrderData.paymentMethod = value;
      else if (field === "partialPayment") row.myOrderData.partialPayment = value;
      else if (field === "selfRemark") row.myOrderData.selfRemark = value;
      else if (field === "shipmentStatus") row.myOrderData.shipmentStatus = value;
      else if (field === "orderId") row.myOrderData.orderId = value;
    } else {
      // Lead-side fields
      row[field] = value;

      if (field === "dosageOrdered" && !row.myOrderData) {
        const days = parseInt(String(value).split("-")[0], 10);
        row.dosageExpiring = calculateDosageExpiring(days);
      }
    }

    updatedSales[index] = row;
    setSales(updatedSales);

    // Decide target doc & issue PUT
    const { targetId, source } = getTargetForField(row, field);

    // For new temp rows, keep the POST flow (unchanged)
    const isNew = String(row._id || "").startsWith("temp-");
    const requiredFieldsFilled = row.name && row.contactNumber;

    if (isNew && requiredFieldsFilled && !row.posting) {
      updatedSales[index].posting = true;
      setSales([...updatedSales]);

      const user = JSON.parse(sessionStorage.getItem("user"));
      const payload = {
        name: row.name,
        contactNumber: row.contactNumber,
        productsOrdered: row.productsOrdered,
        dosageOrdered: row.dosageOrdered,
        dosageExpiring: row.dosageExpiring,
        amountPaid: parseFloat(row.amountPaid),
        partialPayment: row.partialPayment || 0,
        modeOfPayment: row.modeOfPayment,
        lastOrderDate: row.lastOrderDate,
        salesStatus: "Sales Done",
        agentAssigned: agentAssignedName || user?.fullName || "Unknown",
        agentsRemarks: row.agentsRemarks || "",
        date: new Date().toISOString().split("T")[0],
      };

      try {
        const res = await axios.post(
          "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads",
          payload
        );
        const savedLead = res.data.lead;
        updatedSales[index] = { ...savedLead, myOrderData: null };
        setSales(updatedSales);
      } catch (error) {
        console.error("Error saving new sale:", error);
        updatedSales[index].posting = false; // allow retry
        setSales(updatedSales);
      }
      return;
    }

    // Normal update: PUT to /merged-sales/:id (Lead or Order id)
    if (targetId) {
      // Map UI field names to backend doc fields
      let payload = {};
      if (source === "order") {
        // MyOrder fields
        if (field === "orderDate") payload.orderDate = value;
        else if (field === "productOrdered") payload.productOrdered = value;
        else if (field === "dosageOrdered") payload.dosageOrdered = value;
        else if (field === "totalPrice") payload.totalPrice = value;
        else if (field === "paymentMethod") payload.paymentMethod = value;
        else if (field === "partialPayment") payload.partialPayment = value;
        else if (field === "selfRemark") payload.selfRemark = value;
        else if (field === "shipmentStatus") payload.shipmentStatus = value;
        else if (field === "orderId") payload.orderId = value;
      } else { 
        payload[field] = value;
      }

      try {
        await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/merged-sales/${targetId}`, payload);
      } catch (error) {
        console.error("Error updating sale:", error);
      }
    }
  };

  const handleAddSale = () => {
    const newSale = {
      _id: `temp-${Date.now()}`, // temporary ID
      name: "",
      contactNumber: "",
      productsOrdered: [],
      dosageOrdered: "",
      amountPaid: "",
      modeOfPayment: "",
      lastOrderDate: new Date().toISOString().split("T")[0],
      agentsRemarks: "",
      salesStatus: "Sales Done",
      posting: false,
      myOrderData: null,
    };
    setSales((prevSales) => [newSale, ...prevSales]);
  };

  const applyFilters = () => {
    const filteredSales = sales.filter((sale) => {
      const firstDate =
        (sale.myOrderData && sale.myOrderData.orderDate) ||
        sale.lastOrderDate ||
        "";

      return (
        (!filters.dateFrom || new Date(firstDate) >= new Date(filters.dateFrom)) &&
        (!filters.dateTo || new Date(firstDate) <= new Date(filters.dateTo)) &&
        (!filters.name ||
          (sale.name || "")
            .toLowerCase()
            .includes(filters.name.toLowerCase())) &&
        (!filters.contactNumber ||
          (sale.contactNumber || "").includes(filters.contactNumber)) &&
        (!filters.productsOrdered.length ||
          filters.productsOrdered.every((item) =>
            (sale.productsOrdered || []).includes(item)
          )) &&
        (!filters.dosageOrdered ||
          sale.dosageOrdered === filters.dosageOrdered ||
          sale.myOrderData?.dosageOrdered === filters.dosageOrdered) &&
        (!filters.salesStatus || sale.salesStatus === filters.salesStatus) &&
        (!filters.amountFrom ||
          parseFloat(sale.amountPaid ?? sale.myOrderData?.totalPrice ?? 0) >=
            parseFloat(filters.amountFrom)) &&
        (!filters.amountTo ||
          parseFloat(sale.amountPaid ?? sale.myOrderData?.totalPrice ?? 0) <=
            parseFloat(filters.amountTo)) &&
        (!filters.modeOfPayment ||
          sale.modeOfPayment === filters.modeOfPayment ||
          sale.myOrderData?.paymentMethod === filters.modeOfPayment)
      );
    });
    setSales(filteredSales);
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      name: "",
      contactNumber: "",
      productsOrdered: [],
      dosageOrdered: "",
      salesStatus: "",
      amountFrom: "",
      amountTo: "",
      modeOfPayment: "",
    });
    fetchSales(agentAssignedName);
  };

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(0);
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Button variant="contained" onClick={handleAddSale}>
          Add Sale
        </Button>
        <Button variant="contained" onClick={() => setFilterOpen(true)}>
          Filter
        </Button>
      </Box>

      <Drawer anchor="right" open={filterOpen} onClose={() => setFilterOpen(false)}>
        <Box sx={{ width: 300, padding: 2 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <TextField
            label="First Order Date From"
            type="date"
            fullWidth
            value={filters.dateFrom}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="First Order Date To"
            type="date"
            fullWidth
            value={filters.dateTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Name"
            fullWidth
            value={filters.name}
            onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Contact No"
            fullWidth
            value={filters.contactNumber}
            onChange={(e) => setFilters((prev) => ({ ...prev, contactNumber: e.target.value }))}
            sx={{ mb: 2 }}
          />
          {dropdownOptions.map(({ key, label, options, multiple }) => (
            <FormControl fullWidth sx={{ mb: 2 }} key={key}>
              <InputLabel>{label}</InputLabel>
              <Select
                multiple={multiple}
                value={filters[key] || (multiple ? [] : "")}
                onChange={(e) => {
                  const value = multiple ? e.target.value : e.target.value;
                  setFilters((prev) => ({ ...prev, [key]: value }));
                }}
                renderValue={(selected) => (multiple ? selected.join(", ") : selected)}
              >
                {options.map((option) => (
                  <MenuItem key={option} value={option}>
                    {multiple && <Checkbox checked={(filters[key] || []).includes(option)} />}
                    <ListItemText primary={option} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
          <TextField
            label="Amount From"
            type="number"
            fullWidth
            value={filters.amountFrom}
            onChange={(e) => setFilters((prev) => ({ ...prev, amountFrom: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Amount To"
            type="number"
            fullWidth
            value={filters.amountTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, amountTo: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <Divider sx={{ mb: 2 }} />
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              applyFilters();
              setFilterOpen(false);
            }}
            sx={{ mb: 1 }}
          >
            Apply Filters
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => {
              resetFilters();
              setFilterOpen(false);
            }}
          >
            Reset Filters
          </Button>
        </Box>
      </Drawer>

      <TableContainer component={Paper} sx={{ maxHeight: 1000 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell>First Order Date *</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Contact No</TableCell>
              <TableCell>Products Ordered *</TableCell>
              <TableCell>Dosage Ordered *</TableCell>
              <TableCell>Amount Paid *</TableCell>
              <TableCell>Partial Payment</TableCell>
              <TableCell>Mode of Payment *</TableCell>
              <TableCell>Order Id</TableCell>
              <TableCell>Shipment Status</TableCell>
              <TableCell>Agents Remarks *</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={14} align="center">
                  <Box sx={{ py: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Please Wait...
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale, index) => {
                // unique key even when same lead has multiple orders
                const rowKey = `${sale._id || "noLead"}-${sale.myOrderData?._id || sale.myOrderData?.orderId || index}`;
                const firstDate =
                  (sale.myOrderData && sale.myOrderData.orderDate) || sale.lastOrderDate || "";

                return (
                  <TableRow key={rowKey}>
                    {/* First Order Date (editable for both lead/order) */}
                    <TableCell>
                      <TextField
                        type="date"
                        value={firstDate ? new Date(firstDate).toISOString().split("T")[0] : ""}
                        onChange={(e) =>
                          handleInputChange(
                            e,
                            index,
                            sale.myOrderData ? "orderDate" : "lastOrderDate"
                          )
                        }
                        fullWidth
                      />
                    </TableCell>

                    {/* Name (lead field) */}
                    <TableCell style={{ whiteSpace: "nowrap", minWidth: "250px" }}>
                      <TextField
                        value={sale.name || ""}
                        onChange={(e) => handleInputChange(e, index, "name")}
                        fullWidth
                      />
                    </TableCell>

                    {/* Contact No (lead field) */}
                    <TableCell style={{ whiteSpace: "nowrap", minWidth: "200px" }}>
                      <TextField
                        type="number"
                        value={sale.contactNumber || ""}
                        onChange={(e) => handleInputChange(e, index, "contactNumber")}
                        fullWidth
                      />
                    </TableCell>

                    {/* Products Ordered (editable for both) */}
                    <TableCell>
                      {sale.myOrderData ? (
                        <TextField
                          value={sale.myOrderData.productOrdered || ""}
                          onChange={(e) => handleInputChange(e, index, "productOrdered")}
                          fullWidth
                        />
                      ) : (
                        <FormControl fullWidth>
                          <Select
                            multiple
                            value={sale.productsOrdered || []}
                            onChange={(e) => handleInputChange(e, index, "productsOrdered")}
                            renderValue={(selected) => (selected || []).join(", ")}
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
                            ].map((product) => (
                              <MenuItem key={product} value={product}>
                                <Checkbox checked={(sale.productsOrdered || []).includes(product)} />
                                <ListItemText primary={product} />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </TableCell>

                    {/* Dosage Ordered */}
                    <TableCell>
                      {sale.myOrderData ? (
                        <TextField
                          value={sale.myOrderData.dosageOrdered || ""}
                          onChange={(e) => handleInputChange(e, index, "dosageOrdered")}
                          fullWidth
                        />
                      ) : (
                        <Select
                          value={sale.dosageOrdered || ""}
                          onChange={(e) => handleInputChange(e, index, "dosageOrdered")}
                          fullWidth
                        >
                          {["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"].map((dosage) => (
                            <MenuItem key={dosage} value={dosage}>
                              {dosage}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </TableCell>

                    {/* Amount Paid / totalPrice */}
                    <TableCell style={{ whiteSpace: "nowrap", minWidth: "150px" }}>
                      <TextField
                        type="number"
                        value={
                          sale.myOrderData ? sale.myOrderData.totalPrice || "" : sale.amountPaid || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            e,
                            index,
                            sale.myOrderData ? "totalPrice" : "amountPaid"
                          )
                        }
                        fullWidth
                      />
                    </TableCell>

                    {/* Partial Payment */}
                    <TableCell>
                      <TextField
                        type="number"
                        value={
                          sale.myOrderData
                            ? sale.myOrderData.partialPayment || 0
                            : sale.partialPayment || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            e,
                            index,
                            sale.myOrderData ? "partialPayment" : "partialPayment"
                          )
                        }
                        fullWidth
                      />
                    </TableCell>

                    {/* Mode of Payment / paymentMethod */}
                    <TableCell>
                      {sale.myOrderData ? (
                        <TextField
                          value={sale.myOrderData.paymentMethod || ""}
                          onChange={(e) => handleInputChange(e, index, "paymentMethod")}
                          fullWidth
                        />
                      ) : (
                        <Select
                          value={sale.modeOfPayment || ""}
                          onChange={(e) => handleInputChange(e, index, "modeOfPayment")}
                          fullWidth
                        >
                          {["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"].map(
                            (mode) => (
                              <MenuItem key={mode} value={mode}>
                                {mode}
                              </MenuItem>
                            )
                          )}
                        </Select>
                      )}
                    </TableCell>

                    {/* Order Id (editable if order row) */}
                    <TableCell style={{ whiteSpace: "nowrap", minWidth: "150px" }}>
                      {sale.myOrderData ? (
                        <TextField
                          value={sale.myOrderData.orderId || ""}
                          onChange={(e) => handleInputChange(e, index, "orderId")}
                          fullWidth
                        />
                      ) : (
                        <TextField value="-" disabled fullWidth />
                      )}
                    </TableCell>

                    {/* Shipment Status */}
                    <TableCell style={{ whiteSpace: "nowrap", minWidth: "200px" }}>
                      <TextField
                        value={
                          sale.myOrderData
                            ? sale.myOrderData.shipmentStatus || ""
                            : sale.shipmentStatus || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            e,
                            index,
                            sale.myOrderData ? "shipmentStatus" : "shipmentStatus"
                          )
                        }
                        fullWidth
                      />
                    </TableCell>

                    {/* Agents Remarks / selfRemark */}
                    <TableCell style={{ whiteSpace: "nowrap", minWidth: "250px" }}>
                      <TextField
                        value={
                          sale.myOrderData
                            ? sale.myOrderData.selfRemark || ""
                            : sale.agentsRemarks || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            e,
                            index,
                            sale.myOrderData ? "selfRemark" : "agentsRemarks"
                          )
                        }
                        fullWidth
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]} 
        component="div"
        count={totalSales}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default SalesMySales;
