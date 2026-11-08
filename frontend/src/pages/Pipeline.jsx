import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, List } from "lucide-react";
import { api } from "../services/api";

const STAGES = ["sourced", "shortlisted", "rejected", "interviewed", "offered", "joined"];
const LABELS = { sourced: "Sourced", shortlisted: "Shortlisted", rejected: "Rejected", interviewed: "Interviewed", offered: "Offered", joined: "Joined" };

export default function Pipeline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/applications/pipeline/${id}`).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex h-full items-center justify-center"><p className="text-slate-500">Loading&hellip;</p></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <ArrowLeft className="h-5 w-5 text-slate-400" onClick={() => navigate(-1)} />
        <h1 className="text-xl font-semibold text-slate-900">Pipeline</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STAGES.map((stage) => {
          const count = data?.stages.find((s) => s.stage === stage)?.count || 0;
          return (
            <div key={stage} className="panel p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{LABELS[stage]}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Funnel by stage</h2>
          <span className="text-xs text-slate-400">Total {data?.total || 0} applications</span>
        </div>
        <div className="h-48 flex items-end gap-2">
          {STAGES.map((stage) => {
            const count = data?.stages.find((s) => s.stage === stage)?.count || 0;
            const total = data?.total || 1;
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={stage} className="flex flex-col items-center gap-2 w-full">
                <div className={`w-full rounded-t-lg transition-all duration-500 ${stage === "joined" ? "bg-green-500" : stage === "offered" ? "bg-amber-500" : stage === "interviewed" ? "bg-blue-500" : stage === "shortlisted" ? "bg-brand-600" : "bg-slate-400"}`} style={{ height: `${(count / Math.max(...STAGES.map(s => data?.stages.find((x) => x.stage === s)?.count || 1))) * 100}%` }} />
                <span className="text-xs font-medium text-slate-700">{count}</span>
                <span className="text-[10px] text-slate-400 capitalize">{stage}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Stages: sourced &rarr; shortlisted &rarr; rejected &rarr; interviewed &rarr; offered &rarr; joined. Client decisions (shortlist / reject / interview) move candidates through the pipeline.
      </p>
    </div>
  );
}
