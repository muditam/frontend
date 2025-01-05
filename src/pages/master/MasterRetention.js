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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  Divider,
} from "@mui/material";
import axios from "axios";

const RetentionTable = () => {
  const [retentionLeads, setRetentionLeads] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    contactNumber: "",
    agentAssigned: "",
    productPitched: [],
    agentsRemarks: "",
    productsOrdered: [],
    dosageOrdered: "",
    modeOfPayment: "",
    deliveryStatus: "",
    healthExpertAssigned: "",
    dosageExpiring: "",
    rtNextFollowupDate: "",
    rtFollowupReminder: "",
    rtFollowupStatus: "",
    lastOrderDate: "",
    repeatDosageOrdered: "",
    retentionStatus: "",
  });

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
    productOptions: ["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit"],
  });

  const fetchRetentionLeads = async () => {
    try {
      const response = await axios.get("https://www.60brands.com/api/leads/retention");
      setRetentionLeads(response.data);
    } catch (error) {
      console.error("Error fetching retention leads:", error);
    }
  };

  const applyFilters = () => {
    const filteredLeads = retentionLeads.filter((lead) => {
      return Object.keys(filters).every((key) => {
        if (!filters[key]) return true;
        if (Array.isArray(filters[key])) {
          return filters[key].every((item) => lead[key]?.includes(item));
        }
        return String(lead[key] || "").toLowerCase().includes(filters[key].toLowerCase());
      });
    });
    setRetentionLeads(filteredLeads);
  };

  const resetFilters = () => {
    setFilters({
      name: "",
      contactNumber: "",
      agentAssigned: "",
      productPitched: [],
      agentsRemarks: "",
      productsOrdered: [],
      dosageOrdered: "",
      modeOfPayment: "",
      deliveryStatus: "",
      healthExpertAssigned: "",
      dosageExpiring: "",
      rtNextFollowupDate: "",
      rtFollowupReminder: "",
      rtFollowupStatus: "",
      lastOrderDate: "",
      repeatDosageOrdered: "",
      retentionStatus: "",
    });
    fetchRetentionLeads();
  };

  useEffect(() => {
    fetchRetentionLeads();
  }, []);

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
      height: "35px",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      overflow: "hidden",
      maxWidth: "200px",
    },
    card: {
      borderRadius: "8px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    button: {
      borderRadius: "8px",
      textTransform: "none",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
  };

  return (
    <Box sx={{ padding: 2, backgroundColor: "#f9f9f9" }} style={styles.container}>
      <Typography variant="h5" gutterBottom style={styles.header}>
        Master Data - Retention
      </Typography>

      <Button
        variant="contained"
        onClick={() => setFilterOpen(true)}
        sx={{ mb: 2, backgroundColor: "#0073e6", ...styles.button }}
      >
        Filter
      </Button>

      <Drawer
        anchor="right"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        sx={{ ...styles.card }}
      >
        <Box sx={{ width: 300, padding: 2 }}> 
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Divider />
          <Box sx={{ marginBottom: 2 }}>
            {Object.keys(filters).map((key) => (
              <FormControl key={key} fullWidth sx={{ marginBottom: 2 }}>
                {Array.isArray(dropdownOptions[key]) ? (
                  <>
                    <InputLabel>{key.replace(/([A-Z])/g, " $1")}</InputLabel>
                    <Select
                      multiple
                      value={Array.isArray(filters[key]) ? filters[key] : []}
                      onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                      renderValue={(selected) => selected.join(", ")}
                    >
                      {dropdownOptions[key].map((option) => (
                        <MenuItem key={option} value={option}>
                          <Checkbox checked={filters[key]?.includes(option)} />
                          <ListItemText primary={option} />
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                ) : (
                  <TextField
                    label={key.replace(/([A-Z])/g, " $1")}
                    value={filters[key]}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                )}
              </FormControl>
            ))}
          </Box>
          <Divider />
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              applyFilters();
              setFilterOpen(false);
            }}
            sx={{ marginBottom: 1, backgroundColor: "#0073e6", ...styles.button }}
          >
            Apply Filters
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={resetFilters}
          >
            Reset Filters
          </Button>
        </Box>
      </Drawer>

      <TableContainer component={Paper} style={styles.card}>
        <Table style={styles.table}>
          <TableHead>
            <TableRow>
              <TableCell style={styles.tableCell}>Name</TableCell>
              <TableCell style={styles.tableCell}>Contact No</TableCell>
              <TableCell style={styles.tableCell}>Agent Assigned</TableCell>
              <TableCell style={styles.tableCell}>Product Pitched</TableCell>
              <TableCell style={styles.tableCell}>Remark for HE</TableCell>
              <TableCell style={styles.tableCell}>Products Ordered</TableCell>
              <TableCell style={styles.tableCell}>Dosage Ordered</TableCell>
              <TableCell style={styles.tableCell}>Mode Of Payment</TableCell>
              <TableCell style={styles.tableCell}>Delivery Status</TableCell>
              <TableCell style={styles.tableCell}>Health Expert Assigned</TableCell>
              <TableCell style={styles.tableCell}>Dosage Expiring</TableCell>
              <TableCell style={styles.tableCell}>RT Next Followup Date</TableCell>
              <TableCell style={styles.tableCell}>RT- Followup Reminder</TableCell>
              <TableCell style={styles.tableCell}>RT- Followup Status</TableCell>
              <TableCell style={styles.tableCell}>Last Order Date</TableCell>
              <TableCell style={styles.tableCell}>Repeat Dosage Ordered</TableCell>
              <TableCell style={styles.tableCell}>Retention Status</TableCell>
              <TableCell style={styles.tableCell}>RT- Remark</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {retentionLeads.map((lead) => (
              <TableRow
                key={lead._id}
                sx={{
                  '&:hover': {
                    backgroundColor: '#f2f2f2',
                  },
                }}
              >
                <TableCell style={styles.tableCell}>{lead.name}</TableCell>
                <TableCell style={styles.tableCell}>{lead.contactNumber}</TableCell>
                <TableCell style={styles.tableCell}>{lead.agentAssigned}</TableCell>
                <TableCell style={styles.tableCell}>{lead.productPitched?.join(", ")}</TableCell>
                <TableCell style={styles.tableCell}>{lead.agentsRemarks}</TableCell>
                <TableCell style={styles.tableCell}>{lead.productsOrdered?.join(", ")}</TableCell>
                <TableCell style={styles.tableCell}>{lead.dosageOrdered}</TableCell>
                <TableCell style={styles.tableCell}>{lead.modeOfPayment}</TableCell>
                <TableCell style={styles.tableCell}>{lead.deliveryStatus}</TableCell>
                <TableCell style={styles.tableCell}>{lead.healthExpertAssigned}</TableCell>
                <TableCell style={styles.tableCell}>{lead.dosageExpiring}</TableCell>
                <TableCell style={styles.tableCell}>{lead.rtNextFollowupDate}</TableCell>
                <TableCell style={styles.tableCell}>{lead.rtFollowupReminder}</TableCell>
                <TableCell style={styles.tableCell}>{lead.rtFollowupStatus}</TableCell>
                <TableCell style={styles.tableCell}>{lead.lastOrderDate}</TableCell>
                <TableCell style={styles.tableCell}>{lead.repeatDosageOrdered}</TableCell>
                <TableCell style={styles.tableCell}>{lead.retentionStatus}</TableCell>
                <TableCell style={styles.tableCell}>{lead.rtRemark}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
 
export default RetentionTable;
