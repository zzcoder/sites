import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, "dist");
const client = resolve(output, "client");

const staticEntries = [
  "assets",
  "index.html",
  "nav.js",
  "script.js",
  "ships.html",
  "ships.js",
  "style.css",
];

await rm(output, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(resolve(output, "server"), { recursive: true });
await mkdir(resolve(output, ".openai"), { recursive: true });

for (const entry of staticEntries) {
  const source = resolve(root, entry);
  await access(source);
  await cp(source, resolve(client, entry), { recursive: true });
}

const hosting = JSON.parse(
  await readFile(resolve(root, ".openai", "hosting.json"), "utf8"),
);

if (hosting.d1 !== null || hosting.r2 !== null) {
  throw new Error("This static site does not use D1 or R2 bindings.");
}

await cp(
  resolve(root, "worker", "index.js"),
  resolve(output, "server", "index.js"),
);
await cp(
  resolve(root, ".openai", "hosting.json"),
  resolve(output, ".openai", "hosting.json"),
);

console.log("Built USA 250 Baltimore for Sites.");
