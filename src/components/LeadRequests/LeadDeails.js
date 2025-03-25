// LeadDetail.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Paper,
  MenuItem,
  IconButton,
} from "@mui/material";
import { Edit as EditIcon, Check as CheckIcon, Close as CloseIcon } from "@mui/icons-material";
import axios from "axios";

const LeadDetail = () => {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [transferRequestStatus, setTransferRequestStatus] = useState("");
  const [transferRequest, setTransferRequest] = useState(null);
  const [isEditingLeadStatus, setIsEditingLeadStatus] = useState(false);
  const [isEditingSalesStatus, setIsEditingSalesStatus] = useState(false);
  const loggedInUser = JSON.parse(sessionStorage.getItem("user"));

  // Dropdown options for Sales Agent
  const leadStatusOptions = [
    "Sales Done",
    "CNP - Call Not Picked",
    "Not Interested",
    "Product Issue",
    "Order from Other Source",
    "Upsell",
    "Fake Lead",
    "Follow Up",
    "Call Back",
    "New",
    "General Query",
  ];

  const salesStatusOptions = ["Sales Done", "Lost", "On Follow Up"];

  // Fetch lead details
  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await axios.get(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${id}`
        );
        setLead(response.data);
        setFormData(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching lead:", error);
        setLoading(false);
      }
    };
    fetchLead();
  }, [id]);

  // Fetch transfer request status
  useEffect(() => {
    const fetchTransferRequest = async () => {
      try {
        const response = await axios.get(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/transfer-requests`
        );
        const req = response.data.find(
          (r) =>
            r.leadId === id ||
            (typeof r.leadId === "object" && r.leadId.toString() === id)
        );
        if (req && req.requestedBy === loggedInUser.fullName) {
          setTransferRequest(req);
        }
      } catch (error) {
        console.error("Error fetching transfer request status:", error);
      }
    };

    fetchTransferRequest();
  }, [id, loggedInUser.fullName]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const response = await axios.put(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${id}`,
        formData
      );
      setLead(response.data.lead);
      setEditMode(false);
    } catch (error) {
      console.error("Error saving lead:", error);
    }
  };

  const handleTransfer = async () => {
    if (transferRequest) return;
    try {
      const response = await axios.post(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/transfer-request`,
        {
          leadId: id,
          requestedBy: loggedInUser.fullName,
          role: loggedInUser.role,
        }
      );
      setTransferRequest(response.data.request);
      setTransferRequestStatus("Transfer request sent for approval");
    } catch (error) {
      console.error("Error sending transfer request:", error);
      setTransferRequestStatus("Failed to send transfer request");
    }
  };

  const handleInlineSaveLeadStatus = async () => {
    try {
      const response = await axios.put(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${id}`,
        { ...formData, leadStatus: formData.leadStatus }
      );
      setLead(response.data.lead);
      setIsEditingLeadStatus(false);
    } catch (error) {
      console.error("Error saving inline lead status:", error);
    }
  };

  const handleInlineSaveSalesStatus = async () => {
    try {
      const response = await axios.put(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${id}`,
        { ...formData, salesStatus: formData.salesStatus }
      );
      setLead(response.data.lead);
      setIsEditingSalesStatus(false);
    } catch (error) {
      console.error("Error saving inline sales status:", error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!lead) {
    return <Typography variant="h6">Lead not found</Typography>;
  }

  // Determine if the logged-in agent is assigned to the lead
  let isAssigned = false;
  if (
    loggedInUser.role === "Sales Agent" &&
    lead.agentAssigned === loggedInUser.fullName
  ) {
    isAssigned = true;
  } else if (
    loggedInUser.role === "Retention Agent" &&
    lead.healthExpertAssigned === loggedInUser.fullName
  ) {
    isAssigned = true;
  }

  // Styles for the fancy container
  const fancyContainerSx = {
    border: "1px solid #e0e0e0",
    borderRadius: 3,
    p: 3,
    background: "linear-gradient(180deg, #ffffff, #fafafa)",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
    mb: 3,
  };

  // Common fields for full edit mode
  const commonEditableFields = (
    <>
      <TextField
        label="Name"
        name="name"
        value={formData.name || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Contact Number"
        name="contactNumber"
        value={formData.contactNumber || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      />
    </>
  );

  // Fields for Sales Agents in full edit mode
  const salesEditableFields = (
    <>
      <TextField
        label="Lead Source"
        name="leadSource"
        value={formData.leadSource || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Enquiry For"
        name="enquiryFor"
        value={formData.enquiryFor || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Customer Type"
        name="customerType"
        value={formData.customerType || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Product Pitched (comma separated)"
        name="productPitched"
        value={formData.productPitched || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        select
        label="Lead Status"
        name="leadStatus"
        value={formData.leadStatus || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      >
        {leadStatusOptions.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Sales Status"
        name="salesStatus"
        value={formData.salesStatus || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      >
        {salesStatusOptions.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Next Follow-up"
        name="nextFollowup"
        type="date"
        value={formData.nextFollowup || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="Agent's Remarks"
        name="agentsRemarks"
        value={formData.agentsRemarks || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
        multiline
      />
    </>
  );

  // Fields for Retention Agents in full edit mode
  const retentionEditableFields = (
    <>
      <TextField
        label="RT Follow-up Status"
        name="rtFollowupStatus"
        value={formData.rtFollowupStatus || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Last Order Date"
        name="lastOrderDate"
        type="date"
        value={formData.lastOrderDate || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="Repeat Dosage Ordered"
        name="repeatDosageOrdered"
        value={formData.repeatDosageOrdered || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Retention Status"
        name="retentionStatus"
        value={formData.retentionStatus || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="RT Remark"
        name="rtRemark"
        value={formData.rtRemark || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
        multiline
      />
      <TextField
        label="RT Next Follow-up Date"
        name="rtNextFollowupDate"
        type="date"
        value={formData.rtNextFollowupDate || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
        InputLabelProps={{ shrink: true }}
      />
    </>
  );

  return (
    <Box sx={{ p: 4, background: "#eceff1", minHeight: "100vh" }}>
      <Paper
        sx={{
          p: 4,
          maxWidth: 800,
          mx: "auto",
          borderRadius: 3,
          boxShadow: "0px 6px 20px rgba(0, 0, 0, 0.12)",
          background: "linear-gradient(180deg, #ffffff, #f7f7f7)",
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            mb: 3,
            textAlign: "center",
            fontWeight: "bold",
            color: "#37474f",
            borderBottom: "2px solid #90a4ae",
            pb: 1,
          }}
        >
          Lead Details
        </Typography>

        {/* Read-only view with fancy inline-edit for Lead & Sales Status */}
        {!editMode && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Name:</strong> {lead.name}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Contact Number:</strong> {lead.contactNumber}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Lead Source:</strong> {lead.leadSource}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Enquiry For:</strong> {lead.enquiryFor}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Customer Type:</strong> {lead.customerType}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Product Pitched:</strong> {lead.productPitched}
            </Typography>

            <Box sx={fancyContainerSx}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  Lead Status:
                </Typography>
                {isEditingLeadStatus ? (
                  <>
                    <TextField
                      select
                      value={formData.leadStatus || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          leadStatus: e.target.value,
                        }))
                      }
                      sx={{ minWidth: 220, mr: 1 }}
                    >
                      {leadStatusOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                    <IconButton onClick={handleInlineSaveLeadStatus} color="success">
                      <CheckIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, leadStatus: lead.leadStatus }));
                        setIsEditingLeadStatus(false);
                      }}
                      color="error"
                    >
                      <CloseIcon />
                    </IconButton>
                  </>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="subtitle1" sx={{ mr: 1 }}>
                      {lead.leadStatus}
                    </Typography>
                    <IconButton onClick={() => setIsEditingLeadStatus(true)}>
                      <EditIcon />
                    </IconButton>
                  </Box>
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  Sales Status:
                </Typography>
                {isEditingSalesStatus ? (
                  <>
                    <TextField
                      select
                      value={formData.salesStatus || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          salesStatus: e.target.value,
                        }))
                      }
                      sx={{ minWidth: 220, mr: 1 }}
                    >
                      {salesStatusOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                    <IconButton onClick={handleInlineSaveSalesStatus} color="success">
                      <CheckIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, salesStatus: lead.salesStatus }));
                        setIsEditingSalesStatus(false);
                      }}
                      color="error"
                    >
                      <CloseIcon />
                    </IconButton>
                  </>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="subtitle1" sx={{ mr: 1 }}>
                      {lead.salesStatus}
                    </Typography>
                    <IconButton onClick={() => setIsEditingSalesStatus(true)}>
                      <EditIcon />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Box>

            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Next Follow-up:</strong> {lead.nextFollowup}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Agent's Remarks:</strong> {lead.agentsRemarks}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>RT Follow-up Status:</strong> {lead.rtFollowupStatus}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Last Order Date:</strong> {lead.lastOrderDate}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Repeat Dosage Ordered:</strong> {lead.repeatDosageOrdered}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Retention Status:</strong> {lead.retentionStatus}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>RT Remark:</strong> {lead.rtRemark}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>RT Next Follow-up Date:</strong> {lead.rtNextFollowupDate}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Agent Assigned:</strong> {lead.agentAssigned}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#455a64" }}>
              <strong>Health Expert Assigned:</strong> {lead.healthExpertAssigned}
            </Typography>
          </Box>
        )}

        {/* Full Edit Mode */}
        {editMode && (
          <Box
            component="form"
            noValidate
            sx={{
              p: 3,
              border: "1px solid #e0e0e0",
              borderRadius: 3,
              backgroundColor: "#ffffff",
              boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
              mb: 3,
            }}
          >
            {commonEditableFields}
            {loggedInUser.role === "Sales Agent"
              ? salesEditableFields
              : retentionEditableFields}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button variant="contained" onClick={handleSave} sx={{ mr: 2 }}>
                Save
              </Button>
              <Button variant="outlined" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
            </Box>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
          {isAssigned ? (
            <Button variant="contained" onClick={() => setEditMode(true)}>
              Edit Lead
            </Button>
          ) : (
            <>
              {transferRequest ? (
                <Button
                  variant="contained"
                  disabled
                  sx={{
                    backgroundColor: transferRequest.status === "approved" ? "#a5d6a7" : "#ccc",
                  }}
                >
                  {transferRequest.status === "approved"
                    ? "Transfer Converted"
                    : "Transfer Requested"}
                </Button>
              ) : (
                <Button variant="contained" color="secondary" onClick={handleTransfer}>
                  Lead Transfer
                </Button>
              )}
            </>
          )}
        </Box>
        {transferRequestStatus && !transferRequest && (
          <Typography variant="body2" sx={{ mt: 2, color: "red" }}>
            {transferRequestStatus}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default LeadDetail;
