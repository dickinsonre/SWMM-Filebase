import { users, inpFiles, type User, type InsertUser, type InpFile, type InsertInpFile } from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, ilike, count, sum, sql, countDistinct } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // SWMM5 File operations
  getAllInpFiles(): Promise<InpFile[]>;
  getAllInpFilesPaginated(limit: number, offset: number): Promise<{ files: InpFile[], total: number }>;
  getInpFile(id: string): Promise<InpFile | undefined>;
  createInpFile(file: InsertInpFile): Promise<InpFile>;
  deleteInpFile(id: string): Promise<void>;
  getInpFilesByDirectory(directory: string): Promise<InpFile[]>;
  deleteDirectory(directory: string): Promise<InpFile[]>;
  
  // Pinned and Recent files
  togglePinFile(id: string): Promise<InpFile | undefined>;
  updateLastAccessed(id: string): Promise<void>;
  getPinnedFiles(): Promise<InpFile[]>;
  getRecentFiles(limit: number): Promise<InpFile[]>;
  searchFiles(query: string): Promise<InpFile[]>;
  
  // Update file metadata after content edit
  updateFileMetadata(id: string, metadata: { nodeCount: number; linkCount: number; subcatchmentCount: number; size: number }): Promise<InpFile | undefined>;
  
  // Aggregate statistics
  getStats(): Promise<{
    totalFiles: number;
    totalDirectories: number;
    totalNodes: number;
    totalLinks: number;
    totalSubcatchments: number;
    totalSizeBytes: number;
    avgNodesPerFile: number;
    avgLinksPerFile: number;
    avgSubcatchmentsPerFile: number;
    largestFile: { filename: string; size: number } | null;
    smallestFile: { filename: string; size: number } | null;
    directories: { name: string; fileCount: number }[];
    inpCount: number;
    xpCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllInpFiles(): Promise<InpFile[]> {
    return await db.select().from(inpFiles).orderBy(desc(inpFiles.createdAt));
  }

  async getAllInpFilesPaginated(limit: number, offset: number): Promise<{ files: InpFile[], total: number }> {
    const [countResult] = await db.select({ count: count() }).from(inpFiles);
    const total = countResult?.count ?? 0;
    
    const files = await db
      .select()
      .from(inpFiles)
      .orderBy(desc(inpFiles.createdAt))
      .limit(limit)
      .offset(offset);
    
    return { files, total };
  }

  async getInpFile(id: string): Promise<InpFile | undefined> {
    const [file] = await db.select().from(inpFiles).where(eq(inpFiles.id, id));
    return file || undefined;
  }

  async createInpFile(file: InsertInpFile): Promise<InpFile> {
    const [created] = await db
      .insert(inpFiles)
      .values(file)
      .returning();
    return created;
  }

  async deleteInpFile(id: string): Promise<void> {
    await db.delete(inpFiles).where(eq(inpFiles.id, id));
  }

  async getInpFilesByDirectory(directory: string): Promise<InpFile[]> {
    return await db.select().from(inpFiles).where(eq(inpFiles.directory, directory));
  }

  async deleteDirectory(directory: string): Promise<InpFile[]> {
    const filesToDelete = await this.getInpFilesByDirectory(directory);
    await db.delete(inpFiles).where(eq(inpFiles.directory, directory));
    return filesToDelete;
  }

  async togglePinFile(id: string): Promise<InpFile | undefined> {
    const file = await this.getInpFile(id);
    if (!file) return undefined;
    
    const [updated] = await db
      .update(inpFiles)
      .set({ isPinned: !file.isPinned })
      .where(eq(inpFiles.id, id))
      .returning();
    return updated;
  }

  async updateLastAccessed(id: string): Promise<void> {
    await db
      .update(inpFiles)
      .set({ lastAccessedAt: new Date() })
      .where(eq(inpFiles.id, id));
  }

  async getPinnedFiles(): Promise<InpFile[]> {
    return await db
      .select()
      .from(inpFiles)
      .where(eq(inpFiles.isPinned, true))
      .orderBy(desc(inpFiles.lastAccessedAt));
  }

  async getRecentFiles(limit: number): Promise<InpFile[]> {
    return await db
      .select()
      .from(inpFiles)
      .orderBy(desc(inpFiles.lastAccessedAt))
      .limit(limit);
  }

  async searchFiles(query: string): Promise<InpFile[]> {
    const pattern = `%${query}%`;
    return await db
      .select()
      .from(inpFiles)
      .where(
        or(
          ilike(inpFiles.filename, pattern),
          ilike(inpFiles.directory, pattern),
          ilike(inpFiles.description, pattern)
        )
      )
      .orderBy(desc(inpFiles.createdAt));
  }

  async updateFileMetadata(id: string, metadata: { nodeCount: number; linkCount: number; subcatchmentCount: number; size: number }): Promise<InpFile | undefined> {
    const [updated] = await db
      .update(inpFiles)
      .set({
        nodeCount: metadata.nodeCount,
        linkCount: metadata.linkCount,
        subcatchmentCount: metadata.subcatchmentCount,
        size: metadata.size,
        lastModified: new Date()
      })
      .where(eq(inpFiles.id, id))
      .returning();
    return updated;
  }

  async getStats() {
    const [agg] = await db.select({
      totalFiles: count(),
      totalDirectories: countDistinct(inpFiles.directory),
      totalNodes: sum(inpFiles.nodeCount),
      totalLinks: sum(inpFiles.linkCount),
      totalSubcatchments: sum(inpFiles.subcatchmentCount),
      totalSizeBytes: sum(inpFiles.size),
    }).from(inpFiles);

    const totalFiles = agg?.totalFiles ?? 0;
    const totalNodes = Number(agg?.totalNodes ?? 0);
    const totalLinks = Number(agg?.totalLinks ?? 0);
    const totalSubcatchments = Number(agg?.totalSubcatchments ?? 0);
    const totalSizeBytes = Number(agg?.totalSizeBytes ?? 0);
    const totalDirectories = agg?.totalDirectories ?? 0;

    const dirResults = await db.select({
      name: inpFiles.directory,
      fileCount: count(),
    }).from(inpFiles).groupBy(inpFiles.directory).orderBy(desc(count()));

    let largestFile: { filename: string; size: number } | null = null;
    let smallestFile: { filename: string; size: number } | null = null;

    if (totalFiles > 0) {
      const [largest] = await db.select({ filename: inpFiles.filename, size: inpFiles.size })
        .from(inpFiles).orderBy(desc(inpFiles.size)).limit(1);
      const [smallest] = await db.select({ filename: inpFiles.filename, size: inpFiles.size })
        .from(inpFiles).orderBy(inpFiles.size).limit(1);
      if (largest) largestFile = { filename: largest.filename, size: largest.size };
      if (smallest) smallestFile = { filename: smallest.filename, size: smallest.size };
    }

    const [extCounts] = await db.select({
      inpCount: sql<number>`count(*) filter (where lower(${inpFiles.filename}) like '%.inp')`,
      xpCount: sql<number>`count(*) filter (where lower(${inpFiles.filename}) like '%.xp')`,
    }).from(inpFiles);

    return {
      totalFiles,
      totalDirectories,
      totalNodes,
      totalLinks,
      totalSubcatchments,
      totalSizeBytes,
      avgNodesPerFile: totalFiles > 0 ? Math.round(totalNodes / totalFiles) : 0,
      avgLinksPerFile: totalFiles > 0 ? Math.round(totalLinks / totalFiles) : 0,
      avgSubcatchmentsPerFile: totalFiles > 0 ? Math.round(totalSubcatchments / totalFiles) : 0,
      largestFile,
      smallestFile,
      directories: dirResults.map(d => ({ name: d.name, fileCount: d.fileCount })),
      inpCount: Number(extCounts?.inpCount ?? 0),
      xpCount: Number(extCounts?.xpCount ?? 0),
    };
  }
}

export const storage = new DatabaseStorage();
