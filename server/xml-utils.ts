import { parseString } from 'xml2js';

export async function parseGlobalConfigFromXML(content: string): Promise<any> {
  return new Promise((resolve, reject) => {
    parseString(content, { explicitArray: false }, (err: any, result: any) => {
      if (err) {
        reject(err);
        return;
      }

      const globalConfig: any = {
        id: 1,
        defaultQueueSchedulingPolicy: "fair",
        userMaxAppsDefault: 5,
        queueMaxAppsDefault: null,
        queueMaxAMShareDefault: null,
        queuePlacementRules: "specified,user,default",
        defaultQueue: "default",
      };

      if (!result.allocations) {
        resolve(globalConfig);
        return;
      }

      // Parse global configuration elements
      if (result.allocations.defaultQueueSchedulingPolicy) {
        globalConfig.defaultQueueSchedulingPolicy = result.allocations.defaultQueueSchedulingPolicy;
      }

      if (result.allocations.userMaxAppsDefault) {
        globalConfig.userMaxAppsDefault = parseInt(result.allocations.userMaxAppsDefault);
      }

      if (result.allocations.queueMaxAppsDefault) {
        globalConfig.queueMaxAppsDefault = parseInt(result.allocations.queueMaxAppsDefault);
      }

      if (result.allocations.queueMaxAMShareDefault) {
        globalConfig.queueMaxAMShareDefault = parseFloat(result.allocations.queueMaxAMShareDefault);
      }

      // Parse queue placement policy
      if (result.allocations.queuePlacementPolicy && result.allocations.queuePlacementPolicy.rule) {
        const rules = Array.isArray(result.allocations.queuePlacementPolicy.rule) 
          ? result.allocations.queuePlacementPolicy.rule 
          : [result.allocations.queuePlacementPolicy.rule];
        
        const ruleNames = rules.map((rule: any) => {
          if (rule.$ && rule.$.name === 'default' && rule.$.queue) {
            globalConfig.defaultQueue = rule.$.queue;
            return 'default';
          }
          return rule.$ ? rule.$.name : rule;
        });
        
        globalConfig.queuePlacementRules = ruleNames.join(',');
      }

      resolve(globalConfig);
    });
  });
}

export async function parseQueuesFromXML(content: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    parseString(content, { explicitArray: false }, (err: any, result: any) => {
      if (err) {
        reject(err);
        return;
      }

      const queues: any[] = [];
      
      if (!result.allocations) {
        resolve(queues);
        return;
      }

      // Add root queue (only if we have actual queues to parse)
      let hasQueues = false;
      if (result.allocations.queue) {
        hasQueues = true;
      }
      
      if (hasQueues) {
        queues.push({
          name: "root",
          parent: null,
          weight: 1.0,
          schedulingPolicy: "fair"
        });
      }

      // Parse queues from XML
      const processQueue = (queueXml: any, parentName: string = "root") => {
        if (!queueXml) return;

        const queueName = queueXml.$ ? queueXml.$.name : null;
        if (!queueName) return;

        const queue: any = {
          name: queueName,
          parent: parentName,
          weight: parseFloat(queueXml.weight) || 1.0,
          schedulingPolicy: queueXml.schedulingPolicy || "fair"
        };

        // Parse resource limits
        if (queueXml.minResources) {
          const minRes = queueXml.minResources.match(/(\d+)\s*mb.*?(\d+)\s*vcores/i);
          if (minRes) {
            queue.minMemory = parseInt(minRes[1]);
            queue.minVcores = parseInt(minRes[2]);
          }
        }

        if (queueXml.maxResources) {
          const maxRes = queueXml.maxResources.match(/(\d+)\s*mb.*?(\d+)\s*vcores/i);
          if (maxRes) {
            queue.maxMemory = parseInt(maxRes[1]);
            queue.maxVcores = parseInt(maxRes[2]);
          }
        }

        if (queueXml.maxRunningApps) {
          queue.maxRunningApps = parseInt(queueXml.maxRunningApps);
        }

        if (queueXml.maxAMShare) {
          queue.maxAMShare = parseFloat(queueXml.maxAMShare);
        }

        if (queueXml.allowPreemptionFrom) {
          queue.allowPreemptionFrom = queueXml.allowPreemptionFrom === 'true';
        }

        if (queueXml.allowPreemptionTo) {
          queue.allowPreemptionTo = queueXml.allowPreemptionTo === 'true';
        }

        queues.push(queue);

        // Process nested queues
        if (queueXml.queue) {
          const nestedQueues = Array.isArray(queueXml.queue) ? queueXml.queue : [queueXml.queue];
          nestedQueues.forEach((nestedQueue: any) => processQueue(nestedQueue, queueName));
        }
      };

      // Process all queues
      if (result.allocations.queue) {
        const queueList = Array.isArray(result.allocations.queue) ? result.allocations.queue : [result.allocations.queue];
        queueList.forEach((queue: any) => processQueue(queue));
      }

      resolve(queues);
    });
  });
}

export function generateXMLFromQueues(queues: any[], globalConfig?: any): string {
  // FORCE DEBUG OUTPUT TO CONSOLE
  console.log('>>> XML-UTILS generateXMLFromQueues called with', queues.length, 'queues');
  console.log('Queue allowPreemptionFrom values:', queues.map(q => ({ name: q.name, allowPreemptionFrom: q.allowPreemptionFrom })));
  
  let xml = '<?xml version="1.0"?>\n<allocations>\n';
  
  // Build a hierarchy map for easier processing
  const queueMap = new Map();
  const childrenMap = new Map();
  
  // Initialize maps
  queues.forEach(queue => {
    queueMap.set(queue.name, queue);
    childrenMap.set(queue.name, []);
  });
  
  // Build parent-child relationships
  queues.forEach(queue => {
    if (queue.parent && childrenMap.has(queue.parent)) {
      childrenMap.get(queue.parent).push(queue);
    }
  });
  
  // Function to generate queue XML recursively
  const generateQueueXML = (queue: any, depth: number = 1): string => {
    const indent = '  '.repeat(depth);
    let queueXml = `${indent}<queue name="${queue.name}">\n`;
    
    // Add queue properties (but skip them for root queue to keep it clean)
    if (queue.name !== 'root') {
      if (queue.weight !== null && queue.weight !== undefined) {
        queueXml += `${indent}  <weight>${queue.weight}</weight>\n`;
      }
      
      if (queue.schedulingPolicy) {
        queueXml += `${indent}  <schedulingPolicy>${queue.schedulingPolicy}</schedulingPolicy>\n`;
      }
      
      // Generate minResources
      if (queue.minMemory || queue.minVcores) {
        const minParts = [];
        if (queue.minMemory) minParts.push(`${queue.minMemory} mb`);
        if (queue.minVcores) minParts.push(`${queue.minVcores} vcores`);
        queueXml += `${indent}  <minResources>${minParts.join(',')}</minResources>\n`;
      }
      
      // Generate maxResources
      if (queue.maxMemory || queue.maxVcores) {
        const maxParts = [];
        if (queue.maxMemory) maxParts.push(`${queue.maxMemory} mb`);
        if (queue.maxVcores) maxParts.push(`${queue.maxVcores} vcores`);
        queueXml += `${indent}  <maxResources>${maxParts.join(',')}</maxResources>\n`;
      }
      
      if (queue.maxRunningApps) {
        queueXml += `${indent}  <maxRunningApps>${queue.maxRunningApps}</maxRunningApps>\n`;
      }
      
      if (queue.maxAMShare) {
        queueXml += `${indent}  <maxAMShare>${queue.maxAMShare}</maxAMShare>\n`;
      }
      
      // Preemption settings (always include explicit value for allowPreemptionFrom)
      const allowPreemptionFrom = queue.allowPreemptionFrom !== null ? queue.allowPreemptionFrom : false;
      queueXml += `${indent}  <allowPreemptionFrom>${allowPreemptionFrom ? 'true' : 'false'}</allowPreemptionFrom>\n`;
      
      // Only include allowPreemptionTo if explicitly set
      if (queue.allowPreemptionTo !== null && queue.allowPreemptionTo !== undefined) {
        queueXml += `${indent}  <allowPreemptionTo>${queue.allowPreemptionTo ? 'true' : 'false'}</allowPreemptionTo>\n`;
      }
      
      // ACL settings (provide defaults if not specified)
      const aclSubmitApps = queue.aclSubmitApps || "*";
      const aclAdministerApps = queue.aclAdministerApps || "*";
      
      // Only include ACLs if they're not the default "*" value
      if (aclSubmitApps && aclSubmitApps !== "*") {
        queueXml += `${indent}  <aclSubmitApps>${aclSubmitApps}</aclSubmitApps>\n`;
      }
      if (aclAdministerApps && aclAdministerApps !== "*") {
        queueXml += `${indent}  <aclAdministerApps>${aclAdministerApps}</aclAdministerApps>\n`;
      }
    } else {
      // For root queue, add properties
      if (queue.weight && queue.weight !== 1) {
        queueXml += `${indent}  <weight>${queue.weight}</weight>\n`;
      }
      if (queue.schedulingPolicy) {
        queueXml += `${indent}  <schedulingPolicy>${queue.schedulingPolicy}</schedulingPolicy>\n`;
      }
      
      // Preemption settings for root queue too
      const allowPreemptionFrom = queue.allowPreemptionFrom !== null ? queue.allowPreemptionFrom : false;
      queueXml += `${indent}  <allowPreemptionFrom>${allowPreemptionFrom ? 'true' : 'false'}</allowPreemptionFrom>\n`;
      
      if (queue.allowPreemptionTo !== null && queue.allowPreemptionTo !== undefined) {
        queueXml += `${indent}  <allowPreemptionTo>${queue.allowPreemptionTo ? 'true' : 'false'}</allowPreemptionTo>\n`;
      }
    }
    
    // Add child queues
    const children = childrenMap.get(queue.name) || [];
    children.forEach((child: any) => {
      queueXml += generateQueueXML(child, depth + 1);
    });
    
    queueXml += `${indent}</queue>\n`;
    return queueXml;
  };
  
  // Find root queue and generate hierarchical structure
  const rootQueue = queueMap.get('root');
  
  // DEBUG: Force check what we have in the map
  console.log('Available queue names in map:', Array.from(queueMap.keys()));
  console.log('Root queue search result:', rootQueue ? 'FOUND' : 'NOT FOUND');
  
  if (rootQueue) {
    console.log('Generating hierarchical XML with root queue');
    xml += generateQueueXML(rootQueue);
  } else {
    console.log('Falling back to flat structure - no root queue found');
    // Fallback: generate top-level queues without root
    const topLevelQueues = queues.filter(q => !q.parent || q.parent === null);
    topLevelQueues.forEach((queue: any) => {
      xml += generateQueueXML(queue);
    });
  }
  
  // Add global settings using configuration or defaults
  const userMaxApps = globalConfig?.userMaxAppsDefault || 5;
  const defaultPolicy = globalConfig?.defaultQueueSchedulingPolicy || "fair";
  const placementRules = globalConfig?.queuePlacementRules || "specified,user,default";
  const defaultQueue = globalConfig?.defaultQueue || "default";
  
  xml += `\n  <userMaxAppsDefault>${userMaxApps}</userMaxAppsDefault>\n`;
  xml += `  <defaultQueueSchedulingPolicy>${defaultPolicy}</defaultQueueSchedulingPolicy>\n\n`;
  
  xml += `  <queuePlacementPolicy>\n`;
  
  // Parse placement rules and generate rule elements
  const rules = placementRules.split(',').map((rule: string) => rule.trim());
  rules.forEach((rule: string) => {
    if (rule === 'default') {
      xml += `    <rule name="default" queue="${defaultQueue}"/>\n`;
    } else {
      xml += `    <rule name="${rule}"/>\n`;
    }
  });
  
  xml += `  </queuePlacementPolicy>\n`;
  
  xml += `</allocations>`;
  
  return xml;
}