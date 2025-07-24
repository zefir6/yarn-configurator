import { queues, configFiles, type Queue, type InsertQueue, type ConfigFile, type InsertConfigFile } from "@shared/schema";
import * as fs from 'fs/promises';
import * as path from 'path';

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
    this.defaultConfigPath = process.env.HADOOP_CONF_DIR 
      ? path.join(process.env.HADOOP_CONF_DIR, 'fair-scheduler.xml')
      : '/etc/hadoop/conf/fair-scheduler.xml';
    
    // Initialize with default queues
    this.initializeDefaultQueues();
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
      this.queues.set(id, { ...queue, id });
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
    const queue: Queue = { ...insertQueue, id };
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
    const configFile: ConfigFile = { ...config, id };
    this.configFiles.set(id, configFile);
    return configFile;
  }

  async readConfigFromDisk(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      // If file doesn't exist, return default XML structure
      return this.getDefaultXMLContent();
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

  private getDefaultXMLContent(): string {
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

export const storage = new MemStorage();
