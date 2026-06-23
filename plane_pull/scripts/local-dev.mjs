import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import handler from "../api/members.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 3100);

loadLocalEnv();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith("/api/members")) {
      request.body = await readJsonBody(request);
      response.status = (code) => {
        response.statusCode = code;
        return response;
      };
      return handler(request, response);
    }

    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const rawPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = normalize(rawPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(publicDir, safePath);

    if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
      response.statusCode = 404;
      response.end("Not found");
      return;
    }

    response.setHeader("content-type", mime[extname(filePath)] || "application/octet-stream");
    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.statusCode = 500;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: error.message || "Server error" }));
  }
});

server.listen(port, () => {
  console.log(`Local Plane Pull site: http://localhost:${port}`);
});

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
    const index = trimmed.indexOf("=");
    if (index === -1) {
      continue;
    }
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    process.env[key] ||= value;
  }
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    if (!["POST", "PUT", "PATCH"].includes(request.method || "")) {
      resolve({});
      return;
    }

    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        request.destroy(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}
