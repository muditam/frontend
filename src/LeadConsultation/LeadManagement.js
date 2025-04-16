import React, { useState, useEffect } from "react";
import LeadList from "./LeadList";
import ConsultationDetails from "./ConsultationDetails";
import axios from "axios";

const LeadManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [location, setLocation] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Fetch all employees but filter only Sales Agents who are active
  useEffect(() => {
    axios
      .get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees")
      .then((response) => {
        const filteredEmployees = response.data.filter(
          (emp) => emp.role === "Sales Agent" && emp.status === "active"
        );
        setEmployees(filteredEmployees);
      })
      .catch((error) => console.error("Error fetching employees:", error));
  }, []);

  return (
    <div style={{ display: "flex", height: "90vh" }}>
      {/* Lead List Section - occupies 20% of the viewport */}
      <div style={{ width: "20%", background: "#f4f4f4", padding: "20px" }}>
        <LeadList
          employees={employees}
          setLocation={setLocation}
          onSelectCustomer={setSelectedCustomerId}
          selectedCustomerId={selectedCustomerId}
        />
      </div>

      {/* Consultation Details Section - occupies 80% of the viewport */}
      <div style={{ width: "80%" }}>
        <ConsultationDetails customerId={selectedCustomerId} />
      </div>
    </div>
  );
};

export default LeadManagement;
