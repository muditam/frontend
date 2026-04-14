import React, { useState, useEffect } from "react";
import LeadList from "./LeadList";
import ConsultationDetails from "./ConsultationDetails";
import axios from "axios";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const LeadManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [location, setLocation] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    api
      .get("/api/employees")
      .then((response) => {
        const filteredEmployees = (response.data || []).filter(
          (emp) =>
            (emp.role === "Sales Agent" || emp.role === "Retention Agent") &&
            emp.status === "active"
        );
        setEmployees(filteredEmployees);
      })
      .catch((error) => {
        console.error(
          "Error fetching employees:",
          error?.response?.data || error.message
        );
      });
  }, []);

  const handleSelectCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    setReloadTrigger((prev) => prev + 1);
  };

  return (
    <div style={{ display: "flex", height: "90vh" }}>
      <div style={{ width: "20%", background: "#f4f4f4", padding: "20px" }}>
        <LeadList
          employees={employees}
          setLocation={setLocation}
          onSelectCustomer={handleSelectCustomer}
          selectedCustomerId={selectedCustomerId}
          reloadTrigger={reloadTrigger}
        />
      </div>

      <div style={{ width: "80%" }}>
        <ConsultationDetails
          customerId={selectedCustomerId}
          reloadTrigger={reloadTrigger}
          onReload={() => setReloadTrigger((prev) => prev + 1)}
        />
      </div>
    </div>
  );
};

export default LeadManagement;