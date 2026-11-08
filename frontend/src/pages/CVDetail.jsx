import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Calendar, FileText, ShieldCheck, Trash2, RefreshCw } from "lucide-react";
import { api, maskEmail, maskPhone } from "../services/api";

export default function CVDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cand, setCand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get(`/candidates/${id}`).then(setCand).catch(() => setCand(null)).finally(() => setLoading(false));
  }, [id]);

  const toggleConsent = async (consent) => {
    setActionLoading((p) => ({ ...p, consent: true }));
    try {
      await api.post(`/candidates/${id}/consent?consent=${consent}`);
      setMessage(consent ? "Consent recorded" : "Consent withdrawn");
      setCand((p) => p ? { ...p, consent } : p);
    } catch (err) {
      setMessage(err.message || "Consent update failed");
    } finally {
      setActionLoading((p) => ({ ...p, consent: false }));
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this candidate's data? This cannot be undone.")) return;
    setActionLoading((p) => ({ ...p, delete: true }));
    try {
      await api.del(`/candidates/${id}`);
      setMessage("Candidate data deleted (DPDP erasure request)");
      navigate(-1);
    } catch (err) {
      setMessage(err.message || "Delete failed");
    } finally {
      setActionLoading((p) => ({ ...p, delete: false }));
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><p className="text-slate-500">Loading&hellip;</p></div>;
  if (!cand) return (
    <div className="flex flex-col items-center justify-center h-full text-slate-500">
      <FileText className="h-10 w-10 mb-2 opacity-30" /> <p>Candidate not found</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <ArrowLeft className="h-5 w-5 text-slate-400" onClick={() => navigate(-1)} />
        <h1 className="text-xl font-semibold text-slate-900">Candidate profile</h1>
      </div>

      {message && <div className="rounded-lg bg-brand-50 p-4 text-sm text-brand-800">{message}</div>}

      <div className="panel p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{cand.name}</h2>
            <p className="text-sm text-slate-500">{cand.candidate_id} &middot; {cand.source_file ? "Uploaded: " + cand.source_file : "&mdash;"}</p>
          </div>
          <div className="flex gap-2">
            {cand.deleted_at ? (
              <span className="px-3 py-1 rounded text-xs font-semibold bg-red-50 text-red-700">Deleted</span>
            ) : (
              <>
                <button className={`btn-ghost px-3 py-2 rounded-lg ${cand.consent ? "bg-green-50 text-green-700" : "text-slate-600 hover:bg-slate-100"}`} disabled={actionLoading.consent} onClick={() => toggleConsent(!cand.consent)}>
                  {cand.consent ? "Consent given" : "Record consent"}
                </button>
                <button className="btn-danger" disabled={actionLoading.delete} onClick={remove}>
                  {actionLoading.delete ? "Deleting&hellip;" : "Delete data"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="label">Current role</label>
            <p className="text-slate-600">{cand.current_role || "&mdash;"}</p>
          </div>
          <div className="space-y-2">
            <label className="label">Experience</label>
            <p className="text-slate-600">{cand.experience_years ? cand.experience_years + " years" : "&mdash;"}</p>
          </div>
          <div className="space-y-2">
            <label className="label">Key skills</label>
            <p className="text-slate-600">{cand.key_skills?.join(", ") || "&mdash;"}</p>
          </div>
          <div className="space-y-2">
            <label className="label">Notice period</label>
            <p className="text-slate-600">{cand.notice_days ? cand.notice_days + " days" : "&mdash;"}</p>
          </div>
          <div className="space-y-2">
            <label className="label">Email (hiring use only)</label>
            <p className="text-slate-600 font-mono text-sm">{maskEmail(cand.email)}</p>
          </div>
          <div className="space-y-2">
            <label className="label">Phone</label>
            <p className="text-slate-600 font-mono text-sm">{maskPhone(cand.phone)}</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Parsed profile (raw)</h3>
          <pre className="text-xs font-mono text-slate-500 bg-slate-50 rounded-lg p-4 overflow-x-auto">{JSON.stringify(cand.parsed_profile || {}, null, 2)}</pre>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Under the DPDP Act 2023, CVs are personal data: used for hiring only, with candidate consent, and erasable on request. Every view is logged.
      </p>
    </div>
  );
}
