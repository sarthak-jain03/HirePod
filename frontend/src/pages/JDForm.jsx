import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bot, Save, RefreshCw } from "lucide-react";
import { api } from "../services/api";

export default function JDForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const skillInput = useRef(null);
  const niceInput = useRef(null);
  const [jd, setJd] = useState({
    title: "", description: "", location: "", experience_min: "", experience_max: "",
    ctc_lakhs: "", notice_period_days: "", must_have_skills: [], nice_to_have_skills: [], client_id: 2,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/jds/${id}`).then((r) => {
      setJd({
        title: r.title, description: r.description, location: r.location || "",
        experience_min: r.experience_min ?? "", experience_max: r.experience_max ?? "",
        ctc_lakhs: r.ctc_lakhs || "", notice_period_days: r.notice_period_days ?? "",
        must_have_skills: r.must_have_skills || [], nice_to_have_skills: r.nice_to_have_skills || [],
        client_id: r.client_id || 2,
      });
    }).catch(() => setError("Could not load JD")).finally(() => setLoading(false));
  }, [id]);

  const toggleSkill = (skill, list) => {
    setJd((prev) => {
      const next = [...prev[list]];
      const i = next.indexOf(skill);
      if (i >= 0) next.splice(i, 1); else next.push(skill);
      return { ...prev, [list]: next };
    });
  };

  const addSkill = (list) => {
    const el = list === "must_have_skills" ? skillInput.current : niceInput.current;
    const val = el.value.trim();
    if (!val) return;
    toggleSkill(val, list);
    el.value = "";
  };

  const extract = async () => {
    if (!id) return;
    setExtracting(true);
    setError("");
    try {
      const data = await api.post(`/jds/${id}/extract`, { description: jd.description });
      setJd((prev) => ({
        ...prev,
        must_have_skills: data.must_have_skills || [],
        nice_to_have_skills: data.nice_to_have_skills || [],
        experience_min: data.experience_min ?? prev.experience_min,
        experience_max: data.experience_max ?? prev.experience_max,
        ctc_lakhs: data.ctc_lakhs ?? prev.ctc_lakhs,
        notice_period_days: data.notice_period_days ?? prev.notice_period_days,
        location: data.location ?? prev.location,
      }));
      setMessage(data.raw_summary ? `Scorecard extracted. ${data.raw_summary}` : "Scorecard extracted from the JD.");
    } catch (err) {
      setError(err.message || "AI extraction unavailable &mdash; edit the scorecard manually.");
    } finally {
      setExtracting(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: jd.title, description: jd.description, location: jd.location,
        experience_min: jd.experience_min ? Number(jd.experience_min) : null,
        experience_max: jd.experience_max ? Number(jd.experience_max) : null,
        ctc_lakhs: jd.ctc_lakhs || null,
        notice_period_days: jd.notice_period_days ? Number(jd.notice_period_days) : null,
        must_have_skills: jd.must_have_skills,
        nice_to_have_skills: jd.nice_to_have_skills,
        client_id: jd.client_id ? Number(jd.client_id) : 2,
      };
      let saved;
      if (id) {
        saved = await api.put(`/jds/${id}`, payload);
      } else {
        saved = await api.post("/jds", payload);
      }
      navigate(id ? "/" : `/jd/${saved.id}/edit`);
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><p className="text-slate-500">Loading&hellip;</p></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <ArrowLeft className="h-5 w-5 text-slate-400" onClick={() => navigate(-1)} />
        <h1 className="text-xl font-semibold text-slate-900">{id ? "Edit job description" : "New job description"}</h1>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error.replace(/&mdash;/g, "—")}</div>}
      {message && <div className="rounded-lg bg-brand-50 p-4 text-sm text-brand-800">{message.replace(/&mdash;/g, "—")}</div>}

      <form onSubmit={save} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="label">Job title</label>
            <input className="input" value={jd.title} onChange={(e) => setJd((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Senior Java Developer" />
          </div>
          <div className="space-y-2">
            <label className="label">Location</label>
            <input className="input" value={jd.location} onChange={(e) => setJd((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Noida" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="label">Job description</label>
          <textarea className="input h-48 font-mono text-sm" value={jd.description} onChange={(e) => setJd((p) => ({ ...p, description: e.target.value }))} placeholder="Paste the client JD here&hellip;" />
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn-ghost text-sm" disabled={extracting || !id || !jd.description} onClick={extract}>
              {extracting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Bot className="h-4 w-4 mr-2" />} Extract scorecard with AI
            </button>
            {!id && <span className="text-xs text-slate-400">Save first, then extract.</span>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="label">Min experience (yrs)</label>
            <input className="input" type="number" value={jd.experience_min} onChange={(e) => setJd((p) => ({ ...p, experience_min: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="label">Max experience (yrs)</label>
            <input className="input" type="number" value={jd.experience_max} onChange={(e) => setJd((p) => ({ ...p, experience_max: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="label">CTC (lakhs)</label>
            <input className="input" value={jd.ctc_lakhs} onChange={(e) => setJd((p) => ({ ...p, ctc_lakhs: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="label">Notice (days)</label>
            <input className="input" type="number" value={jd.notice_period_days} onChange={(e) => setJd((p) => ({ ...p, notice_period_days: e.target.value }))} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="label">Must-have skills (scorecard criteria)</label>
            <span className="text-xs text-slate-400">These drive AI scoring</span>
          </div>
          <div className="grid gap-2">
            {jd.must_have_skills.map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                <span className="text-sm text-brand-800">{s}</span>
                <button type="button" className="text-brand-600 hover:text-brand-900" onClick={() => toggleSkill(s, "must_have_skills")}>&times;</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input flex-1 text-sm" ref={skillInput} placeholder="Add skill&hellip;" />
              <button type="button" className="btn-ghost px-3" onClick={() => addSkill("must_have_skills")}>Add</button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="label">Nice-to-have skills</label>
            <span className="text-xs text-slate-400">Secondary criteria</span>
          </div>
          <div className="grid gap-2">
            {jd.nice_to_have_skills.map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-600">{s}</span>
                <button type="button" className="text-slate-600 hover:text-slate-900" onClick={() => toggleSkill(s, "nice_to_have_skills")}>&times;</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input flex-1 text-sm" ref={niceInput} placeholder="Add skill&hellip;" />
              <button type="button" className="btn-ghost px-3" onClick={() => addSkill("nice_to_have_skills")}>Add</button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button className="btn-primary" disabled={saving}>
            {saving ? <Save className="h-4 w-4 mr-2 animate-pulse" /> : <Save className="h-4 w-4 mr-2" />}
            {id ? "Save scorecard" : "Create requisition"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate("/")}>Cancel</button>
        </div>
      </form>

      <p className="text-xs text-slate-400">
        Fairness note: name, gender, age, photo and marital status are never sent to the scoring model. CV text is redacted before scoring.
      </p>
    </div>
  );
}
