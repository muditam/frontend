import React, { useEffect, useState } from "react";
import axios from "axios";
import { TablePagination } from "@mui/material";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const DuplicateNumbers = () => {
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // pagination state
  const [page, setPage] = useState(0);            // 0-based for MUI
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalGroups, setTotalGroups] = useState(0);

  const groupColors = ["#d3d3d3", "#90ee90"];

  const fetchDuplicates = async (p = page, l = rowsPerPage) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/duplicate-leads/duplicates`, {
        params: { page: p + 1, limit: l }, // backend expects 1-based page
      });
      // Response shape: { page, limit, totalGroups, groups: [...] }
      setDuplicateGroups(res.data.groups || []);
      setTotalGroups(res.data.totalGroups || 0);
    } catch (error) {
      console.error("Error fetching duplicates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates(0, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangePage = (_e, newPage) => {
    setPage(newPage);
    fetchDuplicates(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setRowsPerPage(newLimit);
    setPage(0);
    fetchDuplicates(0, newLimit);
  };

  const handleDeleteLead = async (leadId, type) => {
    try {
      await axios.delete(`${API_BASE}/api/duplicate-leads/${type}/${leadId}`);

      // Optimistically update state
      setDuplicateGroups((prevGroups) =>
        prevGroups
          .map((group) => ({
            ...group,
            leads: group.leads.filter((lead) => lead._id !== leadId),
          }))
          .filter((group) => group.leads.length > 1)
      );

      // Optional: if this page becomes empty after deletion, refetch current page
      // (helps when the last group on a page gets reduced)
      // If needed, uncomment:
      // if (duplicateGroups.every(g => g.leads.length <= 1)) {
      //   fetchDuplicates(page, rowsPerPage);
      // }
    } catch (error) {
      console.error("Error deleting lead:", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ fontSize: "12px", margin: "20px" }}>
      <h2>Duplicate Leads</h2>
      <table border="1" cellPadding="5" cellSpacing="0" width="100%">
        <thead>
          <tr>
            <th>Delete</th>
            <th>Contact Number</th>
            <th>Name</th>
            <th>Agent Assigned</th>
            <th>Lead Status</th>
            <th>Sales Status</th>
            <th>Health Expert</th>
            <th>Retention Status</th>
          </tr>
        </thead>
        <tbody>
          {duplicateGroups.map((group, groupIndex) =>
            (group.leads || []).map((lead) => (
              <tr
                key={lead._id}
                style={{
                  backgroundColor: groupColors[groupIndex % groupColors.length],
                }}
              >
                <td>
                  <button
                    onClick={() => handleDeleteLead(lead._id, lead.type)}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                    title="Delete Lead"
                  >
                    🗑️
                  </button>
                </td>
                <td>{lead.contactNumber}</td>
                <td>{lead.name}</td>
                <td>{lead.agentAssigned}</td>
                <td>{lead.leadStatus}</td>
                <td>{lead.salesStatus}</td>
                <td>{lead.healthExpertAssigned}</td>
                <td>{lead.type === "customer" ? "?" : (lead.retentionStatus ?? "")}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <TablePagination
        component="div"
        count={totalGroups}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[25, 50, 100, 200]}
      />
    </div>
  );
};

export default DuplicateNumbers;
