import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInpFileSchema } from "@shared/schema";
import { parseInpFile } from "./inp-parser";
import multer from "multer";

// Configure multer for file uploads (in-memory storage)
// Use .any() to accept all files, then filter .inp files in the handler
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get all .inp files
  app.get("/api/inp-files", async (req, res) => {
    try {
      const files = await storage.getAllInpFiles();
      // Transform to match frontend format (omit file content for list view)
      const response = files.map(f => ({
        id: f.id,
        filename: f.filename,
        directory: f.directory,
        size: formatFileSize(f.size),
        lastModified: f.lastModified.toISOString().split('T')[0],
        nodeCount: f.nodeCount,
        linkCount: f.linkCount,
        subcatchmentCount: f.subcatchmentCount,
        description: f.description || undefined
      }));
      res.json(response);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });

  // Get a single .inp file with content
  app.get("/api/inp-files/:id", async (req, res) => {
    try {
      const file = await storage.getInpFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      res.json(file);
    } catch (error) {
      console.error('Error fetching file:', error);
      res.status(500).json({ error: 'Failed to fetch file' });
    }
  });

  // Upload .inp file(s) - accepts any files, filters for .inp in handler
  app.post("/api/inp-files/upload", upload.any(), async (req, res) => {
    try {
      const allFiles = req.files as Express.Multer.File[];
      
      // Filter only .inp files
      const inpFiles = allFiles.filter(f => 
        f.originalname.toLowerCase().endsWith('.inp')
      );
      
      if (!inpFiles || inpFiles.length === 0) {
        return res.status(400).json({ error: 'No .inp files found in upload' });
      }

      const createdFiles = [];

      for (const file of inpFiles) {
        const content = file.buffer.toString('utf-8');
        const metadata = parseInpFile(content);
        
        // Extract directory from request or use default
        const directory = req.body.directory || 'Imported Files';

        const newFile = await storage.createInpFile({
          filename: file.originalname,
          directory,
          size: file.size,
          lastModified: new Date(),
          nodeCount: metadata.nodeCount,
          linkCount: metadata.linkCount,
          subcatchmentCount: metadata.subcatchmentCount,
          description: 'Uploaded via web interface',
          fileContent: content
        });

        createdFiles.push({
          id: newFile.id,
          filename: newFile.filename,
          directory: newFile.directory,
          size: formatFileSize(newFile.size),
          lastModified: newFile.lastModified.toISOString().split('T')[0],
          nodeCount: newFile.nodeCount,
          linkCount: newFile.linkCount,
          subcatchmentCount: newFile.subcatchmentCount,
          description: newFile.description
        });
      }

      res.json({ files: createdFiles, count: createdFiles.length });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  });

  // Delete .inp file
  app.delete("/api/inp-files/:id", async (req, res) => {
    try {
      await storage.deleteInpFile(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  return httpServer;
}

function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
