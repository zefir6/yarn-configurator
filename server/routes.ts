import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { queueFormSchema, insertConfigFileSchema } from "@shared/schema";
import { z } from "zod";
import multer, { FileFilterCallback } from "multer";
import * as path from "path";
import { parseString, Builder } from "xml2js";
import { parseQueuesFromXML } from "./xml-utils";

const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || file.originalname.endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Only XML files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all queues
  app.get("/api/queues", async (req, res) => {
    try {
      const queues = await storage.getQueues();
      res.json(queues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queues" });
    }
  });

  // Get single queue
  app.get("/api/queues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const queue = await storage.getQueue(id);
      if (!queue) {
        return res.status(404).json({ message: "Queue not found" });
      }
      res.json(queue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queue" });
    }
  });

  // Create queue
  app.post("/api/queues", async (req, res) => {
    try {
      const validatedData = queueFormSchema.parse(req.body);
      const queue = await storage.createQueue(validatedData);
      
      // Note: XML sync will happen when changes are applied
      console.log(`Created queue: ${queue.name} (pending sync)`);
      
      res.status(201).json(queue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create queue" });
    }
  });

  // Update queue
  app.put("/api/queues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = queueFormSchema.partial().parse(req.body);
      const queue = await storage.updateQueue(id, validatedData);
      if (!queue) {
        return res.status(404).json({ message: "Queue not found" });
      }
      
      // Note: XML sync will happen when changes are applied
      console.log(`Updated queue: ${queue.name} (pending sync)`);
      
      res.json(queue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update queue" });
    }
  });

  // Delete queue
  app.delete("/api/queues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteQueue(id);
      if (!success) {
        return res.status(404).json({ message: "Queue not found" });
      }
      
      // Note: XML sync will happen when changes are applied
      console.log(`Deleted queue ID: ${id} (pending sync)`);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete queue" });
    }
  });

  // Get current config file
  app.get("/api/config", async (req, res) => {
    try {
      const configFile = await storage.getConfigFile();
      if (!configFile) {
        // Try to read from configured path
        const configPath = process.env.FAIR_SCHEDULER_XML_PATH || '/etc/hadoop/conf/fair-scheduler.xml';
        
        try {
          console.log(`Attempting to read config from: ${configPath}`);
          const content = await storage.readConfigFromDisk(configPath);
          const validation = await validateXML(content);
          
          const newConfig = await storage.saveConfigFile({
            filePath: configPath,
            content,
            isValid: validation.isValid,
            lastModified: new Date().toISOString(),
            validationErrors: validation.errors ? JSON.stringify(validation.errors) : null,
          });
          
          // Parse and sync queues from XML if valid
          if (validation.isValid) {
            try {
              const queuesFromXml = await parseQueuesFromXML(content);
              await storage.syncQueuesFromXML(queuesFromXml);
              console.log(`Synchronized ${queuesFromXml.length} queues from XML`);
            } catch (parseError) {
              console.warn("Failed to parse queues from XML:", parseError);
            }
          }
          
          console.log(`Successfully loaded config from disk: ${configPath}`);
          return res.json(newConfig);
        } catch (diskError) {
          console.warn(`Failed to read config from disk (${configPath}):`, diskError);
          // Return default config if file doesn't exist
          const defaultContent = storage.getDefaultXMLContent();
          const newConfig = await storage.saveConfigFile({
            filePath: configPath,
            content: defaultContent,
            isValid: true,
            lastModified: new Date().toISOString(),
            validationErrors: null,
          });
          return res.json(newConfig);
        }
      }
      res.json(configFile);
    } catch (error) {
      console.error("Failed to fetch configuration:", error);
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  // Save config file
  app.post("/api/config", async (req, res) => {
    try {
      const { content, filePath } = req.body;
      
      // Use configured path if no filePath provided
      const targetPath = filePath || process.env.FAIR_SCHEDULER_XML_PATH || '/etc/hadoop/conf/fair-scheduler.xml';
      
      // Validate XML
      const validation = await validateXML(content);
      
      // Save to memory
      const configFile = await storage.saveConfigFile({
        filePath: targetPath,
        content,
        isValid: validation.isValid,
        lastModified: new Date().toISOString(),
        validationErrors: validation.errors ? JSON.stringify(validation.errors) : null,
      });

      // Save to disk and sync queues if valid
      if (validation.isValid) {
        try {
          console.log(`Writing config to disk: ${targetPath}`);
          await storage.writeConfigToDisk(targetPath, content);
          console.log(`Successfully wrote config to: ${targetPath}`);
          
          // Parse and sync queues from XML
          try {
            const queuesFromXml = await parseQueuesFromXML(content);
            await storage.syncQueuesFromXML(queuesFromXml);
            console.log(`Synchronized ${queuesFromXml.length} queues from saved XML`);
          } catch (parseError) {
            console.warn("Failed to parse queues from saved XML:", parseError);
          }
        } catch (diskError) {
          console.error("Failed to write to disk:", diskError);
          return res.status(500).json({ 
            message: "Failed to write configuration to disk", 
            error: diskError instanceof Error ? diskError.message : String(diskError)
          });
        }
      }

      res.json(configFile);
    } catch (error) {
      console.error("Failed to save configuration:", error);
      res.status(500).json({ message: "Failed to save configuration" });
    }
  });

  // Upload config file
  app.post("/api/config/upload", upload.single('configFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const content = req.file.buffer.toString('utf-8');
      const validation = await validateXML(content);

      const configFile = await storage.saveConfigFile({
        filePath: req.file.originalname,
        content,
        isValid: validation.isValid,
        lastModified: new Date().toISOString(),
        validationErrors: validation.errors ? JSON.stringify(validation.errors) : null,
      });

      res.json(configFile);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload configuration" });
    }
  });

  // Download config file
  app.get("/api/config/download", async (req, res) => {
    try {
      const configFile = await storage.getConfigFile();
      if (!configFile) {
        return res.status(404).json({ message: "No configuration file found" });
      }

      res.set({
        'Content-Type': 'application/xml',
        'Content-Disposition': 'attachment; filename="fair-scheduler.xml"'
      });
      res.send(configFile.content);
    } catch (error) {
      res.status(500).json({ message: "Failed to download configuration" });
    }
  });

  // Validate XML
  app.post("/api/config/validate", async (req, res) => {
    try {
      const { content } = req.body;
      const validation = await validateXML(content);
      res.json(validation);
    } catch (error) {
      res.status(500).json({ message: "Failed to validate XML" });
    }
  });

  // Generate XML from queues
  app.get("/api/config/generate", async (req, res) => {
    try {
      console.log('=== GENERATE XML ROUTE CALLED ===');
      const queues = await storage.getQueues();
      console.log('Retrieved queues from storage:', queues.length);
      console.log('Queue details:', queues.map(q => ({ name: q.name, parent: q.parent })));
      const xmlContent = generateXMLFromQueues(queues);
      console.log('Generated XML contains root:', xmlContent.includes('queue name="root"'));
      res.json({ content: xmlContent });
    } catch (error) {
      console.error('Generate XML error:', error);
      res.status(500).json({ message: "Failed to generate XML" });
    }
  });

  // Reload configuration from disk
  app.post("/api/config/reload", async (req, res) => {
    try {
      await storage.reloadFromDisk();
      res.json({ message: "Configuration reloaded from disk successfully" });
    } catch (error) {
      console.error("Failed to reload configuration:", error);
      res.status(500).json({ 
        message: "Failed to reload configuration from disk",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get pending changes count
  app.get("/api/pending-changes", async (req, res) => {
    try {
      const count = await storage.getPendingChangesCount();
      const hasPending = await storage.hasPendingChanges();
      res.json({ count, hasPending });
    } catch (error) {
      res.status(500).json({ message: "Failed to get pending changes" });
    }
  });

  // Apply pending changes
  app.post("/api/pending-changes/apply", async (req, res) => {
    try {
      await storage.applyPendingChanges();
      res.json({ message: "Pending changes applied successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to apply pending changes" });
    }
  });

  // Discard pending changes
  app.post("/api/pending-changes/discard", async (req, res) => {
    try {
      await storage.discardPendingChanges();
      res.json({ message: "Pending changes discarded successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to discard pending changes" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function validateXML(content: string): Promise<{ isValid: boolean; errors?: string[] }> {
  return new Promise((resolve) => {
    parseString(content, { explicitArray: false }, (err: any, result: any) => {
      if (err) {
        resolve({ isValid: false, errors: [err.message] });
        return;
      }

      // Basic schema validation
      const errors: string[] = [];
      
      if (!result.allocations) {
        errors.push("Missing root 'allocations' element");
      }

      // Additional validation rules can be added here
      
      resolve({ isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined });
    });
  });
}



function generateXMLFromQueues(queues: any[]): string {
  console.log('LOCAL generateXMLFromQueues called with', queues.length, 'queues');
  
  // Build hierarchical structure with root queue
  const buildQueueElement = (queue: any, allQueues: any[]): any => {
    const queueElement: any = {
      $: { name: queue.name }
    };

    // Add properties for non-root queues
    if (queue.name !== 'root') {
      if (queue.weight) queueElement.weight = queue.weight;
      if (queue.schedulingPolicy) queueElement.schedulingPolicy = queue.schedulingPolicy;
      
      if (queue.minMemory || queue.minVcores) {
        queueElement.minResources = `${queue.minMemory || 0} mb,${queue.minVcores || 0} vcores`;
      }
      
      if (queue.maxMemory || queue.maxVcores) {
        queueElement.maxResources = `${queue.maxMemory || 0} mb,${queue.maxVcores || 0} vcores`;
      }
      
      if (queue.maxRunningApps) queueElement.maxRunningApps = queue.maxRunningApps;
      if (queue.maxAMShare) queueElement.maxAMShare = queue.maxAMShare;
      if (queue.allowPreemptionFrom) queueElement.allowPreemptionFrom = 'true';
      if (queue.allowPreemptionTo) queueElement.allowPreemptionTo = 'true';
    } else {
      // Root queue properties
      if (queue.weight && queue.weight !== 1) queueElement.weight = queue.weight;
      if (queue.schedulingPolicy && queue.schedulingPolicy !== 'fair') queueElement.schedulingPolicy = queue.schedulingPolicy;
    }

    // Find and add child queues
    const children = allQueues.filter(q => q.parent === queue.name && q.name !== queue.name);
    if (children.length > 0) {
      queueElement.queue = children.map(child => buildQueueElement(child, allQueues));
    }

    return queueElement;
  };

  const allocations: any = {
    $: { xmlns: undefined },
    userMaxAppsDefault: 5,
    defaultQueueSchedulingPolicy: 'fair',
    queuePlacementPolicy: {
      rule: [
        { $: { name: 'specified' } },
        { $: { name: 'user' } },
        { $: { name: 'default', queue: 'default' } }
      ]
    }
  };

  // Find root queue and build hierarchical structure
  const rootQueue = queues.find(q => q.name === 'root');
  if (rootQueue) {
    console.log('Found root queue, building hierarchical structure');
    allocations.queue = buildQueueElement(rootQueue, queues);
  } else {
    console.log('No root queue found, using flat structure');
    // Fallback to flat structure
    allocations.queue = [];
    queues.forEach(queue => {
      if (queue.name === 'root') return;
      allocations.queue.push(buildQueueElement(queue, queues));
    });
  }

  const builder = new Builder({ 
    xmldec: { version: '1.0' },
    renderOpts: { pretty: true, indent: '  ' }
  });
  
  return builder.buildObject({ allocations });
}
