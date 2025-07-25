import { type Queue, type InsertQueue, type ConfigFile, type InsertConfigFile, type GlobalConfig, type InsertGlobalConfig, type YarnConnection } from "@shared/schema";
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
  getDefaultXMLContent(): string;
  syncQueuesFromXML(queues: any[]): Promise<void>;
  reloadFromDisk(): Promise<void>;
  
  // Global config operations
  getGlobalConfig(): Promise<GlobalConfig>;
  updateGlobalConfig(config: Partial<InsertGlobalConfig>): Promise<GlobalConfig>;
  
  // Pending changes operations
  getPendingChangesCount(): Promise<number>;
  hasPendingChanges(): Promise<boolean>;
  applyPendingChanges(): Promise<void>;
  discardPendingChanges(): Promise<void>;

  // YARN integration operations
  getYarnConnection(): Promise<YarnConnection>;
  updateYarnConnection(connection: Partial<YarnConnection>): Promise<YarnConnection>;
}

export class MemStorage implements IStorage {
  private queues: Map<number, Queue>;
  private configFiles: Map<number, ConfigFile>;
  private globalConfig: GlobalConfig;
  private currentQueueId: number;
  private currentConfigId: number;
  private defaultConfigPath: string;
  private pendingChanges: Set<number>;
  private lastSyncedState: Map<number, Queue>;
  private yarnConnection: YarnConnection;

  constructor() {
    this.queues = new Map();
    this.configFiles = new Map();
    this.globalConfig = {
      id: 1,
      defaultQueueSchedulingPolicy: "fair",
      userMaxAppsDefault: 5,
      queueMaxAppsDefault: null,
      queueMaxAMShareDefault: null,
      queuePlacementRules: "specified,user,default",
      defaultQueue: "default",
    };
    this.currentQueueId = 1;
    this.currentConfigId = 1;
    this.defaultConfigPath = process.env.FAIR_SCHEDULER_XML_PATH || './data/fair-scheduler.xml';
    this.pendingChanges = new Set();
    this.lastSyncedState = new Map();
    this.yarnConnection = {
      resourceManagerHost: process.env.YARN_RM_HOST || 'localhost',
      resourceManagerPort: parseInt(process.env.YARN_RM_PORT || '8088'),
      enabled: process.env.YARN_ENABLED === 'true' || false,
    };
    
    // Try to load existing config from disk first, then initialize
    this.loadConfigFromDisk();
  }

  private initializeDefaultQueues() {
    const defaultQueues: InsertQueue[] = [
      {
        name: "root",
        parent: null,
        weight: 1.0,
        schedulingPolicy: "fair",
        aclSubmitApps: "*",
        aclAdministerApps: "*",
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
        aclSubmitApps: "*",
        aclAdministerApps: "*",
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
      const newQueue: Queue = { 
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
        reservation: queue.reservation || null,
        aclSubmitApps: queue.aclSubmitApps || null,
        aclAdministerApps: queue.aclAdministerApps || null
      };
      this.queues.set(id, newQueue);
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
      reservation: insertQueue.reservation ?? null,
      aclSubmitApps: insertQueue.aclSubmitApps ?? null,
      aclAdministerApps: insertQueue.aclAdministerApps ?? null
    };
    this.queues.set(id, queue);
    this.pendingChanges.add(id);
    return queue;
  }

  async updateQueue(id: number, updateData: Partial<InsertQueue>): Promise<Queue | undefined> {
    const existingQueue = this.queues.get(id);
    if (!existingQueue) return undefined;
    
    const updatedQueue: Queue = { ...existingQueue, ...updateData };
    this.queues.set(id, updatedQueue);
    this.pendingChanges.add(id);
    return updatedQueue;
  }

  async deleteQueue(id: number): Promise<boolean> {
    const deleted = this.queues.delete(id);
    if (deleted) {
      this.pendingChanges.add(id);
    }
    return deleted;
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
      console.log(`Successfully wrote XML config to ${filePath}`);
    } catch (error) {
      throw new Error(`Failed to write config file: ${error}`);
    }
  }

  private async loadConfigFromDisk(): Promise<void> {
    let xmlContent: string;
    
    try {
      console.log(`Attempting to load existing config from: ${this.defaultConfigPath}`);
      xmlContent = await this.readConfigFromDisk(this.defaultConfigPath);
      console.log(`Successfully loaded existing config from: ${this.defaultConfigPath}`);
    } catch (error) {
      console.log(`No existing config found at ${this.defaultConfigPath}, creating default file`);
      // Create default config file
      xmlContent = this.getDefaultXMLContent();
      
      // Ensure directory exists and write default file
      try {
        await this.writeConfigToDisk(this.defaultConfigPath, xmlContent);
        console.log(`Created default config file at: ${this.defaultConfigPath}`);
      } catch (writeError) {
        console.error(`Failed to create default config file:`, writeError);
      }
    }

    // Get actual file modification time
    let actualModTime: string;
    try {
      const stats = await fs.stat(this.defaultConfigPath);
      actualModTime = stats.mtime.toISOString();
    } catch (error) {
      // Fallback to current time if stat fails
      actualModTime = new Date().toISOString();
    }

    // Save to memory storage
    const configFile: ConfigFile = {
      id: this.currentConfigId++,
      filePath: this.defaultConfigPath,
      content: xmlContent,
      isValid: true,
      lastModified: actualModTime,
      validationErrors: null
    };
    this.configFiles.set(configFile.id, configFile);
    
    // Parse global configuration and queues from XML
    try {
      const { parseGlobalConfigFromXML, parseQueuesFromXML } = await import('./xml-utils');
      
      // Parse global configuration from XML first
      const parsedGlobalConfig = await parseGlobalConfigFromXML(xmlContent);
      this.globalConfig = { ...this.globalConfig, ...parsedGlobalConfig };
      console.log('Loaded global config from XML:', this.globalConfig);
      
      // Parse and sync queues from XML
      const parsedQueues = await parseQueuesFromXML(xmlContent);
      await this.syncQueuesFromXML(parsedQueues);
      
      // Save initial synced state after loading from XML
      this.queues.forEach((queue, id) => {
        this.lastSyncedState.set(id, { ...queue });
      });
      
      console.log(`Synchronized ${parsedQueues.length} queues from XML file`);
    } catch (parseError) {
      console.error('Failed to parse XML, using default queues:', parseError);
      // Fallback to default queues if XML parsing fails
      this.initializeDefaultQueues();
      this.queues.forEach((queue, id) => {
        this.lastSyncedState.set(id, { ...queue });
      });
    }
  }

  async syncQueuesFromXML(queues: any[]): Promise<void> {
    console.log(`Syncing ${queues.length} queues from XML to memory storage`);
    
    // Clear existing queues
    this.queues.clear();
    this.currentQueueId = 1;

    // Ensure we only have one root queue
    const uniqueQueues = new Map();
    
    queues.forEach(queue => {
      const key = queue.name;
      if (!uniqueQueues.has(key)) {
        uniqueQueues.set(key, queue);
      }
    });

    // Add queues from XML (deduplicated)
    Array.from(uniqueQueues.values()).forEach(queue => {
      const id = this.currentQueueId++;
      const newQueue: Queue = { 
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
      };
      this.queues.set(id, newQueue);
    });

    console.log(`Synchronized ${uniqueQueues.size} unique queues to memory storage`);
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

  async getPendingChangesCount(): Promise<number> {
    return this.pendingChanges.size;
  }

  async hasPendingChanges(): Promise<boolean> {
    return this.pendingChanges.size > 0;
  }

  async applyPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;

    try {
      // Regenerate and save XML from current queues
      const allQueues = Array.from(this.queues.values());
      const { generateXMLFromQueues } = await import('./xml-utils');
      const xmlContent = generateXMLFromQueues(allQueues, this.globalConfig);
      
      // Update config file with regenerated XML
      const configFile = await this.getConfigFile();
      if (configFile) {
        await this.saveConfigFile({
          filePath: configFile.filePath,
          content: xmlContent,
          isValid: true,
          lastModified: new Date().toISOString(),
          validationErrors: null,
        });
        
        // Write to disk
        await this.writeConfigToDisk(configFile.filePath, xmlContent);
        console.log(`Applied ${this.pendingChanges.size} pending changes to XML file`);
      }

      // Clear pending changes and update synced state
      this.pendingChanges.clear();
      this.lastSyncedState.clear();
      this.queues.forEach((queue, id) => {
        this.lastSyncedState.set(id, { ...queue });
      });
      
    } catch (error) {
      console.error('Failed to apply pending changes:', error);
      throw error;
    }
  }

  async discardPendingChanges(): Promise<void> {
    // Restore queues to last synced state
    this.queues.clear();
    this.lastSyncedState.forEach((queue, id) => {
      this.queues.set(id, { ...queue });
    });
    
    // Clear pending changes
    this.pendingChanges.clear();
    console.log('Discarded all pending changes');
  }

  async getYarnConnection(): Promise<YarnConnection> {
    return { ...this.yarnConnection };
  }

  async updateYarnConnection(connection: Partial<YarnConnection>): Promise<YarnConnection> {
    this.yarnConnection = { ...this.yarnConnection, ...connection };
    return { ...this.yarnConnection };
  }

  async reloadFromDisk(): Promise<void> {
    console.log(`Reloading configuration from disk: ${this.defaultConfigPath}`);
    
    try {
      // Read the current file from disk
      const xmlContent = await this.readConfigFromDisk(this.defaultConfigPath);
      
      // Get actual file modification time
      let actualModTime: string;
      try {
        const stats = await fs.stat(this.defaultConfigPath);
        actualModTime = stats.mtime.toISOString();
      } catch (error) {
        // Fallback to current time if stat fails
        actualModTime = new Date().toISOString();
      }

      // Update config file in memory
      const configFile: ConfigFile = {
        id: this.currentConfigId++,
        filePath: this.defaultConfigPath,
        content: xmlContent,
        isValid: true,
        lastModified: actualModTime,
        validationErrors: null
      };
      
      // Clear existing config and add new one
      this.configFiles.clear();
      this.configFiles.set(configFile.id, configFile);
      
      // Parse global configuration and queues from XML
      const { parseGlobalConfigFromXML, parseQueuesFromXML } = await import('./xml-utils');
      
      // Parse global configuration from XML first
      const parsedGlobalConfig = await parseGlobalConfigFromXML(xmlContent);
      this.globalConfig = { ...this.globalConfig, ...parsedGlobalConfig };
      console.log('Reloaded global config from XML:', this.globalConfig);
      
      // Parse and sync queues from XML
      const parsedQueues = await parseQueuesFromXML(xmlContent);
      await this.syncQueuesFromXML(parsedQueues);
      
      // Clear pending changes and update synced state
      this.pendingChanges.clear();
      this.lastSyncedState.clear();
      this.queues.forEach((queue, id) => {
        this.lastSyncedState.set(id, { ...queue });
      });
      
      console.log(`Successfully reloaded ${parsedQueues.length} queues from disk`);
      
    } catch (error) {
      console.error('Failed to reload from disk:', error);
      throw new Error(`Failed to reload configuration from disk: ${error}`);
    }
  }

  async getGlobalConfig(): Promise<GlobalConfig> {
    return this.globalConfig;
  }

  async updateGlobalConfig(config: Partial<InsertGlobalConfig>): Promise<GlobalConfig> {
    this.globalConfig = {
      ...this.globalConfig,
      ...config,
    };
    return this.globalConfig;
  }
}

// Simple memory storage with XML file persistence only
export const storage = new MemStorage();