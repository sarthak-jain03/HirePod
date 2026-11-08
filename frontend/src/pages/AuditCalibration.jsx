import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, BarChart3, TrendingUp, CheckCircle2, Clock, Users, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "../services/api";

export default function AuditCalibration() {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("calibration"); // calibration | logs
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [calib, auditLogs] = await Promise.all([
        api.get("/audit/calibration"),
        api.get("/audit/logs"),
      ]);
      setData(calib);
      setLogs(auditLogs);
    } catch (err) {
      setError(err.message || "Failed to load audit data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <RefreshCw className="h-7 w-7 animate-spin text-brand-600 mb-2" />
        <p className="text-xs">Loading Delivery Head audit and calibration reports...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Delivery Head Audit &amp; Calibration</h1>
          <p className="text-xs text-slate-500">
            Weekly sample comparing AI ranks with recruiter choices &middot; DPDP Act 2023 compliance audit trail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("calibration")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "calibration"
                ? "bg-brand-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            AI Calibration ({data?.sample?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "logs"
                ? "bg-brand-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            DPDP Access Logs ({logs?.view_logs?.length || 0})
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Executive KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            AI &amp; Recruiter Alignment
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-slate-900">{kpis.alignment_rate}%</span>
            <span className="text-xs font-semibold text-emerald-600">High Agreement</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Weekly sample comparison</p>
        </div>

        <div className="panel p-5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Screening Time Reduction
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-emerald-700">-{kpis.screening_time_reduction_pct}%</span>
            <span className="text-xs text-slate-500">Goal: -60%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">1.4 days vs 5 days baseline</p>
        </div>

        <div className="panel p-5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Shortlist within 48 Hours
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-slate-900">{kpis.shortlist_turnaround_within_48h_pct}%</span>
            <span className="text-xs text-slate-500">Goal: 80%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Prevents loss to faster rivals</p>
        </div>

        <div className="panel p-5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Annual Financial Impact
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-brand-700">₹{kpis.total_annual_impact_crore} Cr</span>
            <span className="text-xs text-slate-500">per year</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">₹75.6L time + ₹81L fees saved</p>
        </div>
      </div>

      {/* Tab 1: AI vs Recruiter Weekly Calibration */}
      {activeTab === "calibration" && (
        <div className="panel overflow-hidden border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Weekly Calibration Sample
              </h2>
              <p className="text-xs text-slate-500">
                Independent oversight comparing AI scoring fit ranks against recruiter submissions and client decisions
              </p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono">
              {data?.period}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Requisition</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Candidate</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">AI Fit Score</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Recruiter Action</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Client Decision</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Alignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.sample || []).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{row.requisition_title}</div>
                      <div className="text-[11px] text-slate-400">Req #{row.requisition_id}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{row.candidate_name}</div>
                      <div className="text-[11px] text-slate-500">{row.current_role} ({row.experience_years} yrs)</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`font-mono font-bold text-sm ${
                        row.ai_score >= 70 ? "text-emerald-700" : row.ai_score >= 40 ? "text-amber-700" : "text-slate-500"
                      }`}>
                        {row.ai_score}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="capitalize px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                        {row.recruiter_action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {row.client_decision ? (
                        <span className={`capitalize px-2 py-0.5 rounded text-xs font-semibold ${
                          row.client_decision === "shortlisted"
                            ? "bg-emerald-50 text-emerald-700"
                            : row.client_decision === "rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {row.client_decision.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Pending review</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        row.is_aligned
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        <CheckCircle2 className="h-3 w-3" />
                        {row.is_aligned ? "Aligned" : "Overridden"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: DPDP Act 2023 Access Logs */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="panel p-5 bg-slate-50/50">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              DPDP Act 2023 Regulatory Compliance Statement
            </h3>
            <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-600">
              {(logs?.principles || []).map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel overflow-hidden border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Mandatory CV View Logs
                </h2>
                <p className="text-xs text-slate-500">
                  Section 6 Audit Requirement: Records of every recruiter and client inspection of candidate personal data
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {logs?.view_logs?.length || 0} access events
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Timestamp</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Viewer Identity</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Role</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Candidate</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Requisition</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(logs?.view_logs || []).map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{v.timestamp}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{v.viewer_email}</td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize">
                          {v.viewer_role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-slate-900">{v.candidate_name}</span>
                        <span className="text-[11px] text-slate-400 font-mono ml-1.5">({v.candidate_id})</span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">Req #{v.requisition_id || "1"}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{v.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

