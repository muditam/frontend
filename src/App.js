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
import NotificationListener from "./components/NotificationListener";
import AcquisitionLost from "./Lostdata/AcquisitionLost";
import RetentionLost from "./Lostdata/RetentionLost";
import PrivateRoute from "./components/PrivateRoute";
import MyTemplates from "./components/MyTemplates";  
import FacebookLeads from './components/FacebookLeads';
import LeadManagement from './LeadConsultation/LeadManagement';

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  return (
    <Router>
      <div>
        <NavbarWithSearch />
        <NotificationListener />
        <ToastContainer position="bottom-right" autoClose={5000} closeButton />

        <Routes>
 
          <Route path="/login" element={<Login />} /> 
          <Route path="/pages/Home" element={<ShipwayOrders />}/> 
          <Route path="/facebook-leads" element={<FacebookLeads />} />

          
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
        </Routes>
      </div>
    </Router>
  );
};

export default App;
