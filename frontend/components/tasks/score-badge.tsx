interface ScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const value = score === null ? "—" : Math.round(score);
  const high = score !== null && score > 70;

  return (
    <span
      aria-label={score === null ? "Not yet scored" : `Priority score ${value}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border font-mono font-semibold tabular-nums ${
        size === "sm" ? "h-7 w-7 text-[0.65rem]" : "h-8 w-8 text-xs"
      } ${
        high
          ? "border-amber/70 bg-amber/8 text-ink"
          : "border-clay/70 bg-white/30 text-ink-muted"
      }`}
    >
      {value}
    </span>
  );
}
