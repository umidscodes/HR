/**
 * Errors use RFC 7807 "problem details" (Content-Type: application/problem+json):
 *   { type, title, status, detail, instance, code, errors? }
 * `code` is a stable, machine-readable name such as SALARY_OUT_OF_RANGE: assert on it in tests.
 * `errors` lists every invalid field when the status is 400 VALIDATION_FAILED.
 */
export interface FieldError { field: string; message: string }

const TITLES: Record<number, string> = {
  400: "Bad Request", 404: "Not Found", 405: "Method Not Allowed", 409: "Conflict",
  413: "Payload Too Large", 415: "Unsupported Media Type", 422: "Unprocessable Entity", 500: "Internal Server Error",
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public detail: string,
    public errors?: FieldError[],
    public headers: Record<string, string> = {},
  ) {
    super(detail);
  }
  get title() { return TITLES[this.status] ?? "Error"; }
  get type() { return `https://icehr.test/problems/${this.code.toLowerCase().replace(/_/g, "-")}`; }
}

export const validation = (errors: FieldError[]) =>
  new ApiError(400, "VALIDATION_FAILED", "One or more fields are invalid.", errors);
export const fieldError = (field: string, message: string) => validation([{ field, message }]);
export const badRequest = (code: string, detail: string) => new ApiError(400, code, detail);
export const notFound = (what: string, id?: number | string) =>
  new ApiError(404, "NOT_FOUND", id === undefined ? `${what} not found.` : `${what} ${id} was not found.`);
export const conflict = (code: string, detail: string) => new ApiError(409, code, detail);
export const rule = (code: string, detail: string) => new ApiError(422, code, detail);

/**
 * Safety net for database errors the API did not check for first (for example two requests racing
 * for the same email). Normal requests never reach this: the API checks each rule itself and
 * returns a specific code.
 */
export function fromPg(err: unknown): ApiError | null {
  const e = err as { code?: string; constraint?: string };
  if (!e || typeof e.code !== "string") return null;
  if (e.code === "23505") return conflict("DUPLICATE", `A record with the same unique value already exists (${e.constraint ?? "unique"}).`);
  if (e.code === "23503") return conflict("REFERENCED", "The record is still referenced by other records.");
  if (e.code === "23514") return rule("CONSTRAINT_VIOLATION", `The request breaks a data rule (${e.constraint ?? "check"}).`);
  return null;
}
