// Lets plain `node` run files that use the app's "@/..." path alias, so the
// catalogue audit needs no bundler, no tsx and no changes to app imports.
// Node 24 strips the TypeScript itself; only the alias needs teaching.
import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

const SRC = pathToFileURL(resolvePath(process.cwd(), "src") + "/").href;

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** TypeScript imports omit the extension; Node needs one. */
function withExtension(url) {
  if (/\.[cm]?[jt]s$/.test(url)) return url;
  for (const candidate of [`${url}.ts`, `${url}/index.ts`, `${url}.tsx`]) {
    if (existsSync(fileURLToPath(candidate))) return candidate;
  }
  return url;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(withExtension(new URL(specifier.slice(2), SRC).href), context);
  }
  if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) {
    return nextResolve(withExtension(new URL(specifier, context.parentURL).href), context);
  }
  return nextResolve(specifier, context);
}
