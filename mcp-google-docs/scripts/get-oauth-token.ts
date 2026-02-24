#!/usr/bin/env node
/**
 * Script to get Google OAuth refresh token
 * Run this once to authenticate and get your refresh token
 */

import { google } from "googleapis";
import * as dotenv from "dotenv";
import * as http from "http";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from project root (parent of mcp-google-docs) or cwd
const rootEnv = path.join(__dirname, "..", "..", ".env");
const cwdEnv = path.join(process.cwd(), ".env");
for (const p of [rootEnv, cwdEnv]) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth2callback";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error(
    "❌ Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file",
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
);

const scopes = [
  "https://www.googleapis.com/auth/documents", // Read/write Google Docs
  "https://www.googleapis.com/auth/drive", // Full Drive access (read, copy, comments)
];

async function getRefreshToken(): Promise<void> {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  console.log("\n🔐 Google OAuth Setup\n");
  console.log("1. Open this URL in your browser:");
  console.log(`\n   ${authUrl}\n`);
  console.log("2. Authorize the application");
  console.log("3. Copy the code from the redirect URL\n");

  // Start a temporary server to receive the callback
  const server = http.createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const code = url.searchParams.get("code");

    if (code) {
      try {
        const { tokens } = await oauth2Client.getToken(code);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body>
              <h1>✅ Authentication Successful!</h1>
              <p>You can close this window.</p>
              <p>Your refresh token:</p>
              <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px;">${tokens.refresh_token}</pre>
              <p>Add this to your .env file:</p>
              <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px;">GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</pre>
            </body>
          </html>
        `);

        console.log("\n✅ Authentication successful!\n");
        console.log("Add this to your .env file:\n");
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);

        server.close();
        process.exit(0);
      } catch (error: any) {
        res.writeHead(500);
        res.end(`Error: ${error.message}`);
        console.error("❌ Error:", error.message);
        server.close();
        process.exit(1);
      }
    } else {
      res.writeHead(400);
      res.end("No code received");
    }
  });

  server.listen(3000, () => {
    console.log("📡 Waiting for OAuth callback on http://localhost:3000\n");
  });
}

getRefreshToken().catch(console.error);
