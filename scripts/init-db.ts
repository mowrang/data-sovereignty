#!/usr/bin/env node
/**
 * Initialize database schema for multi-user support
 */

import { db } from "../src/db/client.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  try {
    console.log("Initializing user management database schema...");
    await db.initializeSchema();
    console.log("✅ User management schema initialized!");

    console.log("Initializing jobs schema...");
    await db.initializeJobsSchema();
    console.log("✅ Jobs schema initialized!");

    console.log("Initializing user history schema...");
    await db.initializeUserHistorySchema();
    console.log("✅ User history schema initialized!");

    console.log("Initializing PostgreSQL permissions for LangGraph monitoring...");
    await db.initializePermissions();
    console.log("✅ Permissions initialized!");

    console.log("✅ All database schemas and permissions initialized successfully!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Failed to initialize database schema:", error.message);
    process.exit(1);
  }
}

main();
