#!/usr/bin/env node
/**
 * Test Job Board Integrations
 *
 * Tests connections to various job board APIs
 */

import { jobBoardIntegrator } from "../src/integrations/job-boards.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testAdzuna() {
  console.log("\n🔍 Testing Adzuna API...");

  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_API_KEY) {
    console.log(
      "❌ Adzuna not configured. Set ADZUNA_APP_ID and ADZUNA_API_KEY in .env",
    );
    console.log("   Sign up at: https://developer.adzuna.com/");
    return;
  }

  try {
    const jobs = await jobBoardIntegrator.searchAdzuna(
      "software engineer",
      "San Francisco, CA",
      5,
    );

    if (jobs.length > 0) {
      console.log(`✅ Adzuna: Found ${jobs.length} jobs`);
      console.log(`   Example: ${jobs[0].title} at ${jobs[0].company}`);
      console.log(
        `   Revenue per click: $${process.env.ADZUNA_REVENUE_PER_CLICK || "0.15"}`,
      );
    } else {
      console.log("⚠️ Adzuna: No jobs found (check API keys)");
    }
  } catch (error: any) {
    console.log(`❌ Adzuna error: ${error.message}`);
  }
}

async function testIndeed() {
  console.log("\n🔍 Testing Indeed API...");

  if (!process.env.INDEED_PUBLISHER_ID || !process.env.INDEED_API_KEY) {
    console.log(
      "❌ Indeed not configured. Set INDEED_PUBLISHER_ID and INDEED_API_KEY in .env",
    );
    console.log("   Apply at: https://www.indeed.com/publisher");
    return;
  }

  try {
    const jobs = await jobBoardIntegrator.searchIndeed(
      "software engineer",
      "San Francisco, CA",
      5,
    );

    if (jobs.length > 0) {
      console.log(`✅ Indeed: Found ${jobs.length} jobs`);
      console.log(`   Example: ${jobs[0].title} at ${jobs[0].company}`);
      console.log(
        `   Revenue per click: $${process.env.INDEED_REVENUE_PER_CLICK || "0.25"}`,
      );
    } else {
      console.log("⚠️ Indeed: No jobs found (check API keys)");
    }
  } catch (error: any) {
    console.log(`❌ Indeed error: ${error.message}`);
  }
}

async function testAll() {
  console.log("\n🔍 Testing All Enabled Job Boards...");

  try {
    const jobs = await jobBoardIntegrator.searchAll(
      "software engineer",
      "San Francisco, CA",
      10,
    );

    console.log(`✅ Total jobs found: ${jobs.length}`);

    const bySource = jobs.reduce((acc: any, job) => {
      acc[job.source] = (acc[job.source] || 0) + 1;
      return acc;
    }, {});

    console.log("\nJobs by source:");
    for (const [source, count] of Object.entries(bySource)) {
      console.log(`   ${source}: ${count} jobs`);
    }

    if (jobs.length > 0) {
      console.log("\nExample jobs:");
      jobs.slice(0, 3).forEach((job, i) => {
        console.log(
          `   ${i + 1}. ${job.title} at ${job.company} (${job.source})`,
        );
      });
    }
  } catch (error: any) {
    console.log(`❌ Error testing all: ${error.message}`);
  }
}

async function main() {
  console.log("🧪 Testing Job Board Integrations\n");
  console.log("=".repeat(50));

  await testAdzuna();
  await testIndeed();
  await testAll();

  console.log("\n" + "=".repeat(50));
  console.log("\n💡 Next Steps:");
  console.log("   1. Sign up for platforms at the URLs shown above");
  console.log("   2. Add API keys to .env file");
  console.log("   3. Run this test again to verify");
  console.log("   4. Use jobBoardIntegrator.searchAll() in your app\n");
}

main().catch(console.error);
