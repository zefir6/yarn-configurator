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