import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";
import { extname, resolve } from "node:path";

const frontendRoot = resolve(
  process.cwd(),
  process.env.FRONTEND_PATH ?? "dist/client",
);

// Identifies requests reserved for the JSON API so they never receive React HTML.
function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

// Identifies missing static files so a broken asset request never receives index.html.
function isAssetPath(pathname: string) {
  return pathname.startsWith("/assets/") || extname(pathname) !== "";
}

// Serves the Vite build and returns index.html only for client-side React routes.
export async function registerFrontend(app: FastifyInstance) {
  await app.register(fastifyStatic, {
    root: frontendRoot,
    prefix: "/",
  });

  app.setNotFoundHandler(async (request, reply) => {
    const requestUrl = new URL(request.raw.url ?? "/", "http://localhost");
    const pathname = requestUrl.pathname;

    if (isApiPath(pathname)) {
      return reply.status(404).send({
        error: "API route not found",
        message: `No API endpoint exists for ${request.method} ${pathname}.`,
      });
    }

    if (
      (request.method !== "GET" && request.method !== "HEAD") ||
      isAssetPath(pathname)
    ) {
      return reply.status(404).send({
        error: "Resource not found",
        message: `No resource exists for ${request.method} ${pathname}.`,
      });
    }

    return reply.type("text/html; charset=utf-8").sendFile("index.html");
  });
}