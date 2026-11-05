/** Starts the app on a random port and gives tests a tiny HTTP client and a reset. */
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../src/app";
import { closePool } from "../src/db";
import { addDays, today } from "../src/dates";

let server: Server | null = null;
let base = "";

export async function start() {
  if (server) return;
  server = createApp().listen(0);
  await new Promise((r) => server!.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
}

export async function stop() {
  await new Promise((r) => server?.close(r));
  server = null;
  await closePool();
}

export interface Res { status: number; body: any; headers: Headers }

export async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> {
  const init: RequestInit = { method, headers: { ...headers } };
  if (body !== undefined) {
    (init.headers as Record<string, string>)["Content-Type"] ??= "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await fetch(base + path, init);
  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* keep text */ }
  return { status: res.status, body: parsed, headers: res.headers };
}

export const get = (p: string) => call("GET", p);
export const post = (p: string, b?: unknown) => call("POST", p, b);
export const put = (p: string, b?: unknown) => call("PUT", p, b);
export const patch = (p: string, b?: unknown) => call("PATCH", p, b);
export const del = (p: string) => call("DELETE", p);

export async function reset() {
  const r = await post("/reset");
  if (r.status !== 200) throw new Error(`reset failed: ${r.status} ${JSON.stringify(r.body)}`);
}

/** The next Monday at least `weeksAhead` weeks from today, so leave tests never hit "start in the past". */
export function nextMonday(weeksAhead = 1): string {
  let d = addDays(today(), 7 * weeksAhead);
  while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 1) d = addDays(d, 1);
  // Keep the whole Monday-to-Friday week inside one calendar year.
  if (addDays(d, 4).slice(0, 4) !== d.slice(0, 4)) d = addDays(d, 7);
  return d;
}

/** A valid new-employee body; override any field. */
export function newEmployee(over: Record<string, unknown> = {}) {
  return {
    firstName: "Jane", lastName: "Doe", email: `jane.doe.${Math.random().toString(36).slice(2, 8)}@icehr.test`,
    phone: "416-555-0199", dateOfBirth: "1995-06-15", hireDate: "2024-03-04",
    jobId: 4, departmentId: 2, managerId: 9, salary: 95000, ...over,
  };
}
