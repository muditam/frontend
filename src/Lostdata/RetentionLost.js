import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  TablePagination,
  Button,
  Box,
} from "@mui/material";
import axios from "axios";
import * as XLSX from "xlsx";
import * as FileSaver from "file-saver";

const RetentionLost = () => {
  // Zero-indexed page for the TablePagination component; convert to 1-indexed for API requests.
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [totalLeads, setTotalLeads] = useState(0);

  const fetchLostLeads = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads",
        {
          params: {
            page: page + 1, // API expects a 1-indexed page number.
            limit: rowsPerPage,
            // Pass filters to return only the leads with retentionStatus "Lost"
            filters: JSON.stringify({ retentionStatus: ["Lost"] }),
          },
        }
      );
      // Expecting response.data to include keys: leads and totalLeads.
      setLeads(response.data.leads);
      setTotalLeads(response.data.totalLeads);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data whenever the page or rowsPerPage changes.
  useEffect(() => {
    fetchLostLeads();
  }, [page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // New function to download all retention lost leads
  const downloadCSV = async () => {
    try {
      // Fetch all leads using totalLeads as the limit, or a high number if totalLeads is 0
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads",
        {
          params: {
            page: 1,
            limit: totalLeads || 10000,
            filters: JSON.stringify({ retentionStatus: ["Lost"] }),
          },
        }
      );
      const allLeads = response.data.leads;
      // Convert JSON data to worksheet
      const worksheet = XLSX.utils.json_to_sheet(allLeads);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "RetentionLost");
      // Write workbook to CSV format
      const csvOutput = XLSX.write(workbook, { bookType: "csv", type: "array" });
      const data = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
      FileSaver.saveAs(data, "RetentionLost.csv");
    } catch (error) {
      console.error("Error downloading CSV:", error);
    }
  };

  return (
    <Paper sx={{ margin: "16px" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Retention Lost Leads
        </Typography>
        <Button variant="contained" onClick={downloadCSV}>
          Download CSV
        </Button>
      </Box>
      {loading ? (
        <CircularProgress sx={{ margin: "16px" }} />
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact No</TableCell>
                  <TableCell>Enquiry For</TableCell>
                  <TableCell>Lead Status</TableCell>
                  <TableCell>First Order Date</TableCell>
                  <TableCell>Retention Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead._id}>
                    <TableCell>{lead.name}</TableCell>
                    <TableCell>{lead.contactNumber}</TableCell>
                    <TableCell>{lead.enquiryFor}</TableCell>
                    <TableCell>{lead.leadStatus}</TableCell>
                    <TableCell>{lead.lastOrderDate}</TableCell>
                    <TableCell>{lead.retentionStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalLeads}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 30, 50, 100]}
          />
        </>
      )}
    </Paper>
  );
};

export default RetentionLost;
