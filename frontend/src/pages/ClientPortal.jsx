import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Calendar, Clock, CheckCircle2, XCircle, List, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { api, maskEmail, maskPhone, setToken } from "../services/api";

export default function ClientPortal() {
  const [reqs, setReqs] = useState([]);
  const [activeReq, setActiveReq] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userRole, setUserRole] = useState("client_manager");
  const [rejectionModal, setRejectionModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [slotModal, setSlotModal] = useState(null);
  const [proposedSlot, setProposedSlot] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      if (u.role) setUserRole(u.role);
    } catch (e) {}

    api.get("/jds")
      .then((data) => {
        const openReqs = data.filter((r) => r.status === "open");
        setReqs(openReqs);
        if (openReqs.length > 0) {
          loadApps(openReqs[0].id);
        }
      })
      .catch(() => setReqs([]))
      .finally(() => setLoading(false));
  }, []);

  const switchToClient = async () => {
    try {
      const res = await api.post("/auth/switch-role/client_manager");
      setToken(res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));
      setUserRole("client_manager");
      window.location.reload();
    } catch (err) {
      setError("Failed to switch role");
    }
  };

  const loadApps = async (reqId) => {
    setActiveReq(reqId);
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/applications/requisition/${reqId}`);
      setApps(data || []);
    } catch (err) {
      setError(err.message || "Could not load candidate submissions");
    } finally {
      setLoading(false);
    }
  };

  const decide = async (appId, decision, reason = "", slot = "") => {
    setDeciding((p) => ({ ...p, [appId]: true }));
    setError("");
    try {
      await api.post(`/applications/${appId}/decision`, {
        decision,
        reason,
        interview_slot: slot,
      });
      setApps((prev) =>
        prev.map((a) =>
          a.id === appId
            ? {
                ...a,
                client_decision: decision,
                client_decision_reason: reason,
                interview_slot_proposed: slot,
                status: decision === "shortlisted" ? "shortlisted" : decision === "rejected" ? "rejected" : "interviewed",
              }
            : a
        )
      );
      setSuccess(`Decision updated: ${decision.replace("_", " ")}`);
      setTimeout(() => setSuccess(""), 4000);
      setRejectionModal(null);
      setSlotModal(null);
      setRejectionReason("");
      setProposedSlot("");
    } catch (err) {
      setError(err.message || "Failed to submit decision");
    } finally {
      setDeciding((p) => ({ ...p, [appId]: false }));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Client Review Portal</h1>
          <p className="text-xs text-slate-500">Review submitted candidate shortlists with AI scoring evidence</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Requisition:</span>
          <select
            className="input text-xs py-1.5 px-3 w-auto bg-white"
            value={activeReq || ""}
            onChange={(e) => loadApps(Number(e.target.value))}
          >
            {reqs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.location || "Noida"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {userRole !== "client_manager" && (
        <div className="bg-purple-50/80 border border-purple-200 rounded-lg p-3 text-xs text-purple-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            <strong>Recruiter Mode:</strong> You can shortlist, propose slots, or reject on behalf of the client, or switch to the Client Manager view.
          </span>
          <button
            type="button"
            onClick={switchToClient}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-3 py-1 rounded text-xs transition-colors shrink-0"
          >
            Switch to Client Manager
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex items-center gap-2">
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin text-brand-600 mb-2" />
          <p className="text-xs">Loading candidate shortlists...</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="panel p-12 text-center text-slate-400">
          <List className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium text-slate-600">No candidates submitted yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Recruiters will submit qualified candidate profiles here after opening and reviewing CVs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>{apps.length} Candidate(s) for Review</span>
            <span className="text-slate-400 font-normal">Contact info masked under DPDP Act 2023</span>
          </div>

          <div className="grid gap-4">
            {apps.map((a) => {
              const c = a.candidate || {};
              const score = a.ai_score ?? 0;
              const hasDecision = !!a.client_decision;

              return (
                <div
                  key={a.id}
                  className="panel p-5 sm:p-6 transition-all border-slate-200 hover:shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Candidate header info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="text-base font-semibold text-slate-900">
                          {c.name || `Candidate #${a.candidate_id}`}
                        </h2>
                        <span className="text-xs font-mono text-slate-400">
                          ({c.candidate_id || `ID-${a.candidate_id}`})
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            score >= 70
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : score >= 40
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          Match {score}%
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mb-3">
                        <span className="font-medium text-slate-800">{c.current_role || "Candidate"}</span>
                        {c.experience_years && ` · ${c.experience_years} years experience`}
                        {c.location && ` · ${c.location}`}
                      </p>

                      {/* Masked Contact & Notice */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="flex items-center gap-1.5 font-mono">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {maskEmail(c.email) || "c****@candidate.in"}
                        </span>
                        <span className="flex items-center gap-1.5 font-mono">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {maskPhone(c.phone) || "+91 ****8910"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {c.notice_days !== null && c.notice_days !== undefined
                            ? `${c.notice_days} days notice`
                            : "Notice not stated"}
                        </span>
                      </div>

                      {/* Key skills */}
                      {c.key_skills && c.key_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {c.key_skills.map((s) => (
                            <span key={s} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* AI Evidence breakdown */}
                      {a.ai_evidence && Object.keys(a.ai_evidence).length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                            <span>AI Evaluation & Evidence Lines</span>
                          </div>
                          <div className="grid gap-1.5">
                            {Object.entries(a.ai_evidence).map(([crit, ev]) => {
                              const quote = Array.isArray(ev) ? ev[0] : ev;
                              return (
                                <div key={crit} className="text-xs bg-slate-50/70 p-2 rounded border border-slate-100">
                                  <span className="font-semibold text-slate-700">{crit}: </span>
                                  {quote ? (
                                    <span className="font-mono text-slate-600 italic">"{quote}"</span>
                                  ) : (
                                    <span className="text-slate-400 italic">No quoted evidence found</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action & Status Card */}
                    <div className="sm:w-64 shrink-0 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                      <div className="mb-3">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Current Stage
                        </span>
                        <span className="text-sm font-semibold capitalize text-slate-800">
                          {a.status}
                        </span>
                        {a.client_decision && (
                          <div className="mt-1 text-xs">
                            <span className="text-slate-500">Decision: </span>
                            <span className="font-semibold text-brand-700 capitalize">
                              {a.client_decision.replace("_", " ")}
                            </span>
                            {a.interview_slot_proposed && (
                              <p className="text-[11px] text-amber-700 mt-0.5">
                                Slot: {a.interview_slot_proposed}
                              </p>
                            )}
                            {a.client_decision_reason && (
                              <p className="text-[11px] text-slate-500 mt-0.5 italic">
                                "{a.client_decision_reason}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <button
                          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                            a.client_decision === "shortlisted"
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                          disabled={deciding[a.id]}
                          onClick={() => decide(a.id, "shortlisted")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Shortlist Candidate
                        </button>

                        <button
                          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                            a.client_decision === "interview_proposed"
                              ? "bg-amber-600 text-white"
                              : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                          }`}
                          disabled={deciding[a.id]}
                          onClick={() => setSlotModal(a.id)}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Propose Interview Slot
                        </button>

                        <button
                          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                            a.client_decision === "rejected"
                              ? "bg-red-600 text-white"
                              : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                          }`}
                          disabled={deciding[a.id]}
                          onClick={() => setRejectionModal(a.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject with Reason
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Reject Candidate</h3>
            <p className="text-xs text-slate-500">
              Provide feedback for why this candidate was not selected. Feedback helps calibrate future shortlists.
            </p>
            <textarea
              className="input text-xs h-24"
              placeholder="e.g. Needs more hands-on Spring Boot microservices experience..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button className="btn-ghost text-xs" onClick={() => setRejectionModal(null)}>
                Cancel
              </button>
              <button
                className="btn-danger text-xs"
                onClick={() => decide(rejectionModal, "rejected", rejectionReason)}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Slot Modal */}
      {slotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Propose Interview Slot</h3>
            <p className="text-xs text-slate-500">
              Select or type a proposed slot for the candidate interview.
            </p>
            <input
              className="input text-xs"
              placeholder="e.g. Wednesday 11:00 AM IST or Friday 3:00 PM"
              value={proposedSlot}
              onChange={(e) => setProposedSlot(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {["Mon 11:00 AM", "Tue 2:00 PM", "Wed 4:00 PM", "Thu 10:30 AM", "Fri 3:00 PM"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setProposedSlot(s)}
                  className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button className="btn-ghost text-xs" onClick={() => setSlotModal(null)}>
                Cancel
              </button>
              <button
                className="btn-primary text-xs"
                onClick={() => decide(slotModal, "interview_proposed", "", proposedSlot)}
              >
                Propose Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
