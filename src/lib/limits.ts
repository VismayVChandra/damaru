/**
 * How many briefs one Generate press may ask for.
 *
 * One definition, used by both the button row and the API. They used to be
 * written separately (the page offered 1/3/5, the route silently clamped to 5),
 * so asking for seven quietly returned five and nothing said so.
 */
export const GENERATE_COUNTS = [1, 3, 5] as const;
export const MAX_GENERATE = GENERATE_COUNTS[GENERATE_COUNTS.length - 1];
export const DEFAULT_GENERATE = 3;
