/**
 * The Express app: REST API under /api/v1, Swagger UI at /swagger, the web UI at / and the tutorials
 * at /tutorials. scripts/dev.ts starts it; the smoke tests start it on a random port.
 */
import express, { type NextFunction, type Request, type Response, Router } from "express";
import path from "node:path";
import { ApiError } from "./errors";
import { accessLog, errorHandler, plainJson, requestId } from "./http";
import { openApiDocument } from "./openapi";
import * as departments from "./api/departments";
import * as employees from "./api/employees";
import * as jobs from "./api/jobs";
import * as leave from "./api/leave";
import * as reports from "./api/reports";
import * as support from "./api/support";

const ROOT = path.resolve(__dirname, "..");
const routers: Router[] = [support.router, jobs.router, departments.router, employees.router, leave.router, reports.router];

/** Methods that some route accepts for this path, e.g. ["GET", "PUT"] for /employees/7. */
function methodsFor(urlPath: string): string[] {
  const out = new Set<string>();
  for (const r of routers) {
    for (const layer of r.stack as unknown as { route?: { methods: Record<string, boolean> }; match: (p: string) => boolean }[]) {
      if (layer.route && layer.match(urlPath)) {
        for (const [m, on] of Object.entries(layer.route.methods)) if (on && m !== "_all") out.add(m.toUpperCase());
      }
    }
  }
  return [...out];
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("etag", false);

  // ---- REST API ------------------------------------------------------------------------------
  const api = Router();
  api.use(requestId, accessLog, plainJson);
  api.use((req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
  // Some clients add "; charset=ISO-8859-1" to JSON. JSON is UTF-8 by definition, so read it as UTF-8.
  api.use((req, _res, next) => {
    const ct = req.headers["content-type"];
    if (ct && /^application\/json/i.test(ct) && /charset=(?!utf-8)/i.test(ct)) req.headers["content-type"] = "application/json; charset=utf-8";
    next();
  });
  api.use(express.json({ limit: "100kb" }));
  api.get("/openapi.json", (_req, res) => { res.json(openApiDocument()); });
  for (const r of routers) api.use(r);
  api.use((req: Request, _res: Response, next: NextFunction) => {
    const allowed = methodsFor(req.path);
    if (allowed.length) {
      if (allowed.includes("GET")) allowed.push("HEAD");
      return next(new ApiError(405, "METHOD_NOT_ALLOWED", `${req.method} is not supported here. Allowed: ${allowed.join(", ")}.`, undefined, { Allow: allowed.join(", ") }));
    }
    next(new ApiError(404, "NOT_FOUND", `There is no endpoint ${req.method} ${req.baseUrl}${req.path}. See /swagger for the list.`));
  });
  api.use(errorHandler);
  app.use("/api/v1", api);

  // ---- Swagger UI ------------------------------------------------------------------------------
  const swaggerDir = path.dirname(require.resolve("swagger-ui-dist/package.json"));
  app.get("/swagger", (_req, res) => { res.type("html").send(SWAGGER_HTML); });
  app.get("/swagger/swagger-ui.css", (_req, res) => { res.sendFile(path.join(swaggerDir, "swagger-ui.css")); });
  app.get("/swagger/swagger-ui-bundle.js", (_req, res) => { res.sendFile(path.join(swaggerDir, "swagger-ui-bundle.js")); });

  // ---- tutorials and web UI ------------------------------------------------------------------
  app.use("/tutorials", express.static(path.join(ROOT, "tutorials"), { dotfiles: "deny" }));
  app.use(express.static(path.join(ROOT, "public"), { dotfiles: "deny", extensions: ["html"] }));
  app.use((_req, res) => { res.status(404).type("text").send("Not found. Try / (the app), /swagger (the API) or /tutorials.\n"); });
  return app;
}

const SWAGGER_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ice HR API - Swagger UI</title>
  <link rel="stylesheet" href="/swagger/swagger-ui.css">
  <style>
    body { margin: 0; background: #f6f8fa; }
    .bar { background: #12355b; color: #fff; padding: 12px 20px; font: 600 16px system-ui, sans-serif; display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
    .bar a { color: #bfe0ff; font-weight: 500; font-size: 14px; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div class="bar">Ice HR API <a href="/">Open the app</a> <a href="/api/v1/openapi.json">openapi.json</a> <a href="/tutorials/">Tutorials</a></div>
  <div id="swagger-ui"></div>
  <script src="/swagger/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/api/v1/openapi.json",
      dom_id: "#swagger-ui",
      deepLinking: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      docExpansion: "list",
      defaultModelsExpandDepth: 0,
    });
  </script>
</body>
</html>`;
