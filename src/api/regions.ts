/**
 * Regions and countries: read-only reference data (see db/migrations/005_regions.sql).
 * 20 regions; every country belongs to one region; every employee works in one country.
 */
import { Router } from "express";
import { query as sql } from "../db";
import { fieldError, notFound } from "../errors";
import { pathId, query } from "../http";
import { json, problem, problemExample, registry, z } from "../openapi";
import { CountrySchema, RegionDetailSchema, RegionSchema } from "../schemas";

interface CountryRow { code: string; name: string; region_id: number }
const toCountry = (r: CountryRow) => ({ code: r.code, name: r.name, regionId: r.region_id });

export const router = Router();

router.get("/regions", async (_req, res) => {
  const rows = await sql<{ id: number; name: string; country_count: number }>(
    `SELECT r.id, r.name, COUNT(c.code)::int AS country_count
       FROM regions r LEFT JOIN countries c ON c.region_id = r.id
      GROUP BY r.id, r.name ORDER BY r.id`);
  res.json(rows.map((r) => ({ id: r.id, name: r.name, countryCount: r.country_count })));
});

router.get("/regions/:id", async (req, res) => {
  const id = pathId(req);
  const [region] = await sql<{ id: number; name: string }>("SELECT id, name FROM regions WHERE id = $1", [id]);
  if (!region) throw notFound("Region", id);
  const countries = await sql<{ code: string; name: string }>("SELECT code, name FROM countries WHERE region_id = $1 ORDER BY name", [id]);
  res.json({ id: region.id, name: region.name, countries });
});

const CountriesQuery = z.object({
  regionId: z.string().regex(/^\d+$/, "must be a whole number").optional(),
});

router.get("/countries", async (req, res) => {
  const q = query(req, CountriesQuery);
  const rows = await sql<CountryRow>(
    "SELECT code, name, region_id FROM countries WHERE ($1::int IS NULL OR region_id = $1) ORDER BY code",
    [q.regionId ? Number(q.regionId) : null]);
  res.json(rows.map(toCountry));
});

router.get("/countries/:code", async (req, res) => {
  const code = String(req.params.code);
  if (!/^[A-Z]{2}$/.test(code)) throw fieldError("code", "must be a two-letter country code in capitals, like CA");
  const [row] = await sql<CountryRow>("SELECT code, name, region_id FROM countries WHERE code = $1", [code]);
  if (!row) throw notFound("Country", code);
  res.json(toCountry(row));
});

// ---- OpenAPI ---------------------------------------------------------------------------------

registry.registerPath({
  method: "get", path: "/api/v1/regions", tags: ["Regions and countries"], summary: "List the 20 regions",
  description: "A plain JSON array ordered by id, with how many countries each region has.",
  responses: { 200: json(z.array(RegionSchema), "Regions 1 to 20.") },
});
registry.registerPath({
  method: "get", path: "/api/v1/regions/{id}", tags: ["Regions and countries"], summary: "One region with its countries",
  request: { params: z.object({ id: z.string().openapi({ example: "1" }) }) },
  responses: {
    200: json(RegionDetailSchema, "The region and its countries, ordered by name."),
    400: problem("The id is not a positive whole number."),
    404: problem("No region has this id.", problemExample(404, "NOT_FOUND", "Region 21 was not found.", "/api/v1/regions/21")),
  },
});
registry.registerPath({
  method: "get", path: "/api/v1/countries", tags: ["Regions and countries"], summary: "List countries",
  description: "A plain JSON array ordered by code. Optional filter ?regionId=.",
  request: { query: z.object({ regionId: z.string().optional().openapi({ example: "1" }) }) },
  responses: { 200: json(z.array(CountrySchema), "Countries."), 400: problem("regionId is not a whole number.") },
});
registry.registerPath({
  method: "get", path: "/api/v1/countries/{code}", tags: ["Regions and countries"], summary: "One country",
  request: { params: z.object({ code: z.string().openapi({ example: "CA", description: "Two capital letters." }) }) },
  responses: {
    200: json(CountrySchema, "The country."),
    400: problem("The code is not two capital letters.", problemExample(400, "VALIDATION_FAILED", "One or more fields are invalid.", "/api/v1/countries/ca", [{ field: "code", message: "must be a two-letter country code in capitals, like CA" }])),
    404: problem("No country has this code.", problemExample(404, "NOT_FOUND", "Country ZZ was not found.", "/api/v1/countries/ZZ")),
  },
});
