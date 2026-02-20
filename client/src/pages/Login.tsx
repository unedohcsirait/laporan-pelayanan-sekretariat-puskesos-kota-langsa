import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ username, password });
      setLocation("/");
    } catch (err: any) {
      const msg = err?.message || "Login gagal";
      // Extract JSON error message if available
      try {
        const json = JSON.parse(msg.replace(/^\d+:\s*/, ""));
        setError(json.message || msg);
      } catch {
        setError(msg.includes("401") ? "Username atau password salah" : msg);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background decorative circles */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-blue-700 opacity-10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-120px] left-[-120px] w-[400px] h-[400px] rounded-full bg-indigo-500 opacity-10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md px-6">
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
          {/* Logo / Title */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Masuk ke Sistem</h1>
            <p className="text-blue-200 text-sm mt-1 text-center">
              Laporan Pelayanan Sekretariat Puskesos
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 bg-red-500/20 border border-red-400/40 text-red-200 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-blue-100 text-sm font-medium mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-blue-300/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-blue-100 text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-12 text-white placeholder-blue-300/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              id="btn-login"
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-blue-500/40 mt-2"
            >
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {isLoggingIn ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300/60 text-xs mt-6">
          &copy; {new Date().getFullYear()} Puskesos Kota Langsa
        </p>
      </div>
    </div>
  );
}
