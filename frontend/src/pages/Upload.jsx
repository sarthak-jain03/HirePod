import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Copy, AlertTriangle, CheckCircle } from "lucide-react";
import { api } from "../services/api";

export default function Upload() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reqs, setReqs] = useState([]);
  const [selected, setSelected] = useState(id || "");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) { setSelected(id); return; }
    api.get("/jds").then((data) => setReqs(data)).catch(() => setReqs([]));
  }, [id]);

  const handleFiles = (e) => {
    setFiles(Array.from(e.target.files || []));
    setError("");
    setResult(null);
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!selected) { setError("Select a job first"); return; }
    if (files.length === 0) { setError("Choose at least one CV"); return; }
    if (files.length > 500) { setError("Maximum 500 CVs per upload"); return; }
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("requisition_id", selected);
    files.forEach((f) => form.append("files", f));
    try {
      const data = await api.post("/candidates/bulk-upload", form, { headers: {} });
      setResult(data);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const loadDemoBatch = async () => {
    if (!selected) { setError("Select a job first"); return; }
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("requisition_id", selected);
      const data = await api.post("/candidates/demo-batch", form);
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to load demo candidates");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <ArrowLeft className="h-5 w-5 text-slate-400" onClick={() => navigate(-1)} />
        <h1 className="text-xl font-semibold text-slate-900">Bulk CV upload</h1>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {!id && (
        <div className="space-y-2">
          <label className="label">Job (required)</label>
          <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Select a requisition&hellip;</option>
            {reqs.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
          {reqs.length === 0 && <p className="text-xs text-slate-400">No requisitions found. Create one first.</p>}
        </div>
      )}

      <div className="panel p-6">
        <div className="space-y-2">
          <label className="label">CV files (PDF or DOCX, up to 500)</label>
          <input type="file" multiple accept=".pdf,.docx" onChange={handleFiles} className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
          <p className="text-xs text-slate-400">Scanned PDFs are processed with OCR (requires Tesseract on the server; otherwise a clear note is shown).</p>
        </div>
        <p className="text-xs text-slate-500">{files.map((f) => f.name).join(", ") || "No files chosen"}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={uploading || !selected || files.length === 0} onClick={upload}>
          {uploading ? "Parsing..." : "Upload and parse CVs"}
        </button>
        <button
          type="button"
          className="btn-ghost border border-brand-200 text-brand-700 bg-brand-50/70 hover:bg-brand-100 text-xs font-semibold px-3 py-2"
          disabled={uploading || !selected}
          onClick={loadDemoBatch}
        >
          {uploading ? "Loading..." : "⚡ Load Demo CV Batch (IT, Banking KYC, Retail)"}
        </button>
      </div>

      {result && (
        <div className="panel p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold text-slate-900">Upload complete</h2>
          </div>
          <p className="text-sm text-slate-600">{result.uploaded} file(s) processed.</p>
          <table className="w-full text-xs text-left border-collapse divide-y divide-slate-100 mt-2">
            <thead><tr className="bg-slate-50"><th className="px-3 py-2 font-semibold text-slate-500">File</th><th className="px-3 py-2 font-semibold text-slate-500">Candidate ID</th><th className="px-3 py-2 font-semibold text-slate-500">Name</th><th className="px-3 py-2 font-semibold text-slate-500 text-right">Role</th><th className="px-3 py-2 font-semibold text-slate-500">Note</th></tr></thead>
            <tbody>
              {result.results.map((r) => (
                <tr key={r.file || r.name}>
                  <td className="px-3 py-2 truncate max-w-[30%]">{r.file}</td>
                  <td className="px-3 py-2 font-mono">{r.candidate_id || "&mdash;"}</td>
                  <td className="px-3 py-2">{r.name || "&mdash;"}</td>
                  <td className="px-3 py-2 text-right">{r.current_role || "&mdash;"}</td>
                  <td className="px-3 py-2">{r.note || (r.duplicate ? "Duplicate &mdash; not re-imported" : "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn-ghost text-sm text-brand-600 hover:underline mt-2" onClick={() => navigate(`/ranked/${selected}`)}>
            Go to ranked list <Copy className="h-3 w-3 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}
