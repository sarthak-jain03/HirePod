import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Eye, Send, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "../services/api";

export default function Ranked() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cands, setCands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(new Set());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRanked = async () => {
    try {
      setLoading(true);
      setError("");
      // Call endpoint that scores all candidates against the requisition scorecard
      let data;
      try {
        data = await api.post(`/applications/score/${id}`);
      } catch (e) {
        data = await api.get(`/applications/${id}/ranked`);
      }
      setCands(data || []);
    } catch (err) {
      setError(err.message || "Could not load ranked candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRanked();
  }, [id]);

  const openCV = async (candId, reqId) => {
    setOpened((s) => new Set([...s, candId]));
    try {
      await api.post(`/applications/open/${candId}?requisition_id=${reqId}`);
      setSuccess("CV opened and audit view logged (DPDP compliant)");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.message || "Could not log CV view");
    }
  };

  const submit = async (cand) => {
    if (!opened.has(cand.id)) {
      setError("Compliance check: You must open and inspect the CV before submitting it to the client.");
      return;
    }
    try {
      setError("");
      await api.post("/applications", {
        candidate_id: cand.id,
        requisition_id: Number(id),
        status: "shortlisted",
      });
      setCands((prev) => prev.map((c) => (c.id === cand.id ? { ...c, submitted: true } : c)));
      setSuccess(`Candidate ${cand.name} (${cand.candidate_id}) submitted to client shortlist.`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.message || "Submit failed");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-3" />
        <p className="text-sm">Ranking candidates with explainable AI evidence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Ranked candidates</h1>
            <p className="text-xs text-slate-500">AI fit score &middot; quoted evidence lines &middot; recruiter compliance</p>
          </div>
        </div>
        <Link to={`/pipeline/${id}`} className="btn-ghost text-xs font-semibold text-brand-700">
          View pipeline &rarr;
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-xs w-24">Fit Score</th>
              <th className="px-5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-xs">Candidate</th>
              <th className="px-5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-xs hidden md:table-cell">Role &middot; Experience</th>
              <th className="px-5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-xs">Skills</th>
              <th className="px-5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-xs hidden lg:table-cell">Scorecard Evidence</th>
              <th className="px-5 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider text-xs">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cands.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  No candidates scored yet. Upload CVs for this requisition to rank candidates.
                </td>
              </tr>
            )}
            {cands.map((c) => {
              const total = c.total_score ?? 0;
              const hasOpened = opened.has(c.id);
              return (
                <tr key={c.candidate_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono font-bold text-lg ${
                        total >= 70 ? "text-emerald-700" : total >= 40 ? "text-amber-700" : "text-slate-600"
                      }`}>{total}</span>
                      <span className="text-xs text-slate-400">/100</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <Link to={`/candidate/${c.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                      {c.name}
                    </Link>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{c.candidate_id}</div>
                    {c.notice_days !== null && c.notice_days !== undefined && (
                      <span className="inline-block mt-1 text-[11px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                        {c.notice_days}d notice
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600 align-top hidden md:table-cell">
                    <div className="font-medium text-slate-800">{c.current_role || "—"}</div>
                    <div className="text-xs text-slate-500">{c.experience_years ? `${c.experience_years} yrs` : "—"}</div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {(c.key_skills || []).slice(0, 4).map((s) => (
                        <span key={s} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {s}
                        </span>
                      ))}
                      {(c.key_skills || []).length > 4 && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          +{(c.key_skills || []).length - 4}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 align-top hidden lg:table-cell max-w-xs">
                    {(c.breakdown || []).slice(0, 3).map((b) => (
                      <div key={b.criterion} className="text-xs mb-1.5">
                        <span className="font-medium text-slate-700">{b.criterion}: </span>
                        <span className="text-slate-900 font-semibold">{b.score}%</span>
                        {b.evidence?.length > 0 ? (
                          <div className="text-[11px] font-mono text-slate-500 italic mt-0.5 bg-slate-50 p-1 rounded border border-slate-100">
                            "{b.evidence[0].slice(0, 70)}..."
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 mt-0.5">— No direct evidence found</div>
                        )}
                      </div>
                    ))}
                  </td>
                  <td className="px-5 py-4 text-right align-top">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className={`btn-ghost p-2 rounded-lg text-xs font-medium border ${
                          hasOpened
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "text-brand-600 border-brand-200 hover:bg-brand-50"
                        }`}
                        onClick={() => openCV(c.id, id)}
                        title="Open CV (mandatory view logged for DPDP audit)"
                      >
                        <Eye className="h-4 w-4 inline mr-1" />
                        {hasOpened ? "Viewed" : "Open CV"}
                      </button>
                      <button
                        className={`text-xs font-medium rounded-lg px-3 py-2 transition-colors ${
                          c.submitted
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                            : hasOpened
                            ? "btn-primary"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                        }`}
                        disabled={!hasOpened || c.submitted}
                        onClick={() => submit(c)}
                      >
                        {c.submitted ? "Submitted" : "Submit to client"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel p-4 bg-slate-50/50">
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Fairness & Compliance Rules</h3>
        <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
          <li><strong>Zero auto-rejections:</strong> AI never rejects candidates automatically; every candidate receives a score with evidence.</li>
          <li><strong>Mandatory recruiter review:</strong> Recruiters must open each CV before submitting it to client hiring managers.</li>
          <li><strong>DPDP Act 2023 compliance:</strong> Every CV opening is logged with timestamp, viewer identity, and requisition.</li>
          <li><strong>PII Redaction:</strong> Candidate name, gender, age, photo, and marital status are strictly excluded from AI scoring.</li>
        </ul>
      </div>
    </div>
  );
}
