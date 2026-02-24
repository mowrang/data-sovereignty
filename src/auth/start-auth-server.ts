#!/usr/bin/env node
/**
 * Auth Server Entry Point
 * Starts the authentication server
 */

import { AuthServer } from "./auth-server.js";

const port = parseInt(process.env.AUTH_SERVER_PORT || "3000", 10);
const server = new AuthServer();
server.start(port).catch((error) => {
  console.error("Failed to start auth server:", error);
  process.exit(1);
});
