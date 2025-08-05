import React, { useEffect, useState } from "react";
import axios from "axios";

const DuplicateNumbers = () => {
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch duplicate groups from the backend.
  const fetchDuplicates = async () => {
    try {
      const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/duplicate-leads/duplicates"); 
      setDuplicateGroups(res.data);
      setLoading(false); 
    } catch (error) {
      console.error("Error fetching duplicates:", error); 
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const handleDeleteLead = async (leadId, type) => {
    try {
      await axios.delete(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${type}/${leadId}`);
      // Optimistically update state
      setDuplicateGroups((prevGroups) =>
        prevGroups
          .map((group) => ({
            ...group,
            leads: group.leads.filter((lead) => lead._id !== leadId),
          }))
          .filter((group) => group.leads.length > 1)
      );
    } catch (error) {
      console.error("Error deleting lead:", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  const groupColors = ["#d3d3d3", "#90ee90"];

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
            group.leads.map((lead) => (
              <tr
                key={lead._id}
                style={{ backgroundColor: groupColors[groupIndex % groupColors.length] }}
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
                <td>
                  {lead.type === "customer" ? "?" : (lead.retentionStatus ?? "")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DuplicateNumbers;
