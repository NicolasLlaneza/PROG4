import { useState } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../stores/authStore";
import { ApiError } from "../api/client";
import { POST_LOGIN_REDIRECT_KEY } from "../routes/PrivateRoute";
import DarkModeToggle from "../components/DarkModeToggle";

interface LocationState { from?: string; }

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => !!s.user);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await authApi.login({ email, password });
      login(res.user);
      const fromStorage = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
      const fromState = (location.state as LocationState | null)?.from;
      const destino = fromStorage ?? fromState ?? "/";
      sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Error inesperado al iniciar sesion");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f2f7] dark:bg-black p-4">
      {/* Toggle en esquina */}
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">FoodStore</h1>
          <p className="text-gray-500 dark:text-gray-400">Iniciar sesion</p>
        </div>

        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-200 dark:border-[#3a3a3c] overflow-hidden">
          <form onSubmit={onSubmit}>
            <div className="divide-y divide-gray-100 dark:divide-[#3a3a3c]">
              <div className="px-4 py-3">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Email
                </label>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none text-base"
                  placeholder="admin@foodstore.com" autoComplete="email"
                />
              </div>
              <div className="px-4 py-3">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Contrasena
                </label>
                <input
                  type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none text-base"
                  placeholder="Tu contrasena" autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="mx-4 my-3 bg-red-50 dark:bg-[#ff453a]/10 border border-red-200 dark:border-[#ff453a]/30 text-red-700 dark:text-[#ff453a] text-sm rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <div className="p-4">
              <button
                type="submit" disabled={cargando}
                className="w-full bg-[#007aff] dark:bg-[#0a84ff] hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-opacity text-base"
              >
                {cargando ? "Iniciando..." : "Iniciar sesion"}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Sin cuenta?{" "}
          <Link to="/register" className="text-[#007aff] dark:text-[#0a84ff] font-medium">
            Registrarse
          </Link>
        </p>
      </div>
    </div>
  );
}
