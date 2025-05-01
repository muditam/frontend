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
  Typography,
  Button,
  Drawer,
  TextField,
  OutlinedInput,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  Divider,
  Input,
  TablePagination,
} from "@mui/material";
import axios from "axios";
import TuneIcon from "@mui/icons-material/Tune";




const RetentionTable = () => {
  const [retentionLeads, setRetentionLeads] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [retentionAgents, setRetentionAgents] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [agents, setAgents] = useState([]);
  const [salesAgents, setSalesAgents] = useState([]);

  const [filters, setFilters] = useState({
    name: "",
    contactNumber: "",
    agentAssigned: [],
    productPitched: [],
    productsOrdered: [],
    dosageOrdered: "",
    modeOfPayment: "",
    healthExpertAssigned: "",
    rtFollowupReminder: "",
    rtFollowupStatus: "",
    lastOrderDate: "",
    retentionStatus: "",
    lastOrderDateFrom: "",
    lastOrderDateTo: "",
  });
  const [activeFilters, setActiveFilters] = useState({});

  const [dropdownOptions] = useState({
    dosageOrdered: ["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"],
    modeOfPayment: ["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"],
    deliveryStatus: ["Delivered", "RTO", "Undelivered"],
    retentionStatus: ["Active", "Lost"],
    rtFollowupReminder: ["Today", "Tomorrow", "Follow-up Missed"],
    rtFollowupStatus: [
      "Good Results",
      "No Result",
      "Sales Done",
      "Do Not Want to Continue",
      "Call Not Picked",
      "Blood Test Suggested",
      "Product Issue",
      "Order from Other Source",
      "Upsell",
      "Follow Up Again",
      "Call Back",
      "Others",
    ],
    productOptions: [
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
  });

  // Fetch retention leads with pagination and filters applied
  const fetchRetentionLeads = async () => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retention",
        {
          params: {
            ...activeFilters,
            page: currentPage + 1,
            limit: rowsPerPage,
          },
        }
      );
      setRetentionLeads(response.data.leads);
      setTotalLeads(response.data.totalLeads);
    } catch (error) {
      console.error("Error fetching retention leads:", error);
    }
  };

  const fetchRetentionAgents = async () => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees",
        { params: { role: "Retention Agent" } }
      );
      setRetentionAgents(response.data.map((agent) => agent.fullName));
    } catch (error) {
      console.error("Error fetching retention agents:", error);
    }
  };
  const fetchSalesAgents = async () => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees",
        { params: { role: "Sales Agent" } }
      );
      setSalesAgents(response.data.map((agent) => agent.fullName));
    } catch (error) {
      console.error("Error fetching sales agents:", error);
    }
  };

  useEffect(() => {
    fetchRetentionLeads(); 
  }, [currentPage, rowsPerPage, activeFilters]);

  useEffect(() => {
    fetchRetentionAgents();
    fetchSalesAgents();
  }, []);

  const handleApplyFilters = () => {
    const payload = { ...filters };
    if (payload.lastOrderDateFrom) {
      const from = new Date(payload.lastOrderDateFrom);
      from.setHours(0, 0, 0, 0);
      payload.lastOrderDateFrom = from.toISOString();
    }
    if (payload.lastOrderDateTo) {
      const to = new Date(payload.lastOrderDateTo);
      to.setHours(23, 59, 59, 999);
      payload.lastOrderDateTo = to.toISOString();
    }
    Object.keys(payload).forEach((k) => {
      const v = payload[k];
      if (v === "" || (Array.isArray(v) && v.length === 0)) {
        delete payload[k];
      }
    });
    setActiveFilters(payload);
    setFilterOpen(false);
    setCurrentPage(0)
  };

  const resetFilters = () => {
    setFilters({
      name: "",
      contactNumber: "",
      agentAssigned: [],
      productPitched: [],
      productsOrdered: [],
      dosageOrdered: "",
      modeOfPayment: "",
      healthExpertAssigned: "",
      rtFollowupReminder: "",
      lastOrderDate: "",
      rtFollowupStatus: "",
      lastOrderDateFrom: "",
      lastOrderDateTo: "",
      retentionStatus: "",
    });
    setCurrentPage(0);
    setActiveFilters({});
    setFilterOpen(false);
  };

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const styles = {
    container: {
      fontFamily: "Inter, sans-serif",
      fontWeight: 450,
      fontSize: "13px",
      lineHeight: "20px",
    },
    header: {
      color: "rgb(74, 74, 74)",
    },
    table: {
      minWidth: 650,
    },
    tableCell: {
      backgroundColor: "white",
      padding: "4px 8px",
      height: "24px",
      lineHeight: "20px",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      overflow: "hidden",
      maxWidth: "200px",
      fontSize: "0.875rem",
      textAlign: "center",
      borderBottom: "1px solid #333",
    },
    card: {
      borderRadius: "8px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    tableHead: {
      color: "white",
      backgroundColor: "black",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      // padding: "10px",
      textAlign: "center",
    },
    button: {
      borderRadius: "8px",
      textTransform: "none",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
  };

  return (
    <Box
      sx={{ padding: 2, backgroundColor: "#f9f9f9" }}
      style={styles.container}
    >
      <Typography
        gutterBottom
        variant="h4"
        sx={{
          fontWeight: "bold",
          textAlign: "center",
          letterSpacing: "1px",
          color: "black",
          marginBottom: 2,
        }}
      >
        Master Data - Retention
      </Typography>




      <Button
        variant="contained"
        onClick={() => setFilterOpen(true)}
        sx={{ mb: 2, backgroundColor: "black", ...styles.button }}
        startIcon={<TuneIcon />}
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
              width: "100%",
              borderRadius: "2px",
              mb: 2,
            }}
          />
          <Box sx={{ marginBottom: 1 }}>
            {Object.keys(filters).map((key) => (
              <FormControl
                key={key}
                fullWidth
                variant="outlined"
                sx={{
                  mb: 2,
                  "& .MuiInputLabel-root": {
                    fontSize: "0.85rem",
                    paddingLeft: "8px",
                    top: "50%",
                    transition: "all 0.4s ease-in-out",
                    transform: "translateY(-50%)",
                  },
                  "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled":
                  {
                    top: 0,
                    transform: "translateY(-50%) translateX(8px)",
                    fontSize: "0.75rem",
                    color: "gray",
                  },
                  "& .MuiOutlinedInput-root": {
                    "& input": {
                      padding: "4px !important",
                    },
                    "& .MuiSelect-select": {
                      padding: "4px",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "black",
                    },
                    "&:hover fieldset": {
                      borderColor: "black",
                    },
                  },
                }}
              >
                {key === "healthExpertAssigned" ? (
                  <>
                    <InputLabel>Health Expert Assigned</InputLabel>
                    <Select
                      label="Health Expert Assigned"
                      value={filters[key] || ""}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    >
                      {retentionAgents.map((agent) => (
                        <MenuItem key={agent} value={agent}>
                          {agent}
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                ) : key === "agentAssigned" ? (
                  <>
                    <InputLabel>Agent Assigned</InputLabel>
                    <Select
                      label="Agent Assigned"
                      multiple
                      value={Array.isArray(filters[key]) ? filters[key] : []}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      renderValue={(selected) => selected.join(", ")}
                    >
                      {salesAgents.map((agent) => (
                        <MenuItem key={agent} value={agent}>
                          <Checkbox
                            checked={filters[key]?.includes(agent) || false}
                          />
                          <ListItemText primary={agent} />
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                ) : key === "productPitched" ? (
                  <>
                    <InputLabel>Product Pitched</InputLabel>
                    <Select
                      label="Product Pitched"
                      multiple
                      value={Array.isArray(filters[key]) ? filters[key] : []}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      renderValue={(selected) => selected.join(", ")}
                    >
                      {dropdownOptions.productOptions.map((product) => (
                        <MenuItem key={product} value={product}>
                          <Checkbox
                            checked={filters[key]?.includes(product) || false}
                          />
                          <ListItemText primary={product} />
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                ) : key === "productsOrdered" ? (
                  <>
                    <InputLabel>Products Ordered</InputLabel>
                    <Select
                      label="Products Ordered"
                      multiple
                      value={Array.isArray(filters[key]) ? filters[key] : []}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      renderValue={(selected) => selected.join(", ")}
                    >
                      {dropdownOptions.productOptions.map((product) => (
                        <MenuItem key={product} value={product}>
                          <Checkbox
                            checked={filters[key]?.includes(product) || false}
                          />
                          <ListItemText primary={product} />
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                ) : key === "lastOrderDate" ? (
                  <>
                    <TextField
                      label="Last Order Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      sx={{
                        minWidth: 180,
                        "& .MuiInputBase-root": {
                          backgroundColor: "background.default",
                        },
                        "& .MuiInputLabel-root": {
                          top: -1,
                          transform: "translate(10px, -6px) scale(0.85)",
                          transition: "all 0.4s ease-in-out",
                          color: "#777",
                        },
                      }}
                    />
                  </>
                ) : key === "lastOrderDateFrom" ? (
                  <>
                    <TextField
                      label="Last Order Date From"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))}
                      sx={{
                        minWidth: 180,
                        "& .MuiInputBase-root": {
                          backgroundColor: "background.default",
                        },
                        "& .MuiInputLabel-root": {
                          top: -1,
                          transform: "translate(10px, -6px) scale(0.85)",
                          transition: "all 0.4s ease-in-out",
                          color: "#777",
                        },
                      }}
                    />
                  </>
                ) : key === "lastOrderDateTo" ? (
                  <>
                    <TextField
                      label="Last Order Date To"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))}
                      sx={{
                        minWidth: 180,
                        "& .MuiInputBase-root": {
                          backgroundColor: "background.default",
                        },
                        "& .MuiInputLabel-root": {
                          top: -1,
                          transform: "translate(10px, -6px) scale(0.85)",
                          transition: "all 0.4s ease-in-out",
                          color: "#777",
                        },
                      }}
                    />
                  </>
                ) : Array.isArray(dropdownOptions[key]) ? (
                  <>
                    <InputLabel>
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                    </InputLabel>
                    <Select
                      label={key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                      multiple
                      value={Array.isArray(filters[key]) ? filters[key] : []}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      renderValue={(selected) => selected.join(", ")}
                    >
                      {dropdownOptions[key].map((option) => (
                        <MenuItem key={option} value={option}>
                          <Checkbox
                            checked={filters[key]?.includes(option) || false}
                          />
                          <ListItemText primary={option} />
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                ) : (
                  <>
                    <InputLabel>
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                    </InputLabel>
                    <OutlinedInput
                      value={filters[key]}
                      label={key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  </>
                )}
              </FormControl>
            ))}
          </Box>
          <Divider />
          <Button
            variant="contained"
            fullWidth
            onClick={handleApplyFilters}
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
            onClick={resetFilters}
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
          >
            Reset Filters
          </Button>
        </Box>
      </Drawer>


      <TableContainer
        component={Paper}
        style={{ backgroundColor: "#121212", borderRadius: "10px" }}
        sx={{ maxHeight: 1000 }}
      >
        <Table
          stickyHeader
          aria-label="sticky table"
          style={{ minWidth: 1200 }}
        >
          <TableHead>
            <TableRow>
              {[
                "Last Order Date",
                "Name",
                "Contact No",
                "Agent Assigned",
                "Product Pitched",
                "Remark for HE",
                "Products Ordered",
                "Dosage Ordered",
                "Mode Of Payment",
                "Delivery Status",
                "Health Expert Assigned",
                "Dosage Expiring",
                "RT Next Followup Date",
                "RT- Followup Reminder",
                "RT- Followup Status",
                "Repeat Dosage Ordered",
                "Retention Status",
                "RT- Remark",
              ].map((heading) => (
                <TableCell
                  key={heading}
                  sx={{
                    backgroundColor: "#1f1f1f",
                    color: "#ffffff",
                    fontWeight: "bold",
                    borderBottom: "1px solid #333",
                    fontSize: "0.875rem",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                    paddingTop: "5px",
                    paddingBottom: "5px"
                  }}
                >
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {retentionLeads.map((lead) => (
              <TableRow
                key={lead._id}
                sx={{
                  backgroundColor: "#1a1a1a",
                  "&:hover": {
                    backgroundColor: "#2a2a2a",
                  },
                }}
              >
                <TableCell sx={styles.tableCell}>
                  {lead.lastOrderDate}
                </TableCell>
                <TableCell sx={styles.tableCell}>{lead.name}</TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.contactNumber}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.agentAssigned}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.productPitched?.join(", ")}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.agentsRemarks}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.productsOrdered?.join(", ")}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.dosageOrdered}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.modeOfPayment}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.deliveryStatus}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.healthExpertAssigned}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.dosageExpiring}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.rtNextFollowupDate}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.rtFollowupReminder}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.rtFollowupStatus}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.repeatDosageOrdered}
                </TableCell>
                <TableCell sx={styles.tableCell}>
                  {lead.retentionStatus}
                </TableCell>
                <TableCell sx={styles.tableCell}>{lead.rtRemark}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={totalLeads}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default RetentionTable;
