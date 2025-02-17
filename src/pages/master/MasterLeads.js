import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    MenuItem,
    IconButton,
    Typography,
    Select,
    Checkbox,
    FormControl,
    ListItemText,
    Input,
    Drawer,
    List,
    ListItem,
    Divider,
    TablePagination,
    InputLabel,
    CircularProgress,
} from "@mui/material";
import { Delete, AddCircle } from "@mui/icons-material";
import axios from "axios";
import * as FileSaver from "file-saver";
import * as XLSX from "xlsx";

const LeadTable = () => {
    const [leads, setLeads] = useState([]);
    const [agents, setAgents] = useState([]);
    const [salesAgents, setSalesAgents] = useState([]);
    const [retentionAgents, setRetentionAgents] = useState([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [validationErrors, setValidationErrors] = useState({});
    const [rowsPerPage, setRowsPerPage] = useState(30);
    const [totalPages, setTotalPages] = useState(0);
    const [totalLeads, setTotalLeads] = useState(0);
    const [loading, setLoading] = useState(false);
    const [addingLead, setAddingLead] = useState(false);
    const [applyingFilters, setApplyingFilters] = useState(false);
    const [filters, setFilters] = useState({
        date: "",
        name: "",
        contactNumber: "",
        deliveryStatus: "",
        customerType: "",
        agentAssigned: [],
        leadStatus: [],
        salesStatus: [],
        reminder: "",
        healthExpertAssigned: "",
        orderId: "",
        rtFollowupReminder: "",
        rtFollowupStatus: "",
        retentionStatus: "",
        leadSource: [],
        enquiryFor: "",
        orderDate: "",
    });

    const [newLead, setNewLead] = useState({
        date: "",
        time: "",
        name: "",
        contactNumber: "",
        leadSource: "",
        enquiryFor: "",
        customerType: "",
        agentAssigned: "",
        productPitched: [],
        leadStatus: "",
        salesStatus: "",
        nextFollowup: "",
        reminder: "",
        agentsRemarks: "",
        productsOrdered: [],
        dosageOrdered: "",
        amountPaid: "",
        modeOfPayment: "",
        deliveryStatus: "",
        healthExpertAssigned: "",
        orderId: "",
        dosageExpiring: "",
        rtNextFollowupDate: "",
        rtFollowupReminder: "",
        rtFollowupStatus: "",
        lastOrderDate: "",
        repeatDosageOrdered: "",
        retentionStatus: "",
        rtRemark: "",
    });
    const [multiSelectOptions] = useState(["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"]);


    useEffect(() => {
        fetchLeads(currentPage, rowsPerPage);
        fetchAgents();
        fetchEmployeesByRole("Sales Agent", setSalesAgents);
        fetchEmployeesByRole("Retention Agent", setRetentionAgents);
    }, [currentPage, rowsPerPage]);

    const fetchLeads = async (page, limit, activeFilters = filters) => {
        try {
            const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads", {
                params: {
                    page,
                    limit,
                    filters: JSON.stringify(activeFilters),
                },
            });
            setLeads(response.data.leads);
            setTotalPages(response.data.totalPages);
            setTotalLeads(response.data.totalLeads);
        } catch (error) {
            console.error("Failed to fetch leads", error);
        }
    };


    const fetchEmployeesByRole = async (role, setState) => {
        try {
            const response = await axios.get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees?role=${encodeURIComponent(role)}`);
            setState(response.data);
        } catch (error) {
            console.error(`Failed to fetch ${role} employees`, error);
        }
    };

    const fetchAgents = async () => {
        try {
            const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees");
            const filteredAgents = response.data.filter((employee) => employee.role.toLowerCase() === "agent");
            setAgents(filteredAgents);
        } catch (error) {
            console.error("Failed to fetch agents", error);
        }
    };



    const handleAddRow = async () => {
        setAddingLead(true);
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().split("T")[0];
        const formattedTime = currentDate.toLocaleTimeString("en-IN");

        const leadToAdd = {
            ...newLead,
            date: formattedDate,
            time: formattedTime,
        };

        const newLeadData = {
            ...newLead,
            date: new Date().toISOString().split("T")[0],
            time: new Date().toLocaleTimeString(),
        };


        try {
            const response = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads", newLeadData, leadToAdd);
            if (response.status === 201) {
                setLeads([response.data.lead, ...leads]);
                // fetchLeads();
                setNewLead({
                    date: "",
                    time: "",
                    name: "",
                    contactNumber: "",
                    leadSource: "",
                    enquiryFor: "",
                    customerType: "",
                    agentAssigned: "",
                    productPitched: [],
                    leadStatus: "",
                    salesStatus: "",
                    nextFollowup: "",
                    reminder: "",
                    agentsRemarks: "",
                    productsOrdered: [],
                    dosageOrdered: "",
                    amountPaid: "",
                    modeOfPayment: "",
                    deliveryStatus: "",
                    healthExpertAssigned: "",
                    orderId: "",
                    dosageExpiring: "",
                    rtNextFollowupDate: "",
                    rtFollowupReminder: "",
                    rtFollowupStatus: "",
                    lastOrderDate: "",
                    repeatDosageOrdered: "",
                    retentionStatus: "",
                    rtRemark: "",
                });
            }
        } catch (error) {
            console.error("Error adding lead:", error);
        } finally {
            setAddingLead(false); // Stop spinner for Add Lead button
        }
    };

    const handleDeleteLead = async (id) => {
        try {
            await axios.delete(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${id}`);
            setLeads(leads.filter((lead) => lead._id !== id));
        } catch (error) {
            console.error('Error deleting lead:', error);
        }
    };


    const handleInputChange = async (e, index, field) => {
        const updatedLeads = [...leads];  

        // Update the field in the cloned array
        updatedLeads[index][field] = e.target.value;
        setLeads(updatedLeads); 

        // Handle specific field logic
        if (field === "dosageOrdered") {
            const days = parseInt(e.target.value.split("-")[0], 10);
            updatedLeads[index].dosageExpiring = calculateDosageExpiring(days);
        }

        if (field === "contactNumber") {
            const enteredNumber = e.target.value;

            // Check if the number exists in the database
            try {
                const response = await axios.get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/check-duplicate`, {
                    params: { contactNumber: enteredNumber },
                });

                if (response.data.exists) {
                    // If duplicate, set validation error
                    setValidationErrors((prev) => ({
                        ...prev,
                        [index]: "This number is already registered",
                    }));
                    return; // Prevent further execution
                } else {
                    // Clear error if no duplicate
                    setValidationErrors((prev) => ({
                        ...prev,
                        [index]: null,
                    }));
                }
            } catch (error) {
                console.error("Error checking duplicate number:", error);
            }
        }

        // Save the updated field to MongoDB
        const leadId = updatedLeads[index]._id;
        try {
            await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${leadId}`, {
                [field]: e.target.value,
            });
        } catch (error) {
            console.error("Error updating lead:", error);
        }
    };


    const calculateDosageExpiring = (days) => {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + days);
        return currentDate.toISOString().split("T")[0];
    };

    const handleSaveLead = async (index) => {
        const lead = leads[index];
        if (!lead._id) {
            console.error("Missing lead ID for update.");
            return;
        }

        try {
            const response = await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${lead._id}`, lead);
            if (response.status === 200) {
                console.log("Lead updated successfully");
                fetchLeads();
            } else {
                console.error("Failed to update lead:", response.data);
            }
        } catch (error) {
            console.error("Error updating lead:", error.response?.data || error.message);
        }
    };

    const handleSalesStatusChange = (e, index) => {
        const updatedLeads = [...leads];
        updatedLeads[index].salesStatus = e.target.value;



        setLeads(updatedLeads);
    };

    const handleCombinedChange = (event, index, field) => {
        const { value } = event.target;

        handleSalesStatusChange(event, index);

        handleInputChange(event, index, field);
    };

    const calculateReminder = (nextFollowup) => {
        if (!nextFollowup) return "";

        const followupDate = new Date(nextFollowup);
        const today = new Date();
        const diffInDays = Math.ceil((followupDate - today) / (1000 * 60 * 60 * 24));

        if (diffInDays < 0) return "Follow-up Missed";
        if (diffInDays === 0) return "Today";
        if (diffInDays === 1) return "Tomorrow";
        return diffInDays > 1 ? "Later" : "";
    };

    const isValidDate = (dateString) => {
        const regEx = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateString.match(regEx)) return false;
        const d = new Date(dateString);
        const dNum = d.getTime();
        if (!dNum && dNum !== 0) return false;
        return d.toISOString().slice(0, 10) === dateString;
    }

    const formatToISODate = (dateString) => {
        const [day, month, year] = dateString.split("-");
        return `${year}-${month}-${day}`;
    };

    const applyFilters = async () => {
        setApplyingFilters(true);
        setCurrentPage(1);

        try {
            const activeFilters = {
                ...filters,
                startDate: filters.startDate ? formatToISODate(filters.startDate) : "",
                endDate: filters.endDate ? formatToISODate(filters.endDate) : "",
            };

            const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads", {
                params: {
                    page: 1,
                    limit: rowsPerPage,
                    filters: JSON.stringify(activeFilters),
                },
            }); 

            setLeads(response.data.leads);
            setTotalPages(response.data.totalPages);
            setTotalLeads(response.data.totalLeads);
        } catch (error) {
            console.error("Error applying filters:", error);
        } finally {
            setApplyingFilters(false);
        }
    };
 
    const exportToCSV = async () => {
        try {
            const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads", {
                params: { page: 1, limit: 8000 },  
            });
            const allLeads = response.data.leads;

            const worksheet = XLSX.utils.json_to_sheet(allLeads);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

            const excelBuffer = XLSX.write(workbook, { bookType: "csv", type: "array" });
            const data = new Blob([excelBuffer], { type: "text/csv;charset=utf-8;" });
            FileSaver.saveAs(data, "leads_data.csv");
        } catch (error) {
            console.error("Error exporting data:", error);
        }
    };

    const handleChangePage = (event, newPage) => {
        setCurrentPage(newPage + 1);
        fetchLeads(newPage + 1, rowsPerPage, filters);  
    };


    const handleChangeRowsPerPage = (event) => {
        const newRowsPerPage = parseInt(event.target.value, 10);
        setRowsPerPage(newRowsPerPage);
        setCurrentPage(1); // Reset to the first page
        fetchLeads(1, newRowsPerPage, filters); 
    };

    const currentLeads = leads.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);


    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h5" gutterBottom>
                Master Data - Leads
            </Typography>

            <Button
                variant="contained"
                startIcon={addingLead ? <CircularProgress size={20} /> : <AddCircle />}
                onClick={handleAddRow}
                sx={{ mb: 2 }}
                disabled={addingLead}
            >
                Add Lead
            </Button>

            <Button
                variant="contained"
                onClick={() => setFilterOpen(true)}
                sx={{ mb: 2, ml: 2 }}
            >
                Filter
            </Button>

            <Button
                variant="contained"
                onClick={exportToCSV}
                sx={{ mb: 2, ml: 2 }}
            >
                Export to CSV
            </Button>

            <Drawer
                anchor="right"
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
            >
                <Box sx={{ width: 300, padding: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Filters
                    </Typography>
                    <Divider />
                    <List>
                        <ListItem>
                            <TextField
                                fullWidth
                                type="date"
                                label="Start Date"
                                value={filters.startDate}
                                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                                sx={{
                                    marginBottom: 0,
                                    "& .MuiInputBase-input": {
                                        padding: "10px 12px",
                                    },
                                    "& .MuiOutlinedInput-root": {
                                        borderColor: "#0073e6",
                                        "&:hover fieldset": {
                                            borderColor: "#005bb5",
                                        },
                                    },
                                }}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                            />
                        </ListItem>
                        <ListItem>
                            <TextField
                                fullWidth
                                type="date"
                                label="End Date"
                                value={filters.endDate}
                                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                                sx={{
                                    marginBottom: 0,
                                    "& .MuiInputBase-input": {
                                        padding: "10px 12px",
                                    },
                                    "& .MuiOutlinedInput-root": {
                                        borderColor: "#0073e6",
                                        "&:hover fieldset": {
                                            borderColor: "#005bb5",
                                        },
                                    },
                                }}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                            />
                        </ListItem>
                        <ListItem>
                            <TextField
                                fullWidth
                                label="Name"
                                value={filters.name}
                                onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))}
                            />
                        </ListItem>
                        <ListItem>
                            <TextField
                                fullWidth
                                label="Contact Number"
                                value={filters.contactNumber}
                                onChange={(e) => setFilters((prev) => ({ ...prev, contactNumber: e.target.value }))}
                            />
                        </ListItem>
                        <ListItem>
                            <TextField
                                fullWidth
                                type="date"
                                label="Order Date"
                                value={filters.orderDate}
                                onChange={(e) => setFilters((prev) => ({ ...prev, orderDate: e.target.value }))}
                                sx={{
                                    marginBottom: 0,
                                    "& .MuiInputBase-input": {
                                        padding: "10px 12px",
                                    },
                                    "& .MuiOutlinedInput-root": {
                                        borderColor: "#0073e6",
                                        "&:hover fieldset": {
                                            borderColor: "#005bb5",
                                        },
                                    },
                                }}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                            />
                        </ListItem>
                        <ListItem>
                            <FormControl fullWidth>
                                <InputLabel>Agent Assigned</InputLabel>
                                <Select
                                    multiple
                                    value={filters.agentAssigned}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, agentAssigned: e.target.value }))}
                                    input={<Input />}
                                    renderValue={(selected) => selected.join(", ")}
                                >
                                    {salesAgents.map((agent) => (
                                        <MenuItem key={agent.fullName} value={agent.fullName}>
                                            <Checkbox checked={filters.agentAssigned.includes(agent.fullName)} />
                                            <ListItemText primary={agent.fullName} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </ListItem>
                        <ListItem>
                            <FormControl fullWidth>
                                <InputLabel>Lead Source</InputLabel>
                                <Select
                                    multiple
                                    value={filters.leadSource}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, leadSource: e.target.value }))}
                                    input={<Input />}
                                    renderValue={(selected) => selected.join(", ")}
                                >
                                    {[
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
                                    ].map((source) => (
                                        <MenuItem key={source} value={source}>
                                            <Checkbox checked={filters.leadSource.includes(source)} />
                                            <ListItemText primary={source} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </ListItem>
                        <ListItem>
                            <FormControl fullWidth>
                                <InputLabel>Lead Status</InputLabel>
                                <Select
                                    multiple
                                    value={filters.leadStatus}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, leadStatus: e.target.value }))}
                                    input={<Input />}
                                    renderValue={(selected) => selected.join(", ")}
                                >
                                    {[
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
                                    ].map((status) => (
                                        <MenuItem key={status} value={status}>
                                            <Checkbox checked={filters.leadStatus.includes(status)} />
                                            <ListItemText primary={status} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </ListItem>
                        <ListItem>
                            <FormControl fullWidth>
                                <InputLabel>Reminder</InputLabel>
                                <Select
                                    value={filters.reminder || ""}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, reminder: e.target.value }))}
                                >
                                    {["Follow-up Missed", "Today", "Tomorrow", "Later"].map((option) => (
                                        <MenuItem key={option} value={option}>
                                            {option}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </ListItem>
                        <ListItem>
                            <FormControl fullWidth>
                                <InputLabel>RT-Followup Reminder</InputLabel>
                                <Select
                                    value={filters.rtFollowupReminder || ""}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, rtFollowupReminder: e.target.value }))}
                                >
                                    {["Follow-up Missed", "Today", "Tomorrow", "Later"].map((option) => (
                                        <MenuItem key={option} value={option}>
                                            {option}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </ListItem>

                        <ListItem>
                            <FormControl fullWidth>
                                <InputLabel>Sales Status</InputLabel>
                                <Select
                                    multiple
                                    value={filters.salesStatus}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, salesStatus: e.target.value }))}
                                    input={<Input />}
                                    renderValue={(selected) => selected.join(", ")}
                                >
                                    {["Sales Done", "Lost", "On Follow Up"].map((status) => (
                                        <MenuItem key={status} value={status}>
                                            <Checkbox checked={filters.salesStatus.includes(status)} />
                                            <ListItemText primary={status} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </ListItem>
                        {[
                            { key: 'deliveryStatus', options: ['Delivered', 'RTO', 'Undelivered'] },
                            { key: 'customerType', options: ['Fresh', 'Renewal', 'Online Order'] },
                            { key: 'healthExpertAssigned', options: retentionAgents.map(agent => agent.fullName) },
                            { key: 'rtFollowupStatus', options: ['Good Results', 'No Result', 'Sales Done', 'Do Not Want to Continue', 'Call Not Picked', 'Blood Test Suggested', 'Product Issue', 'Order from Other Source', 'Upsell', 'Follow Up Again', 'Call Back', 'Others'] },
                            { key: 'retentionStatus', options: ['Active', 'Lost'] },
                            { key: 'enquiryFor', options: ['KJF', 'SDP', 'VKR', 'L-Fx', 'S&S', 'CPV', 'HDP', 'PF', 'PGut', 'Shilajit', 'Kit', 'Blood Test'] },
                        ].map(field => (
                            <ListItem key={field.key}>
                                <FormControl fullWidth>
                                    <InputLabel>{field.key}</InputLabel>
                                    <Select
                                        value={filters[field.key]}
                                        onChange={(e) => setFilters((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                        label={field.key}
                                    >
                                        {field.options.map(option => (
                                            <MenuItem key={option} value={option}>{option}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </ListItem>
                        ))}
                    </List>
                    <Divider />
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={applyingFilters ? <CircularProgress size={20} /> : null}
                        disabled={applyingFilters}
                        onClick={() => {
                            applyFilters();
                            setFilterOpen(false);
                        }}
                        sx={{ marginBottom: 1, backgroundColor: "#0073e6" }}
                    >
                        Apply Filters
                    </Button>

                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => {
                            const defaultFilters = {
                                date: "",
                                name: "",
                                contactNumber: "",
                                deliveryStatus: "",
                                customerType: "",
                                agentAssigned: [],
                                leadStatus: [],
                                salesStatus: [],
                                reminder: "",
                                healthExpertAssigned: "",
                                orderId: "",
                                rtFollowupReminder: "",
                                rtFollowupStatus: "",
                                retentionStatus: "",
                                leadSource: [],
                                enquiryFor: "",
                                orderDate: "",
                            };
                            setFilters(defaultFilters);
                            setCurrentPage(1);
                            fetchLeads(1, rowsPerPage, defaultFilters);
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
                            <TableCell>Delete</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Time</TableCell>
                            <TableCell>Name *</TableCell>
                            <TableCell>Contact No *</TableCell>
                            <TableCell>Lead Source *</TableCell>
                            <TableCell>Enquiry For *</TableCell>
                            <TableCell>Customer Type *</TableCell>
                            <TableCell>Agent Assigned *</TableCell>
                            <TableCell>Product Pitched</TableCell>
                            <TableCell>Lead Status</TableCell>
                            <TableCell>Sales Status</TableCell>
                            <TableCell>Next Followup</TableCell>
                            <TableCell>Reminder</TableCell>
                            <TableCell>Agent's Remarks</TableCell>
                            <TableCell>First Order Date</TableCell>
                            <TableCell>Products Ordered</TableCell>
                            <TableCell>Dosage Ordered</TableCell>
                            <TableCell>Amount Paid</TableCell>
                            <TableCell>Mode of Payment</TableCell>
                            <TableCell>Delivery Status</TableCell>
                            <TableCell>Health Expert Assigned</TableCell>
                            <TableCell>Order ID</TableCell>
                            <TableCell>Dosage Expiring</TableCell>
                            <TableCell>RT Next Followup Date</TableCell>
                            <TableCell>RT-Followup Reminder</TableCell>
                            <TableCell>RT-Followup Status</TableCell>
                            <TableCell>Repeat Dosage Ordered</TableCell>
                            <TableCell>Retention Status</TableCell>
                            <TableCell>RT-Remark</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} align="center">
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : (
                            leads.map((lead, index) => (
                                <TableRow key={lead._id}>
                                    <TableCell>
                                        <IconButton color="error" onClick={() => handleDeleteLead(lead._id)}>
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            type="date"
                                            value={lead.date || ""}
                                            onChange={(e) => handleInputChange(e, index, "date")}
                                        />
                                    </TableCell>
                                    <TableCell style={{ whiteSpace: "nowrap", minWidth: "150px" }}>
                                        <TextField
                                            value={lead.time || new Date().toLocaleTimeString("en-IN")}
                                            disabled
                                        />
                                    </TableCell>
                                    <TableCell className="px-6 py-4" style={{ whiteSpace: "nowrap", minWidth: "240px" }}>
                                        <TextField
                                            value={lead.name}
                                            onChange={(e) => handleInputChange(e, index, "name")}
                                        />
                                    </TableCell>
                                    <TableCell className="px-6 py-4" style={{ whiteSpace: "nowrap", minWidth: "200px" }}>
                                        <TextField
                                            type="number"
                                            value={lead.contactNumber || ""}
                                            onChange={(e) => handleInputChange(e, index, "contactNumber")}
                                            error={Boolean(validationErrors[index])}
                                            helperText={validationErrors[index]}
                                            sx={{
                                                flexGrow: 1,
                                                '& input[type=number]': {
                                                  MozAppearance: 'textfield',  
                                                },
                                                '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                                                  WebkitAppearance: 'none', 
                                                  margin: 0,
                                                },
                                              }}
                                        />
                                    </TableCell>
                                    <TableCell >
                                        <Select
                                            value={lead.leadSource || ""}
                                            onChange={(e) => handleInputChange(e, index, "leadSource")}
                                        >
                                            {[
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
                                            ].map((source) => (
                                                <MenuItem key={source} value={source}>
                                                    {source}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.enquiryFor || ""}
                                            onChange={(e) => handleInputChange(e, index, "enquiryFor")}
                                        >
                                            {["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"].map(
                                                (item) => (
                                                    <MenuItem key={item} value={item}>
                                                        {item}
                                                    </MenuItem>
                                                )
                                            )}
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.customerType || ""}
                                            onChange={(e) => handleInputChange(e, index, "customerType")}
                                        >
                                            {["Fresh", "Renewal", "Online Order"].map((type) => (
                                                <MenuItem key={type} value={type}>
                                                    {type}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.agentAssigned || ""}
                                            onChange={(e) => handleInputChange(e, index, "agentAssigned")}
                                            fullWidth
                                        >
                                            {salesAgents.map((agent) => (
                                                <MenuItem key={agent._id} value={agent.fullName}>
                                                    {agent.fullName}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>

                                    <TableCell>
                                        <FormControl>
                                            <Select
                                                multiple
                                                value={lead.productPitched || []}
                                                onChange={(e) => handleInputChange(e, index, "productPitched")}
                                                renderValue={(selected) => selected.join(", ")}
                                            >
                                                {["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"].map(
                                                    (option) => (
                                                        <MenuItem key={option} value={option}>
                                                            <Checkbox checked={lead.productPitched?.includes(option)} />
                                                            <ListItemText primary={option} />
                                                        </MenuItem>
                                                    )
                                                )}
                                            </Select>
                                        </FormControl>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.leadStatus || ""}
                                            onChange={(e) => handleInputChange(e, index, "leadStatus")}
                                        >
                                            {[
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
                                            ].map((status) => (
                                                <MenuItem key={status} value={status}>
                                                    {status}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.salesStatus || ""}
                                            onChange={(e) => handleCombinedChange(e, index, "salesStatus")}
                                        >
                                            {["Sales Done", "Lost", "On Follow Up"].map((status) => (
                                                <MenuItem key={status} value={status}>
                                                    {status}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        {lead.salesStatus === "On Follow Up" ? (
                                            <TextField
                                                type="date"
                                                value={lead.nextFollowup || ""}
                                                onChange={(e) => handleInputChange(e, index, "nextFollowup")}
                                            />
                                        ) : (
                                            <Typography>{lead.nextFollowup || ""}</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color:
                                                calculateReminder(lead.nextFollowup) === "Today"
                                                    ? "green"
                                                    : calculateReminder(lead.nextFollowup) === "Tomorrow"
                                                        ? "blue"
                                                        : calculateReminder(lead.nextFollowup) ===
                                                            "Follow-up Missed"
                                                            ? "red"
                                                            : "inherit",
                                        }}
                                    >
                                        {lead.salesStatus === "On Follow Up"
                                            ? calculateReminder(lead.nextFollowup)
                                            : lead.salesStatus}
                                    </TableCell>
                                    <TableCell style={{ whiteSpace: "nowrap", minWidth: "250px" }}>
                                        <TextField
                                            value={lead.agentsRemarks || ""}
                                            onChange={(e) => handleInputChange(e, index, "agentsRemarks")}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            type="date"
                                            value={lead.lastOrderDate || ""}
                                            onChange={(e) => handleInputChange(e, index, "lastOrderDate")}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <FormControl>
                                            <Select
                                                multiple
                                                value={lead.productsOrdered || []}
                                                onChange={(e) => handleInputChange(e, index, "productsOrdered")}
                                                renderValue={(selected) => selected.join(", ")}
                                            >
                                                {["KJF", "SDP", "VKR", "L-Fx", "S&S", "CPV", "HDP", "PF", "PGut", "Shilajit", "Kit", "Blood Test"].map(
                                                    (option) => (
                                                        <MenuItem key={option} value={option}>
                                                            <Checkbox checked={lead.productsOrdered?.includes(option)} />
                                                            <ListItemText primary={option} />
                                                        </MenuItem>

                                                    )
                                                )}
                                            </Select>
                                        </FormControl>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.dosageOrdered || ""}
                                            onChange={(e) => handleInputChange(e, index, "dosageOrdered")}
                                        >
                                            {["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"].map((dosage) => (
                                                <MenuItem key={dosage} value={dosage}>
                                                    {dosage}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell style={{ whiteSpace: "nowrap", minWidth: "160px" }}>
                                        <TextField
                                            type="number"
                                            value={lead.amountPaid || ""}
                                            onChange={(e) => handleInputChange(e, index, "amountPaid")}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.modeOfPayment || ""}
                                            onChange={(e) => handleInputChange(e, index, "modeOfPayment")}
                                        >
                                            {["Partial Paid", "Razorpay", "COD", "UPI", "Bank Transfer"].map((mode) => (
                                                <MenuItem key={mode} value={mode}>
                                                    {mode}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.deliveryStatus || ""}
                                            onChange={(e) => handleInputChange(e, index, "deliveryStatus")}
                                        >
                                            {["Delivered", "RTO", "Undelivered"].map((status) => (
                                                <MenuItem key={status} value={status}>
                                                    {status}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.healthExpertAssigned || ""}
                                            onChange={(e) => handleInputChange(e, index, "healthExpertAssigned")}
                                            fullWidth
                                        >
                                            {retentionAgents.map((expert) => (
                                                <MenuItem key={expert._id} value={expert.fullName}>
                                                    {expert.fullName}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell style={{ whiteSpace: "nowrap", minWidth: "150px" }}>
                                        <TextField
                                            value={lead.orderId || ""}
                                            onChange={(e) => handleInputChange(e, index, "orderId")}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            type="date"
                                            disabled
                                            value={lead.dosageExpiring || ""}
                                            onChange={(e) => handleInputChange(e, index, "dosageExpiring")}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            type="date"
                                            value={lead.rtNextFollowupDate || ""}
                                            onChange={(e) => handleInputChange(e, index, "rtNextFollowupDate")}
                                        />
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color:
                                                lead.rtFollowupReminder === "Today"
                                                    ? "green"
                                                    : lead.rtFollowupReminder === "Tomorrow"
                                                        ? "blue"
                                                        : lead.rtFollowupReminder === "Follow-up Missed"
                                                            ? "red"
                                                            : "inherit",
                                        }}
                                    >
                                        {lead.rtFollowupReminder || ""}
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.rtFollowupStatus || ""}
                                            onChange={(e) => handleInputChange(e, index, "rtFollowupStatus")}
                                        >
                                            {[
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
                                            ].map((status) => (
                                                <MenuItem key={status} value={status} style={{ whiteSpace: "nowrap", minWidth: "200px" }}>
                                                    {status}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>

                                    <TableCell>
                                        <Select
                                            value={lead.repeatDosageOrdered || ""}
                                            onChange={(e) => handleInputChange(e, index, "repeatDosageOrdered")}
                                        >
                                            {["10-Days", "20-Days", "30-Days", "60-Days", "90-Days"].map((dosage) => (
                                                <MenuItem key={dosage} value={dosage}>
                                                    {dosage}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.retentionStatus || ""}
                                            onChange={(e) => handleInputChange(e, index, "retentionStatus")}
                                        >
                                            {["Active", "Lost"].map((status) => (
                                                <MenuItem key={status} value={status}>
                                                    {status}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell style={{ whiteSpace: "nowrap", minWidth: "180px" }}>
                                        <TextField
                                            value={lead.rtRemark || ""}
                                            onChange={(e) => handleInputChange(e, index, "rtRemark")}
                                        />
                                    </TableCell>  
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div"
                count={totalLeads}
                page={currentPage - 1}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 30, 50, 100]}
            />
        </Box>
    );

};

export default LeadTable;