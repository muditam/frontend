import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';

const OnlineOrders = () => {
  const [orders, setOrders] = useState([]);
  const [retentionAgents, setRetentionAgents] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [loadingTable, setLoadingTable] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(60);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('');
  const [availablePaymentModes, setAvailablePaymentModes] = useState([]);


  const productAbbreviations = {
    'Karela Jamun Fizz': 'KJF',
    'Sugar Defend Pro': 'SDP',
    'Vasant Kusmakar Ras': 'VKR',
    'Liver Fix': 'L-Fx',
    'Stress & Sleep': 'S&S',
    'Chandraprabha Vati': 'CPV',
    'Heart Defend Pro': 'HDP',
    'Performance Forever': 'PF',
    'Power Gut': 'PGut',
    'Shilajit with Gold': 'Shilajit',
    'Diabetes Management Kit': 'Kit',
  };

  const storedStartDate = localStorage.getItem('startDate');
  const storedEndDate = localStorage.getItem('endDate');
  const defaultStart = storedStartDate || "2025-02-01";
  const today = new Date().toISOString().split("T")[0];
  const defaultEnd = storedEndDate || today;

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  useEffect(() => {
    localStorage.setItem('startDate', startDate);
    localStorage.setItem('endDate', endDate);
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoadingTable(true);
    setEstimatedTime(60);

    const startTime = Date.now();
    const totalSeconds = 60;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(totalSeconds - elapsed, 0);
      setEstimatedTime(remaining);

      if (remaining === 0) clearInterval(timer);
    }, 1000);

    try {
      const [ordersResponse, agentsResponse] = await Promise.all([
        axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders", {
          params: { startDate, endDate },
        }),
        axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees?role=Retention%20Agent"),
      ]);

      const webOrders = ordersResponse.data.filter(
        (order) =>
          order.channel_name === "web" ||
          order.channel_name === "208644538369" ||
          order.channel_name === "252664381441"
      );

      const phones = webOrders.map((o) => o.contact_number.replace(/[^\d]/g, ""));
      const leadsRes = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/by-phones", {
        phoneNumbers: phones,
      });
      const leads = leadsRes.data;
      const leadPhonesSet = new Set(leads.map((lead) => lead.contactNumber.replace(/[^\d]/g, "")));

      const ordersWithHealthExperts = webOrders
        .map((order) => {
          const normalizedPhone = order.contact_number.replace(/[^\d]/g, "");
          const matchingLead = leads.find(
            (lead) => lead.contactNumber.replace(/[^\d]/g, "") === normalizedPhone
          );
          return {
            ...order,
            normalizedPhone,
            healthExpertAssigned: matchingLead?.healthExpertAssigned || "Not Assigned",
            leadExists: !!matchingLead,
            isSaved: matchingLead?.agentAssigned === "Online Order",
            agentAssigned: matchingLead?.agentAssigned || "Online Order",
          };
        })
        .filter((order) => !leadPhonesSet.has(order.normalizedPhone));

      setOrders(ordersWithHealthExperts);
      setRetentionAgents(agentsResponse.data);

      const allModes = ordersWithHealthExperts.map((o) =>
        Array.isArray(o.payment_gateway_names)
          ? o.payment_gateway_names.join(", ")
          : o.payment_gateway_names
      );
      const uniqueModes = [...new Set(allModes)];
      setAvailablePaymentModes(uniqueModes);


      const uniqueStatuses = [...new Set(ordersWithHealthExperts.map((o) => o.shipway_status || "Not Available"))];
      setAvailableStatuses(uniqueStatuses);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      clearInterval(timer);
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handleSaveHealthExpert = async (orderIndex) => {
    const globalIndex = currentPage * rowsPerPage + orderIndex;
    const order = filteredOrders[globalIndex];
    if (!order.healthExpertAssigned) return;

    const leadData = {
      orderId: order.order_id,
      name: order.name,
      contactNumber: order.contact_number,
      date: new Date(order.created_at).toISOString().split("T")[0],
      lastOrderDate: new Date(order.created_at).toISOString().split("T")[0],
      amount: order.total_price,
      modeOfPayment: Array.isArray(order.payment_gateway_names)
        ? order.payment_gateway_names.join(", ")
        : order.payment_gateway_names,
      productsOrdered: order.line_items
        ? order.line_items.map((item) => productAbbreviations[item.title] || item.title).join(", ")
        : "",
      agentAssigned: order.agentAssigned,
      healthExpertAssigned: order.healthExpertAssigned,
      leadStatus: "Sales Done",
      salesStatus: "Sales Done",
    };

    try {
      const existingLeadResponse = await axios.get(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/check-duplicate?contactNumber=${leadData.contactNumber}`
      );
      if (existingLeadResponse.data.exists) {
        await axios.put(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/${existingLeadResponse.data.leadId}`,
          leadData
        );
      } else {
        await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads", leadData);
      }

      // Remove order from list after save
      const updatedOrders = orders.filter((_, index) => index !== globalIndex);
      setOrders(updatedOrders);
    } catch (error) {
      console.error("Failed to update lead:", error);
    }
  };

  const handleChangeHealthExpert = (orderIndex, expertName) => {
    const globalIndex = currentPage * rowsPerPage + orderIndex;
    const updatedOrders = [...filteredOrders];
    updatedOrders[globalIndex].healthExpertAssigned = expertName;
    updatedOrders[globalIndex].isSaved = false;
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.order_id === updatedOrders[globalIndex].order_id ? updatedOrders[globalIndex] : order
      )
    );
  };

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = selectedStatus ? order.shipway_status === selectedStatus : true;
    const mode =
      Array.isArray(order.payment_gateway_names)
        ? order.payment_gateway_names.join(", ")
        : order.payment_gateway_names;
    const matchesMode = selectedPaymentMode ? mode === selectedPaymentMode : true;
    return matchesStatus && matchesMode;
  });


  const paginatedOrders = filteredOrders.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage
  );

  return (
    <>
      <div style={{ marginBottom: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
        <label>
          Start from:&nbsp;
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End to:&nbsp;
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <div style={{ marginLeft: "auto", display: "flex", gap: "16px", alignItems: "center" }}>
          <div>
            <label style={{ marginRight: "8px" }}>Filter by Shipway Status:</label>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              displayEmpty
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              {availableStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </div>
          <div>
            <label style={{ marginRight: "8px" }}>Mode of Payment:</label>
            <Select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              displayEmpty
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              {availablePaymentModes.map((mode) => (
                <MenuItem key={mode} value={mode}>
                  {mode}
                </MenuItem>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <TableContainer component={Paper} sx={{ minWidth: 650 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Contact Number</TableCell>
              <TableCell>Order Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Mode of Payment</TableCell>
              <TableCell>Products Ordered</TableCell>
              <TableCell>Agent Assigned</TableCell>
              <TableCell>Channel Name</TableCell>
              <TableCell>Shipway Status</TableCell>
              <TableCell>Health Expert Assigned</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingTable ? (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  <CircularProgress size={60} />
                  <Typography variant="body1" style={{ marginTop: "10px" }}>
                    Loading table data... ~{estimatedTime} seconds left
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order, index) => (
                <TableRow key={order.order_id}>
                  <TableCell>{order.order_id}</TableCell>
                  <TableCell>{order.name}</TableCell>
                  <TableCell>{order.contact_number}</TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{order.total_price}</TableCell>
                  <TableCell>
                    {Array.isArray(order.payment_gateway_names)
                      ? order.payment_gateway_names.join(", ")
                      : order.payment_gateway_names}
                  </TableCell>
                  <TableCell>
                    {order.line_items
                      ? order.line_items
                        .map((item) => productAbbreviations[item.title] || item.title)
                        .join(", ")
                      : ""}
                  </TableCell>
                  <TableCell>{order.agentAssigned}</TableCell>
                  <TableCell>{order.channel_name}</TableCell>
                  <TableCell>{order.shipway_status}</TableCell>
                  <TableCell>
                    <Select
                      value={order.healthExpertAssigned || ""}
                      onChange={(e) => handleChangeHealthExpert(index, e.target.value)}
                      displayEmpty
                      fullWidth
                    >
                      <MenuItem value=""></MenuItem>
                      {retentionAgents.map((agent) => (
                        <MenuItem key={agent._id} value={agent.fullName}>
                          {agent.fullName}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      style={{
                        backgroundColor: order.isSaved ? "lightgreen" : "primary",
                        color: order.isSaved ? "black" : "white",
                      }}
                      onClick={() => handleSaveHealthExpert(index)}
                      disabled={order.isSaved}
                    >
                      {order.isSaved ? "Saved" : "Save"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={filteredOrders.length}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </>
  );
};

export default OnlineOrders;
