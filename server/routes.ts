import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseInpFile, parseCoordinates } from "./inp-parser";
import { ObjectStorageService } from "./objectStorage";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  }
});

const objectStorageService = new ObjectStorageService();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/inp-files", async (req, res) => {
    try {
      const files = await storage.getAllInpFiles();
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

  app.get("/api/inp-files/:id", async (req, res) => {
    try {
      const file = await storage.getInpFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      let fileContent = '';
      try {
        fileContent = await objectStorageService.getInpFileContent(file.objectPath);
      } catch (err) {
        console.error('Error fetching file content from object storage:', err);
      }
      
      const coordinates = fileContent ? parseCoordinates(fileContent) : null;
      
      res.json({
        ...file,
        fileContent,
        coordinates,
        size: formatFileSize(file.size),
        lastModified: file.lastModified.toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Error fetching file:', error);
      res.status(500).json({ error: 'Failed to fetch file' });
    }
  });

  app.get("/api/inp-files/compare", async (req, res) => {
    try {
      const { file1, file2 } = req.query;
      
      if (!file1 || !file2) {
        return res.status(400).json({ error: 'Both file1 and file2 query parameters are required' });
      }
      
      const [fileData1, fileData2] = await Promise.all([
        storage.getInpFile(file1 as string),
        storage.getInpFile(file2 as string)
      ]);
      
      if (!fileData1) {
        return res.status(404).json({ error: `File with id ${file1} not found` });
      }
      if (!fileData2) {
        return res.status(404).json({ error: `File with id ${file2} not found` });
      }
      
      const [content1, content2] = await Promise.all([
        objectStorageService.getInpFileContent(fileData1.objectPath).catch(() => ''),
        objectStorageService.getInpFileContent(fileData2.objectPath).catch(() => '')
      ]);
      
      res.json({
        file1: {
          id: fileData1.id,
          filename: fileData1.filename,
          directory: fileData1.directory,
          nodeCount: fileData1.nodeCount,
          linkCount: fileData1.linkCount,
          subcatchmentCount: fileData1.subcatchmentCount,
          content: content1
        },
        file2: {
          id: fileData2.id,
          filename: fileData2.filename,
          directory: fileData2.directory,
          nodeCount: fileData2.nodeCount,
          linkCount: fileData2.linkCount,
          subcatchmentCount: fileData2.subcatchmentCount,
          content: content2
        }
      });
    } catch (error) {
      console.error('Error comparing files:', error);
      res.status(500).json({ error: 'Failed to compare files' });
    }
  });

  app.post("/api/inp-files/upload", upload.any(), async (req, res) => {
    try {
      const allFiles = req.files as Express.Multer.File[];
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
        const directory = req.body.directory || 'Imported Files';

        const objectPath = await objectStorageService.uploadInpFile(content, file.originalname);

        const newFile = await storage.createInpFile({
          filename: file.originalname,
          directory,
          size: file.size,
          lastModified: new Date(),
          nodeCount: metadata.nodeCount,
          linkCount: metadata.linkCount,
          subcatchmentCount: metadata.subcatchmentCount,
          description: 'Uploaded via web interface',
          objectPath
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

  app.delete("/api/inp-files/:id", async (req, res) => {
    try {
      const file = await storage.getInpFile(req.params.id);
      if (file) {
        await objectStorageService.deleteInpFile(file.objectPath);
      }
      await storage.deleteInpFile(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  app.delete("/api/directories/:directory", async (req, res) => {
    try {
      const directory = decodeURIComponent(req.params.directory);
      const filesToDelete = await storage.deleteDirectory(directory);
      
      for (const file of filesToDelete) {
        try {
          await objectStorageService.deleteInpFile(file.objectPath);
        } catch (err) {
          console.error(`Error deleting file from object storage: ${file.objectPath}`, err);
        }
      }
      
      res.json({ success: true, deletedCount: filesToDelete.length });
    } catch (error) {
      console.error('Error deleting directory:', error);
      res.status(500).json({ error: 'Failed to delete directory' });
    }
  });

  return httpServer;
}

function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
