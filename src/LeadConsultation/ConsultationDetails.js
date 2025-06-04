import React, { useState, useEffect } from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import Presales from "./ProcessTracker/Presales";
import Consultation from "./ProcessTracker/Consultation";
import Closing from "./ProcessTracker/Closing";
import ConsultationFollowup from "./FollowUpConsultation/ConsultationFollowup";
import ConsultationHistory from "./FollowUpConsultation/ConsultationHistory";

// All icon imports are now at the top
import EditIcon from '@mui/icons-material/Edit';
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ChatIcon from "@mui/icons-material/Chat";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ScheduleIcon from "@mui/icons-material/Schedule"; 
import HistoryIcon from "@mui/icons-material/History";

// Original stepper icons for Presales, Consultation & Closing
const stepIconsOriginal = {
  1: ShoppingCartIcon,
  2: ChatIcon,
  3: CheckCircleIcon,
};

const leadSourceOptions = [
  "Abandoned Cart",
  "BiteSpeed",
  "Business on Bot",
  "Facebook Lead",
  "Google Lead",
  "Incoming Call",
  "Lead Form",
  "Online Store",
  "Others",
  "Rampwin",
  "Reference",
  "Whatsapp",
  "Degpeg",
];

const CustomStepIconOriginal = (props) => {
  const { active, completed, icon, className } = props;
  const Icon = stepIconsOriginal[icon] || ShoppingCartIcon;
  return (
    <Icon
      className={className}
      style={{
        color: active || completed ? "black" : "#9e9e9e",
      }}
    />
  );
};

// New stepper icons for Sales Done case: Follow-up & History
const newStepperSteps = ["Follow-up", "History"];
const stepIconsNew = {
  1: ScheduleIcon,
  2: HistoryIcon,
};

const CustomStepIconNew = (props) => {
  const { active, completed, icon, className } = props;
  const Icon = stepIconsNew[icon] || ScheduleIcon;
  return (
    <Icon
      className={className}
      style={{
        color: active || completed ? "black" : "#9e9e9e",
      }}
    />
  );
};

const BlackConnector = styled(StepConnector)(({ theme }) => ({
  [`& .MuiStepConnector-line`]: {
    borderColor: "#9e9e9e",
  },
}));

// Helper to format the "Created At" label
const getCreatedAtLabel = (createdAt) => {
  if (!createdAt) return "";
  const now = new Date();
  const created = new Date(createdAt);
  now.setHours(0, 0, 0, 0);
  created.setHours(0, 0, 0, 0);
  const diffTime = now.getTime() - created.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays >= 2 && diffDays <= 7) {
    return created.toLocaleDateString("en-US", { weekday: "long" });
  }
  const day = created.getDate().toString().padStart(2, "0");
  const month = (created.getMonth() + 1).toString().padStart(2, "0");
  const year = created.getFullYear();
  return `${day}/${month}/${year}`;
};

// Steps for the original stepper
const stepsOriginal = ["Presales", "Consultation", "Closing"];

const ConsultationDetails = ({ customerId, reloadTrigger, onReload }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followUpDate, setFollowUpDate] = useState("");
  // activeStep controls the displayed child component
  const [activeStep, setActiveStep] = useState(0);
  // Local state for presales.leadStatus (used by dropdown and to decide stepper type)
  const [leadStatus, setLeadStatus] = useState("New Lead");

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({});

  const [employees, setEmployees] = useState([]);

  const [subLeadStatus, setSubLeadStatus] = useState("");

  // Fetch employees for Assigned To dropdown
  useEffect(() => {
    axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees")
      .then(res => {
        const filtered = res.data.filter(emp =>
          (emp.role === "Sales Agent" || emp.role === "Retention Agent") && emp.status === "active"
        );
        setEmployees(filtered);
      })
      .catch(err => console.error("Error fetching employees:", err));
  }, []);

  // Reset activeStep when customerId changes
  useEffect(() => {
    setActiveStep(0);
  }, [customerId]);

  // Fetch customer data and consultation details on mount or when customerId changes
  useEffect(() => {
    setLeadStatus("New Lead");
    if (customerId) {
      setLoading(true);
      // Fetch customer info
      axios
        .get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/customers/${customerId}`)
        .then((response) => {
          const c = response.data;
          if (c) {
            setCustomer(c);
            setFollowUpDate(c.followUpDate ? c.followUpDate.split("T")[0] : "");
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching customer:", error);
          setLoading(false);
        });
      // Fetch consultation details to get presales.leadStatus
      axios
        .get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-details?customerId=${customerId}`)
        .then((res) => {
          if (res.data && res.data.length > 0) {
            const presalesData = res.data[0].presales;
            if (presalesData && presalesData.leadStatus) {
              setLeadStatus(presalesData.leadStatus);
            }
          }
        })
        .catch((err) =>
          console.error("Error fetching consultation details:", err)
        );
    } else {
      setCustomer(null);
      setLoading(false);
    }
  }, [customerId, reloadTrigger]);

  // Save updated follow-up date
  const handleSaveFollowUp = () => {
    if (!customer) return;
    axios
      .put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/customers/${customerId}`, {
        ...customer,
        followUpDate: followUpDate,
      })
      .then((response) => {
        setCustomer(response.data.customer);
        if (onReload) {
        onReload(); 
      }   
      })
      .catch((error) => {
        console.error("Error updating follow-up date:", error);
      });
  };

  const handleSubLeadStatusChange = async (newSubStatus) => {
    setSubLeadStatus(newSubStatus);
    try {
      await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-details", {
        customerId,
        presales: { subLeadStatus: newSubStatus },
      });
    } catch (error) {
      console.error("Error updating subLeadStatus:", error);
    }
  };  

  const handleOpenEdit = () => {
    setEditData({
      name: customer.name,
      phone: customer.phone,
      age: customer.age,
      location: customer.location,
      lookingFor: customer.lookingFor,
      assignedTo: customer.assignedTo,
      leadSource: customer.leadSource,
      followUpDate,
    });
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  // Save edits
  const handleSaveEdit = () => {
    axios.put(
      `https://muditamleads-14f32a10d7f7.herokuapp.com/api/customers/${customerId}`,
      editData
    ).then(({ data }) => {
      setCustomer(data.customer);
      setFollowUpDate(editData.followUpDate);
      setEditOpen(false);
    });
  };

  // Update active step when a step is clicked
  const handleStepClick = (stepIndex) => {
    setActiveStep(stepIndex);
  };

  // When lead status is changed from the dropdown, update local state and backend
  const handleLeadStatusChange = async (event) => {
    const newStatus = event.target.value;
    setLeadStatus(newStatus);
    try {
      await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-details", {
        customerId,
        presales: { leadStatus: newStatus },
      });
    } catch (error) {
      console.error("Error updating leadStatus:", error);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress sx={{ color: "black" }} />
      </Box>
    );
  }
  if (!customer) return <div>No customer found.</div>;

  return (
    <Box sx={{ p: 2 }}>

<Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Edit Customer</Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}><TextField label="Name" name="name" value={editData.name} onChange={handleEditChange} fullWidth size="small" /></Grid>
            <Grid item xs={6}><TextField label="Phone" name="phone" value={editData.phone} onChange={handleEditChange} fullWidth size="small" /></Grid>
            <Grid item xs={4}><TextField label="Age" name="age" type="number" value={editData.age} onChange={handleEditChange} fullWidth size="small" /></Grid>
            <Grid item xs={8}><TextField label="Location" name="location" value={editData.location} onChange={handleEditChange} fullWidth size="small" /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Looking For</InputLabel>
                <Select name="lookingFor" value={editData.lookingFor} onChange={handleEditChange} label="Looking For">
                  <MenuItem value="Diabetes">Diabetes</MenuItem>
                  <MenuItem value="Fatty Liver">Fatty Liver</MenuItem>
                  <MenuItem value="Cholesterol">Cholesterol</MenuItem>
                  <MenuItem value="Others">Others</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Assigned To</InputLabel>
                <Select name="assignedTo" value={editData.assignedTo} onChange={handleEditChange} label="Assigned To">
                  <MenuItem value="">Unassigned</MenuItem>
                  {employees.map(emp => <MenuItem key={emp._id} value={emp.fullName}>{emp.fullName}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Lead Source</InputLabel>
                <Select name="leadSource" value={editData.leadSource} onChange={handleEditChange} label="Lead Source">
                  {leadSourceOptions.map(src => <MenuItem key={src} value={src}>{src}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}><TextField label="Follow-up Date" name="followUpDate" type="date" value={editData.followUpDate} onChange={handleEditChange} fullWidth size="small" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Customer details table */}
      <Table sx={{ mb: 2 }}>
        <TableHead sx={{ backgroundColor: "black" }}>
          <TableRow>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Name</TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Phone Number</TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Age</TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Location</TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Looking For</TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Assigned To</TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Created At</TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Lead Source</TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Follow-up Date</TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>{customer.name}</TableCell>
            <TableCell>{customer.phone}</TableCell>
            <TableCell>{customer.age}</TableCell>
            <TableCell>{customer.location}</TableCell>
            <TableCell>{customer.lookingFor}</TableCell>
            <TableCell>{customer.assignedTo}</TableCell>
            <TableCell>{getCreatedAtLabel(customer.createdAt)}</TableCell>
            <TableCell>{customer.leadSource}</TableCell>
            <TableCell>
              <TextField
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                type="date"
                size="small"
              />
            </TableCell>
            <TableCell><IconButton size="small" onClick={handleOpenEdit}><EditIcon/></IconButton> <Button size="small" variant="contained" onClick={handleSaveFollowUp} sx={{ ml:1, backgroundColor:'black', color:'white', '&:hover':{backgroundColor:'#333'} }}>Save</Button></TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Stepper and Lead Status Dropdown side by side */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {leadStatus === "Sales Done" ? (
          <Stepper
            alternativeLabel
            activeStep={activeStep}
            connector={<BlackConnector />}
            sx={{
              flex: 1,
              cursor: "pointer",
              "& .MuiStepIcon-root.Mui-active": { color: "black" },
              "& .MuiStepIcon-root.Mui-completed": { color: "black" },
            }}
          >
            {newStepperSteps.map((label, index) => (
              <Step
                key={label}
                completed={activeStep > index}
                onClick={() => handleStepClick(index)}
                sx={{
                  ".MuiStepLabel-root": { cursor: "pointer" },
                }}
              >
                <StepLabel StepIconComponent={CustomStepIconNew}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        ) : (
          <Stepper
            alternativeLabel
            activeStep={activeStep}
            connector={<BlackConnector />}
            sx={{
              flex: 1,
              cursor: "pointer",
              "& .MuiStepIcon-root.Mui-active": { color: "black" },
              "& .MuiStepIcon-root.Mui-completed": { color: "black" },
            }}
          >
            {stepsOriginal.map((label, index) => (
              <Step
                key={label}
                completed={activeStep > index}
                onClick={() => handleStepClick(index)}
                sx={{
                  ".MuiStepLabel-root": { cursor: "pointer" },
                }}
              >
                <StepLabel StepIconComponent={CustomStepIconOriginal}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {/* Lead Status Dropdown on the right */}
        <FormControl size="small" sx={{ minWidth: 200, ml: 2 }}>
          <InputLabel>Lead Status</InputLabel>
          <Select value={leadStatus} label="Lead Status" onChange={handleLeadStatusChange}>
            {[
              "New Lead",
              "CONS Scheduled",
              "CONS Done",
              "Sales Done",
              "Call Back Later", 
              "On Follow Up",
              "CNP", 
              "Switch Off",
              "General Query",
              "Fake Lead",
              "Invalid Number",
              "Not Interested", 
              "Ordered from Other Sources",
              "language barrier",
              "Budget issue",
            ].map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {leadStatus === "CONS Done" && (
          <FormControl size="small" sx={{ minWidth: 200, ml: 2 }}>
            <InputLabel>CONS Status</InputLabel>
            <Select
              value={subLeadStatus}
              label="Sub-Status"
              onChange={(e) => handleSubLeadStatusChange(e.target.value)}
            >
              {["Budget issue", "On Follow Up", "CNP", "Call Back Later"].map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Render child component based on the current step */}
      <Box>
        {leadStatus === "Sales Done" ? (
          activeStep === 0 ? (
            <ConsultationFollowup key={`followup-${customerId}`} customerId={customerId} />
          ) : (
            <ConsultationHistory key={`history-${customerId}`} customerId={customerId} />
          )
        ) : (
          <>
            {activeStep === 0 && <Presales key={`presales-${customerId}`} customerId={customerId} parentLeadStatus={leadStatus} />}
            {activeStep === 1 && <Consultation key={`consultation-${customerId}`} customerId={customerId} />}
            {activeStep === 2 && <Closing key={`closing-${customerId}`} customerId={customerId} />}
          </>
        )}
      </Box>
    </Box>
  );
};

export default ConsultationDetails;
