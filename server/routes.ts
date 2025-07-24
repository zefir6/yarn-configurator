import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { queueFormSchema, insertConfigFileSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as path from "path";
import { parseString, Builder } from "xml2js";

const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
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
        // Try to read from default location
        const defaultPath = process.env.HADOOP_CONF_DIR 
          ? path.join(process.env.HADOOP_CONF_DIR, 'fair-scheduler.xml')
          : '/etc/hadoop/conf/fair-scheduler.xml';
        
        try {
          const content = await storage.readConfigFromDisk(defaultPath);
          const newConfig = await storage.saveConfigFile({
            filePath: defaultPath,
            content,
            isValid: true,
            lastModified: new Date().toISOString(),
            validationErrors: null,
          });
          return res.json(newConfig);
        } catch (diskError) {
          return res.status(404).json({ message: "No configuration file found" });
        }
      }
      res.json(configFile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  // Save config file
  app.post("/api/config", async (req, res) => {
    try {
      const { content, filePath } = req.body;
      
      // Validate XML
      const validation = await validateXML(content);
      
      // Save to memory
      const configFile = await storage.saveConfigFile({
        filePath: filePath || '/etc/hadoop/conf/fair-scheduler.xml',
        content,
        isValid: validation.isValid,
        lastModified: new Date().toISOString(),
        validationErrors: validation.errors ? JSON.stringify(validation.errors) : null,
      });

      // Save to disk if valid
      if (validation.isValid) {
        try {
          await storage.writeConfigToDisk(configFile.filePath, content);
        } catch (diskError) {
          console.warn("Failed to write to disk:", diskError);
          // Still return success for memory storage
        }
      }

      res.json(configFile);
    } catch (error) {
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
      const queues = await storage.getQueues();
      const xmlContent = generateXMLFromQueues(queues);
      res.json({ content: xmlContent });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate XML" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function validateXML(content: string): Promise<{ isValid: boolean; errors?: string[] }> {
  return new Promise((resolve) => {
    parseString(content, { explicitArray: false }, (err, result) => {
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
  const allocations: any = {
    $: { xmlns: undefined },
    queue: [],
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

  queues.forEach(queue => {
    if (queue.name === 'root') return; // Skip root queue in XML

    const queueElement: any = {
      $: { name: queue.name }
    };

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

    allocations.queue.push(queueElement);
  });

  const builder = new Builder({ 
    xmldec: { version: '1.0' },
    renderOpts: { pretty: true, indent: '  ' }
  });
  
  return builder.buildObject({ allocations });
}
