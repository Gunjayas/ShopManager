import type { FastifyInstance } from "fastify";
import type { openDatabase } from "../db/connection.js";

export type ShopDatabase = ReturnType<typeof openDatabase>["database"];

export type RouteRegistrar = (
  app: FastifyInstance,
  database: ShopDatabase,
) => Promise<void>;
