import React, { useState, useEffect } from "react";
import LeadList from "./LeadList";
import ConsultationDetails from "./ConsultationDetails";
import axios from "axios";

const LeadManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [location, setLocation] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Fetch all employees but filter only Sales Agents who are active
  useEffect(() => {
    axios
      .get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees")
      .then((response) => {
        const filteredEmployees = response.data.filter(
          (emp) =>
            (emp.role === "Sales Agent" || emp.role === "Retention Agent") &&
            emp.status === "active"
        );
        setEmployees(filteredEmployees);
      })
      .catch((error) => console.error("Error fetching employees:", error));
  }, []);

  const handleSelectCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    setReloadTrigger((prev) => prev + 1); // INCREMENT ON EVERY SELECT
  };

  return (
    <div style={{ display: "flex", height: "90vh" }}>
      {/* Lead List Section - occupies 20% of the viewport */}
      <div style={{ width: "20%", background: "#f4f4f4", padding: "20px" }}>
        <LeadList
          employees={employees}
          setLocation={setLocation}
          onSelectCustomer={handleSelectCustomer}  // PASS THE HANDLER FUNCTION
          selectedCustomerId={selectedCustomerId}  // PASS THE CURRENT SELECTED ID 
          reloadTrigger={reloadTrigger}
        />

      </div>

      {/* Consultation Details Section - occupies 80% of the viewport */}
      <div style={{ width: "80%" }}>
        <ConsultationDetails customerId={selectedCustomerId} reloadTrigger={reloadTrigger} onReload={() => setReloadTrigger(prev => prev + 1)} />
      </div>
    </div>
  );
};

export default LeadManagement;
