export class ApiRequestError extends Error { constructor(public readonly status: number, message: string) { super(message); } }

// Sends a JSON request and converts structured Fastify failures into readable UI errors.
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers ?? {}) } });
  const payload = await response.json().catch(() => ({})) as { message?: string; error?: string } & T;
  if (!response.ok) throw new ApiRequestError(response.status, payload.message ?? payload.error ?? "The request could not be completed.");
  return payload;
}

// Formats integer rupees consistently across all screens.
export function formatRs(amount: number | null | undefined) { return `Rs ${new Intl.NumberFormat("en-IN").format(amount ?? 0)}`; }

// Returns today's local date in the format accepted by the API.
export function today() { return new Date().toISOString().slice(0, 10); }