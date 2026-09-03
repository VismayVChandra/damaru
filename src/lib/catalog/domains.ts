import type { Domain } from "@/lib/types";

/**
 * Domains are structural: an area someone can care about, plus the kinds of
 * data that exist inside it. They change rarely, so they stay in code.
 *
 * The frictions themselves now live in Postgres (see supabase/migrations/
 * 002_frictions.sql). That is what lets a club member submit one and have it
 * reach the generator once accepted, without a deploy.
 */
export const DOMAINS: Domain[] = [
  {
    id: "music",
    label: "Music & Audio",
    icon: "🎧",
    signals: [
      "raw audio files and their waveforms",
      "MIDI captures from a keyboard",
      "public listening-history exports",
      "venue and event calendars",
      "setlist archives",
    ],
  },
  {
    id: "climate",
    label: "Climate & Environment",
    icon: "🌍",
    signals: [
      "open government air-quality feeds",
      "smart-meter or utility exports",
      "public weather station APIs",
      "satellite or aerial imagery tiles",
      "hand-collected field survey sheets",
    ],
  },
  {
    id: "health",
    label: "Health & Wellbeing",
    icon: "🩺",
    signals: [
      "wearable step and heart-rate exports",
      "self-reported daily check-ins",
      "phone screen-time and sleep logs",
      "public medication interaction databases",
      "calendar and appointment data",
    ],
  },
  {
    id: "education",
    label: "Learning & Teaching",
    icon: "📚",
    signals: [
      "submitted assignment text and code",
      "quiz attempt histories",
      "open textbook and syllabus corpora",
      "public question banks",
      "timestamps of study sessions",
    ],
  },
  {
    id: "campus",
    label: "Campus & Student Life",
    icon: "🎒",
    signals: [
      "club rosters and sign-up sheets",
      "event RSVP counts",
      "shared timetable exports",
      "campus map and room booking data",
      "group chat message archives",
    ],
  },
  {
    id: "sports",
    label: "Sports & Fitness",
    icon: "🏃",
    signals: [
      "GPS watch and fitness app exports",
      "match video with timestamps",
      "league fixture and results tables",
      "manual session logs",
      "public sports statistics APIs",
    ],
  },
  {
    id: "food",
    label: "Food & Cooking",
    icon: "🍳",
    signals: [
      "supermarket price and stock listings",
      "open recipe and nutrition datasets",
      "receipt photos and line items",
      "fridge inventory entered by hand",
      "seasonal produce calendars",
    ],
  },
  {
    id: "money",
    label: "Money & Personal Finance",
    icon: "💸",
    signals: [
      "bank statement CSV exports",
      "payment app transaction history",
      "receipt photographs",
      "public currency and rate APIs",
      "manually entered ledger rows",
    ],
  },
  {
    id: "accessibility",
    label: "Accessibility & Disability",
    icon: "♿",
    signals: [
      "page DOM and ARIA structure",
      "OpenStreetMap accessibility tags",
      "lecture audio transcripts",
      "crowd-reported venue access notes",
      "WCAG rule definitions",
    ],
  },
  {
    id: "civic",
    label: "Civic & Local Government",
    icon: "🏛",
    signals: [
      "open council data portals",
      "scanned minutes and agenda PDFs",
      "public budget spreadsheets",
      "complaint ticket exports",
      "OpenStreetMap and property boundary data",
    ],
  },
  {
    id: "gaming",
    label: "Games & Play",
    icon: "🎮",
    signals: [
      "game session logs and scores",
      "public board game database APIs",
      "gameplay video and input traces",
      "player rating histories",
      "rulebook text",
    ],
  },
  {
    id: "art",
    label: "Art, Film & Creative Work",
    icon: "🎨",
    signals: [
      "image files and their EXIF metadata",
      "extracted video frames",
      "manuscript and draft text",
      "colour palettes sampled from images",
      "project folder structures",
    ],
  },
  {
    id: "transit",
    label: "Transport & Cities",
    icon: "🚌",
    signals: [
      "GTFS transit schedule feeds",
      "realtime vehicle position APIs",
      "OpenStreetMap road and cycle networks",
      "crowd-reported delay notes",
      "trip GPS traces",
    ],
  },
  {
    id: "work",
    label: "Work & Getting Things Done",
    icon: "🗂",
    signals: [
      "git commit and issue history",
      "meeting transcript text",
      "calendar and availability data",
      "public repository metadata APIs",
      "document and note exports",
    ],
  },
  {
    id: "science",
    label: "Science & Research",
    icon: "🔬",
    signals: [
      "open paper metadata APIs",
      "instrument output files",
      "species occurrence databases",
      "lab notebook text",
      "sensor time series",
    ],
  },
  {
    id: "language",
    label: "Language & Culture",
    icon: "🗣",
    signals: [
      "parallel text corpora",
      "recorded speech samples",
      "public dictionary and wordnet data",
      "subtitle files",
      "learner error logs",
    ],
  },
  {
    id: "agri",
    label: "Farming & Food Systems",
    icon: "🌾",
    signals: [
      "public weather and rainfall APIs",
      "market price bulletins",
      "photographs of leaves and crops",
      "soil test result sheets",
      "satellite vegetation indices",
    ],
  },
  {
    id: "pets",
    label: "Animals & Pets",
    icon: "🐾",
    signals: [
      "intake and adoption records",
      "photographs of animals",
      "volunteer shift rosters",
      "veterinary treatment logs",
      "geotagged sighting reports",
    ],
  },
];

export const DOMAIN_BY_ID = new Map(DOMAINS.map((d) => [d.id, d]));
