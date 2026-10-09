import { build, context } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const watch = process.argv.includes("--watch");
const outdir = "dist";
const entryPoints = {
  background: "src/background/index.ts",
  content: "src/content/index.ts",
  options: "src/ui/options.ts",
  onboarding: "src/ui/onboarding.ts"
};

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
for (const file of ["manifest.json", "src/ui/options.html", "src/ui/onboarding.html", "src/ui/styles.css", "src/ui/options.css", "src/ui/onboarding.css", "PRIVACY.md"]) {
  await cp(file, `${outdir}/${file.split("/").at(-1)}`);
}
await cp("_locales", `${outdir}/_locales`, { recursive: true });
await cp("assets/icons", `${outdir}/icons`, { recursive: true });
await cp("assets/onboarding", `${outdir}/onboarding`, { recursive: true });

const options = { entryPoints, outdir, bundle: true, format: "iife", target: "chrome120", sourcemap: true, minify: !watch, logLevel: "info" };
if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("Watching extension sources…");
} else {
  await build(options);
}
