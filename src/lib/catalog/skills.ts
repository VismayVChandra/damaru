import type { Skill, SkillCategory } from "@/lib/types";

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  frontend: "Frontend",
  backend: "Backend",
  data: "Data",
  ml: "ML / AI",
  mobile: "Mobile",
  systems: "Systems",
  design: "Design",
  hardware: "Hardware",
  ops: "Infra / Ops",
  gamedev: "Game dev",
  security: "Security",
};

export const SKILLS: Skill[] = [
  // frontend
  { id: "html-css", label: "HTML & CSS", category: "frontend" },
  { id: "javascript", label: "JavaScript", category: "frontend", aliases: ["js"] },
  { id: "typescript", label: "TypeScript", category: "frontend", aliases: ["ts"] },
  { id: "react", label: "React", category: "frontend" },
  { id: "nextjs", label: "Next.js", category: "frontend" },
  { id: "vue", label: "Vue", category: "frontend" },
  { id: "svelte", label: "Svelte", category: "frontend" },
  { id: "tailwind", label: "Tailwind CSS", category: "frontend" },
  { id: "d3", label: "D3 / dataviz", category: "frontend", aliases: ["charts"] },
  { id: "webgl", label: "WebGL / three.js", category: "frontend", aliases: ["3d"] },
  { id: "canvas", label: "Canvas / SVG animation", category: "frontend" },

  // backend
  { id: "node", label: "Node.js", category: "backend" },
  { id: "python-web", label: "Python (Flask/FastAPI/Django)", category: "backend" },
  { id: "java", label: "Java", category: "backend" },
  { id: "go", label: "Go", category: "backend" },
  { id: "ruby", label: "Ruby on Rails", category: "backend" },
  { id: "php", label: "PHP / Laravel", category: "backend" },
  { id: "dotnet", label: "C# / .NET", category: "backend" },
  { id: "rest-api", label: "REST API design", category: "backend" },
  { id: "graphql", label: "GraphQL", category: "backend" },
  { id: "websockets", label: "WebSockets / realtime", category: "backend" },
  { id: "auth", label: "Auth & sessions", category: "backend" },

  // data
  { id: "sql", label: "SQL", category: "data" },
  { id: "postgres", label: "Postgres", category: "data" },
  { id: "mongodb", label: "MongoDB", category: "data" },
  { id: "pandas", label: "pandas / NumPy", category: "data" },
  { id: "scraping", label: "Web scraping", category: "data" },
  { id: "etl", label: "ETL / data pipelines", category: "data" },
  { id: "spreadsheets", label: "Spreadsheets & CSV wrangling", category: "data" },
  { id: "stats", label: "Statistics", category: "data" },
  { id: "geospatial", label: "Maps / geospatial", category: "data", aliases: ["gis"] },

  // ml
  { id: "sklearn", label: "scikit-learn", category: "ml" },
  { id: "pytorch", label: "PyTorch / TensorFlow", category: "ml" },
  { id: "nlp", label: "NLP / text processing", category: "ml" },
  { id: "cv", label: "Computer vision", category: "ml" },
  { id: "llm-apps", label: "LLM app building", category: "ml", aliases: ["prompting", "rag"] },
  { id: "recsys", label: "Recommender systems", category: "ml" },
  { id: "audio-ml", label: "Audio / signal processing", category: "ml", aliases: ["dsp"] },

  // mobile
  { id: "react-native", label: "React Native", category: "mobile" },
  { id: "flutter", label: "Flutter", category: "mobile" },
  { id: "swift", label: "Swift / iOS", category: "mobile" },
  { id: "kotlin", label: "Kotlin / Android", category: "mobile" },
  { id: "pwa", label: "PWAs & offline-first", category: "mobile" },

  // systems
  { id: "c-cpp", label: "C / C++", category: "systems" },
  { id: "rust", label: "Rust", category: "systems" },
  { id: "cli-tools", label: "CLI tool building", category: "systems" },
  { id: "compilers", label: "Parsers & interpreters", category: "systems" },
  { id: "concurrency", label: "Concurrency & performance", category: "systems" },
  { id: "algorithms", label: "Algorithms & data structures", category: "systems" },

  // design
  { id: "figma", label: "Figma / UI design", category: "design" },
  { id: "ux-research", label: "UX research & interviews", category: "design" },
  { id: "illustration", label: "Illustration", category: "design" },
  { id: "motion", label: "Motion & video", category: "design" },
  { id: "writing", label: "Writing & documentation", category: "design" },
  { id: "accessibility", label: "Accessibility", category: "design", aliases: ["a11y"] },

  // hardware
  { id: "arduino", label: "Arduino / ESP32", category: "hardware" },
  { id: "raspberry-pi", label: "Raspberry Pi / Linux SBC", category: "hardware" },
  { id: "sensors", label: "Sensors & electronics", category: "hardware" },
  { id: "cad", label: "CAD / 3D printing", category: "hardware" },
  { id: "robotics", label: "Robotics", category: "hardware" },

  // ops
  { id: "docker", label: "Docker", category: "ops" },
  { id: "ci-cd", label: "CI/CD", category: "ops" },
  { id: "cloud", label: "Cloud deploys (AWS/GCP/Vercel)", category: "ops" },
  { id: "linux", label: "Linux & shell", category: "ops", aliases: ["bash"] },
  { id: "monitoring", label: "Logging & monitoring", category: "ops" },

  // gamedev
  { id: "unity", label: "Unity", category: "gamedev" },
  { id: "godot", label: "Godot", category: "gamedev" },
  { id: "game-design", label: "Game design", category: "gamedev" },
  { id: "pixel-art", label: "Pixel art / game assets", category: "gamedev" },

  // security
  { id: "appsec", label: "App security & pentesting", category: "security" },
  { id: "crypto", label: "Cryptography", category: "security" },
  { id: "netsec", label: "Networking & protocols", category: "security" },
  { id: "forensics", label: "Forensics & reverse engineering", category: "security" },
];

export const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

export function skillLabel(id: string): string {
  return SKILL_BY_ID.get(id)?.label ?? id;
}
