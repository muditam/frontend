import React, { useEffect, useState } from 'react';

const API_BASE = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');

export default function LeadMigration() {
  const [experts, setExperts] = useState([]);
  const [fromExpert, setFromExpert] = useState(''); 
  const [toExpert, setToExpert] = useState(''); 
  const [leads, setLeads] = useState([]); // { _id, name, contactNumber, healthExpertAssigned, retentionStatus, checked }
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Load experts on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg('');
      try {
        const r = await fetch(`${API_BASE}/api/lead-migration/experts`, {
          credentials: 'include',
        });
        const j = await r.json();
        setExperts(j.experts || []);
      } catch (e) {
        setMsg('Failed to load experts');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load leads for a selected expert
  const loadLeads = async (expert, q = '', selectedStatus = 'all') => {
    if (!expert) return;
    setLoading(true);
    setLeads([]);
    setMsg('');
    try {
      const statusParam =
        selectedStatus && selectedStatus !== 'all'
          ? `&status=${encodeURIComponent(selectedStatus)}`
          : '';
      const url = `${API_BASE}/api/lead-migration/experts/${encodeURIComponent(expert)}/leads?q=${encodeURIComponent(q)}${statusParam}`;
      const r = await fetch(url, {
        credentials: 'include',
      });
      const j = await r.json();
      const items = (j.items || []).map(x => ({ ...x, checked: false }));
      setLeads(items);
      const statusLabel =
        selectedStatus === 'active'
          ? ' • Active only'
          : selectedStatus === 'lost'
          ? ' • Lost only'
          : '';
      setMsg(`Loaded ${items.length} leads for "${expert}"${statusLabel}`);
    } catch (e) {
      setMsg('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const onPickFrom = (e) => {
    const value = e.target.value;
    setFromExpert(value);
    setLeads([]);
    if (value) loadLeads(value, query, statusFilter);
  };

  const doSearch = () => {
    if (fromExpert) loadLeads(fromExpert, query, statusFilter);
  };

  // When status filter changes, reload if we already picked an expert
  useEffect(() => {
    if (fromExpert) {
      loadLeads(fromExpert, query, statusFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const toggleOne = (id) => {
    setLeads(prev => prev.map(x => x._id === id ? { ...x, checked: !x.checked } : x));
  };

  const allChecked = leads.length > 0 && leads.every(x => x.checked);
  const toggleAll = (checked) => {
    setLeads(prev => prev.map(x => ({ ...x, checked })));
  };

  // Migrate selected
  const migrate = async () => {
    setMsg('');
    const selectedIds = leads.filter(x => x.checked).map(x => x._id);
    if (!selectedIds.length) {
      setMsg('Select at least one lead');
      return;
    }
    if (!toExpert.trim()) {
      setMsg('Enter target expert (To Expert)');
      return;
    }

    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/lead-migration/migrate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedIds,
          toExpert: toExpert.trim(),
        }),
      });
      const j = await r.json();
      if (j.ok) {
        setMsg(`Migrated ${j.modified ?? 0} lead(s) to "${j.toExpert}"`);
        await loadLeads(fromExpert, query, statusFilter); // refresh
      } else {
        setMsg(j.error || 'Failed to migrate');
      }
    } catch (e) {
      setMsg('Failed to migrate');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = leads.filter(x => x.checked).length;

  return (
    <div className="lm-wrap">
      <style>{`
        .lm-wrap {
          max-width: 980px;
          margin: 24px auto;
          padding: 0 12px;
        }
        .lm-card {
          background: #fff;
          border: 1px solid #e9e9ef;
          border-radius: 14px;
          box-shadow: 0 6px 24px rgba(18,18,23,0.06);
          overflow: hidden;
        }
        .lm-head {
          padding: 18px 16px;
          background: linear-gradient(180deg, #faf9ff 0%, #ffffff 100%);
          border-bottom: 1px solid #eee;
        }
        .lm-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.2px;
          color: #1f1f28;
        }
        .lm-sub {
          margin: 6px 0 0 0;
          font-size: 13px;
          color: #5a5a67;
        }
        .lm-controls {
          display: grid;
          grid-template-columns: 170px 1fr;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid #f1f1f6;
          background: #fff;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .lm-label {
          align-self: center;
          color: #333;
          font-weight: 600;
          font-size: 13px;
        }
        .lm-row {
          display: flex;
          gap: 10px;
          align-items: center;
          min-height: 40px;
        }
        .lm-input, .lm-select, .lm-btn {
          border-radius: 10px;
          border: 1px solid #ddddeb;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
          background: #fff;
        }
        .lm-input:focus, .lm-select:focus {
          border-color: #7a5af8;
          box-shadow: 0 0 0 3px rgba(122,90,248,0.12);
        }
        .lm-select {
          min-width: 240px;
        }
        .lm-btn {
          cursor: pointer;
          border: 1px solid #d8d8ea;
          background: #f7f7ff;
          font-weight: 600;
        }
        .lm-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .lm-btn-primary {
          background: #7a5af8;
          color: #fff;
          border-color: #6b48f6;
        }
        .lm-btn-primary:hover:enabled {
          filter: brightness(0.98);
        }
        .lm-hint {
          color: #6b6b79;
          font-size: 12.5px;
        }

        .lm-topbar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 10px 16px 0 16px;
          flex-wrap: wrap;
        }

        .lm-table-wrap {
          margin: 10px 16px 0 16px;
          border: 1px solid #eee;
          border-radius: 10px;
          overflow: auto;
          max-height: 460px;
          background: #fff;
        }
        table.lm-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .lm-table thead th {
          position: sticky;
          top: 0;
          background: #faf9ff;
          color: #373745;
          text-align: left;
          padding: 10px;
          border-bottom: 1px solid #eee;
          z-index: 1;
        }
        .lm-table tbody tr {
          border-top: 1px solid #f3f3f7;
          transition: background 120ms ease;
        }
        .lm-table tbody tr:nth-child(odd) {
          background: #fff;
        }
        .lm-table tbody tr:nth-child(even) {
          background: #fcfcff;
        }
        .lm-table tbody tr:hover {
          background: #f6f4ff;
        }
        .lm-td, .lm-th {
          padding: 10px;
        }

        .lm-empty {
          padding: 14px;
          color: #6c6c78;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lm-footer {
          position: sticky;
          bottom: 0;
          background: #fff;
          padding: 12px 16px;
          display: flex;
          gap: 10px;
          align-items: center;
          border-top: 1px solid #eee;
          box-shadow: 0 -8px 18px rgba(20,20,30,0.04);
        }

        .lm-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f5f2ff;
          color: #5a39f0;
          font-weight: 700;
          font-size: 12.5px;
          border: 1px solid #e7e2ff;
        }

        .lm-msg {
          font-size: 13px;
          color: #2b2b33;
        }
        .lm-msg.error { color: #b00020; } 
        .lm-msg.ok { color: #1a7f37; }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid #eee;
        }
        .status-active {
          background: #e9f9ee;
          border-color: #cdebd6;
          color: #1a7f37;
        }
        .status-lost {
          background: #fff0f0;
          border-color: #ffd6d6;
          color: #b00020;
        }
        .status-other {
          background: #f3f5ff;
          border-color: #e0e7ff;
          color: #3743b2;
        }
      `}</style>

      <div className="lm-card">
        <div className="lm-head">
          <h3 className="lm-title">Lead Migration (Health Expert)</h3>
          <p className="lm-sub">Pick a current expert → select leads → set target expert → migrate.</p>
        </div>

        {/* Controls */}
        <div className="lm-controls">
          {/* From Expert */}
          <label className="lm-label">From Expert</label>
          <div className="lm-row">
            <select className="lm-select" value={fromExpert} onChange={onPickFrom}>
              <option value="">-- Select --</option>
              {experts.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>

            <input
              className="lm-input"
              placeholder="Search (name/contact)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="lm-btn" onClick={doSearch} disabled={!fromExpert || loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          {/* To Expert */}
          <label className="lm-label">To Expert</label>
          <div className="lm-row">
            <input
              className="lm-input"
              placeholder="Type target expert name"
              value={toExpert}
              onChange={(e) => setToExpert(e.target.value)}
              style={{ flex: 1, minWidth: 220 }}
            />
            <select
              className="lm-select"
              value=""
              onChange={(e) => setToExpert(e.target.value)}
              title="Pick existing expert name"
            >
              <option value="">Pick existing</option>
              {experts.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Top bar: select all + filters */}
        <div className="lm-topbar">
          <label className="lm-hint" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              onChange={(e) => toggleAll(e.target.checked)}
              checked={allChecked}
              disabled={leads.length === 0}
              style={{ width: 18, height: 18 }}
            />
            <span>
              <strong>Select All</strong> ({selectedCount}/{leads.length})
            </span>
          </label>

          {[
            { value: 'all', label: 'Select all' },
            { value: 'active', label: 'Active' },
            { value: 'lost', label: 'Lost' },
          ].map((option) => (
            <label
              key={option.value}
              className="lm-hint"
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <input
                type="radio"
                name="lead-migration-status-filter"
                checked={statusFilter === option.value}
                onChange={() => setStatusFilter(option.value)}
                style={{ width: 18, height: 18 }}
                disabled={!fromExpert || loading}
              />
              <span><strong>{option.label}</strong></span>
            </label>
          ))}

          <span className="lm-hint">
            {fromExpert
              ? `Showing leads assigned to "${fromExpert}"${
                  statusFilter === 'active'
                    ? ' • Active only'
                    : statusFilter === 'lost'
                    ? ' • Lost only'
                    : ''
                }`
              : 'Pick a From Expert to load leads'}
          </span>
        </div>

        {/* Table */}
        <div className="lm-table-wrap">
          {loading ? (
            <div className="lm-empty">⏳ Loading…</div>
          ) : leads.length === 0 ? (
            <div className="lm-empty">🗂️ No leads</div>
          ) : (
            <table className="lm-table">
              <thead>
                <tr>
                  <th className="lm-th" style={{ width: 70 }}>Select</th>
                  <th className="lm-th">Name</th>
                  <th className="lm-th">Contact Number</th>
                  <th className="lm-th" style={{ width: 220 }}>Current Expert</th>
                  <th className="lm-th" style={{ width: 180 }}>Retention Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(row => (
                  <tr key={row._id}>
                    <td className="lm-td">
                      <input
                        type="checkbox"
                        checked={row.checked}
                        onChange={() => toggleOne(row._id)}
                        style={{ width: 18, height: 18 }}
                      />
                    </td>
                    <td className="lm-td">{row.name || '-'}</td>
                    <td className="lm-td">
                      {row.contactNumber ? (
                        <span className="lm-badge">📞 {row.contactNumber}</span>
                      ) : '-'}
                    </td>
                    <td className="lm-td">{row.healthExpertAssigned || '-'}</td>
                    <td className="lm-td">
                      {row.retentionStatus ? (
                        <span
                          className={
                            'status-badge ' +
                            (row.retentionStatus?.toLowerCase() === 'active'
                              ? 'status-active'
                              : row.retentionStatus?.toLowerCase() === 'lost'
                              ? 'status-lost'
                              : 'status-other')
                          }
                          title="Retention status"
                        >
                          {row.retentionStatus}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
 
        <div className="lm-footer">
          <button
            className="lm-btn lm-btn-primary"
            onClick={migrate}
            disabled={saving || selectedCount === 0 || !toExpert.trim()}
            title={
              !toExpert.trim()
                ? 'Enter To Expert first'
                : selectedCount === 0
                  ? 'Select at least one lead'
                  : 'Migrate selected leads'
            }
          >
            {saving ? 'Migrating…' : `Migrate (${selectedCount} selected)`}
          </button>

          <span
            className={
              'lm-msg ' +
              (msg
                ? msg.toLowerCase().includes('fail')
                  ? 'error'
                  : msg.toLowerCase().includes('migrated') || msg.toLowerCase().includes('loaded')
                  ? 'ok'
                  : ''
                : '')
            }
          >
            {msg || (
              !toExpert.trim()
                ? 'Tip: type or pick a To Expert'
                : selectedCount === 0
                  ? 'Tip: tick some checkboxes'
                  : ''
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
