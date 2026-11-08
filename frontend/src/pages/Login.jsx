import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, AlertTriangle, ShieldCheck, UserCheck, Briefcase } from "lucide-react";
import { api, setToken } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("recruiter@hirepod.demo");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const form = new FormData();
      form.set("email", email);
      form.set("password", password);
      const data = await api.post("/auth/token", form, { headers: {} });
      setToken(data.access_token);
      
      // Fetch profile to know role
      try {
        const me = await api.get("/auth/me");
        localStorage.setItem("user", JSON.stringify(me));
        if (me.role === "client_manager") {
          navigate("/client");
          return;
        }
      } catch (err) {
        // continue
      }
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (userEmail) => {
    setEmail(userEmail);
    setPassword("password");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md panel p-8 sm:p-10">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-6 w-6 text-brand-600" />
          <span className="font-semibold text-slate-900 tracking-tight text-xl">HirePod</span>
        </div>
        <p className="text-sm text-slate-500 mb-6">Recruitment screening &mdash; sign in</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recruiter@hirepod.demo"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 mr-2 inline" /> {error}
            </div>
          )}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
            Quick demo sign-in
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => selectRole("recruiter@hirepod.demo")}
              className={`p-2 text-xs font-medium rounded-lg border text-center transition-all ${
                email === "recruiter@hirepod.demo"
                  ? "bg-brand-50 border-brand-300 text-brand-700 font-semibold"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Recruiter
            </button>
            <button
              type="button"
              onClick={() => selectRole("client@hirepod.demo")}
              className={`p-2 text-xs font-medium rounded-lg border text-center transition-all ${
                email === "client@hirepod.demo"
                  ? "bg-brand-50 border-brand-300 text-brand-700 font-semibold"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Client Mgr
            </button>
            <button
              type="button"
              onClick={() => selectRole("delivery@hirepod.demo")}
              className={`p-2 text-xs font-medium rounded-lg border text-center transition-all ${
                email === "delivery@hirepod.demo"
                  ? "bg-brand-50 border-brand-300 text-brand-700 font-semibold"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Delivery Head
            </button>
          </div>
          <p className="mt-3 text-[11px] text-center text-slate-400">
            All accounts use password: <code className="font-mono text-slate-600">password</code>
          </p>
        </div>
      </div>
    </div>
  );
}
