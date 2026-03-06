import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseInpFile, parseCoordinates } from "./inp-parser";
import { ObjectStorageService } from "./objectStorage";
import { applyReswmm, DEFAULT_RESWMM, type ReswmmConfig } from "./reswmm";
import multer from "multer";
import archiver from "archiver";
import fs from "fs";
import path from "path";

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
  
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

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
      const skippedFiles: { filename: string }[] = [];
      const directory = req.body.directory || 'Imported Files';

      const existingFiles = await storage.getInpFilesByDirectory(directory);
      const existingNames = new Set(existingFiles.map(f => f.filename));

      for (const file of inpFiles) {
        try {
          if (existingNames.has(file.originalname)) {
            skippedFiles.push({ filename: file.originalname });
            continue;
          }

          const content = file.buffer.toString('utf-8');
          const metadata = parseInpFile(content);

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
        failedCount: failedFiles.length,
        skipped: skippedFiles,
        skippedCount: skippedFiles.length
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

  app.post("/api/load-samples", async (req, res) => {
    try {
      const samplesDir = path.join(process.cwd(), "server", "samples");
      if (!fs.existsSync(samplesDir)) {
        return res.status(404).json({ error: "Samples directory not found" });
      }

      const sampleFiles = fs.readdirSync(samplesDir).filter(f => f.endsWith(".inp"));
      const { files: existingFiles } = await storage.getAllInpFilesPaginated(1000, 0);
      const existingNames = new Set(
        existingFiles
          .filter(f => f.directory === "Sample Models")
          .map(f => f.filename)
      );

      const loaded = [];

      for (const filename of sampleFiles) {
        if (existingNames.has(filename)) continue;
        try {
          const content = fs.readFileSync(path.join(samplesDir, filename), "utf-8");
          const metadata = parseInpFile(content);
          const objectPath = await objectStorageService.uploadInpFile(content, filename);

          const newFile = await storage.createInpFile({
            filename,
            directory: "Sample Models",
            size: Buffer.byteLength(content, "utf-8"),
            lastModified: new Date(),
            nodeCount: metadata.nodeCount,
            linkCount: metadata.linkCount,
            subcatchmentCount: metadata.subcatchmentCount,
            description: extractTitle(content),
            objectPath,
          });
          loaded.push(newFile.filename);
        } catch (err) {
          console.error(`Failed to load sample ${filename}:`, err);
        }
      }

      if (loaded.length === 0) {
        return res.json({ message: "All sample models are already loaded", loaded: 0 });
      }

      res.json({ message: `Loaded ${loaded.length} sample models`, loaded: loaded.length, files: loaded });
    } catch (error) {
      console.error("Error loading samples:", error);
      res.status(500).json({ error: "Failed to load sample models" });
    }
  });

  app.post("/api/reswmm/apply", async (req, res) => {
    try {
      const { directory, config } = req.body as { directory: string; config: ReswmmConfig };

      if (!directory) {
        return res.status(400).json({ error: "Directory is required" });
      }

      const reswmmConfig: ReswmmConfig = {
        ...DEFAULT_RESWMM,
        ...config,
        enabled: true,
      };

      if (reswmmConfig.fixedMinLength < 1 || reswmmConfig.fixedMaxLength < 1) {
        return res.status(400).json({ error: "Segment lengths must be positive" });
      }
      if (reswmmConfig.fixedMinLength > reswmmConfig.fixedMaxLength) {
        return res.status(400).json({ error: "Min length cannot exceed max length" });
      }
      if (reswmmConfig.dxDRatio < 0.5) {
        return res.status(400).json({ error: "Dx/D ratio must be at least 0.5" });
      }
      if (reswmmConfig.mnsa <= 0) {
        return res.status(400).json({ error: "MNSA must be positive" });
      }

      const dirFiles = await storage.getInpFilesByDirectory(directory);
      if (dirFiles.length === 0) {
        return res.status(404).json({ error: `No files found in directory "${directory}"` });
      }

      const results: { filename: string; changed: boolean; stats: any; newFileId?: string }[] = [];
      let filesChanged = 0;

      for (const file of dirFiles) {
        if (file.filename.endsWith('_Disc.inp')) continue;

        try {
          const content = await objectStorageService.getInpFileContent(file.objectPath);
          const result = applyReswmm(content, reswmmConfig);

          if (result.changed) {
            filesChanged++;
            const discFilename = file.filename.replace(/\.inp$/i, '_Disc.inp');

            const existingDisc = dirFiles.find(f => f.filename === discFilename);
            if (existingDisc) {
              await objectStorageService.updateInpFileContent(existingDisc.objectPath, result.discretizedContent);
              const metadata = parseInpFile(result.discretizedContent);
              await storage.updateFileMetadata(existingDisc.id, {
                nodeCount: metadata.nodeCount,
                linkCount: metadata.linkCount,
                subcatchmentCount: metadata.subcatchmentCount,
                size: Buffer.byteLength(result.discretizedContent, 'utf-8'),
              });
              results.push({
                filename: discFilename,
                changed: true,
                stats: result.stats,
                newFileId: existingDisc.id,
              });
            } else {
              const objectPath = await objectStorageService.uploadInpFile(result.discretizedContent, discFilename);
              const metadata = parseInpFile(result.discretizedContent);
              const newFile = await storage.createInpFile({
                filename: discFilename,
                directory: file.directory,
                size: Buffer.byteLength(result.discretizedContent, 'utf-8'),
                lastModified: new Date(),
                nodeCount: metadata.nodeCount,
                linkCount: metadata.linkCount,
                subcatchmentCount: metadata.subcatchmentCount,
                description: `ReSWMM discretized from ${file.filename}`,
                objectPath,
              });
              results.push({
                filename: discFilename,
                changed: true,
                stats: result.stats,
                newFileId: newFile.id,
              });
            }
          } else {
            results.push({
              filename: file.filename,
              changed: false,
              stats: result.stats,
            });
          }
        } catch (err) {
          console.error(`ReSWMM error for ${file.filename}:`, err);
          results.push({
            filename: file.filename,
            changed: false,
            stats: { error: String(err) },
          });
        }
      }

      res.json({
        directory,
        totalFiles: dirFiles.filter(f => !f.filename.endsWith('_Disc.inp')).length,
        filesChanged,
        filesCreated: results.filter(r => r.changed).length,
        method: reswmmConfig.method,
        results,
      });
    } catch (error) {
      console.error("Error applying ReSWMM:", error);
      res.status(500).json({ error: "Failed to apply ReSWMM discretization" });
    }
  });

  let insightsCache: { data: any; timestamp: number } | null = null;
  const INSIGHTS_CACHE_TTL = 5 * 60 * 1000;

  app.get("/api/insights", async (req, res) => {
    try {
      if (insightsCache && Date.now() - insightsCache.timestamp < INSIGHTS_CACHE_TTL) {
        return res.json(insightsCache.data);
      }

      const { files } = await storage.getAllInpFilesPaginated(2000, 0);
      if (files.length === 0) {
        return res.json({ totalModels: 0, totalElements: 0, totalConduits: 0, pipeDiameters: [], shapes: [], manningsN: [], conduitLengths: [], offsets: [], modelComplexity: [] });
      }

      const modelComplexity = files.map(f => ({
        filename: f.filename,
        directory: f.directory,
        nodes: f.nodeCount,
        links: f.linkCount,
        subcatchments: f.subcatchmentCount,
      }));

      const totalElements = files.reduce((s, f) => s + f.nodeCount + f.linkCount + f.subcatchmentCount, 0);
      const totalConduits = files.reduce((s, f) => s + f.linkCount, 0);

      const pipeDiameters: number[] = [];
      const shapes: Record<string, number> = {};
      const manningsN: number[] = [];
      const conduitLengths: number[] = [];
      const offsetPatterns: Record<string, number> = { 'Both Zero': 0, 'Outlet Only': 0, 'Inlet Only': 0, 'Both Nonzero': 0 };

      let processedCount = 0;
      const batchSize = 20;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const contents = await Promise.allSettled(
          batch.map(f => objectStorageService.getInpFileContent(f.objectPath))
        );

        for (const result of contents) {
          if (result.status !== 'fulfilled') continue;
          const content = result.value;
          processedCount++;

          let currentSection = '';
          const conduitOffsets = new Map<string, { inOffset: number; outOffset: number }>();

          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(';')) continue;
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
              currentSection = trimmed.slice(1, -1).toUpperCase();
              continue;
            }

            const parts = trimmed.split(/\s+/);

            if (currentSection === 'CONDUITS' && parts.length >= 5) {
              const length = parseFloat(parts[3]);
              const roughness = parseFloat(parts[4]);
              if (!isNaN(length) && length > 0 && length < 100000) conduitLengths.push(length);
              if (!isNaN(roughness) && roughness > 0 && roughness < 1) manningsN.push(roughness);
              if (parts.length >= 7) {
                const inOff = parseFloat(parts[5]) || 0;
                const outOff = parseFloat(parts[6]) || 0;
                conduitOffsets.set(parts[0], { inOffset: inOff, outOffset: outOff });
              }
            }

            if (currentSection === 'XSECTIONS' && parts.length >= 3) {
              const shape = parts[1].toUpperCase();
              const geom1 = parseFloat(parts[2]);
              shapes[shape] = (shapes[shape] || 0) + 1;
              if (!isNaN(geom1) && geom1 > 0 && geom1 < 1000) {
                if (shape === 'CIRCULAR' || shape === 'FILLED_CIRCULAR' || shape === 'FORCE_MAIN') {
                  const diamInches = geom1 < 10 ? Math.round(geom1 * 12) : Math.round(geom1);
                  pipeDiameters.push(diamInches);
                }
              }
            }
          }

          for (const [, off] of conduitOffsets) {
            if (off.inOffset === 0 && off.outOffset === 0) offsetPatterns['Both Zero']++;
            else if (off.inOffset === 0 && off.outOffset !== 0) offsetPatterns['Outlet Only']++;
            else if (off.inOffset !== 0 && off.outOffset === 0) offsetPatterns['Inlet Only']++;
            else offsetPatterns['Both Nonzero']++;
          }
        }
      }

      const diameterBins: Record<string, number> = {};
      for (const d of pipeDiameters) {
        const binSizes = [4, 6, 8, 10, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 72, 84, 96];
        let binLabel = '96+';
        for (const b of binSizes) {
          if (d <= b) { binLabel = `${b}"`; break; }
        }
        diameterBins[binLabel] = (diameterBins[binLabel] || 0) + 1;
      }

      const manningsNBins: Record<string, number> = {};
      const nRanges = [
        { label: '0.009-0.011', min: 0, max: 0.011 },
        { label: '0.011-0.013', min: 0.011, max: 0.013 },
        { label: '0.013-0.015', min: 0.013, max: 0.015 },
        { label: '0.015-0.020', min: 0.015, max: 0.020 },
        { label: '0.020-0.030', min: 0.020, max: 0.030 },
        { label: '0.030+', min: 0.030, max: Infinity },
      ];
      for (const n of manningsN) {
        for (const r of nRanges) {
          if (n >= r.min && n < r.max) {
            manningsNBins[r.label] = (manningsNBins[r.label] || 0) + 1;
            break;
          }
        }
      }

      const lengthBins: Record<string, number> = {};
      const lengthRanges = [
        { label: '0-50', min: 0, max: 50 },
        { label: '50-100', min: 50, max: 100 },
        { label: '100-200', min: 100, max: 200 },
        { label: '200-500', min: 200, max: 500 },
        { label: '500-1000', min: 500, max: 1000 },
        { label: '1000+', min: 1000, max: Infinity },
      ];
      for (const l of conduitLengths) {
        for (const r of lengthRanges) {
          if (l >= r.min && l < r.max) {
            lengthBins[r.label] = (lengthBins[r.label] || 0) + 1;
            break;
          }
        }
      }

      const insightsData = {
        totalModels: files.length,
        totalElements,
        totalConduits,
        processedFiles: processedCount,
        pipeDiameters: Object.entries(diameterBins).map(([label, count]) => ({ label, count })),
        shapes: Object.entries(shapes).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
        manningsN: Object.entries(manningsNBins).map(([label, count]) => ({ label, count })),
        conduitLengths: Object.entries(lengthBins).map(([label, count]) => ({ label, count })),
        offsets: Object.entries(offsetPatterns).map(([label, count]) => ({ label, count })),
        modelComplexity,
      };

      insightsCache = { data: insightsData, timestamp: Date.now() };
      res.json(insightsData);
    } catch (error) {
      console.error('Error computing insights:', error);
      res.status(500).json({ error: 'Failed to compute insights' });
    }
  });

  return httpServer;
}

function extractTitle(content: string): string {
  const lines = content.split("\n");
  let inTitle = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "[TITLE]") {
      inTitle = true;
      continue;
    }
    if (inTitle) {
      if (trimmed.startsWith("[")) break;
      if (trimmed && !trimmed.startsWith(";")) return trimmed;
    }
  }
  return "Sample SWMM5 model";
}

function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
