import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Clock, FileText, Users, UploadCloud, Edit3, Briefcase, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";

export default function Dashboard() {
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/jds")
      .then(setReqs)
      .catch(() => setError("Could not load requisitions"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = () => navigate("/jd/new");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-400 text-sm">Loading requisitions &amp; screening activity&hellip;</p>
      </div>
    );
  }

  const totalCandidatesScreened = reqs.reduce((s, r) => s + (r.application_count || 0), 0);
  const totalShortlisted = reqs.reduce((s, r) => s + (r.shortlisted_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Recruiter Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Company A, Noida &mdash; Contract &amp; Permanent Hiring Operations</p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> New Requisition
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Requisitions</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-slate-900">
              {reqs.filter((r) => r.status === "open").length}
            </span>
            <span className="text-xs text-slate-400">active jobs</span>
          </div>
        </div>

        <div className="panel p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidates Screened</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-slate-900">{totalCandidatesScreened}</span>
            <span className="text-xs text-emerald-600 font-medium">CVs evaluated</span>
          </div>
        </div>

        <div className="panel p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shortlisted to Clients</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-slate-900">{totalShortlisted}</span>
            <span className="text-xs text-brand-600 font-medium">in client portal</span>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Active Requisitions</h2>
          <span className="text-xs text-slate-400">{reqs.length} total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-6 py-3.5 font-semibold text-slate-600 uppercase tracking-wider text-xs">Job Title</th>
                <th className="px-6 py-3.5 font-semibold text-slate-600 uppercase tracking-wider text-xs">Location</th>
                <th className="px-6 py-3.5 font-semibold text-slate-600 uppercase tracking-wider text-xs">Experience</th>
                <th className="px-6 py-3.5 font-semibold text-slate-600 uppercase tracking-wider text-xs">Notice</th>
                <th className="px-6 py-3.5 font-semibold text-slate-600 uppercase tracking-wider text-xs">Screened</th>
                <th className="px-6 py-3.5 font-semibold text-slate-600 uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-3.5 font-semibold text-slate-600 uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reqs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No requisitions yet. Create your first JD to start bulk screening.
                  </td>
                </tr>
              )}
              {reqs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/ranked/${r.id}`} className="font-semibold text-slate-900 hover:text-brand-600">
                      {r.title}
                    </Link>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {r.must_have_skills?.slice(0, 4).join(", ") || "No must-have skills configured"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{r.location || "Noida"}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {r.experience_min && r.experience_max
                      ? `${r.experience_min}–${r.experience_max} yrs`
                      : r.experience_min
                      ? `${r.experience_min}+ yrs`
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {r.notice_period_days ? `Up to ${r.notice_period_days}d` : "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className="font-semibold text-slate-800">{r.application_count || 0}</span> CVs
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        r.status === "open"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/upload/${r.id}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100"
                        title="Bulk upload CVs"
                      >
                        <UploadCloud className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/ranked/${r.id}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100"
                        title="Ranked candidates"
                      >
                        <Clock className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/pipeline/${r.id}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100"
                        title="Pipeline stages"
                      >
                        <Users className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/jd/${r.id}/edit`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100"
                        title="Edit scorecard"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel p-4 bg-slate-50/50">
        <p className="text-xs text-slate-500">
          <strong>HirePod Efficiency Guarantee:</strong> Designed to cut screening time per requisition by 60% and deliver candidate shortlists within 48 hours for 80% of open requisitions.
        </p>
      </div>
    </div>
  );
}
