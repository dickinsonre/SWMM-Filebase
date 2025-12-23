import { users, inpFiles, type User, type InsertUser, type InpFile, type InsertInpFile } from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, ilike, count } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
