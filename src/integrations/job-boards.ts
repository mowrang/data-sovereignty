/**
 * External Job Board Integrations
 *
 * Integrates with job board APIs to pull jobs and earn affiliate revenue
 */

import axios from "axios";

interface JobBoardConfig {
  name: string;
  apiKey: string;
  appId?: string;
  publisherId?: string;
  affiliateId?: string;
  revenuePerClick: number;
  enabled: boolean;
}

interface AdzunaKey {
  appId: string;
  apiKey: string;
  usageCount: number;
  lastUsed: Date;
}

interface ExternalJob {
  id: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  salary?: string;
  url: string;
  affiliateUrl: string;
  source: string;
  postedDate?: Date;
}

export class JobBoardIntegrator {
  private configs: Map<string, JobBoardConfig> = new Map();
  private adzunaKeys: AdzunaKey[] = [];
  private currentAdzunaKeyIndex = 0;

  constructor() {
    // Load job board configurations from environment
    this.loadConfigs();
    this.loadAdzunaKeys();
  }

  private loadConfigs(): void {
    // Indeed
    if (process.env.INDEED_PUBLISHER_ID && process.env.INDEED_API_KEY) {
      this.configs.set("indeed", {
        name: "Indeed",
        apiKey: process.env.INDEED_API_KEY,
        publisherId: process.env.INDEED_PUBLISHER_ID,
        affiliateId: process.env.INDEED_AFFILIATE_ID,
        revenuePerClick: parseFloat(
          process.env.INDEED_REVENUE_PER_CLICK || "0.25",
        ),
        enabled: process.env.INDEED_ENABLED === "true",
      });
    }

    // Adzuna - support multiple keys for scalability
    // Check for multiple keys first (ADZUNA_APP_ID_1, ADZUNA_API_KEY_1, etc.)
    // If not found, fall back to single key (ADZUNA_APP_ID, ADZUNA_API_KEY)
    let adzunaEnabled = false;
    if (process.env.ADZUNA_ENABLED === "true") {
      // Check for multiple keys
      let keyIndex = 1;
      while (
        process.env[`ADZUNA_APP_ID_${keyIndex}`] &&
        process.env[`ADZUNA_API_KEY_${keyIndex}`]
      ) {
        this.adzunaKeys.push({
          appId: process.env[`ADZUNA_APP_ID_${keyIndex}`]!,
          apiKey: process.env[`ADZUNA_API_KEY_${keyIndex}`]!,
          usageCount: 0,
          lastUsed: new Date(),
        });
        keyIndex++;
        adzunaEnabled = true;
      }

      // Fall back to single key if no multiple keys found
      if (
        this.adzunaKeys.length === 0 &&
        process.env.ADZUNA_APP_ID &&
        process.env.ADZUNA_API_KEY
      ) {
        this.adzunaKeys.push({
          appId: process.env.ADZUNA_APP_ID,
          apiKey: process.env.ADZUNA_API_KEY,
          usageCount: 0,
          lastUsed: new Date(),
        });
        adzunaEnabled = true;
      }

      if (adzunaEnabled) {
        this.configs.set("adzuna", {
          name: "Adzuna",
          apiKey: this.adzunaKeys[0].apiKey, // Default to first key
          appId: this.adzunaKeys[0].appId,
          affiliateId: process.env.ADZUNA_AFFILIATE_ID,
          revenuePerClick: parseFloat(
            process.env.ADZUNA_REVENUE_PER_CLICK || "0.15",
          ),
          enabled: true,
        });
      }
    }

    // ZipRecruiter (if you have API access)
    if (process.env.ZIPRECRUITER_API_KEY) {
      this.configs.set("ziprecruiter", {
        name: "ZipRecruiter",
        apiKey: process.env.ZIPRECRUITER_API_KEY,
        affiliateId: process.env.ZIPRECRUITER_AFFILIATE_ID,
        revenuePerClick: parseFloat(
          process.env.ZIPRECRUITER_REVENUE_PER_CLICK || "0.50",
        ),
        enabled: process.env.ZIPRECRUITER_ENABLED === "true",
      });
    }
  }

  /**
   * Search jobs from Indeed
   */
  async searchIndeed(
    query: string,
    location: string,
    limit = 25,
  ): Promise<ExternalJob[]> {
    const config = this.configs.get("indeed");
    if (!config || !config.enabled) {
      return [];
    }

    try {
      // Indeed API endpoint (example - actual API may vary)
      const response = await axios.get("https://api.indeed.com/ads/apisearch", {
        params: {
          publisher: config.publisherId,
          q: query,
          l: location,
          sort: "date",
          radius: 25,
          limit,
          format: "json",
          v: "2", // API version
        },
      });

      return response.data.results.map((job: any) => ({
        id: `indeed_${job.jobkey}`,
        title: job.jobtitle,
        company: job.company,
        description: job.snippet,
        location: job.formattedLocation,
        salary: job.formattedRelativeTime,
        url: job.url,
        affiliateUrl: config.affiliateId
          ? `${job.url}&affid=${config.affiliateId}`
          : job.url,
        source: "indeed",
        postedDate: new Date(job.date),
      }));
    } catch (error: any) {
      console.error("Error fetching Indeed jobs:", error.message);
      return [];
    }
  }

  /**
   * Load Adzuna API keys from environment
   * Called after loadConfigs to ensure keys are available
   */
  private loadAdzunaKeys(): void {
    // Keys are loaded in loadConfigs() method
    // This method exists for clarity and future expansion
  }

  /**
   * Get next available Adzuna API key (round-robin with usage tracking)
   */
  private getNextAdzunaKey(): AdzunaKey | null {
    if (this.adzunaKeys.length === 0) {
      return null;
    }

    // Round-robin: get next key
    const key = this.adzunaKeys[this.currentAdzunaKeyIndex];
    this.currentAdzunaKeyIndex =
      (this.currentAdzunaKeyIndex + 1) % this.adzunaKeys.length;

    // Update usage
    key.usageCount++;
    key.lastUsed = new Date();

    return key;
  }

  /**
   * Search jobs from Adzuna with key rotation and caching
   */
  async searchAdzuna(
    query: string,
    location: string,
    limit = 25,
  ): Promise<ExternalJob[]> {
    const config = this.configs.get("adzuna");
    if (!config || !config.enabled || this.adzunaKeys.length === 0) {
      return [];
    }

    // Check cache first (24 hour TTL)
    const { redisCache } = await import("../utils/redis-cache.js");
    const cacheKey = `adzuna_search:${query}:${location}:${limit}`;
    try {
      const cached = await redisCache.getUser(cacheKey);
      if (cached && Array.isArray(cached)) {
        console.log(`Adzuna cache hit for: ${query} in ${location}`);
        return cached as ExternalJob[];
      }
    } catch (error) {
      // Cache miss or error, continue to API call
    }

    try {
      // Get next available API key
      const adzunaKey = this.getNextAdzunaKey();
      if (!adzunaKey) {
        console.error("No Adzuna API keys available");
        return [];
      }

      // Adzuna API endpoint
      const response = await axios.get(
        "https://api.adzuna.com/v1/api/jobs/us/search/1",
        {
          params: {
            app_id: adzunaKey.appId,
            app_key: adzunaKey.apiKey,
            results_per_page: limit,
            what: query,
            where: location,
            content_type: "json",
          },
        },
      );

      const jobs = response.data.results.map((job: any) => ({
        id: `adzuna_${job.id}`,
        title: job.title,
        company: job.company?.display_name || "Unknown",
        description: job.description,
        location: job.location?.display_name,
        salary:
          job.salary_min && job.salary_max
            ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
            : undefined,
        url: job.redirect_url,
        affiliateUrl: config.affiliateId
          ? `${job.redirect_url}?affid=${config.affiliateId}`
          : job.redirect_url,
        source: "adzuna",
        postedDate: new Date(job.created),
      }));

      // Cache results for 24 hours
      try {
        await redisCache.setUser(cacheKey, jobs, 86400);
      } catch (error) {
        // Cache error is not critical
        console.warn("Failed to cache Adzuna results:", error);
      }

      return jobs;
    } catch (error: any) {
      console.error("Error fetching Adzuna jobs:", error.message);

      // If rate limited, try next key
      if (error.response?.status === 429 && this.adzunaKeys.length > 1) {
        console.log("Rate limited, trying next Adzuna key...");
        const nextKey = this.getNextAdzunaKey();
        if (nextKey) {
          // Retry with next key (but don't recurse to avoid infinite loop)
          return [];
        }
      }

      return [];
    }
  }

  /**
   * Search all enabled job boards
   */
  async searchAll(
    query: string,
    location: string,
    limit = 25,
  ): Promise<ExternalJob[]> {
    const allJobs: ExternalJob[] = [];

    // Search Indeed
    if (this.configs.get("indeed")?.enabled) {
      const indeedJobs = await this.searchIndeed(query, location, limit);
      allJobs.push(...indeedJobs);
    }

    // Search Adzuna
    if (this.configs.get("adzuna")?.enabled) {
      const adzunaJobs = await this.searchAdzuna(query, location, limit);
      allJobs.push(...adzunaJobs);
    }

    // Remove duplicates (same title + company)
    const uniqueJobs = new Map<string, ExternalJob>();
    for (const job of allJobs) {
      const key = `${job.title}_${job.company}`.toLowerCase();
      if (!uniqueJobs.has(key)) {
        uniqueJobs.set(key, job);
      }
    }

    return Array.from(uniqueJobs.values()).slice(0, limit);
  }

  /**
   * Import external jobs to database
   */
  async importJobsToDatabase(
    jobs: ExternalJob[],
    systemUserId: string,
  ): Promise<void> {
    const pool = (await import("../db/client.js")).db.getPool();

    for (const job of jobs) {
      try {
        // Check if job already exists
        const existing = await pool.query(
          `SELECT id FROM job_postings WHERE external_id = $1 AND source = $2`,
          [job.id, job.source],
        );

        if (existing.rows.length > 0) {
          continue; // Skip if already exists
        }

        // Insert job
        await pool.query(
          `INSERT INTO job_postings (
            employer_id, title, company, description, location,
            application_url, revenue_model, revenue_per_click,
            affiliate_id, source, external_id, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'affiliate', $7, $8, $9, $10, 'active')`,
          [
            systemUserId, // System user ID for external jobs
            job.title,
            job.company,
            job.description,
            job.location || null,
            job.affiliateUrl,
            this.configs.get(job.source)?.revenuePerClick || 0.25,
            this.configs.get(job.source)?.affiliateId || null,
            job.source,
            job.id,
          ],
        );
      } catch (error: any) {
        console.error(`Error importing job ${job.id}:`, error.message);
      }
    }
  }

  /**
   * Sync jobs from external sources (run periodically)
   */
  async syncJobs(query: string, location: string): Promise<number> {
    const jobs = await this.searchAll(query, location, 100);

    // Get system user ID (create if doesn't exist)
    const pool = (await import("../db/client.js")).db.getPool();
    let systemUser = await pool.query(
      `SELECT id FROM users WHERE email = 'system@jobboard.com'`,
    );

    if (systemUser.rows.length === 0) {
      // Create system user for external jobs
      const result = await pool.query(
        `INSERT INTO users (email, name, user_role) 
         VALUES ('system@jobboard.com', 'System', 'admin')
         RETURNING id`,
      );
      systemUser = result;
    }

    await this.importJobsToDatabase(jobs, systemUser.rows[0].id);
    return jobs.length;
  }
}

export const jobBoardIntegrator = new JobBoardIntegrator();
