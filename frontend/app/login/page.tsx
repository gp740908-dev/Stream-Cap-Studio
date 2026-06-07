"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Username atau password salah");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-9 h-9 rounded bg-[#F59E0B] flex items-center justify-center">
            <Radio className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#e8e8e8] leading-tight">StreamCap</p>
            <p className="text-[10px] text-[#555] font-mono uppercase tracking-widest">Studio</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-lg p-6 space-y-4">
          <div className="mb-2">
            <h1 className="text-[15px] font-semibold text-[#e8e8e8]">Sign in</h1>
            <p className="text-[12px] text-[#555] mt-0.5">Access your recording dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] text-[#888] uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-[13px] text-[#e8e8e8] placeholder-[#444] focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
                placeholder="admin"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[#888] uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-[13px] text-[#e8e8e8] placeholder-[#444] focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed text-black text-[13px] font-semibold py-2.5 rounded transition-colors"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#333] font-mono mt-4">
          StreamCap Studio v1.0
        </p>
      </div>
    </div>
  );
}
