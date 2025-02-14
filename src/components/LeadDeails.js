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
} from "@mui/material";
import axios from "axios";

const LeadDetail = () => {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [transferRequestStatus, setTransferRequestStatus] = useState("");
  const [transferRequest, setTransferRequest] = useState(null);
  const loggedInUser = JSON.parse(sessionStorage.getItem("user"));

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
      // Assuming your backend responds with the updated lead in response.data.lead
      setLead(response.data.lead);
      setEditMode(false);
    } catch (error) {
      console.error("Error saving lead:", error);
    }
  };

  const handleTransfer = async () => {
    // Prevent duplicate transfer request
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

  // Common fields that are always editable
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

  // Fields specific for Sales Agents (excluding common fields)
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
        label="Lead Status"
        name="leadStatus"
        value={formData.leadStatus || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Sales Status"
        name="salesStatus"
        value={formData.salesStatus || ""}
        onChange={handleInputChange}
        fullWidth
        sx={{ mb: 2 }}
      />
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

  // Fields specific for Retention Agents (excluding common fields)
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
    <Box sx={{ padding: 3, backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Paper
        sx={{
          padding: 3,
          maxWidth: 800,
          margin: "auto",
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ mb: 3, textAlign: "center" }}
        >
          Lead Details
        </Typography>

        {/* Read-only view */}
        {!editMode && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1">
              <strong>Name:</strong> {lead.name}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Contact Number:</strong> {lead.contactNumber}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Lead Source:</strong> {lead.leadSource}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Enquiry For:</strong> {lead.enquiryFor}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Customer Type:</strong> {lead.customerType}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Product Pitched:</strong> {lead.productPitched}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Lead Status:</strong> {lead.leadStatus}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Sales Status:</strong> {lead.salesStatus}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Next Follow-up:</strong> {lead.nextFollowup}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Agent's Remarks:</strong> {lead.agentsRemarks}
            </Typography>
            <Typography variant="subtitle1">
              <strong>RT Follow-up Status:</strong> {lead.rtFollowupStatus}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Last Order Date:</strong> {lead.lastOrderDate}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Repeat Dosage Ordered:</strong> {lead.repeatDosageOrdered}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Retention Status:</strong> {lead.retentionStatus}
            </Typography>
            <Typography variant="subtitle1">
              <strong>RT Remark:</strong> {lead.rtRemark}
            </Typography>
            <Typography variant="subtitle1">
              <strong>RT Next Follow-up Date:</strong> {lead.rtNextFollowupDate}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Agent Assigned:</strong> {lead.agentAssigned}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Health Expert Assigned:</strong> {lead.healthExpertAssigned}
            </Typography>
          </Box>
        )}

        {/* Edit Mode */}
        {editMode && (
          <Box component="form" noValidate sx={{ mb: 3 }}>
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
                    backgroundColor:
                      transferRequest.status === "approved" ? "#a5d6a7" : "#ccc",
                  }}
                >
                  {transferRequest.status === "approved"
                    ? "Transfer Converted"
                    : "Transfer Requested"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleTransfer}
                >
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
