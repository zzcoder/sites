import dns from "node:dns";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const root = fileURLToPath(new URL("..", import.meta.url));
const shirtColors = [
  "White",
  "Black",
  "Graphite",
  "Navy",
  "Deep Royal",
  "Light Blue",
  "Wow Pink",
  "Deep Red",
  "Safety Orange",
  "Safety Green",
  "Deep Forest"
];
const shirtSizes = ["S", "M", "L", "XL"];

dns.setDefaultResultOrder("ipv4first");
loadLocalEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured. Add it to .env.local or the shell environment.");
  process.exitCode = 1;
} else {
  await printVoteReport();
}

async function printVoteReport() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000
  });

  try {
    const [votesResult, missingVotersResult] = await Promise.all([
      pool.query(`
        SELECT
          puller_name AS name,
          shirt_color AS color,
          COALESCE(shirt_size, 'Not selected') AS size
        FROM public.plane_pull_shirt_votes
        ORDER BY lower(puller_name), member_id
      `),
      pool.query(`
        SELECT
          roster."Name" AS name,
          roster."Role" AS role
        FROM public."plane-pull" AS roster
        LEFT JOIN public.plane_pull_shirt_votes AS vote
          ON vote.member_id = roster.id
        WHERE vote.member_id IS NULL
        ORDER BY
          CASE roster."Role" WHEN 'puller' THEN 0 ELSE 1 END,
          lower(roster."Name"),
          roster.id
      `)
    ]);
    renderReport(votesResult.rows, missingVotersResult.rows);
  } catch (error) {
    console.error(`Could not load voting results: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

function renderReport(votes, missingVoters) {
  const colorCounts = countBy(votes, "color", shirtColors);
  const sizeCounts = countBy(votes, "size", shirtSizes);
  const unselectedSizes = votes.filter((vote) => vote.size === "Not selected").length;

  console.log("\nHEALTHY HIKERS SHIRT VOTING RESULTS");
  console.log(`Roster members: ${votes.length + missingVoters.length}`);
  console.log(`Voted: ${votes.length}`);
  console.log(`Not voted: ${missingVoters.length}\n`);

  console.log("VOTES BY PERSON");
  if (votes.length === 0) {
    console.log("No votes recorded yet.\n");
  } else {
    printTable(
      ["#", "Name", "Color", "Size"],
      votes.map((vote, index) => [index + 1, vote.name, vote.color, vote.size])
    );
    console.log("");
  }

  console.log("PEOPLE WHO HAVE NOT VOTED");
  if (missingVoters.length === 0) {
    console.log("Everyone on the roster has voted.\n");
  } else {
    printTable(
      ["#", "Name", "Role"],
      missingVoters.map((member, index) => [
        index + 1,
        member.name,
        member.role === "puller" ? "Puller" : "Backup"
      ])
    );
    console.log(`\nTotal not voted: ${missingVoters.length}\n`);
  }

  console.log("COLOR TALLY");
  const rankedColors = [...colorCounts.entries()].sort((a, b) => {
    const difference = b[1] - a[1];
    return difference || shirtColors.indexOf(a[0]) - shirtColors.indexOf(b[0]);
  });
  printTable(
    ["Rank", "Color", "Votes", "Percent"],
    rankedColors.map(([color, count], index) => [
      index + 1,
      color,
      count,
      votes.length ? `${Math.round((count / votes.length) * 100)}%` : "0%"
    ])
  );

  const highestCount = Math.max(0, ...colorCounts.values());
  const winners = highestCount > 0
    ? rankedColors.filter(([, count]) => count === highestCount).map(([color]) => color)
    : [];
  console.log("");
  if (winners.length === 0) {
    console.log("Highest voted color: No votes recorded yet.");
  } else {
    const label = winners.length === 1 ? "Highest voted color" : "Highest voted colors";
    const voteLabel = highestCount === 1 ? "vote" : "votes";
    console.log(`${label}: ${winners.join(", ")} (${highestCount} ${voteLabel})`);
  }

  console.log("\nSIZE TALLY");
  const sizeRows = shirtSizes.map((size) => [size, sizeCounts.get(size) || 0]);
  if (unselectedSizes > 0) {
    sizeRows.push(["Not selected", unselectedSizes]);
  }
  printTable(["Size", "Shirts"], sizeRows);
  console.log(`\nTotal shirts: ${votes.length}\n`);
}

function countBy(rows, key, knownValues) {
  const counts = new Map(knownValues.map((value) => [value, 0]));
  for (const row of rows) {
    counts.set(row[key], (counts.get(row[key]) || 0) + 1);
  }
  return counts;
}

function printTable(headers, rows) {
  const stringRows = rows.map((row) => row.map(String));
  const widths = headers.map((header, column) => Math.max(
    header.length,
    ...stringRows.map((row) => row[column]?.length || 0)
  ));
  const line = `+-${widths.map((width) => "-".repeat(width)).join("-+-")}-+`;
  const formatRow = (row) => `| ${row.map((value, column) => String(value).padEnd(widths[column])).join(" | ")} |`;

  console.log(line);
  console.log(formatRow(headers));
  console.log(line);
  for (const row of stringRows) {
    console.log(formatRow(row));
  }
  console.log(line);
}

function loadLocalEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) {
    return;
  }
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] ||= value;
  }
}
