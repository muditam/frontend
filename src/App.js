import React from "react";
import "./global.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import BulkDataUpload from "./components/BulkDataUpload";
import AddEmployee from "./pages/AddEmployee";
import LeadTable from "./pages/master/MasterLeads";
import RetentionTable from "./pages/master/MasterRetention";
import NewOrders from "./pages/master/MasterNewOrders";
import RetentionOrders from "./pages/master/MasterRetentionOrders";
import DuplicateNumbers from "./pages/master/DuplicateNumbers";
import SalesMyLeads from "./pages/sales/SalesMyLeads";
import SalesMySales from "./pages/sales/SalesMySales";
import RetentionLeads from "./pages/retention/RetentionLeads";
import RetentionSales from "./pages/retention/RetentionSales";
import ShipwayOrders from "./pages/Home";
import Login from "./pages/Login";
import NavbarWithSearch from "./components/TopBars/NavBarwithSearch";
import SalesDashboard from "./components/Dashboards/SalesDashboard";
import OrdersTable from "./ShopifyOrders/AllShopifyOrders";
import OnlineOrders from "./ShopifyOrders/OnlineOrders";
import TransferRequests from "./components/LeadRequests/TransferRequest"; 
import LeadDetail from "./components/LeadRequests/LeadDetails";
import RetentionData from "./pages/filtered/Retention";
import AcquisitionLost from "./Lostdata/AcquisitionLost";
import RetentionLost from "./Lostdata/RetentionLost";
import PrivateRoute from "./components/PrivateRoute";
import MyTemplates from "./components/MyTemplates";
import LeadManagement from './LeadConsultation/LeadManagement';
import EscalationsPage from './components/EscalationsPage';
import TeamPage from "./components/TeamPage";
import GrowthTracker from "./components/GrowthTracker";
import Leaderboard from "./components/Leaderboard";
import BloomLeaderboard from "./components/BloomLeaderboard";
import DeliveredSalesRecord from "./components/DeliveredSalesRecord";
import DeliveredHistory from "./components/TopBars/DeliveredHistory";
import ShipmentDetails from "./pages/filtered/ShipmentDetails";

const App = () => {
  return (
    <Router>
      <div>
        <NavbarWithSearch />

        <Routes>
          <Route
            path="/shipment-details"
            element={
              <ShipmentDetails />
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="/pages/Home" element={<ShipwayOrders />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <SalesDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/lead/:id"
            element={
              <PrivateRoute>
                <LeadDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/transfer-requests"
            element={
              <PrivateRoute>
                <TransferRequests />
              </PrivateRoute>
            }
          />
          <Route
            path="/leadmanagement"
            element={
              <PrivateRoute>
                <LeadManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/bulk-data-upload"
            element={
              <PrivateRoute>
                <BulkDataUpload />
              </PrivateRoute>
            }
          />
          <Route
            path="/all-shopify-orders"
            element={
              <PrivateRoute>
                <OrdersTable />
              </PrivateRoute>
            }
          />
          <Route
            path="/online-orders"
            element={
              <PrivateRoute>
                <OnlineOrders />
              </PrivateRoute>
            }
          />
          <Route
            path="/add-employee"
            element={
              <PrivateRoute>
                <AddEmployee />
              </PrivateRoute>
            }
          />
          <Route
            path="/master/leads"
            element={
              <PrivateRoute>
                <LeadTable />
              </PrivateRoute>
            }
          />
          <Route
            path="/master/retention"
            element={
              <PrivateRoute>
                <RetentionTable />
              </PrivateRoute>
            }
          />
          <Route
            path="/master/new-orders"
            element={
              <PrivateRoute>
                <NewOrders />
              </PrivateRoute>
            }
          />
          <Route
            path="/master/retention-orders"
            element={
              <PrivateRoute>
                <RetentionOrders />
              </PrivateRoute>
            }
          />
          <Route
            path="/master/Duplicates"
            element={
              <PrivateRoute>
                <DuplicateNumbers />
              </PrivateRoute>
            }
          />
          <Route
            path="/sales/my-leads"
            element={
              <PrivateRoute>
                <SalesMyLeads />
              </PrivateRoute>
            }
          />
          <Route
            path="/sales/my-sales"
            element={
              <PrivateRoute>
                <SalesMySales />
              </PrivateRoute>
            }
          />
          <Route
            path="/retention/leads"
            element={
              <PrivateRoute>
                <RetentionLeads />
              </PrivateRoute>
            }
          />
          <Route
            path="/retention/sales"
            element={
              <PrivateRoute>
                <RetentionSales />
              </PrivateRoute>
            }
          />
          <Route
            path="/retention/:filterType"
            element={
              <PrivateRoute>
                <RetentionData />
              </PrivateRoute>
            }
          />

          <Route
            path="/lost/acquisition"
            element={
              <PrivateRoute>
                <AcquisitionLost />
              </PrivateRoute>
            }
          />
          <Route
            path="/escalations"
            element={
              <PrivateRoute>
                <EscalationsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/lost/retention"
            element={
              <PrivateRoute>
                <RetentionLost />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-templates"
            element={
              <PrivateRoute>
                <MyTemplates />
              </PrivateRoute>
            }
          />
          <Route
            path="/team"
            element={
              <PrivateRoute>
                <TeamPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-growth-plan"
            element={
              <PrivateRoute>
                <GrowthTracker />
              </PrivateRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <PrivateRoute>
                <Leaderboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/bloom-leaderboard"
            element={
              <PrivateRoute>
                <BloomLeaderboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/delivered-sales-record"
            element={
              <PrivateRoute>
                <DeliveredSalesRecord />
              </PrivateRoute>
            }
          />
          <Route
            path="/delivered-history"
            element={
              <PrivateRoute>
                <DeliveredHistory />
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
