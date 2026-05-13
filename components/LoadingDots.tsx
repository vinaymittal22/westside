"use client";

export default function LoadingDots() {
  return (
    <div className="flex items-center gap-[5px] px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-[7px] h-[7px] rounded-full bg-gold-400 animate-dot-bounce"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}
