import postgres, { type Sql } from "postgres";

let client: Sql | null = null;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function db(): Sql {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!client) {
    client = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : "require"
    });
  }
  return client;
}
