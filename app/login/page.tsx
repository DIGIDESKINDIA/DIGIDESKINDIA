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

  const login = () => {
    const adminUser =
      process.env.NEXT_PUBLIC_ADMIN_USERNAME;

    const adminPass =
      process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (
      username === adminUser &&
      password === adminPass
    ) {
      localStorage.setItem(
        "digitaldesk_admin",
        "true"
      );

      router.push("/app/admin");
    } else {
      alert("Invalid Login");
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
          className="w-full bg-blue-600 text-white py-3 rounded-xl"
        >
          Login
        </button>
      </div>
    </main>
  );
} 