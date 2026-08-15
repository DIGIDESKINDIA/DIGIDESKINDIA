"use client";

export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">

      {/* Grid */}

      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(#2563eb 1px, transparent 1px),
            linear-gradient(90deg,#2563eb 1px, transparent 1px)
          `,
          backgroundSize: "70px 70px",
        }}
      />

      {/* Top Glow */}

      <div className="absolute left-[10%] top-[-120px] h-[420px] w-[420px] animate-pulse rounded-full bg-blue-500/20 blur-[120px]" />

      {/* Right Glow */}

      <div className="absolute right-[5%] top-[10%] h-[350px] w-[350px] animate-pulse rounded-full bg-cyan-400/20 blur-[120px]" />

      {/* Bottom Glow */}

      <div className="absolute bottom-[-120px] left-1/2 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[120px]" />

      {/* Floating Circles */}

      <div className="absolute left-[15%] top-[25%] h-5 w-5 animate-float rounded-full bg-blue-400/50" />

      <div className="absolute right-[20%] top-[20%] h-4 w-4 animate-float-delayed rounded-full bg-cyan-400/50" />

      <div className="absolute bottom-[18%] left-[25%] h-6 w-6 animate-float-slow rounded-full bg-indigo-400/40" />

      <div className="absolute right-[28%] bottom-[15%] h-3 w-3 animate-float rounded-full bg-sky-400/60" />

      {/* Gradient Overlay */}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-slate-950" />

    </div>
  );
}