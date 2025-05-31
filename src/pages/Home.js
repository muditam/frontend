import React, { useState } from "react";
import axios from "axios";
import TablePagination from '@mui/material/TablePagination';

const ShipwayOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const rowsPerPage = 100;
  const [totalOrders, setTotalOrders] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
 
  const fetchOrdersFromDB = async (pageIndex = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params = { 
        page: pageIndex + 1,
        startDate,
        endDate 
      };
      const response = await axios.get("http://localhost:5001/api/shipway/orders", { params });
      const data = response.data;
      let ordersArray = [];
      if (data && Array.isArray(data.message)) {
        ordersArray = data.message;
      } else {
        console.warn("Expected an array in data.message but received:", data);
      }
      setOrders(ordersArray);
      setTotalOrders(data.totalOrders);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    fetchOrdersFromDB(newPage);
  };
 
  const handleFetchOrders = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }
    setPage(0);
    try { 
      await axios.post("http://localhost:5001/api/shipway/fetch-orders", { startDate, endDate }); 
      fetchOrdersFromDB(0);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div style={{ margin: "20px" }}>
      <h1>Shipway Orders</h1>
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
        <label>
          Start Date:
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ marginLeft: "5px" }} />
        </label>
        <label>
          End Date:
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ marginLeft: "5px" }} />
        </label>
        <button onClick={handleFetchOrders} style={{ padding: "6px 12px", cursor: "pointer" }}>
          Fetch Orders
        </button>
      </div>
      {/* Display total orders count */}
      {!loading && !error && (
        <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
          Total Orders: {totalOrders}
        </div>
      )}
      {loading && <div>Loading orders...</div>}
      {error && <div style={{ color: "red" }}>Error fetching orders: {error.message}</div>}
      {!loading && !error && orders.length > 0 && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f0f0f0", borderBottom: "2px solid #ccc" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>S.No</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Order ID</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Contact Number</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Shipment Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <tr key={order.order_id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px" }}>{page * rowsPerPage + index + 1}</td>
                  <td style={{ padding: "8px" }}>{order.order_id || "N/A"}</td>
                  <td style={{ padding: "8px" }}>{order.contact_number || "N/A"}</td>
                  <td style={{ padding: "8px" }}>{order.shipment_status || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination
            component="div"
            count={totalOrders}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[]}
          />
        </>
      )}
      {!loading && !error && orders.length === 0 && (
        <div style={{ textAlign: "center" }}>No orders found.</div>
      )}
    </div>
  );
};

export default ShipwayOrders;
