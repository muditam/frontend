import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./OrganisationTree.css";


const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");


const api = axios.create({
 baseURL: API_BASE,
  withCredentials: true,
});


const CARD_COLORS = [
  "#1E88E5",
  "#7E57C2",
  "#F4511E",
  "#26A69A",
  "#EF5350",
  "#5C6BC0",
  "#8D6E63",
  "#78909C",
];

function getDepartmentColor(department = "") {
  const text = String(department || "General");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

function shouldExcludeDepartment(node = {}) {
  return String(node.department || "").trim().toLowerCase() === "tech helper";
}

function normalizeAndFilterTree(nodes = []) {
  const result = [];

  nodes.forEach((node) => {
    const reports = normalizeAndFilterTree(Array.isArray(node.reports) ? node.reports : []);

    if (shouldExcludeDepartment(node)) {
      result.push(...reports);
      return;
    }

    result.push({
      ...node,
      reports,
    });
  });

  return result;
}

function buildDisplayHierarchy(nodes = []) {
  return normalizeAndFilterTree(nodes);
}

const CHILD_LIMIT = 4;

function TreeNode({ node }) {
  const [expanded, setExpanded] = useState(false);
  const reports = Array.isArray(node.reports) ? node.reports : [];
  const department = node.department || "Department N/A";
  const role = node.role || "Role N/A";
  const name = node.fullName || "Name N/A";
  const color = getDepartmentColor(department);

  const hasMore = reports.length > CHILD_LIMIT;
  const visibleReports = hasMore && !expanded ? reports.slice(0, CHILD_LIMIT) : reports;
  const hiddenCount = reports.length - CHILD_LIMIT;

  return (
    <li className="org-tree__item">
      <article className="org-node-card">
        <header className="org-node-card__header" style={{ backgroundColor: color }}>
          <p className="org-node-card__department">{department}</p>
        </header>
        <div className="org-node-card__body">
          <p className="org-node-card__role">{role}</p>
          <p className="org-node-card__name">{name}</p>
        </div>
      </article>

      {reports.length > 0 && (
        <ul className="org-tree__list">
          {visibleReports.map((child, index) => (
            <TreeNode key={child._id || `${name}-${index}`} node={child} />
          ))}
          {hasMore && (
            <li className="org-tree__item org-tree__item--more">
              <button
                className={`org-more-btn${expanded ? " org-more-btn--less" : ""}`}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Show less" : `+${hiddenCount} more`}
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}


export default function OrganisationTree() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hierarchy, setHierarchy] = useState([]);
  const [treeScale, setTreeScale] = useState(1);
  const [treeStageHeight, setTreeStageHeight] = useState(null);
  const [treeStageWidth, setTreeStageWidth] = useState(null);
  const wrapperRef = useRef(null);
  const treeRef = useRef(null);


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

  const displayHierarchy = useMemo(() => buildDisplayHierarchy(hierarchy), [hierarchy]);

  useEffect(() => {
    if (!displayHierarchy.length || !wrapperRef.current || !treeRef.current) {
      setTreeScale(1);
      setTreeStageHeight(null);
      return undefined;
    }

    let frameId = null;

    const updateTreeFit = () => {
      if (!wrapperRef.current || !treeRef.current) return;

      const wrapperWidth = wrapperRef.current.clientWidth - 8;
      const treeWidth = treeRef.current.scrollWidth;
      const treeHeight = treeRef.current.scrollHeight;
      if (!wrapperWidth || !treeWidth || !treeHeight) return;

      const nextScale = Math.min(1, Math.max(0.52, wrapperWidth / treeWidth));
      const scaledWidth = Math.ceil(treeWidth * nextScale) + 6;
      const scaledHeight = Math.ceil(treeHeight * nextScale) + 6;
      setTreeScale(nextScale);
      setTreeStageHeight(scaledHeight);
      setTreeStageWidth(scaledWidth);
      // Center the tree horizontally in the wrapper on initial load
      wrapperRef.current.scrollLeft = Math.max(0, (scaledWidth - wrapperWidth) / 2);
    };

    const requestUpdate = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateTreeFit);
    };

    requestUpdate();

    const resizeObserver = new ResizeObserver(() => requestUpdate());
    resizeObserver.observe(wrapperRef.current);
    resizeObserver.observe(treeRef.current);
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", requestUpdate);
    };
  }, [displayHierarchy, loading]);


  return (
    <section className="org-page">
      <header className="org-page__header">
        <div>
          <h1 className="org-page__title">Organisation Tree</h1>
          <p className="org-page__meta">Total Employees: {totalEmployees}</p>
        </div>
        <button className="org-page__back-btn" onClick={() => navigate("/add-employee")}>
          Back To Add Employee
        </button>
      </header>


      {loading ? (
        <div className="org-page__status">Loading organisation tree...</div>
      ) : error ? (
        <p className="org-page__status org-page__status--error">{error}</p>
      ) : displayHierarchy.length === 0 ? (
        <p className="org-page__status">No employees found.</p>
      ) : (
        <div className="org-chart-wrapper" ref={wrapperRef}>
          <div className="org-chart-stage" style={{ height: treeStageHeight || undefined, width: treeStageWidth || undefined }}>
            <div
              className="org-tree"
              ref={treeRef}
              style={{ transform: `scale(${treeScale})` }}
            >
              <ul className="org-tree__list">
                {displayHierarchy.map((root, index) => (
                  <TreeNode key={root._id || `root-${index}`} node={root} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

