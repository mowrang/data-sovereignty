/**
 * File Upload API
 *
 * Handles local file uploads for resume storage
 * Supports: .docx, .pdf, .txt, .md files
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";
// Authentication middleware - import from web-ui server or create inline
async function authenticate(
  req: Request,
  res: Response,
  next: () => void,
): Promise<void> {
  // This should match the authenticate function from web-ui/server.ts
  // For now, we'll use a simple check - in production, import the actual middleware
  const sessionToken =
    req.cookies?.session_token ||
    req.headers.authorization?.replace("Bearer ", "");
  if (!sessionToken) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  // In production, verify session token here
  (req as any).user = { id: "temp-user-id" }; // Placeholder
  next();
}
import { dataSourceManager } from "../utils/data-source-manager.js";

const router = Router();

// Configure multer for file uploads
const uploadDir =
  process.env.LOCAL_FILE_UPLOAD_DIR ||
  path.join(process.cwd(), "uploads", "resumes");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, _res, cb) => {
    const user = (req as any).user;
    if (!user || !user.id) {
      return cb(new Error("User not authenticated"), "");
    }

    // Create user-specific directory
    const userDir = path.join(uploadDir, user.id);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow specific file types
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedTypes = [".docx", ".pdf", ".txt", ".md"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${ext} not allowed. Allowed types: ${allowedTypes.join(", ")}`,
      ),
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * POST /api/file-upload
 * Upload a resume file
 */
router.post(
  "/",
  authenticate,
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      // Parse file content based on type
      let content = "";
      const ext = path.extname(file.filename).toLowerCase();

      try {
        if (ext === ".docx") {
          // Parse .docx file
          const mammoth = await import("mammoth");
          const buffer = fs.readFileSync(file.path);
          const result = await mammoth.extractRawText({ arrayBuffer: buffer });
          content = result.value;
        } else if (ext === ".pdf") {
          // Parse PDF file
          const pdfParseModule = await import("pdf-parse");
          const pdfParse = pdfParseModule.default || pdfParseModule;
          const buffer = fs.readFileSync(file.path);
          const pdfData = await pdfParse(buffer);
          content = pdfData.text;
        } else if (ext === ".txt" || ext === ".md") {
          // Plain text files
          content = fs.readFileSync(file.path, "utf-8");
        }

        // Create document using local file data source
        const title = path.basename(file.originalname, ext);

        // Use DataSourceManager to create document
        const doc = await dataSourceManager.createDocument(title, content, {
          userId: user.id,
          provider: "local",
        });

        // Clean up uploaded file (it's now stored by the data source)
        // Note: The local file data source stores files differently,
        // so we might want to keep the original file or move it
        // For now, we'll keep it and let the data source manage it

        res.json({
          success: true,
          document: {
            id: doc.id,
            title: doc.title,
            url: doc.url,
            provider: doc.provider,
          },
          message: "File uploaded and processed successfully",
        });
        return;
      } catch (parseError: any) {
        // If parsing fails, still save the file but with a warning
        console.warn("Failed to parse file:", parseError.message);

        const title = path.basename(file.originalname, ext);

        const doc = await dataSourceManager.createDocument(
          title,
          `[File uploaded but parsing failed: ${parseError.message}]`,
          {
            userId: user.id,
            provider: "local",
          },
        );

        res.status(200).json({
          success: true,
          document: {
            id: doc.id,
            title: doc.title,
            url: doc.url,
            provider: doc.provider,
          },
          warning: `File uploaded but content parsing failed: ${parseError.message}`,
        });
        return;
      }
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({ error: error.message || "Failed to upload file" });
      return;
    }
  },
);

/**
 * GET /api/file-upload/list
 * List all uploaded files for the current user
 */
router.get(
  "/list",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const userDir = path.join(uploadDir, user.id);

      if (!fs.existsSync(userDir)) {
        res.json({ files: [] });
        return;
      }

      const files = fs
        .readdirSync(userDir)
        .filter((file) => {
          const ext = path.extname(file).toLowerCase();
          return [".docx", ".pdf", ".txt", ".md"].includes(ext);
        })
        .map((file) => {
          const filePath = path.join(userDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            uploadedAt: stats.birthtime,
            url: `/uploads/resumes/${user.id}/${file}`,
          };
        });

      res.json({ files });
      return;
    } catch (error: any) {
      console.error("Error listing files:", error);
      res.status(500).json({ error: error.message || "Failed to list files" });
      return;
    }
  },
);

/**
 * DELETE /api/file-upload/:fileId
 * Delete an uploaded file
 */
router.delete(
  "/:fileId",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { fileId } = req.params;
      const userDir = path.join(uploadDir, user.id);

      // Find file by ID (filename without extension)
      const files = fs.readdirSync(userDir);
      const file = files.find((f) => f.startsWith(fileId));

      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      const filePath = path.join(userDir, file);
      fs.unlinkSync(filePath);

      res.json({ success: true, message: "File deleted successfully" });
      return;
    } catch (error: any) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: error.message || "Failed to delete file" });
      return;
    }
  },
);

export default router;
