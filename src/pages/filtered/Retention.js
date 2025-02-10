import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import { useParams } from "react-router-dom";


const RetentionData = () => {
  const { filterType } = useParams();
  const [leads, setLeads] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);


  const user = JSON.parse(sessionStorage.getItem("user"));
  const todayDate = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];


  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };


  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };


  const salesData = [
    "Sales Done",
    "Sales Done Today",
    "Customers Retained This Month",
  ].includes(filterType);
  const data = salesData ? sales : leads;


  const paginatedData = data.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage
  );


  const applyFilter = (data, filterType, user) => {
    // if (!filterType || !user) return data;


    const filters = {
      "Active Customers": (lead) =>
        lead.healthExpertAssigned === user.fullName &&
        (!lead.retentionStatus || lead.retentionStatus === "Active"),


      "Lost Customers": (lead) =>
        lead.healthExpertAssigned === user.fullName &&
        lead.retentionStatus === "Lost",


      "Sales Done": (sale) => sale.orderCreatedBy === user.fullName,


      "No Followup Set": (lead) =>
        lead.healthExpertAssigned?.toLowerCase() ===
          user.fullName?.toLowerCase() &&
        (!lead.rtNextFollowupDate || lead.rtNextFollowupDate.trim() === ""),


      "Followup Today": (lead) =>
        lead.healthExpertAssigned?.toLowerCase() ===
          user.fullName?.toLowerCase() && lead.rtNextFollowupDate === todayDate,


      "Followup Tomorrow": (lead) =>
        lead.healthExpertAssigned?.toLowerCase() ===
          user.fullName?.toLowerCase() &&
        lead.rtNextFollowupDate === tomorrowDate,


      "Followup Missed": (lead) =>
        lead.healthExpertAssigned?.toLowerCase() ===
          user.fullName?.toLowerCase() &&
        lead.rtNextFollowupDate &&
        lead.rtNextFollowupDate < todayDate,


      "Followup Later": (lead) =>
        lead.healthExpertAssigned?.toLowerCase() ===
          user.fullName?.toLowerCase() &&
        lead.rtNextFollowupDate > tomorrowDate,
    };


    const filteredData = data.filter(filters[filterType] || (() => true));


    console.log("Filtered Data: ", filteredData);


    return filteredData;
  };


  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }


    const fetchData = async () => {
      try {
        const [leadsResponse, salesResponse] = await Promise.all([
          axios.get(
            "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retentions",
            {
              params: { limit: 0, fullName: user.fullName, email: user.email },
            }
          ),
          axios.get(
            "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales",
            {
              params: { orderCreatedBy: user.fullName },
            }
          ),
        ]);


        setLeads(applyFilter(leadsResponse.data || [], filterType, user));
        setSales(applyFilter(salesResponse.data || [], filterType, user));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(true);
      }
    };
    fetchData();
  }, []);


  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }


  return (
    <Box
      sx={{ padding: { xs: 2, sm: 3, md: 4 }, margin: "auto", width: "95%" }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{ fontWeight: "bold", textAlign: "center", mb: 3 }}
      >
        {filterType} -{" "}
        {[
          "Sales Done",
          "Sales Done Today",
          "Customers Retained This Month",
        ].includes(filterType)
          ? "Sales Data"
          : "Leads Data"}
      </Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 1000 }}>
        {[
          "Sales Done",
          "Sales Done Today",
          "Customers Retained This Month",
        ].includes(filterType) ? (
          <Table stickyHeader aria-label="filtered sales table">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Contact No</TableCell>
                <TableCell>Products Ordered</TableCell>
                <TableCell>Dosage Ordered</TableCell>
                <TableCell>Amount Paid</TableCell>
                <TableCell>Mode of Payment</TableCell>
                <TableCell>Delivery Status</TableCell>
                <TableCell>Order Created By</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((sale) => (
                  <TableRow key={sale._id}>
                    <TableCell>{sale.date}</TableCell>
                    <TableCell>{sale.name}</TableCell>
                    <TableCell>{sale.contactNumber}</TableCell>
                    <TableCell>{sale.productsOrdered?.join(", ")}</TableCell>
                    <TableCell>{sale.dosageOrdered}</TableCell>
                    <TableCell>{sale.amountPaid}</TableCell>
                    <TableCell>{sale.modeOfPayment}</TableCell>
                    <TableCell>{sale.deliveryStatus}</TableCell>
                    <TableCell>{sale.orderCreatedBy}</TableCell>
                    <TableCell>{sale.actions}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} style={{ textAlign: "center" }}>
                    No sales data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <Table stickyHeader aria-label="filtered leads table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Contact No</TableCell>
                <TableCell>Sales Agent Assigned</TableCell>
                <TableCell>Product Pitched</TableCell>
                <TableCell>Products Ordered</TableCell>
                <TableCell>Dosage Ordered</TableCell>
                <TableCell>Delivery Status</TableCell>
                <TableCell>Health Expert Assigned</TableCell>
                <TableCell>RT Followup Status</TableCell>
                <TableCell>Retention Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((lead) => (
                  <TableRow key={lead._id}>
                    <TableCell>{lead.name}</TableCell>
                    <TableCell>{lead.contactNumber}</TableCell>
                    <TableCell>{lead.agentAssigned}</TableCell>
                    <TableCell>{lead.productPitched?.join(", ")}</TableCell>
                    <TableCell>{lead.productsOrdered?.join(", ")}</TableCell>
                    <TableCell>{lead.dosageOrdered}</TableCell>
                    <TableCell>{lead.deliveryStatus}</TableCell>
                    <TableCell>{lead.healthExpertAssigned}</TableCell>
                    <TableCell>{lead.rtFollowupStatus}</TableCell>
                    <TableCell>{lead.retentionStatus}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} style={{ textAlign: "center" }}>
                    No leads data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={currentPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </TableContainer>
    </Box>
  );
};


export default RetentionData;



