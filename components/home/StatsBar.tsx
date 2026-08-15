import {
  Clock3,
  Heart,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";

const statItems = [
  {
    icon: ShieldCheck,
    title: "100% Secure",
    description: "Your data is safe with us",
    iconClassName:
      "bg-emerald-500/15 text-emerald-400",
  },
  {
    icon: Users,
    title: "1+ Crore",
    description: "Happy users across India",
    iconClassName:
      "bg-blue-500/15 text-blue-400",
  },
  {
    icon: Clock3,
    title: "24x7 Available",
    description: "Always here for you",
    iconClassName:
      "bg-violet-500/15 text-violet-400",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Super fast service experience",
    iconClassName:
      "bg-amber-500/15 text-amber-400",
  },
  {
    icon: Heart,
    title: "Trusted by Millions",
    description: "Across India",
    iconClassName:
      "bg-cyan-500/15 text-cyan-400",
  },
];

export default function StatsBar() {
  return (
    <section className="w-full border-y border-white/10 bg-gradient-to-r from-[#0A1330] to-[#0F1B3D] py-6">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.iconClassName}`}
                >
                  <Icon size={21} />
                </div>

                <div>
                  <p className="text-sm font-bold text-white sm:text-base">
                    {item.title}
                  </p>

                  <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}