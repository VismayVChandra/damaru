/**
 * The Damaru mark: the drum's silhouette, reduced to one closed path.
 *
 * Two flared heads meeting at a pinched waist - the whole shape, no strokes and
 * no detail to lose at small sizes. It reads as a drum in context and as an
 * hourglass out of it, which suits a tool about projects people finish.
 *
 * Inherits `currentColor`, so it takes the colour of whatever it sits in and
 * works unchanged in both themes, in monochrome, and reversed.
 */
export const MARK_PATH =
  "M20 20 H80 C64 34 56 43 56 50 C56 57 64 66 80 80 H20 C36 66 44 57 44 50 C44 43 36 34 20 20 Z";

export default function Mark({
  size = 20,
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
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <path d={MARK_PATH} fill="currentColor" />
    </svg>
  );
}
