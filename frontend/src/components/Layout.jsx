import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { LogOut, ShieldCheck, LayoutDashboard, FileText, UploadCloud, Briefcase, BarChart3, Menu, X, ArrowLeftRight, Check } from "lucide-react";
import { clearToken, api, getToken, setToken } from "../services/api";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUser = () => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    const saved = localStorage.getItem("user");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch (e) {}
    }
    api.get("/auth/me").then((u) => {
      setUser(u);
      localStorage.setItem("user", JSON.stringify(u));
    }).catch(() => {});
  };

  useEffect(() => {
    fetchUser();
  }, [navigate]);

  const logout = () => {
    clearToken();
    localStorage.removeItem("user");
    navigate("/login");
  };

  const switchRole = async (targetRole) => {
    setSwitching(true);
    try {
      const res = await api.post(`/auth/switch-role/${targetRole}`);
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem("user", JSON.stringify(res.user));
      // Refresh current route
      window.location.reload();
    } catch (err) {
      console.error("Role switch failed", err);
    } finally {
      setSwitching(false);
    }
  };

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Job Descriptions", path: "/jd/new", icon: FileText },
    { label: "Bulk CV Upload", path: "/upload/1", icon: UploadCloud },
    { label: "Client Portal", path: "/client", icon: Briefcase },
    { label: "Audit & Calibration", path: "/audit", icon: BarChart3 },
  ];

  const roleLabels = {
    recruiter: "Recruiter",
    client_manager: "Client Manager",
    delivery_head: "Delivery Head",
  };

  const currentRole = user?.role || "recruiter";

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <span className="font-semibold text-slate-900 tracking-tight text-lg">HirePod</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Recruitment screening &middot; Noida</p>

          {/* User profile & 1-click Role Switcher */}
          <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200/90 p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Active User
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                currentRole === "client_manager"
                  ? "bg-purple-100 text-purple-700"
                  : currentRole === "delivery_head"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-brand-100 text-brand-700"
              }`}>
                {roleLabels[currentRole] || currentRole}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-800 truncate mb-2">{user?.email || "Signed in"}</p>

            <div className="border-t border-slate-200/70 pt-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Switch Role Demo:
              </span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => switchRole("recruiter")}
                  className={`text-[10px] py-1 px-1 rounded font-medium text-center transition-all ${
                    currentRole === "recruiter"
                      ? "bg-brand-600 text-white font-semibold shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                  title="Act as Recruiter"
                >
                  Recruiter
                </button>
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => switchRole("client_manager")}
                  className={`text-[10px] py-1 px-1 rounded font-medium text-center transition-all ${
                    currentRole === "client_manager"
                      ? "bg-purple-600 text-white font-semibold shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                  title="Act as Client Manager"
                >
                  Client
                </button>
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => switchRole("delivery_head")}
                  className={`text-[10px] py-1 px-1 rounded font-medium text-center transition-all ${
                    currentRole === "delivery_head"
                      ? "bg-amber-600 text-white font-semibold shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                  title="Act as Delivery Head"
                >
                  Delivery
                </button>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? "bg-brand-50 text-brand-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-brand-700" : "text-slate-400"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4 text-red-600" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar for mobile and quick info */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 md:hidden">
            <button
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              onClick={() => setOpen((o) => !o)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            <span className="font-semibold text-slate-900 text-sm">HirePod</span>
          </div>

          {/* Quick role indicator in desktop header */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span>Viewing as:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => switchRole("recruiter")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  currentRole === "recruiter" ? "bg-white shadow-xs text-brand-700 font-semibold" : "text-slate-600"
                }`}
              >
                Recruiter
              </button>
              <button
                type="button"
                onClick={() => switchRole("client_manager")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  currentRole === "client_manager" ? "bg-white shadow-xs text-purple-700 font-semibold" : "text-slate-600"
                }`}
              >
                Client Manager
              </button>
              <button
                type="button"
                onClick={() => switchRole("delivery_head")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  currentRole === "delivery_head" ? "bg-white shadow-xs text-amber-700 font-semibold" : "text-slate-600"
                }`}
              >
                Delivery Head
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">DPDP Act 2023 Compliant</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="System operational" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      {open && (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col md:hidden animate-in slide-in-from-left duration-200">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-600" />
              <span className="font-semibold text-slate-900 text-sm">HirePod</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-900">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 mx-3 mt-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-900 truncate">{user?.email}</p>
            <span className="text-[10px] font-semibold text-brand-700">
              {roleLabels[currentRole] || currentRole}
            </span>
            <div className="grid grid-cols-3 gap-1 mt-2">
              <button
                type="button"
                onClick={() => { switchRole("recruiter"); setOpen(false); }}
                className="text-[10px] bg-white border p-1 rounded font-medium"
              >
                Recruiter
              </button>
              <button
                type="button"
                onClick={() => { switchRole("client_manager"); setOpen(false); }}
                className="text-[10px] bg-white border p-1 rounded font-medium"
              >
                Client
              </button>
              <button
                type="button"
                onClick={() => { switchRole("delivery_head"); setOpen(false); }}
                className="text-[10px] bg-white border p-1 rounded font-medium"
              >
                Delivery
              </button>
            </div>
          </div>

          <nav className="px-3 py-3 space-y-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg text-left ${
                    isActive
                      ? "bg-brand-50 text-brand-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
