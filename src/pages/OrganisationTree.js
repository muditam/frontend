import React, { useEffect, useMemo, useState } from "react";
import {
 Box,
 Button,
 Chip,
 CircularProgress,
 Paper,
 Stack,
 Typography,
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";


const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");


const api = axios.create({
 baseURL: API_BASE,
 withCredentials: true,
});


function NodeCard({ node, level = 0 }) {
 const leftGap = level * 24;


 return (
   <Box sx={{ ml: `${leftGap}px`, mt: 1.2 }}>
     <Paper sx={{ p: 1.5, borderRadius: 2, border: "1px solid #e0e0e0" }}>
       <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
         <Typography sx={{ fontWeight: 700 }}>{node.fullName}</Typography>
         <Chip size="small" label={node.role || "Role N/A"} />
         <Chip size="small" label={node.department || "Department N/A"} />
         <Chip
           size="small"
           color={node.status === "active" ? "success" : "default"}
           label={node.status || "unknown"}
         />
       </Stack>
     </Paper>


     {(node.reports || []).map((child) => (
       <NodeCard key={child._id} node={child} level={level + 1} />
     ))}
   </Box>
 );
}


export default function OrganisationTree() {
 const navigate = useNavigate();
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [hierarchy, setHierarchy] = useState([]);


 useEffect(() => {
   const fetchTree = async () => {
     try {
       setLoading(true);
       setError("");
       const res = await api.get("/api/employees/hierarchy-tree");
       setHierarchy(Array.isArray(res.data?.hierarchy) ? res.data.hierarchy : []);
     } catch (e) {
       console.error("Failed to fetch organisation tree", e);
       setError("Unable to load organisation tree.");
     } finally {
       setLoading(false);
     }
   };


   fetchTree();
 }, []);


 const totalEmployees = useMemo(() => {
   const countNodes = (nodes = []) =>
     nodes.reduce(
       (sum, n) => sum + 1 + countNodes(Array.isArray(n.reports) ? n.reports : []),
       0
     );
   return countNodes(hierarchy);
 }, [hierarchy]);


 return (
   <Box sx={{ maxWidth: 1100, mx: "auto", mt: 4, px: 2, pb: 5 }}>
     <Stack direction="row" justifyContent="space-between" alignItems="center">
       <Box>
         <Typography variant="h5" sx={{ fontWeight: 700 }}>
           Organisation Tree
         </Typography>
         <Typography variant="body2" color="text.secondary">
           Total Employees: {totalEmployees}
         </Typography>
       </Box>
       <Button variant="outlined" onClick={() => navigate("/add-employee")}>
         Back To Add Employee
       </Button>
     </Stack>


     {loading ? (
       <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
         <CircularProgress />
       </Box>
     ) : error ? (
       <Typography color="error" sx={{ mt: 3 }}>
         {error}
       </Typography>
     ) : hierarchy.length === 0 ? (
       <Typography sx={{ mt: 3 }}>No employees found.</Typography>
     ) : (
       <Box sx={{ mt: 3 }}>
         {hierarchy.map((root) => (
           <NodeCard key={root._id} node={root} />
         ))}
       </Box>
     )}
   </Box>
 );
}





