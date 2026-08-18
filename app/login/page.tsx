"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.message ?? "Invalid login.");
        return;
      }

      router.push("/admin");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={isDark ? "min-h-screen flex items-center justify-center bg-[#050B18] px-5" : "min-h-screen flex items-center justify-center bg-gray-100 px-5"}>
      <div className={isDark ? "w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_24px_60px_rgba(2,6,23,0.4)]" : "w-full max-w-md rounded-3xl bg-white p-8 shadow-xl"}>
        <h1 className={isDark ? "mb-6 text-center text-3xl font-bold text-white" : "mb-6 text-center text-3xl font-bold"}>
          Digital Desk Admin Login
        </h1>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
          className={isDark ? "mb-4 w-full rounded-xl border border-white/10 bg-white/6 p-3 text-white placeholder:text-slate-500" : "mb-4 w-full rounded-xl border p-3"}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          className={isDark ? "mb-4 w-full rounded-xl border border-white/10 bg-white/6 p-3 text-white placeholder:text-slate-500" : "mb-4 w-full rounded-xl border p-3"}
        />

        <button
          onClick={login}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Login"}
        </button>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>
    </main>
  );
} 