import React, { useState } from "react";
import "./global.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import BulkDataUpload from "./components/BulkDataUpload";
import AddEmployee from "./pages/AddEmployee";
import LeadTable from "./pages/master/MasterLeads";
import RetentionTable from "./pages/master/MasterRetention";
import NewOrders from "./pages/master/MasterNewOrders";
import RetentionOrders from "./pages/master/MasterRetentionOrders";
import SalesMyLeads from "./pages/sales/SalesMyLeads";
import SalesMySales from "./pages/sales/SalesMySales";
import RetentionLeads from "./pages/retention/RetentionLeads";
import RetentionSales from "./pages/retention/RetentionSales";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NavbarWithSearch from "./components/NavBarwithSearch";
import SalesDashboard from "./components/SalesDashboard";
import AllShopifyOrders from "./components/AllShopifyOrders";

const App = () => {
   

  return (
    <Router>
      <div>  
        <NavbarWithSearch />

        <Routes>
          <Route path="/" element={<SalesDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/bulk-data-upload" element={<BulkDataUpload />} />
          <Route path="/all-shopify-orders" element={<AllShopifyOrders />} />
          <Route path="/add-employee" element={<AddEmployee />} />
          <Route path="/master/leads" element={<LeadTable />} />
          <Route path="/master/retention" element={<RetentionTable />} />
          <Route path="/master/new-orders" element={<NewOrders />} />
          <Route path="/master/retention-orders" element={<RetentionOrders />} />
          <Route path="/sales/my-leads" element={<SalesMyLeads />} />
          <Route path="/sales/my-sales" element={<SalesMySales />} />
          <Route path="/retention/leads" element={<RetentionLeads />} />
          <Route path="/retention/sales" element={<RetentionSales />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
