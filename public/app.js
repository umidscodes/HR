/*
 * Ice HR web UI helpers. Every page talks to the same REST API that your tests use:
 * open DevTools, Network tab, and watch the calls happen.
 */
const API = "/api/v1";

/** Calls the API. Resolves with the parsed JSON (or null for 204); rejects with the problem details. */
async function api(method, path, body) {
  const opts = { method, headers: { Accept: "application/json" } };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API + path, opts);
  } catch {
    throw { title: "Network error", detail: "Could not reach Ice HR. Is npm run dev still running?" };
  }
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { detail: text }; }
  if (!res.ok) throw data || { status: res.status, detail: res.statusText };
  return data;
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const money = (n) => (n == null ? "" : "$" + Number(n).toLocaleString("en-CA"));
const badge = (s) => `<span class="badge ${esc(s)}">${esc(s)}</span>`;
const qs = (name) => new URLSearchParams(location.search).get(name);

/** Shows a success message or an API error (with each field error) in the element with id "message". */
function showMessage(kind, payload) {
  const box = document.getElementById("message");
  if (!box) return;
  if (kind === "ok") {
    box.className = "message ok";
    box.innerHTML = esc(payload);
  } else {
    const p = payload || {};
    const fields = (p.errors || []).map((e) => `<li><strong>${esc(e.field)}</strong> ${esc(e.message)}</li>`).join("");
    box.className = "message error";
    box.innerHTML = `<strong>${esc(p.status ? p.status + " " + (p.title || "") : p.title || "Error")}</strong>` +
      (p.code ? ` <code>${esc(p.code)}</code>` : "") + `<div>${esc(p.detail || "")}</div>` + (fields ? `<ul>${fields}</ul>` : "");
  }
  box.hidden = false;
  box.scrollIntoView({ block: "nearest" });
}

function clearMessage() {
  const box = document.getElementById("message");
  if (box) { box.hidden = true; box.innerHTML = ""; }
}

/** Reads a form into an object. Empty optional fields become null; data-type="int" fields become numbers. */
function formData(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    let v = el.value.trim();
    if (v === "") { out[el.name] = el.dataset.optional ? null : undefined; continue; }
    if (el.dataset.type === "int") v = /^-?\d+$/.test(v) ? Number(v) : v;
    out[el.name] = v;
  }
  return out;
}

function header(active) {
  const links = [["index", "/", "Dashboard"], ["employees", "/employees", "Employees"], ["departments", "/departments", "Departments"], ["leave", "/leave", "Leave requests"]];
  document.body.insertAdjacentHTML("afterbegin", `
    <header><div class="inner">
      <a class="brand" href="/">Ice HR</a>
      <nav aria-label="Main">${links.map(([k, href, label]) => `<a href="${href}"${k === active ? ' class="active" aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
      <div class="tools"><a href="/swagger" target="_blank" rel="noopener">Swagger</a> &nbsp; <a href="/tutorials/" target="_blank" rel="noopener">Tutorials</a></div>
    </div></header>`);
  document.body.insertAdjacentHTML("beforeend",
    `<footer>Ice HR is fictional and built for testing practice. Every page here uses the REST API under <code>/api/v1</code>.</footer>`);
}

/** Fills a <select> with options from the API. */
async function fillSelect(select, path, label, { blank } = {}) {
  const items = await api("GET", path);
  select.innerHTML = (blank !== undefined ? `<option value="">${esc(blank)}</option>` : "") +
    items.map((i) => `<option value="${i.id}">${esc(label(i))}</option>`).join("");
  return items;
}
