import Link from "next/link";
import { ArrowRight } from "lucide-react";

const categories = [
  {
    title: "Evening & Gala",
    description: "Timeless gowns and formal pieces for unforgettable moments.",
    tag: "formal",
    gradient: "from-purple-900/40 to-black",
    accent: "text-purple-300",
  },
  {
    title: "Everyday Luxe",
    description: "Effortless sophistication from morning coffee to late dinners.",
    tag: "casual",
    gradient: "from-amber-900/30 to-black",
    accent: "text-amber-300",
  },
  {
    title: "Power Dressing",
    description: "Structured silhouettes that command every room you enter.",
    tag: "office",
    gradient: "from-slate-800/60 to-black",
    accent: "text-slate-300",
  },
];

export default function CategoryShowcase() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-dark-400">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-gold-400 text-xs font-medium tracking-widest uppercase mb-3">
            Style Universes
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white">
            Find Your Aesthetic
          </h2>
          <p className="mt-4 text-zinc-500 max-w-xl mx-auto">
            Tell our AI stylist your vibe and watch it curate your perfect wardrobe in moments.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {categories.map(({ title, description, gradient, accent }) => (
            <div
              key={title}
              className={`group relative rounded-3xl border border-white/5 bg-gradient-to-br ${gradient} p-8 overflow-hidden cursor-pointer hover:border-gold-400/20 transition-all duration-500 hover:shadow-[0_8px_40px_rgba(196,149,58,0.1)]`}
            >
              {/* Ambient dot */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />

              <p className={`text-xs font-semibold tracking-widest uppercase mb-3 ${accent}`}>
                Collection
              </p>
              <h3 className="font-display text-2xl font-bold text-white mb-3 leading-tight">
                {title}
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                {description}
              </p>
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 text-sm font-medium text-gold-400 hover:text-gold-300 transition-colors group/link"
              >
                Explore with AI
                <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform duration-200" />
              </Link>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="mt-16 rounded-3xl border border-gold-400/20 bg-gradient-to-r from-gold-400/5 via-gold-300/5 to-gold-400/5 p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gold-gradient opacity-[0.03] pointer-events-none" />
          <p className="text-gold-400 text-xs font-medium tracking-widest uppercase mb-4">
            Your Personal Stylist
          </p>
          <h3 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Not sure where to start?
          </h3>
          <p className="text-zinc-400 max-w-md mx-auto mb-8">
            Describe your occasion, mood, or style goal and our AI curates the
            perfect outfit in seconds.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gold-gradient text-black font-semibold text-sm tracking-wider uppercase hover:shadow-lg hover:shadow-gold-400/25 hover:scale-105 transition-all duration-300"
          >
            Start Styling Now
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
