import { parseString } from 'xml2js';

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

export function generateXMLFromQueues(queues: any[]): string {
  // FORCE DEBUG OUTPUT TO CONSOLE
  console.log('>>> XML GENERATION FUNCTION CALLED WITH', queues.length, 'QUEUES <<<');
  
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
      
      if (queue.allowPreemptionFrom === true) {
        queueXml += `${indent}  <allowPreemptionFrom>true</allowPreemptionFrom>\n`;
      }
      
      if (queue.allowPreemptionTo === true) {
        queueXml += `${indent}  <allowPreemptionTo>true</allowPreemptionTo>\n`;
      }
    } else {
      // For root queue, add minimal properties if needed
      if (queue.weight && queue.weight !== 1) {
        queueXml += `${indent}  <weight>${queue.weight}</weight>\n`;
      }
      if (queue.schedulingPolicy && queue.schedulingPolicy !== 'fair') {
        queueXml += `${indent}  <schedulingPolicy>${queue.schedulingPolicy}</schedulingPolicy>\n`;
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
  
  // Add global settings
  xml += `\n  <userMaxAppsDefault>5</userMaxAppsDefault>\n`;
  xml += `  <defaultQueueSchedulingPolicy>fair</defaultQueueSchedulingPolicy>\n\n`;
  
  xml += `  <queuePlacementPolicy>\n`;
  xml += `    <rule name="specified"/>\n`;
  xml += `    <rule name="user"/>\n`;
  xml += `    <rule name="default" queue="default"/>\n`;
  xml += `  </queuePlacementPolicy>\n`;
  
  xml += `</allocations>`;
  
  return xml;
}