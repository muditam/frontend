import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Divider,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  Checkbox,
  ListItemText,
  Drawer,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  InputLabel,
  IconButton,
} from "@mui/material";
import { Delete, AddCircle } from "@mui/icons-material";
import axios from "axios";
import TuneIcon from "@mui/icons-material/Tune";


const productOptions = [
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
];


const dosageOptions = ["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"];
const paymentModes = [
  "Partial Paid",
  "Razorpay",
  "COD",
  "UPI",
  "Bank Transfer",
];
const shipmentStatusOptions = [
  "Delivered",
  "In Transit",
  "Out for delivery",
  "RTO",
  "RTO Delivered",
  "Shipment Booked",
  "OFP",
  "Undelivered",
  "Others",
];


const RetentionSales = () => {
  // full list from API
  const [allSales, setAllSales] = useState([]);
  // list to be displayed (may be filtered)
  const [displayedSales, setDisplayedSales] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [editedSales, setEditedSales] = useState({});
  const [savingStatus, setSavingStatus] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    name: "",
    contactNumber: "",
    productsOrdered: [],
    dosageOrdered: "",
    modeOfPayment: "",
    shipmentStatus: [],
  });


  const loggedInUser = JSON.parse(sessionStorage.getItem("user"));


  // Fetch sales and update both states
  const fetchSales = async () => {
    try {
      let params = {};
      if (loggedInUser.role === "Retention Agent") {
        params.orderCreatedBy = loggedInUser.fullName;
      }
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/all",
        { params }
      );
      setAllSales(response.data);
      setDisplayedSales(response.data);
    } catch (error) {
      console.error("Error fetching retention sales:", error.response || error);
      alert("Failed to load sales data. Please try again.");
    }
  };

  

  useEffect(() => {
    if (loggedInUser) {
      fetchSales();
    }
  }, []);
 
  const handleInputChange = (e, id, field) => {
    setEditedSales((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: e.target.value,
      },
    }));
  };


  const handleSave = async (id) => {
    if (editedSales[id]) {
      setSavingStatus((prev) => ({ ...prev, [id]: "Saving..." }));
     
      // Find the sale in the current state to check which collection it comes from.
      const sale = allSales.find((s) => s._id === id);
      // Create the update payload from edited data.
      const updatePayload = { ...editedSales[id] };
     
      // If this is a MyOrder record, ensure you include the source.
      if (sale && sale.source === "MyOrder") {
        updatePayload.source = "MyOrder";
      }
     
      try {
        const response = await axios.put(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/all/${id}`,
          updatePayload
        );
       
        const updatedSales = allSales.map((s) =>
          s._id === id ? { ...s, ...response.data } : s
        );
        setAllSales(updatedSales);
        setDisplayedSales(updatedSales);
        setSavingStatus((prev) => ({ ...prev, [id]: "Saved" }));
        setEditedSales((prev) => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        setTimeout(() => {
          setSavingStatus((prev) => ({ ...prev, [id]: undefined }));
        }, 3000);
      } catch (error) {
        console.error("Error saving sale:", error);
        setSavingStatus((prev) => ({ ...prev, [id]: "Error" }));
      }
    }
  };  


  const handleAddSale = async () => {
    const newSale = {
      date: new Date().toISOString().split("T")[0],
      name: "",
      contactNumber: "",
      productsOrdered: [],
      dosageOrdered: "",
      amountPaid: 0,
      modeOfPayment: "",
      orderCreatedBy: loggedInUser.fullName,
      upsellAmount: 0, // new field
      partialPayment: 0, // new field
    };


    try {
      const response = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales",
        newSale
      );
      const newAllSales = [response.data, ...allSales];
      setAllSales(newAllSales);
      // Reapply filters if any; if filters are blank, display all
      if (
        Object.values(filters).some(
          (value) => value !== "" && (!Array.isArray(value) || value.length > 0)
        )
      ) {
        applyFilters(newAllSales);
      } else {
        setDisplayedSales(newAllSales);
      }
    } catch (error) {
      console.error("Error adding new sale:", error);
    }
  };


  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/${id}`);
      const updatedAllSales = allSales.filter((sale) => sale._id !== id);
      setAllSales(updatedAllSales);
      setDisplayedSales(updatedAllSales);
    } catch (error) {
      console.error("Error deleting sale:", error);
    }
  };


  // Apply filters to the full dataset
  const applyFilters = (salesData = allSales) => {
  const filteredSales = salesData.filter((sale) => {
    return (
      (!filters.dateFrom || new Date(sale.date) >= new Date(filters.dateFrom)) &&
      (!filters.dateTo || new Date(sale.date) <= new Date(filters.dateTo)) &&
      (!filters.name ||
        sale.name.toLowerCase().includes(filters.name.toLowerCase())) &&
      (!filters.contactNumber ||
        sale.contactNumber.includes(filters.contactNumber)) &&
      (!filters.productsOrdered.length ||
        filters.productsOrdered.every((p) =>
          sale.productsOrdered.includes(p)
        )) &&
      (!filters.dosageOrdered || sale.dosageOrdered === filters.dosageOrdered) &&
      (!filters.modeOfPayment || sale.modeOfPayment === filters.modeOfPayment) &&
      (
        !filters.shipmentStatus.length ||
        filters.shipmentStatus.some(status =>
          status === "Others"
            ? ![
                "Delivered",
                "In Transit",
                "Out for delivery",
                "RTO",
                "RTO Delivered",
                "Undelivered",
              ].includes(sale.shipway_status)
            : sale.shipway_status === status
        )
      )
    );
  });
  setCurrentPage(0);
  setDisplayedSales(filteredSales);
};


  
  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      name: "",
      contactNumber: "",
      productsOrdered: "",
      dosageOrdered: "",
      modeOfPayment: "",
      shipmentStatus: [],
    });
    setDisplayedSales(allSales);
    setFilterOpen(false)
  };


  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };


  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };


  const currentSales = displayedSales.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage
  );


  const textFieldSx = {
    mb: 2,
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


  }
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
    tableCell: {
      backgroundColor: "white",
      padding: "1px 25px",
      paddingBottom: "1px",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      overflow: "hidden",
      maxWidth: "150px",
      fontSize: "0.65rem",
      textAlign: "center",
      borderBottom: "1px solid gray",
      height: "45px",
    },
    tableHead: {
      backgroundColor: "black",
      color: "white",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      textAlign: "center",
      lineHeight: "10px",
      minHeight: "25px",
      height: "25px",
    },
    tableRow: {
      backgroundColor: "#1a1a1a",
      height: "10px",
      "&:hover": {
        backgroundColor: "#2a2a2a",
      },
    },
  };


  return (
    <Box sx={{ padding: 2 }}>

      <Typography variant="h5" gutterBottom sx={{
        fontWeight: "bold",
        textAlign: "center",
        letterSpacing: "1px",
        color: "black",
        marginBottom: 2,
      }}>
        Retention Sales
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddCircle />}
        sx={{ mb: 2, backgroundColor: "black" }}
        onClick={handleAddSale}
      >
        Add New Sale
      </Button>
      <Button
        variant="contained"
         sx={{ mb: 2,ml:2, backgroundColor: "black" }}
                  startIcon={<TuneIcon />}
        onClick={() => setFilterOpen(true)}
      >
        Filter
      </Button>

      

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
          <Typography variant="h6" gutterBottom
          sx={{
            mb: 1,
            position: "sticky",
            top: 0,
            fontWeight: "bold",
            textAlign: "center",
            color: "#333",
            background: "white",
            zIndex: 10,
          }}>
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
            label="Date From"
            type="date"
            fullWidth
            value={filters.dateFrom}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            sx={dateFieldSx}
          />
          <TextField
            label="Date To"
            type="date"
            fullWidth
            value={filters.dateTo}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            sx={dateFieldSx}
          />
          <TextField
            label="Name"
            fullWidth
            value={filters.name}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, name: e.target.value }))
            }
            sx={textFieldSx}
          />
          <TextField
            label="Contact No"
            fullWidth
            value={filters.contactNumber}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, contactNumber: e.target.value }))
            }
            sx={textFieldSx}
          />
          <FormControl fullWidth sx={formControlSx}>
            <InputLabel id="products-ordered-label">
              Products Ordered
            </InputLabel>
            <Select
            label="Products Ordered"
              multiple
              value={filters.productsOrdered || []}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  productsOrdered: e.target.value,
                }))
              }
              renderValue={(selected) => selected.join(", ")}
            >
              {productOptions.map((product) => (
                <MenuItem key={product} value={product}>
                  <Checkbox
                    checked={filters.productsOrdered.includes(product)}
                  />
                  <ListItemText primary={product} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={formControlSx}>
            <InputLabel id="dosage-ordered-label">
              Dosage Ordered
            </InputLabel>
            <Select
            label="Dosage Ordered"
              value={filters.dosageOrdered}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  dosageOrdered: e.target.value,
                }))
              }
            >
              {dosageOptions.map((dosage) => (
                <MenuItem key={dosage} value={dosage}>
                  {dosage}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={formControlSx}>
            <InputLabel id="mode-of-payment-label">
              Mode of Payment
            </InputLabel>
            <Select
            label="Mode of Payment"
              value={filters.modeOfPayment}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  modeOfPayment: e.target.value,
                }))
              }
            >
              {paymentModes.map((mode) => (
                <MenuItem key={mode} value={mode}>
                  {mode}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={formControlSx}>
              <InputLabel id="shipment-status-label">Shipment Status</InputLabel>
              <Select
                label="Shipment Status"
                multiple
                value={filters.shipmentStatus || []}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    shipmentStatus: e.target.value,
                  }))
                }
                renderValue={(selected) => selected.join(", ")}
              >
                {shipmentStatusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    <Checkbox checked={filters.shipmentStatus.includes(status)} />
                    <ListItemText primary={status} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Button
            variant="contained"
            fullWidth
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
          <Button variant="outlined" fullWidth onClick={resetFilters}  sx={{
              marginBottom: 1,
              color: "black",
              borderColor: "black",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderColor: "#333",
                color: "#333",
              },
            }}>
            Reset Filters
          </Button>
        </Box>
      </Drawer>


      <TableContainer component={Paper} sx={{ maxHeight: 1000 }}>
        <Table stickyHeader aria-label="retention sales table">
          <TableHead sx={styles.tableHead}>
            <TableRow>
              <TableCell sx={styles.tableHead}>Date</TableCell>
              <TableCell sx={styles.tableHead}>Name *</TableCell>
              <TableCell sx={styles.tableHead}>Contact No *</TableCell>
              <TableCell sx={styles.tableHead}>Products Ordered *</TableCell>
              <TableCell sx={styles.tableHead}>Dosage Ordered *</TableCell>
              <TableCell sx={styles.tableHead}>Amount Paid *</TableCell>
              <TableCell sx={styles.tableHead}>Partial Payment</TableCell>
              <TableCell sx={styles.tableHead}>Mode of Payment *</TableCell>
              <TableCell sx={styles.tableHead}>Order ID</TableCell>
              <TableCell sx={styles.tableHead}>Shipment Status</TableCell>
              <TableCell sx={styles.tableHead}>Order Created By *</TableCell>
              <TableCell sx={styles.tableHead}>Remarks</TableCell>
              <TableCell sx={styles.tableHead}>Actions *</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentSales.map((sale) => (
              <TableRow key={sale._id}>
                <TableCell>
                  <TextField
                    type="date"
                    value={editedSales[sale._id]?.date || sale.date || ""}
                    onChange={(e) => handleInputChange(e, sale._id, "date")}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "250px" }}>
                  <TextField
                    value={editedSales[sale._id]?.name || sale.name || ""}
                    onChange={(e) => handleInputChange(e, sale._id, "name")}
                    fullWidth
                  />
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "180px" }}>
                  <TextField
                    value={
                      editedSales[sale._id]?.contactNumber ||
                      sale.contactNumber ||
                      ""
                    }
                    onChange={(e) =>
                      handleInputChange(e, sale._id, "contactNumber")
                    }
                    fullWidth
                  />
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "170px" }}>
                  <TextField
                    value={
                      editedSales[sale._id]?.productsOrdered ||
                      sale.productsOrdered ||
                      ""
                    }
                    onChange={(e) =>
                      handleInputChange(e, sale._id, "productsOrdered")
                    }
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={
                      editedSales[sale._id]?.dosageOrdered ||
                      sale.dosageOrdered ||
                      ""
                    }
                    onChange={(e) =>
                      handleInputChange(e, sale._id, "dosageOrdered")
                    }
                    fullWidth
                  />
                </TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "170px" }}>
                <TextField
                  value={(
                    editedSales[sale._id]?.amountPaid ??
                      (sale.upsellAmount > 0
                        ? sale.upsellAmount
                        : sale.amountPaid)
                  ) || 0}
                  onChange={(e) =>
                    handleInputChange(e, sale._id, "amountPaid")
                  }
                  fullWidth
                />
                </TableCell>
                <TableCell>
                  <TextField
                    value={
                      editedSales[sale._id]?.partialPayment ??
                      sale.partialPayment ??
                      ""
                    }
                    onChange={(e) =>
                      handleInputChange(e, sale._id, "partialPayment")
                    }
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={
                      editedSales[sale._id]?.modeOfPayment ||
                      sale.modeOfPayment ||
                      ""
                    }
                    onChange={(e) =>
                      handleInputChange(e, sale._id, "modeOfPayment")
                    }
                    fullWidth
                  />
                </TableCell>
                <TableCell>{sale.orderId}</TableCell>
                <TableCell>{sale.shipway_status}</TableCell>
                <TableCell>{sale.orderCreatedBy}</TableCell>
                <TableCell style={{ whiteSpace: "nowrap", minWidth: "180px" }}>
                  <TextField
                    value={editedSales[sale._id]?.remarks || sale.remarks || ""}
                    onChange={(e) => handleInputChange(e, sale._id, "remarks")}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    sx={{backgroundColor:"black", color:"white"}}
                    onClick={() => handleSave(sale._id)}
                  >
                    {savingStatus[sale._id]
                      ? savingStatus[sale._id]
                      : "Save"}
                  </Button>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(sale._id)}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={displayedSales.length}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};


export default RetentionSales;