import { queues, configFiles, type Queue, type InsertQueue, type ConfigFile, type InsertConfigFile } from "@shared/schema";
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

export interface IStorage {
  // Queue operations
  getQueues(): Promise<Queue[]>;
  getQueue(id: number): Promise<Queue | undefined>;
  createQueue(queue: InsertQueue): Promise<Queue>;
  updateQueue(id: number, queue: Partial<InsertQueue>): Promise<Queue | undefined>;
  deleteQueue(id: number): Promise<boolean>;
  
  // Config file operations
  getConfigFile(): Promise<ConfigFile | undefined>;
  saveConfigFile(config: InsertConfigFile): Promise<ConfigFile>;
  readConfigFromDisk(filePath: string): Promise<string>;
  writeConfigToDisk(filePath: string, content: string): Promise<void>;
  getDefaultXMLContent(): string;
}

export class MemStorage implements IStorage {
  private queues: Map<number, Queue>;
  private configFiles: Map<number, ConfigFile>;
  private currentQueueId: number;
  private currentConfigId: number;
  private defaultConfigPath: string;

  constructor() {
    this.queues = new Map();
    this.configFiles = new Map();
    this.currentQueueId = 1;
    this.currentConfigId = 1;
    this.defaultConfigPath = process.env.FAIR_SCHEDULER_XML_PATH || 
      (process.env.HADOOP_CONF_DIR 
        ? path.join(process.env.HADOOP_CONF_DIR, 'fair-scheduler.xml')
        : '/etc/hadoop/conf/fair-scheduler.xml');
    
    // Initialize with default queues
    this.initializeDefaultQueues();
    
    // Try to load existing config from disk
    this.loadConfigFromDisk();
  }

  private initializeDefaultQueues() {
    const defaultQueues: InsertQueue[] = [
      {
        name: "root",
        parent: null,
        weight: 1.0,
        schedulingPolicy: "fair",
      },
      {
        name: "production",
        parent: "root",
        weight: 3.0,
        schedulingPolicy: "fair",
        minMemory: 2048,
        minVcores: 2,
        maxMemory: 16384,
        maxVcores: 8,
        maxRunningApps: 100,
        maxAMShare: 0.3,
        allowPreemptionFrom: true,
      },
      {
        name: "development",
        parent: "root",
        weight: 2.0,
        schedulingPolicy: "fair",
        minMemory: 1024,
        minVcores: 1,
        maxMemory: 8192,
        maxVcores: 4,
        maxRunningApps: 50,
        maxAMShare: 0.5,
      },
      {
        name: "default",
        parent: "root",
        weight: 1.0,
        schedulingPolicy: "fair",
        minMemory: 1024,
        minVcores: 1,
        maxMemory: 8192,
        maxVcores: 4,
        maxRunningApps: 25,
      }
    ];

    defaultQueues.forEach(queue => {
      const id = this.currentQueueId++;
      this.queues.set(id, { 
        ...queue, 
        id,
        parent: queue.parent || null,
        weight: queue.weight || null,
        schedulingPolicy: queue.schedulingPolicy || null,
        minMemory: queue.minMemory || null,
        minVcores: queue.minVcores || null,
        maxMemory: queue.maxMemory || null,
        maxVcores: queue.maxVcores || null,
        maxRunningApps: queue.maxRunningApps || null,
        maxAMShare: queue.maxAMShare || null,
        allowPreemptionFrom: queue.allowPreemptionFrom || null,
        allowPreemptionTo: queue.allowPreemptionTo || null,
        reservation: queue.reservation || null
      });
    });
  }

  async getQueues(): Promise<Queue[]> {
    return Array.from(this.queues.values());
  }

  async getQueue(id: number): Promise<Queue | undefined> {
    return this.queues.get(id);
  }

  async createQueue(insertQueue: InsertQueue): Promise<Queue> {
    const id = this.currentQueueId++;
    const queue: Queue = { 
      ...insertQueue, 
      id,
      parent: insertQueue.parent ?? null,
      weight: insertQueue.weight ?? null,
      schedulingPolicy: insertQueue.schedulingPolicy ?? null,
      minMemory: insertQueue.minMemory ?? null,
      minVcores: insertQueue.minVcores ?? null,
      maxMemory: insertQueue.maxMemory ?? null,
      maxVcores: insertQueue.maxVcores ?? null,
      maxRunningApps: insertQueue.maxRunningApps ?? null,
      maxAMShare: insertQueue.maxAMShare ?? null,
      allowPreemptionFrom: insertQueue.allowPreemptionFrom ?? null,
      allowPreemptionTo: insertQueue.allowPreemptionTo ?? null,
      reservation: insertQueue.reservation ?? null
    };
    this.queues.set(id, queue);
    return queue;
  }

  async updateQueue(id: number, updateData: Partial<InsertQueue>): Promise<Queue | undefined> {
    const existingQueue = this.queues.get(id);
    if (!existingQueue) return undefined;
    
    const updatedQueue: Queue = { ...existingQueue, ...updateData };
    this.queues.set(id, updatedQueue);
    return updatedQueue;
  }

  async deleteQueue(id: number): Promise<boolean> {
    return this.queues.delete(id);
  }

  async getConfigFile(): Promise<ConfigFile | undefined> {
    const configs = Array.from(this.configFiles.values());
    return configs[0]; // Return the first (and typically only) config file
  }

  async saveConfigFile(config: InsertConfigFile): Promise<ConfigFile> {
    const id = this.currentConfigId++;
    const configFile: ConfigFile = { 
      ...config, 
      id,
      isValid: config.isValid ?? null,
      lastModified: config.lastModified ?? null,
      validationErrors: config.validationErrors ?? null
    };
    this.configFiles.set(id, configFile);
    return configFile;
  }

  async readConfigFromDisk(filePath: string): Promise<string> {
    try {
      console.log(`Reading config file from: ${filePath}`);
      const content = await fs.readFile(filePath, 'utf-8');
      console.log(`Successfully read ${content.length} characters from ${filePath}`);
      return content;
    } catch (error) {
      console.error(`Failed to read config file from ${filePath}:`, error);
      throw error; // Let the caller handle the error
    }
  }

  async writeConfigToDisk(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write the file
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write config file: ${error}`);
    }
  }

  private async loadConfigFromDisk(): Promise<void> {
    try {
      console.log(`Attempting to load existing config from: ${this.defaultConfigPath}`);
      const content = await this.readConfigFromDisk(this.defaultConfigPath);
      
      // Save to memory storage
      const configFile: ConfigFile = {
        id: this.currentConfigId++,
        filePath: this.defaultConfigPath,
        content,
        isValid: true,
        lastModified: new Date().toISOString(),
        validationErrors: null
      };
      this.configFiles.set(configFile.id, configFile);
      console.log(`Successfully loaded existing config from: ${this.defaultConfigPath}`);
    } catch (error) {
      console.log(`No existing config found at ${this.defaultConfigPath}, will use defaults`);
    }
  }

  getDefaultXMLContent(): string {
    return `<?xml version="1.0"?>
<allocations>
  <queue name="production">
    <weight>3.0</weight>
    <schedulingPolicy>fair</schedulingPolicy>
    <minResources>2048 mb,2 vcores</minResources>
    <maxResources>16384 mb,8 vcores</maxResources>
    <maxRunningApps>100</maxRunningApps>
    <maxAMShare>0.3</maxAMShare>
    <allowPreemptionFrom>true</allowPreemptionFrom>
  </queue>
  
  <queue name="development">
    <weight>2.0</weight>
    <schedulingPolicy>fair</schedulingPolicy>
    <minResources>1024 mb,1 vcores</minResources>
    <maxResources>8192 mb,4 vcores</maxResources>
    <maxRunningApps>50</maxRunningApps>
    <maxAMShare>0.5</maxAMShare>
  </queue>
  
  <queue name="default">
    <weight>1.0</weight>
    <schedulingPolicy>fair</schedulingPolicy>
    <minResources>1024 mb,1 vcores</minResources>
    <maxResources>8192 mb,4 vcores</maxResources>
    <maxRunningApps>25</maxRunningApps>
  </queue>
  
  <userMaxAppsDefault>5</userMaxAppsDefault>
  <defaultQueueSchedulingPolicy>fair</defaultQueueSchedulingPolicy>
  
  <queuePlacementPolicy>
    <rule name="specified"/>
    <rule name="user"/>
    <rule name="default" queue="default"/>
  </queuePlacementPolicy>
</allocations>`;
  }
}

// SQLite Storage Implementation
export class SqliteStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private sqlite: Database.Database;
  private defaultConfigPath: string;

  constructor(dbPath: string = './data/yarn-scheduler.db') {
    // Ensure the data directory exists
    const dataDir = path.dirname(dbPath);
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.sqlite = new Database(dbPath);
    this.db = drizzle(this.sqlite);
    this.defaultConfigPath = process.env.FAIR_SCHEDULER_XML_PATH || 
      (process.env.HADOOP_CONF_DIR 
        ? path.join(process.env.HADOOP_CONF_DIR, 'fair-scheduler.xml')
        : '/etc/hadoop/conf/fair-scheduler.xml');
    
    this.initializeDatabase();
    
    // Try to load existing config from disk
    this.loadConfigFromDisk();
  }

  private initializeDatabase() {
    // Create tables if they don't exist
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS queues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent TEXT,
        weight REAL DEFAULT 1.0,
        scheduling_policy TEXT DEFAULT 'fair',
        min_memory INTEGER,
        min_vcores INTEGER,
        max_memory INTEGER,
        max_vcores INTEGER,
        max_running_apps INTEGER,
        max_am_share REAL,
        allow_preemption_from INTEGER DEFAULT 0,
        allow_preemption_to INTEGER DEFAULT 0,
        reservation INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS config_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        is_valid INTEGER DEFAULT 1,
        last_modified TEXT,
        validation_errors TEXT
      );
    `);

    // Insert default queues if table is empty
    const existingQueues = this.sqlite.prepare('SELECT COUNT(*) as count FROM queues').get() as { count: number };
    if (existingQueues.count === 0) {
      this.insertDefaultQueues();
    }
  }

  private insertDefaultQueues() {
    const defaultQueues = [
      {
        name: "root",
        parent: null,
        weight: 1.0,
        schedulingPolicy: "fair",
      },
      {
        name: "production",
        parent: "root",
        weight: 3.0,
        schedulingPolicy: "fair",
        minMemory: 2048,
        minVcores: 2,
        maxMemory: 16384,
        maxVcores: 8,
        maxRunningApps: 100,
        maxAMShare: 0.3,
        allowPreemptionFrom: true,
      },
      {
        name: "development",
        parent: "root",
        weight: 2.0,
        schedulingPolicy: "fair",
        minMemory: 1024,
        minVcores: 1,
        maxMemory: 8192,
        maxVcores: 4,
        maxRunningApps: 50,
        maxAMShare: 0.5,
      },
      {
        name: "default",
        parent: "root",
        weight: 1.0,
        schedulingPolicy: "fair",
        minMemory: 1024,
        minVcores: 1,
        maxMemory: 8192,
        maxVcores: 4,
        maxRunningApps: 25,
      }
    ];

    const insert = this.sqlite.prepare(`
      INSERT INTO queues (name, parent, weight, scheduling_policy, min_memory, min_vcores, max_memory, max_vcores, max_running_apps, max_am_share, allow_preemption_from)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    defaultQueues.forEach(queue => {
      insert.run(
        queue.name,
        queue.parent,
        queue.weight,
        queue.schedulingPolicy,
        queue.minMemory || null,
        queue.minVcores || null,
        queue.maxMemory || null,
        queue.maxVcores || null,
        queue.maxRunningApps || null,
        queue.maxAMShare || null,
        queue.allowPreemptionFrom ? 1 : 0
      );
    });
  }

  async getQueues(): Promise<Queue[]> {
    const rows = this.sqlite.prepare('SELECT * FROM queues').all();
    return rows.map(row => ({
      ...row,
      allowPreemptionFrom: Boolean(row.allow_preemption_from),
      allowPreemptionTo: Boolean(row.allow_preemption_to),
      reservation: Boolean(row.reservation)
    })) as Queue[];
  }

  async getQueue(id: number): Promise<Queue | undefined> {
    const row = this.sqlite.prepare('SELECT * FROM queues WHERE id = ?').get(id);
    if (!row) return undefined;
    return {
      ...row,
      allowPreemptionFrom: Boolean(row.allow_preemption_from),
      allowPreemptionTo: Boolean(row.allow_preemption_to),
      reservation: Boolean(row.reservation)
    } as Queue;
  }

  async createQueue(insertQueue: InsertQueue): Promise<Queue> {
    const insert = this.sqlite.prepare(`
      INSERT INTO queues (name, parent, weight, scheduling_policy, min_memory, min_vcores, max_memory, max_vcores, max_running_apps, max_am_share, allow_preemption_from, allow_preemption_to, reservation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      insertQueue.name,
      insertQueue.parent || null,
      insertQueue.weight || null,
      insertQueue.schedulingPolicy || null,
      insertQueue.minMemory || null,
      insertQueue.minVcores || null,
      insertQueue.maxMemory || null,
      insertQueue.maxVcores || null,
      insertQueue.maxRunningApps || null,
      insertQueue.maxAMShare || null,
      insertQueue.allowPreemptionFrom ? 1 : 0,
      insertQueue.allowPreemptionTo ? 1 : 0,
      insertQueue.reservation ? 1 : 0
    );

    const newQueue = await this.getQueue(result.lastInsertRowid as number);
    if (!newQueue) throw new Error('Failed to create queue');
    return newQueue;
  }

  async updateQueue(id: number, updateData: Partial<InsertQueue>): Promise<Queue | undefined> {
    const existing = await this.getQueue(id);
    if (!existing) return undefined;

    const fields = [];
    const values = [];

    if (updateData.name !== undefined) { fields.push('name = ?'); values.push(updateData.name); }
    if (updateData.parent !== undefined) { fields.push('parent = ?'); values.push(updateData.parent); }
    if (updateData.weight !== undefined) { fields.push('weight = ?'); values.push(updateData.weight); }
    if (updateData.schedulingPolicy !== undefined) { fields.push('scheduling_policy = ?'); values.push(updateData.schedulingPolicy); }
    if (updateData.minMemory !== undefined) { fields.push('min_memory = ?'); values.push(updateData.minMemory); }
    if (updateData.minVcores !== undefined) { fields.push('min_vcores = ?'); values.push(updateData.minVcores); }
    if (updateData.maxMemory !== undefined) { fields.push('max_memory = ?'); values.push(updateData.maxMemory); }
    if (updateData.maxVcores !== undefined) { fields.push('max_vcores = ?'); values.push(updateData.maxVcores); }
    if (updateData.maxRunningApps !== undefined) { fields.push('max_running_apps = ?'); values.push(updateData.maxRunningApps); }
    if (updateData.maxAMShare !== undefined) { fields.push('max_am_share = ?'); values.push(updateData.maxAMShare); }
    if (updateData.allowPreemptionFrom !== undefined) { fields.push('allow_preemption_from = ?'); values.push(updateData.allowPreemptionFrom ? 1 : 0); }
    if (updateData.allowPreemptionTo !== undefined) { fields.push('allow_preemption_to = ?'); values.push(updateData.allowPreemptionTo ? 1 : 0); }
    if (updateData.reservation !== undefined) { fields.push('reservation = ?'); values.push(updateData.reservation ? 1 : 0); }

    if (fields.length === 0) return existing;

    values.push(id);
    const update = this.sqlite.prepare(`UPDATE queues SET ${fields.join(', ')} WHERE id = ?`);
    update.run(...values);

    return await this.getQueue(id);
  }

  async deleteQueue(id: number): Promise<boolean> {
    const result = this.sqlite.prepare('DELETE FROM queues WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getConfigFile(): Promise<ConfigFile | undefined> {
    const row = this.sqlite.prepare('SELECT * FROM config_files ORDER BY id DESC LIMIT 1').get();
    if (!row) return undefined;
    return {
      ...row,
      isValid: Boolean(row.is_valid)
    } as ConfigFile;
  }

  async saveConfigFile(config: InsertConfigFile): Promise<ConfigFile> {
    const insert = this.sqlite.prepare(`
      INSERT INTO config_files (file_path, content, is_valid, last_modified, validation_errors)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      config.filePath,
      config.content,
      config.isValid ? 1 : 0,
      config.lastModified || null,
      config.validationErrors || null
    );

    const newConfig = this.sqlite.prepare('SELECT * FROM config_files WHERE id = ?').get(result.lastInsertRowid);
    return {
      ...newConfig,
      isValid: Boolean(newConfig.is_valid)
    } as ConfigFile;
  }

  async readConfigFromDisk(filePath: string): Promise<string> {
    try {
      console.log(`Reading config file from: ${filePath}`);
      const content = await fs.readFile(filePath, 'utf-8');
      console.log(`Successfully read ${content.length} characters from ${filePath}`);
      return content;
    } catch (error) {
      console.error(`Failed to read config file from ${filePath}:`, error);
      throw error; // Let the caller handle the error
    }
  }

  async writeConfigToDisk(filePath: string, content: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write config file: ${error}`);
    }
  }

  private async loadConfigFromDisk(): Promise<void> {
    try {
      console.log(`Attempting to load existing config from: ${this.defaultConfigPath}`);
      const content = await this.readConfigFromDisk(this.defaultConfigPath);
      
      // Save to SQLite database
      const insert = this.sqlite.prepare(`
        INSERT INTO config_files (file_path, content, is_valid, last_modified, validation_errors)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      insert.run(
        this.defaultConfigPath,
        content,
        1, // Assume valid for now
        new Date().toISOString(),
        null
      );
      
      console.log(`Successfully loaded existing config from: ${this.defaultConfigPath}`);
    } catch (error) {
      console.log(`No existing config found at ${this.defaultConfigPath}, will use defaults`);
    }
  }

  getDefaultXMLContent(): string {
    return `<?xml version="1.0"?>
<allocations>
  <queue name="production">
    <weight>3.0</weight>
    <schedulingPolicy>fair</schedulingPolicy>
    <minResources>2048 mb,2 vcores</minResources>
    <maxResources>16384 mb,8 vcores</maxResources>
    <maxRunningApps>100</maxRunningApps>
    <maxAMShare>0.3</maxAMShare>
    <allowPreemptionFrom>true</allowPreemptionFrom>
  </queue>
  
  <queue name="development">
    <weight>2.0</weight>
    <schedulingPolicy>fair</schedulingPolicy>
    <minResources>1024 mb,1 vcores</minResources>
    <maxResources>8192 mb,4 vcores</maxResources>
    <maxRunningApps>50</maxRunningApps>
    <maxAMShare>0.5</maxAMShare>
  </queue>
  
  <queue name="default">
    <weight>1.0</weight>
    <schedulingPolicy>fair</schedulingPolicy>
    <minResources>1024 mb,1 vcores</minResources>
    <maxResources>8192 mb,4 vcores</maxResources>
    <maxRunningApps>25</maxRunningApps>
  </queue>
  
  <userMaxAppsDefault>5</userMaxAppsDefault>
  <defaultQueueSchedulingPolicy>fair</defaultQueueSchedulingPolicy>
  
  <queuePlacementPolicy>
    <rule name="specified"/>
    <rule name="user"/>
    <rule name="default" queue="default"/>
  </queuePlacementPolicy>
</allocations>`;
  }

  close() {
    this.sqlite.close();
  }
}

// Factory function to create storage instance based on environment
function createStorage(): IStorage {
  const storageType = process.env.STORAGE_TYPE || 'sqlite';
  
  if (storageType === 'sqlite') {
    const dbPath = process.env.SQLITE_DB_PATH || './data/yarn-scheduler.db';
    return new SqliteStorage(dbPath);
  } else {
    // Default to in-memory storage
    return new MemStorage();
  }
}

export const storage = createStorage();
