import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseInpFile, parseCoordinates } from "./inp-parser";
import { ObjectStorageService } from "./objectStorage";
import multer from "multer";
import archiver from "archiver";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024,
  }
});

const objectStorageService = new ObjectStorageService();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/inp-files", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const { files, total } = await storage.getAllInpFilesPaginated(limit, offset);
      const response = {
        files: files.map(f => ({
          id: f.id,
          filename: f.filename,
          directory: f.directory,
          size: formatFileSize(f.size),
          lastModified: f.lastModified.toISOString().split('T')[0],
          nodeCount: f.nodeCount,
          linkCount: f.linkCount,
          subcatchmentCount: f.subcatchmentCount,
          description: f.description || undefined
        })),
        total,
        limit,
        offset,
        hasMore: offset + files.length < total
      };
      res.json(response);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
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

  app.put("/api/inp-files/:id/content", async (req, res) => {
    try {
      const { content } = req.body;
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'Content is required' });
      }

      const file = await storage.getInpFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      await objectStorageService.updateInpFileContent(file.objectPath, content);

      const metadata = parseInpFile(content);
      const updatedFile = await storage.updateFileMetadata(req.params.id, {
        nodeCount: metadata.nodeCount,
        linkCount: metadata.linkCount,
        subcatchmentCount: metadata.subcatchmentCount,
        size: Buffer.byteLength(content, 'utf-8')
      });

      res.json({
        success: true,
        nodeCount: updatedFile?.nodeCount,
        linkCount: updatedFile?.linkCount,
        subcatchmentCount: updatedFile?.subcatchmentCount
      });
    } catch (error) {
      console.error('Error updating file content:', error);
      res.status(500).json({ error: 'Failed to update file content' });
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
      const failedFiles: { filename: string; error: string }[] = [];

      for (const file of inpFiles) {
        try {
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
        } catch (fileError) {
          console.error(`Error uploading file ${file.originalname}:`, fileError);
          failedFiles.push({
            filename: file.originalname,
            error: fileError instanceof Error ? fileError.message : 'Unknown error'
          });
        }
      }

      res.json({ 
        files: createdFiles, 
        count: createdFiles.length,
        failed: failedFiles,
        failedCount: failedFiles.length
      });
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

  app.get("/api/inp-files/search/content", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const allFiles = await storage.getAllInpFiles();
      const results = [];
      
      for (const file of allFiles) {
        try {
          const content = await objectStorageService.getInpFileContent(file.objectPath);
          if (content.toLowerCase().includes(q.toLowerCase())) {
            const lines = content.split('\n');
            const matches: { lineNumber: number; content: string }[] = [];
            
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(q.toLowerCase())) {
                matches.push({ lineNumber: i + 1, content: lines[i].trim() });
                if (matches.length >= 5) break;
              }
            }
            
            results.push({
              id: file.id,
              filename: file.filename,
              directory: file.directory,
              matches
            });
          }
        } catch (err) {
          console.error(`Error searching file ${file.filename}:`, err);
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error searching files:', error);
      res.status(500).json({ error: 'Failed to search files' });
    }
  });

  app.post("/api/inp-files/:id/pin", async (req, res) => {
    try {
      const file = await storage.togglePinFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      res.json({ id: file.id, isPinned: file.isPinned });
    } catch (error) {
      console.error('Error toggling pin:', error);
      res.status(500).json({ error: 'Failed to toggle pin' });
    }
  });

  app.get("/api/pinned-files", async (req, res) => {
    try {
      const files = await storage.getPinnedFiles();
      res.json(files.map(f => ({
        id: f.id,
        filename: f.filename,
        directory: f.directory,
        isPinned: f.isPinned,
        lastAccessedAt: f.lastAccessedAt?.toISOString()
      })));
    } catch (error) {
      console.error('Error fetching pinned files:', error);
      res.status(500).json({ error: 'Failed to fetch pinned files' });
    }
  });

  app.get("/api/recent-files", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const files = await storage.getRecentFiles(limit);
      res.json(files.filter(f => f.lastAccessedAt).map(f => ({
        id: f.id,
        filename: f.filename,
        directory: f.directory,
        isPinned: f.isPinned,
        lastAccessedAt: f.lastAccessedAt?.toISOString()
      })));
    } catch (error) {
      console.error('Error fetching recent files:', error);
      res.status(500).json({ error: 'Failed to fetch recent files' });
    }
  });

  app.post("/api/inp-files/:id/access", async (req, res) => {
    try {
      await storage.updateLastAccessed(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating access time:', error);
      res.status(500).json({ error: 'Failed to update access time' });
    }
  });

  app.post("/api/export", async (req, res) => {
    try {
      const { fileIds, directory } = req.body;
      
      let filesToExport: { id: string; filename: string; objectPath: string }[] = [];
      
      if (directory) {
        const dirFiles = await storage.getInpFilesByDirectory(directory);
        filesToExport = dirFiles.map(f => ({ id: f.id, filename: f.filename, objectPath: f.objectPath }));
      } else if (fileIds && Array.isArray(fileIds)) {
        for (const id of fileIds) {
          const file = await storage.getInpFile(id);
          if (file) {
            filesToExport.push({ id: file.id, filename: file.filename, objectPath: file.objectPath });
          }
        }
      }
      
      if (filesToExport.length === 0) {
        return res.status(400).json({ error: 'No files to export' });
      }
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="swmm5-export-${Date.now()}.zip"`);
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);
      
      for (const file of filesToExport) {
        try {
          const content = await objectStorageService.getInpFileContent(file.objectPath);
          archive.append(content, { name: file.filename });
        } catch (err) {
          console.error(`Error adding file to archive: ${file.filename}`, err);
        }
      }
      
      await archive.finalize();
    } catch (error) {
      console.error('Error exporting files:', error);
      res.status(500).json({ error: 'Failed to export files' });
    }
  });

  app.post("/api/simulate/:id", async (req, res) => {
    try {
      const file = await storage.getInpFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      let fileContent = '';
      try {
        fileContent = await objectStorageService.getInpFileContent(file.objectPath);
      } catch (err) {
        return res.status(500).json({ error: 'Failed to read file content' });
      }

      const response = await fetch("https://swmm-engine--robertdickinson.replit.app/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inp_content: fileContent,
          filename: file.filename
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ 
          error: errorData.error || `Simulation failed with status ${response.status}` 
        });
      }

      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error('Error running simulation:', error);
      res.status(500).json({ error: 'Failed to run simulation' });
    }
  });

  return httpServer;
}

function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
