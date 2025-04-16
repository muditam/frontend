import React, { useEffect, useState } from "react";
import AgentDashboard from "../../Dashboards/AgentDashboard";
import RetentionAgentDashboard from "../../Dashboards/RetentionDashboard";
import ManagerSalesDashboard from "../../Dashboards/MasterSalesDashboard"; 
import ManagerRetentionDashboard from "../../Dashboards/MasterRetentionDashboard"; 
import { useNavigate } from "react-router-dom";

const SalesDashboard = () => {
  const [role, setRole] = useState(null);
  const [activeTab, setActiveTab] = useState("Sales");
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user && user.role) {
      setRole(user.role);
    } else {
      navigate("/login");
    }
  }, [navigate]); 

  if (!role) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {role === "Manager" && (
        <div>
          {/* Tabs Section */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "20px",
              padding: "15px",
              backgroundColor: "#f8f9fa",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <button
              onClick={() => setActiveTab("Sales")}
              style={{
                padding: "12px 30px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: activeTab === "Sales" ? "bold" : "normal",
                color: activeTab === "Sales" ? "#fff" : "#333",
                backgroundColor: activeTab === "Sales" ? "#000000" : "#e9ecef",
                border: "none",
                borderRadius: "5px",
                boxShadow: activeTab === "Sales" ? "0 2px 4px rgba(0, 0, 0, 0.2)" : "none",
                transition: "all 0.3s ease",
              }}
            >
              Sales Dashboard
            </button>
            <button
              onClick={() => setActiveTab("Retention")}
              style={{
                padding: "12px 30px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: activeTab === "Retention" ? "bold" : "normal",
                color: activeTab === "Retention" ? "#fff" : "#333",
                backgroundColor: activeTab === "Retention" ? "#000000" : "#e9ecef",
                border: "none",
                borderRadius: "5px",
                boxShadow: activeTab === "Retention" ? "0 2px 4px rgba(0, 0, 0, 0.2)" : "none",
                transition: "all 0.3s ease",
              }}
            > 
              Retention Dashboard
            </button>
          </div>
          {/* Active Tab Content */}
          <div style={{ padding: "20px" }}>
            {activeTab === "Sales" && <ManagerSalesDashboard />}
            {activeTab === "Retention" && <ManagerRetentionDashboard />}
          </div>
        </div>
      )}
      {role === "Sales Agent" && <AgentDashboard />}
      {role === "Retention Agent" && <RetentionAgentDashboard />}
    </div>
  );
};

export default SalesDashboard;
