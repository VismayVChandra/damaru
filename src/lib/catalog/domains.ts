import type { Domain } from "@/lib/types";

/**
 * The generator's raw material.
 *
 * Each friction carries the person who feels it and the mechanic ids that could
 * plausibly answer it. Sampling those independently is how generators end up
 * proposing a playable game to fix a timetable clash, so they are bound here.
 */
export const DOMAINS: Domain[] = [
  {
    id: "music",
    label: "Music & Audio",
    icon: "\u{1F3A7}",
    frictions: [
      {
        actor: "a bedroom producer",
        text: "their sample library is four thousand unlabelled WAV files, and finding the right kick means auditioning for an hour",
        mechanics: ["search", "classify", "fuzzy-match", "structuring"],
      },
      {
        actor: "a DJ who plays weekly sets",
        text: "setlists get rebuilt from scratch every gig because nobody records which songs actually landed",
        mechanics: ["timeseries", "recommend", "capture", "structuring"],
      },
      {
        actor: "someone teaching themselves an instrument with no tutor",
        text: "practice happens in bursts, and there is no honest record of what improved and what quietly got worse",
        mechanics: ["timeseries", "capture", "viz", "classify"],
      },
      {
        actor: "the sound engineer at a 200-capacity venue",
        text: "the same soundcheck problems recur every week, and the fixes live only in one person's memory",
        mechanics: ["workflow", "search", "structuring", "capture", "sensor"],
      },
      {
        actor: "a bedroom producer",
        text: "collaborators send back mixes as bare files, with no way to comment on a specific second of audio",
        mechanics: ["realtime", "workflow", "capture", "viz"],
      },
      {
        actor: "a campus radio station run by four volunteers",
        text: "the back catalogue is spread across three phones, a laptop and a dead Dropbox account",
        mechanics: ["structuring", "search", "parser", "pipeline"],
      },
      {
        actor: "a college a cappella group",
        text: "nobody can tell which of the two hundred rehearsal recordings is the take worth keeping",
        mechanics: ["classify", "search", "timeseries", "viz"],
      },
      {
        actor: "a college a cappella group",
        text: "credits and splits get agreed verbally and then disputed six months later",
        mechanics: ["workflow", "privacy", "structuring"],
      },
    ],
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
    icon: "\u{1F30D}",
    frictions: [
      {
        actor: "a river clean-up volunteer crew",
        text: "field observations are collected on paper and the data dies in a drawer before anyone analyses it",
        mechanics: ["capture", "structuring", "pipeline", "viz"],
      },
      {
        actor: "a household trying to cut its power bill",
        text: "energy bills arrive monthly as a single number, far too late and too coarse to change any behaviour",
        mechanics: ["timeseries", "viz", "sensor", "simulate"],
      },
      {
        actor: "a student sustainability committee",
        text: "grant reports need before-and-after evidence that nobody was set up to capture at the start",
        mechanics: ["timeseries", "viz", "structuring", "capture"],
      },
      {
        actor: "a neighbourhood tree-planting group",
        text: "volunteers repeat surveys of the same site because there is no shared record of who covered what",
        mechanics: ["geo", "realtime", "workflow", "capture"],
      },
      {
        actor: "a campus facilities manager",
        text: "air-quality and weather data exist publicly, but in formats nobody on the team can open",
        mechanics: ["parser", "pipeline", "structuring", "viz"],
      },
      {
        actor: "a student sustainability committee",
        text: "the case for a change is obvious to the team and impossible to show a sceptical committee in one page",
        mechanics: ["viz", "simulate", "timeseries"],
      },
      {
        actor: "a small solar installer",
        text: "seasonal patterns matter enormously, and their records only go back as far as the current spreadsheet",
        mechanics: ["timeseries", "structuring", "simulate", "pipeline"],
      },
      {
        actor: "a campus facilities manager",
        text: "recycling and waste rules differ per building and everyone simply guesses",
        mechanics: ["search", "classify", "vision", "geo"],
      },
    ],
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
    icon: "\u{1FA7A}",
    frictions: [
      {
        actor: "someone managing a chronic condition day to day",
        text: "symptom tracking demands daily effort exactly when the person feels worst, so the log has holes precisely where it matters",
        mechanics: ["capture", "timeseries", "privacy", "classify", "sensor"],
      },
      {
        actor: "a physiotherapy patient doing home exercises",
        text: "the exercises are prescribed on a photocopied sheet and abandoned within a week with nobody noticing",
        mechanics: ["capture", "gameloop", "workflow", "timeseries"],
      },
      {
        actor: "a person coordinating care across four different clinics",
        text: "records live in four portals that do not talk to each other, and none of them export",
        mechanics: ["parser", "structuring", "privacy", "search"],
      },
      {
        actor: "someone managing a chronic condition day to day",
        text: "the useful question is what changed before this flare-up, and no consumer app answers it",
        mechanics: ["timeseries", "viz", "classify", "simulate"],
      },
      {
        actor: "a person coordinating care across four different clinics",
        text: "appointment prep means recalling three months of detail under time pressure in a ten-minute slot",
        mechanics: ["nlp-extract", "viz", "structuring", "search"],
      },
      {
        actor: "a caregiver looking after an ageing parent",
        text: "handovers between shifts happen verbally and important detail evaporates",
        mechanics: ["workflow", "capture", "realtime", "structuring"],
      },
      {
        actor: "a student counselling service with a three-week waitlist",
        text: "advice is generic when the thing that actually helps is noticing one person's specific pattern",
        mechanics: ["timeseries", "recommend", "privacy", "classify"],
      },
      {
        actor: "a night-shift worker whose sleep is wrecked",
        text: "reminders either nag constantly or get muted entirely, with no setting in between",
        mechanics: ["workflow", "recommend", "capture", "timeseries"],
      },
    ],
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
    icon: "\u{1F4DA}",
    frictions: [
      {
        actor: "a teaching assistant grading 180 submissions",
        text: "feedback arrives two weeks after the work, by which point the student has moved on and cannot use it",
        mechanics: ["classify", "nlp-extract", "pipeline", "workflow"],
      },
      {
        actor: "a school teacher with one shared computer lab",
        text: "the same five misconceptions appear in every cohort and get re-explained from scratch each year",
        mechanics: ["classify", "nlp-extract", "search", "structuring"],
      },
      {
        actor: "a self-taught learner with no cohort",
        text: "spaced repetition works, but building the deck is such a chore that people quit before benefiting",
        mechanics: ["nlp-extract", "recommend", "capture", "classify"],
      },
      {
        actor: "someone preparing for a competitive exam alone",
        text: "practice questions run out long before understanding does",
        mechanics: ["recommend", "nlp-extract", "simulate", "search"],
      },
      {
        actor: "a tutor working with students across three subjects",
        text: "a learner cannot tell whether they are stuck on this topic or on a gap three topics back",
        mechanics: ["classify", "viz", "recommend", "simulate"],
      },
      {
        actor: "a study group of five that keeps drifting apart",
        text: "group study degenerates into the fastest person talking while everyone else copies",
        mechanics: ["workflow", "realtime", "gameloop", "capture"],
      },
      {
        actor: "a school teacher with one shared computer lab",
        text: "teaching materials get remade every term because last term's version cannot be found",
        mechanics: ["search", "structuring", "fuzzy-match", "pipeline", "capture"],
      },
      {
        actor: "a self-taught learner with no cohort",
        text: "progress feels invisible in the middle stretch, which is exactly when people quit",
        mechanics: ["viz", "timeseries", "gameloop", "capture"],
      },
    ],
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
    icon: "\u{1F392}",
    frictions: [
      {
        actor: "a club secretary handling sign-ups in a WhatsApp group",
        text: "every club runs recruitment through its own form, and nobody can see the overlap or the burnout",
        mechanics: ["structuring", "viz", "fuzzy-match", "classify"],
      },
      {
        actor: "a hostel mess committee",
        text: "attendance is guessed from a group chat and catering is over-ordered every single time",
        mechanics: ["timeseries", "capture", "simulate", "viz", "sensor"],
      },
      {
        actor: "a departmental society running six events a term",
        text: "the institutional memory of how to run an event walks out the door with each graduating batch",
        mechanics: ["search", "nlp-extract", "workflow", "structuring"],
      },
      {
        actor: "a first-year who knows nobody",
        text: "lost-and-found is a table in a corridor and a notice board nobody reads",
        mechanics: ["vision", "fuzzy-match", "search", "capture"],
      },
      {
        actor: "the organiser of a 400-person fest",
        text: "timetable clashes between clubs are only discovered when both events are already advertised",
        mechanics: ["scheduling", "realtime", "workflow", "viz"],
      },
      {
        actor: "a departmental society running six events a term",
        text: "the same ten people do all the work and nobody notices until they collapse",
        mechanics: ["timeseries", "viz", "workflow", "classify"],
      },
      {
        actor: "a student trying to sublet a room for the summer",
        text: "rooms, books and second-hand cycles change hands through chaotic broadcast messages",
        mechanics: ["search", "fuzzy-match", "recommend", "workflow"],
      },
      {
        actor: "a first-year who knows nobody",
        text: "newcomers cannot find the club that matches them because discovery is entirely word of mouth",
        mechanics: ["recommend", "search", "classify", "viz"],
      },
    ],
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
    icon: "\u{1F3C3}",
    frictions: [
      {
        actor: "an amateur football club with no analyst",
        text: "match footage exists, but tagging it for anything useful takes longer than the match itself",
        mechanics: ["vision", "capture", "classify", "viz"],
      },
      {
        actor: "a runner training for a first half marathon",
        text: "training load is tracked in a notebook and injuries arrive with no warning anybody could read",
        mechanics: ["timeseries", "capture", "viz", "simulate", "sensor"],
      },
      {
        actor: "a badminton league run by one exhausted organiser",
        text: "fixtures, results and tables are maintained by hand and are wrong by mid-season",
        mechanics: ["structuring", "scheduling", "pipeline", "workflow"],
      },
      {
        actor: "a climbing gym setting routes",
        text: "grades and difficulty are subjective and inconsistent between setters",
        mechanics: ["classify", "recommend", "structuring", "viz"],
      },
      {
        actor: "an amateur football club with no analyst",
        text: "team selection debates go in circles because nobody has the numbers to hand",
        mechanics: ["viz", "timeseries", "simulate", "structuring"],
      },
      {
        actor: "a school PE teacher tracking thirty kids",
        text: "a beginner has no idea whether today's session was too easy, too hard, or just badly timed",
        mechanics: ["timeseries", "classify", "recommend", "capture"],
      },
      {
        actor: "a badminton league run by one exhausted organiser",
        text: "juggling substitutes and availability eats the organiser's entire week",
        mechanics: ["scheduling", "workflow", "realtime", "capture"],
      },
      {
        actor: "a lifter working from a coach's PDF",
        text: "progress plateaus, and there is no way to tell whether to push, deload, or change something",
        mechanics: ["timeseries", "simulate", "recommend", "viz"],
      },
    ],
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
    icon: "\u{1F373}",
    frictions: [
      {
        actor: "a student learning to cook on a strict budget",
        text: "recipes assume ingredients they do not have, and no substitution advice survives contact with a real kitchen",
        mechanics: ["recommend", "fuzzy-match", "search", "structuring"],
      },
      {
        actor: "a home cook with a fridge that keeps producing waste",
        text: "food goes off at the back of the fridge and the waste is invisible until it smells",
        mechanics: ["capture", "vision", "timeseries", "workflow"],
      },
      {
        actor: "a shared flat of five cooking on rotation",
        text: "meal planning collapses the moment one day goes off-script",
        mechanics: ["scheduling", "workflow", "recommend", "realtime"],
      },
      {
        actor: "someone cooking for a specific medical diet",
        text: "dietary restrictions turn every shared meal into a negotiation from first principles",
        mechanics: ["classify", "structuring", "recommend", "search"],
      },
      {
        actor: "a small cafe owner ordering stock by instinct",
        text: "stock ordering is guesswork and the correction always arrives a week too late",
        mechanics: ["timeseries", "simulate", "viz", "pipeline"],
      },
      {
        actor: "a community kitchen serving 80 meals a day",
        text: "scaling a recipe from four servings to forty breaks in non-obvious ways",
        mechanics: ["structuring", "simulate", "parser", "viz"],
      },
      {
        actor: "a student learning to cook on a strict budget",
        text: "the cheapest shop depends entirely on the basket, and comparing takes longer than the saving is worth",
        mechanics: ["search", "fuzzy-match", "pipeline", "simulate"],
      },
      {
        actor: "a shared flat of five cooking on rotation",
        text: "nobody remembers which of the things they cooked last month were actually any good",
        mechanics: ["capture", "recommend", "timeseries", "viz"],
      },
    ],
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
    icon: "\u{1F4B8}",
    frictions: [
      {
        actor: "someone paying off a loan on a fixed salary",
        text: "bank statements are technically available and completely unreadable as a picture of a month",
        mechanics: ["parser", "viz", "structuring", "classify"],
      },
      {
        actor: "four flatmates splitting bills and groceries",
        text: "shared expenses accumulate as IOUs in a chat and settling up becomes a quarterly argument",
        mechanics: ["workflow", "structuring", "realtime", "nlp-extract"],
      },
      {
        actor: "someone paying off a loan on a fixed salary",
        text: "subscriptions renew silently and the total is never seen in one place",
        mechanics: ["classify", "timeseries", "parser", "viz"],
      },
      {
        actor: "a freelancer with unpredictable monthly income",
        text: "budgeting tools are built for stable salaries and break immediately on irregular income",
        mechanics: ["simulate", "timeseries", "viz", "recommend"],
      },
      {
        actor: "a student society treasurer",
        text: "the annual handover is a spreadsheet that nobody else understands",
        mechanics: ["structuring", "workflow", "viz", "pipeline"],
      },
      {
        actor: "a first-time earner sending money home each month",
        text: "small recurring leaks are individually trivial and collectively enormous",
        mechanics: ["classify", "timeseries", "viz", "fuzzy-match"],
      },
      {
        actor: "a freelancer with unpredictable monthly income",
        text: "tax and receipt gathering is a frantic annual archaeology dig",
        mechanics: ["vision", "nlp-extract", "structuring", "pipeline"],
      },
      {
        actor: "a first-time earner sending money home each month",
        text: "every piece of financial advice is written for people who already have a buffer",
        mechanics: ["simulate", "recommend", "viz", "privacy"],
      },
    ],
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
    icon: "\u{267F}",
    frictions: [
      {
        actor: "a screen-reader user navigating a badly built site",
        text: "accessibility problems are found by the people harmed by them and reported into a void",
        mechanics: ["workflow", "structuring", "capture", "classify"],
      },
      {
        actor: "a wheelchair user planning an unfamiliar route",
        text: "route planners know about distance and time but nothing about kerbs, steps or working lifts",
        mechanics: ["geo", "capture", "structuring", "viz"],
      },
      {
        actor: "a deaf student in a lecture with no captions",
        text: "auto-captions mangle exactly the technical vocabulary the lecture is about",
        mechanics: ["nlp-extract", "fuzzy-match", "classify", "capture"],
      },
      {
        actor: "someone with limited hand mobility using a phone one-handed",
        text: "interfaces assume two hands, steady aim and a fast connection",
        mechanics: ["workflow", "perf", "capture", "viz"],
      },
      {
        actor: "a person with dyslexia reading dense course material",
        text: "reading tools reformat text and destroy the structure that made it navigable",
        mechanics: ["parser", "structuring", "nlp-extract", "viz"],
      },
      {
        actor: "a volunteer auditing a building for step-free access",
        text: "an audit produces a hundred-item PDF that nobody prioritises or ever revisits",
        mechanics: ["classify", "viz", "structuring", "workflow"],
      },
      {
        actor: "a person with dyslexia reading dense course material",
        text: "accessible versions of documents are made once and immediately drift out of sync",
        mechanics: ["pipeline", "parser", "structuring", "classify"],
      },
      {
        actor: "a screen-reader user navigating a badly built site",
        text: "the person who needs an adjustment has to explain themselves from scratch to every new office",
        mechanics: ["privacy", "workflow", "structuring", "search"],
      },
    ],
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
    icon: "\u{1F3DB}",
    frictions: [
      {
        actor: "a local journalist covering council meetings alone",
        text: "decisions are published as scanned PDFs of minutes that nobody reads",
        mechanics: ["parser", "nlp-extract", "search", "pipeline"],
      },
      {
        actor: "a tenants' group tracking repairs",
        text: "complaints go into a portal and disappear with no trackable status",
        mechanics: ["workflow", "structuring", "capture", "viz"],
      },
      {
        actor: "a ward councillor with no analyst",
        text: "budget documents are technically public and practically impenetrable",
        mechanics: ["viz", "parser", "structuring", "simulate"],
      },
      {
        actor: "a residents' association covering 300 flats",
        text: "the same pothole gets reported forty times as forty separate tickets",
        mechanics: ["fuzzy-match", "geo", "classify", "structuring"],
      },
      {
        actor: "a volunteer running a neighbourhood broadcast list",
        text: "meeting notices arrive too late for anyone working a normal job to attend",
        mechanics: ["pipeline", "classify", "search", "workflow"],
      },
      {
        actor: "a tenants' group tracking repairs",
        text: "residents cannot tell whether a promised repair happened or quietly got dropped",
        mechanics: ["timeseries", "capture", "workflow", "viz"],
      },
      {
        actor: "someone trying to find out what is being built next door",
        text: "planning applications affect a whole street and are announced on one laminated notice",
        mechanics: ["geo", "pipeline", "search", "nlp-extract"],
      },
      {
        actor: "a ward councillor with no analyst",
        text: "turnout at consultations is dominated by whoever is retired and angry",
        mechanics: ["viz", "timeseries", "structuring", "simulate"],
      },
    ],
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
    icon: "\u{1F3AE}",
    frictions: [
      {
        actor: "a board game group of eight with wildly different tastes",
        text: "picking what to play takes longer than playing it, and the loudest voice usually wins",
        mechanics: ["recommend", "scheduling", "viz", "classify"],
      },
      {
        actor: "a solo indie dev with no playtesters",
        text: "playtest feedback arrives as vibes and nothing actionable survives to the next build",
        mechanics: ["capture", "structuring", "classify", "viz"],
      },
      {
        actor: "a dungeon master prepping weekly sessions",
        text: "session prep is three hours of work that gets used for forty minutes and then discarded",
        mechanics: ["search", "structuring", "recommend", "workflow"],
      },
      {
        actor: "an esports team reviewing their own VODs",
        text: "balance and tactics are argued about with anecdotes because nobody logs outcomes",
        mechanics: ["capture", "timeseries", "viz", "simulate"],
      },
      {
        actor: "a board game group of eight with wildly different tastes",
        text: "the shelf holds fifty games and eight get played on rotation forever",
        mechanics: ["recommend", "timeseries", "viz", "classify"],
      },
      {
        actor: "a speedrunner routing a new category",
        text: "reviewing your own recordings is so tedious that nobody does it consistently",
        mechanics: ["vision", "capture", "classify", "viz"],
      },
      {
        actor: "a dungeon master prepping weekly sessions",
        text: "a house rule gets agreed and then remembered differently by everyone",
        mechanics: ["structuring", "search", "workflow", "realtime"],
      },
      {
        actor: "a parent choosing games for a nine-year-old",
        text: "recommendation engines optimise for popularity and cannot handle like that, but shorter",
        mechanics: ["recommend", "search", "fuzzy-match", "classify"],
      },
    ],
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
    icon: "\u{1F3A8}",
    frictions: [
      {
        actor: "an illustrator with eleven years of files and no index",
        text: "the archive is enormous, and searching it means remembering a filename from 2019",
        mechanics: ["search", "vision", "fuzzy-match", "structuring"],
      },
      {
        actor: "a two-person film crew on a weekend shoot",
        text: "shoot days are planned on paper and the schedule dies at the first delay",
        mechanics: ["scheduling", "realtime", "workflow", "capture"],
      },
      {
        actor: "an animator reusing assets across projects",
        text: "client feedback arrives as vague adjectives with no reference to a specific frame",
        mechanics: ["capture", "workflow", "viz", "realtime"],
      },
      {
        actor: "a writer with drafts scattered across six apps",
        text: "version control for non-code work is a folder called final_final_v3",
        mechanics: ["structuring", "fuzzy-match", "workflow", "parser"],
      },
      {
        actor: "an animator reusing assets across projects",
        text: "the same asset gets remade because finding the original takes longer",
        mechanics: ["search", "vision", "fuzzy-match", "structuring"],
      },
      {
        actor: "an illustrator with eleven years of files and no index",
        text: "portfolio upkeep is always the thing that loses to paid work",
        mechanics: ["pipeline", "classify", "workflow", "viz"],
      },
      {
        actor: "a photographer culling four thousand frames",
        text: "colour, style and tone consistency across a series is maintained purely by eye",
        mechanics: ["vision", "classify", "viz", "timeseries"],
      },
      {
        actor: "a zine collective coordinating twelve contributors",
        text: "collaborators need to see work in progress without being handed the whole raw project",
        mechanics: ["workflow", "realtime", "privacy", "structuring"],
      },
    ],
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
    icon: "\u{1F68C}",
    frictions: [
      {
        actor: "a daily commuter with two unreliable connections",
        text: "official timetables describe an intention, and the real service is something else entirely",
        mechanics: ["timeseries", "pipeline", "viz", "simulate"],
      },
      {
        actor: "a cyclist choosing between a fast route and a safe one",
        text: "route planners optimise for speed when the actual constraint is reliability or safety",
        mechanics: ["geo", "recommend", "simulate", "viz"],
      },
      {
        actor: "someone new to a city with no local instinct",
        text: "the last-mile gap is where every journey plan quietly falls apart",
        mechanics: ["geo", "recommend", "search", "simulate"],
      },
      {
        actor: "a daily commuter with two unreliable connections",
        text: "delays are announced after they have already ruined the connection",
        mechanics: ["timeseries", "realtime", "classify", "capture"],
      },
      {
        actor: "a shift worker travelling at hours the timetable ignores",
        text: "crowding is completely invisible until you are standing on the platform",
        mechanics: ["capture", "timeseries", "classify", "viz", "sensor"],
      },
      {
        actor: "a delivery rider optimising a route by memory",
        text: "hard-won local knowledge stays in one rider's head and helps nobody else",
        mechanics: ["capture", "geo", "structuring", "search"],
      },
      {
        actor: "a campus shuttle coordinator",
        text: "demand is spiky, the schedule is fixed, and it is wrong at both ends of the day",
        mechanics: ["scheduling", "timeseries", "simulate", "viz"],
      },
      {
        actor: "someone new to a city with no local instinct",
        text: "comparing modes fairly means comparing cost, time, effort and stress, and no tool does all four",
        mechanics: ["simulate", "viz", "geo", "recommend"],
      },
    ],
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
    icon: "\u{1F5C2}",
    frictions: [
      {
        actor: "an intern trying to understand a codebase nobody documented",
        text: "context lives in the heads of two people and onboarding anyone takes a month",
        mechanics: ["search", "nlp-extract", "structuring", "viz"],
      },
      {
        actor: "an open-source maintainer with 400 open issues",
        text: "the issue tracker is a graveyard and triage never happens because it is nobody's job",
        mechanics: ["classify", "fuzzy-match", "recommend", "pipeline"],
      },
      {
        actor: "a remote team spread across three time zones",
        text: "meeting notes are taken and never read again",
        mechanics: ["nlp-extract", "search", "structuring", "classify"],
      },
      {
        actor: "a two-person startup drowning in tool sprawl",
        text: "the same decision gets re-litigated because the reasoning was never written down",
        mechanics: ["search", "structuring", "nlp-extract", "workflow"],
      },
      {
        actor: "a remote team spread across three time zones",
        text: "status updates cost more time than the work they describe",
        mechanics: ["pipeline", "structuring", "workflow", "viz"],
      },
      {
        actor: "a researcher who reads forty papers a month",
        text: "search across their own tools returns nothing, because everything lives in a different silo",
        mechanics: ["search", "pipeline", "fuzzy-match", "structuring"],
      },
      {
        actor: "a job seeker tracking sixty applications",
        text: "the pipeline is tracked in a spreadsheet that goes stale within two weeks",
        mechanics: ["workflow", "pipeline", "structuring", "capture"],
      },
      {
        actor: "an intern trying to understand a codebase nobody documented",
        text: "the useful question is why is this code like this, and git blame only tells you who",
        mechanics: ["nlp-extract", "search", "parser", "viz"],
      },
    ],
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
    icon: "\u{1F52C}",
    frictions: [
      {
        actor: "a lab sharing one expensive instrument between nine people",
        text: "booking is a paper sheet on a door and double-bookings are constant",
        mechanics: ["scheduling", "realtime", "workflow", "capture"],
      },
      {
        actor: "a PhD student whose analysis lives in one untitled notebook",
        text: "reproducing last year's figure requires a specific person who has since graduated",
        mechanics: ["pipeline", "structuring", "workflow", "parser"],
      },
      {
        actor: "an undergraduate doing their first literature review",
        text: "the literature is vast and the relevant twelve papers are indistinguishable from the noise",
        mechanics: ["search", "nlp-extract", "classify", "recommend"],
      },
      {
        actor: "a field ecologist counting species by hand",
        text: "observations are recorded on paper in the rain and typed up weeks later with errors",
        mechanics: ["capture", "structuring", "vision", "geo", "sensor"],
      },
      {
        actor: "a PhD student whose analysis lives in one untitled notebook",
        text: "raw data, cleaning steps and final figures live in three unlinked places",
        mechanics: ["pipeline", "structuring", "viz", "workflow"],
      },
      {
        actor: "a citizen science project with 2000 casual contributors",
        text: "submitted observations vary wildly in quality with no way to weight them",
        mechanics: ["classify", "structuring", "timeseries", "viz"],
      },
      {
        actor: "an undergraduate doing their first literature review",
        text: "negative results are never written down, and the same dead end is explored repeatedly",
        mechanics: ["search", "structuring", "nlp-extract", "workflow"],
      },
      {
        actor: "a lab sharing one expensive instrument between nine people",
        text: "a protocol is followed slightly differently by every person in the lab",
        mechanics: ["workflow", "capture", "structuring", "classify"],
      },
    ],
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
    icon: "\u{1F5E3}",
    frictions: [
      {
        actor: "a learner six months into a language with no speaking partner",
        text: "apps teach vocabulary they will never use in the conversations they actually have",
        mechanics: ["recommend", "nlp-extract", "classify", "capture"],
      },
      {
        actor: "a translator working between two under-resourced languages",
        text: "smaller languages have almost no digital tooling, and what exists is decades old",
        mechanics: ["nlp-extract", "structuring", "search", "parser"],
      },
      {
        actor: "someone documenting a grandparent's dialect",
        text: "an elderly speaker's knowledge is irreplaceable and nobody has recorded it",
        mechanics: ["capture", "structuring", "nlp-extract", "privacy"],
      },
      {
        actor: "a migrant navigating forms in a second language",
        text: "official forms use a register that fluent conversational speakers still cannot parse",
        mechanics: ["nlp-extract", "viz", "parser", "structuring"],
      },
      {
        actor: "a literature student reading works in translation",
        text: "dictionaries give definitions when what is needed is usage in context",
        mechanics: ["search", "nlp-extract", "fuzzy-match", "structuring"],
      },
      {
        actor: "a translator working between two under-resourced languages",
        text: "regional variation is enormous and reference material picks one standard and ignores the rest",
        mechanics: ["structuring", "classify", "geo", "search"],
      },
      {
        actor: "a learner six months into a language with no speaking partner",
        text: "practice requires a partner, partners require scheduling, and scheduling kills the habit",
        mechanics: ["scheduling", "gameloop", "capture", "workflow"],
      },
      {
        actor: "a subtitler working without a script",
        text: "a translation choice is made once and its reasoning is lost to the next person",
        mechanics: ["structuring", "workflow", "search", "nlp-extract"],
      },
    ],
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
    icon: "\u{1F33E}",
    frictions: [
      {
        actor: "a smallholder farmer with two hectares",
        text: "advisory information is generic to a whole state when the decision is specific to one field",
        mechanics: ["geo", "recommend", "simulate", "classify"],
      },
      {
        actor: "a farmers market coordinator",
        text: "market prices are known only after the crop has already been sold",
        mechanics: ["timeseries", "pipeline", "viz", "simulate"],
      },
      {
        actor: "an agricultural extension worker covering eighty villages",
        text: "pest and disease identification depends on one expert who is three districts away",
        mechanics: ["vision", "classify", "search", "capture"],
      },
      {
        actor: "an urban rooftop grower",
        text: "irrigation decisions are made by feel and the feedback loop is an entire season long",
        mechanics: ["sensor", "timeseries", "simulate", "capture"],
      },
      {
        actor: "a smallholder farmer with two hectares",
        text: "record-keeping competes with actual physical labour and always loses",
        mechanics: ["capture", "structuring", "workflow", "viz"],
      },
      {
        actor: "a community allotment of forty plots",
        text: "forecasts are for the district, and the microclimate differs plot to plot",
        mechanics: ["sensor", "geo", "timeseries", "simulate"],
      },
      {
        actor: "a farmers market coordinator",
        text: "buyers and growers find each other through intermediaries who capture most of the margin",
        mechanics: ["search", "fuzzy-match", "workflow", "structuring"],
      },
      {
        actor: "a beekeeper managing twelve hives",
        text: "what worked last year is remembered as a story rather than as a comparable record",
        mechanics: ["capture", "timeseries", "structuring", "viz"],
      },
    ],
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
    icon: "\u{1F43E}",
    frictions: [
      {
        actor: "a small animal shelter with no software budget",
        text: "adoption matching is done on gut feeling and returns are heartbreakingly common",
        mechanics: ["recommend", "classify", "structuring", "viz"],
      },
      {
        actor: "a street-feeder coordinating with six neighbours",
        text: "feeding and medication schedules are split across volunteers with no shared source of truth",
        mechanics: ["scheduling", "realtime", "workflow", "capture"],
      },
      {
        actor: "someone fostering a series of anxious cats",
        text: "an animal's history is lost every time it moves between foster homes",
        mechanics: ["structuring", "workflow", "capture", "search"],
      },
      {
        actor: "someone fostering a series of anxious cats",
        text: "behavioural changes are noticed late because no one person sees the whole week",
        mechanics: ["timeseries", "capture", "classify", "viz", "sensor"],
      },
      {
        actor: "a small animal shelter with no software budget",
        text: "donation and supply needs are broadcast constantly and still mismatched",
        mechanics: ["timeseries", "structuring", "viz", "workflow"],
      },
      {
        actor: "a wildlife rescue receiving calls at all hours",
        text: "call triage depends entirely on who happens to pick up the phone",
        mechanics: ["workflow", "classify", "geo", "scheduling"],
      },
      {
        actor: "a vet clinic running on paper files",
        text: "vaccination and neutering records are on paper and get lost",
        mechanics: ["vision", "structuring", "parser", "capture"],
      },
      {
        actor: "a small animal shelter with no software budget",
        text: "outcomes cannot be shown to donors because outcomes were never tracked",
        mechanics: ["timeseries", "viz", "structuring", "pipeline"],
      },
    ],
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
