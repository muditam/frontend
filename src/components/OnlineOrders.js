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
  Button
} from '@mui/material';

const OnlineOrders = () => {
  const [orders, setOrders] = useState([]);
  const [retentionAgents, setRetentionAgents] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

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
    'Diabetes Management Kit': 'Kit'
  };

  // Retrieve persisted dates from localStorage or use defaults.
  const storedStartDate = localStorage.getItem('startDate');
  const storedEndDate = localStorage.getItem('endDate');
  // Default start date: 2025-02-01; default end: today's date.
  const defaultStart = storedStartDate || "2025-02-01";
  const today = new Date().toISOString().split("T")[0];
  const defaultEnd = storedEndDate || today;

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Persist date changes to localStorage.
  useEffect(() => {
    localStorage.setItem('startDate', startDate);
    localStorage.setItem('endDate', endDate);
  }, [startDate, endDate]);

  // Function to fetch all leads.
  const fetchAllLeads = async () => {
    try {
      const limit = 100;  
      let page = 1;
      let allLeads = [];
      let totalPages = 1;  

      do {
        const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads", {
          params: {
            page,
            limit,
            filters: JSON.stringify({}),  
          },
        });
        allLeads = allLeads.concat(response.data.leads);
        totalPages = response.data.totalPages;
        page++; 
      } while (page <= totalPages);

      return allLeads;
    } catch (error) {
      console.error("Error fetching all leads:", error);
      return [];
    }
  };

  // Fetch orders and agents from the server using the selected date range.
  const fetchData = async () => {
    try {
      const [ordersResponse, agentsResponse] = await Promise.all([
        axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders", {
          params: { startDate, endDate }
        }),
        axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees?role=Retention%20Agent"),
      ]);

      const leads = await fetchAllLeads();

      // Filter only web orders (channel "web" or "208644538369")
      const webOrders = ordersResponse.data.filter(order =>
        order.channel_name === "web" || order.channel_name === "208644538369"
      ); 

      // Map orders to add properties from matching leads.
      const ordersWithHealthExperts = webOrders
        .map(order => {
          // Use order.contact_number (which is already stripped of +91)
          const normalizedOrderPhone = order.contact_number.replace(/[^\d]/g, "");
          const matchingLead = leads.find(lead =>
            lead.contactNumber.replace(/[^\d]/g, "") === normalizedOrderPhone
          );
          let healthExpertAssigned = "Not Assigned";
          let leadExists = false;
          let isSaved = false;
          let agentAssigned = "Online Order";

          if (matchingLead) {
            leadExists = true;
            healthExpertAssigned = matchingLead.healthExpertAssigned || "Not Assigned";
            agentAssigned = matchingLead.agentAssigned || "Online Order";
            isSaved = (agentAssigned === "Online Order");
          }

          return {
            ...order,
            healthExpertAssigned,
            leadExists,
            isSaved,
            agentAssigned,
          };
        })
        .filter(order => order.healthExpertAssigned === "Not Assigned");

      setOrders(ordersWithHealthExperts);
      setRetentionAgents(agentsResponse.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Refetch data whenever the selected startDate or endDate changes.
  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handleSaveHealthExpert = async (orderIndex) => { 
    const globalIndex = currentPage * rowsPerPage + orderIndex;
    const order = orders[globalIndex];  
    if (!order.healthExpertAssigned) return;

    const leadData = {
      orderId: order.order_id,
      name: order.name,
      contactNumber: order.contact_number,
      date: new Date(order.created_at).toISOString().split('T')[0],
      amount: order.total_price,
      modeOfPayment: Array.isArray(order.payment_gateway_names)
        ? order.payment_gateway_names.join(", ")
        : order.payment_gateway_names,
      productsOrdered: order.line_items
        ? order.line_items.map(item => productAbbreviations[item.title] || item.title).join(", ")
        : "",
      agentAssigned: order.agentAssigned,
      healthExpertAssigned: order.healthExpertAssigned,
      leadStatus: 'Sales Done',
      salesStatus: 'Sales Done',
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

      // After saving, remove the order from the table.
      const updatedOrders = orders.filter((_, index) => index !== globalIndex);
      setOrders(updatedOrders);
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const handleChangeHealthExpert = (orderIndex, expertName) => {
    const globalIndex = currentPage * rowsPerPage + orderIndex;
    const updatedOrders = [...orders];
    updatedOrders[globalIndex].healthExpertAssigned = expertName;
    updatedOrders[globalIndex].isSaved = false;
    setOrders(updatedOrders);
  };

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  // Paginate orders returned by the API.
  const paginatedOrders = orders.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);

  return (
    <>
      {/* Date Filters */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
        <label>
          Start from:&nbsp;
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
        </label>
        <label>
          End to:&nbsp;
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
        </label>
      </div>
      <TableContainer component={Paper} sx={{ minWidth: 650 }}>
        <Table stickyHeader aria-label="sticky table">
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
              <TableCell>Health Expert Assigned</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedOrders.map((order, index) => (
              <TableRow key={order.order_id}>
                <TableCell component="th" scope="row">{order.order_id}</TableCell>
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
                        .map(item => productAbbreviations[item.title] || item.title)
                        .join(", ")
                    : ""}
                </TableCell>
                <TableCell>{order.agentAssigned}</TableCell>
                <TableCell>{order.channel_name}</TableCell>
                <TableCell>
                  <Select
                    value={order.healthExpertAssigned || ""}
                    onChange={(e) => handleChangeHealthExpert(index, e.target.value)}  
                    displayEmpty
                    fullWidth
                  >
                    <MenuItem value="">
                      {/* Empty item */}
                    </MenuItem>
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={orders.length}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </>
  );
};

export default OnlineOrders;
