/**
 * Type definitions for Express Request extensions
 */

import { User } from "../db/client.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
    }
  }
}

export {};
