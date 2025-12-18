import { users, inpFiles, type User, type InsertUser, type InpFile, type InsertInpFile } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // SWMM5 File operations
  getAllInpFiles(): Promise<InpFile[]>;
  getInpFile(id: string): Promise<InpFile | undefined>;
  createInpFile(file: InsertInpFile): Promise<InpFile>;
  deleteInpFile(id: string): Promise<void>;
  getInpFilesByDirectory(directory: string): Promise<InpFile[]>;
  deleteDirectory(directory: string): Promise<InpFile[]>;
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
}

export const storage = new DatabaseStorage();
