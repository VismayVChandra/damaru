import { MARK_PATH } from "@/components/Mark";

/**
 * A damaru is played by twisting it at the wrist so the two beads on their
 * cords swing out and strike each head in turn - that's the actual motion
 * this animates, not a generic spinner. Reuses the same silhouette as the
 * wordmark (Mark.tsx) for the body, so a loading state reads as "the thing
 * this club is named after," not an unrelated spinner shape.
 *
 * Inherits currentColor like Mark does, so it matches whatever text it sits
 * next to. Everything rotates around the drum's waist (50,50 in the shared
 * 0-100 viewBox) via `transform-box: view-box` in CSS, not SMIL, so the
 * whole thing can be switched off in one place for prefers-reduced-motion.
 */
export default function DamaruSpinner({
  size = 18,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`damaru-spinner${className ? ` ${className}` : ""}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <g className="damaru-part damaru-bead-cord damaru-bead-left">
        <line x1="50" y1="50" x2="27" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
        <circle cx="25" cy="50" r="6" fill="currentColor" />
      </g>
      <g className="damaru-part damaru-bead-cord damaru-bead-right">
        <line x1="50" y1="50" x2="73" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
        <circle cx="75" cy="50" r="6" fill="currentColor" />
      </g>
      <path className="damaru-part damaru-body" d={MARK_PATH} fill="currentColor" />
    </svg>
  );
}
