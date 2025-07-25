import type { ClusterMetrics, QueueMetrics, YarnConnection } from '@shared/schema';

export class YarnResourceManagerClient {
  private baseUrl: string;
  private enabled: boolean;

  constructor(connection: YarnConnection) {
    // Use mock endpoints when running on localhost:5000 for testing
    if (connection.resourceManagerHost === 'localhost' && connection.resourceManagerPort === 5000) {
      this.baseUrl = `http://${connection.resourceManagerHost}:${connection.resourceManagerPort}/mock-yarn/ws/v1/cluster`;
    } else {
      this.baseUrl = `http://${connection.resourceManagerHost}:${connection.resourceManagerPort}/ws/v1/cluster`;
    }
    this.enabled = connection.enabled;
  }

  async isConnected(): Promise<boolean> {
    if (!this.enabled) return false;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('YARN RM connection failed:', error);
      return false;
    }
  }

  async getClusterMetrics(): Promise<ClusterMetrics> {
    if (!this.enabled) {
      throw new Error('YARN integration is disabled');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.baseUrl}/metrics`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.clusterMetrics;
    } catch (error) {
      console.error('Failed to fetch cluster metrics:', error);
      throw new Error(`Failed to fetch cluster metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSchedulerInfo(): Promise<any> {
    if (!this.enabled) {
      throw new Error('YARN integration is disabled');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.baseUrl}/scheduler`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.schedulerInfo;
    } catch (error) {
      console.error('Failed to fetch scheduler info:', error);
      throw new Error(`Failed to fetch scheduler info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getQueueMetrics(queueName?: string): Promise<QueueMetrics[]> {
    const schedulerInfo = await this.getSchedulerInfo();
    
    if (queueName) {
      const queue = this.findQueueInHierarchy(schedulerInfo, queueName);
      return queue ? [queue] : [];
    }

    return this.extractAllQueues(schedulerInfo);
  }

  private findQueueInHierarchy(schedulerInfo: any, queueName: string): QueueMetrics | null {
    if (schedulerInfo.queueName === queueName) {
      return this.formatQueueMetrics(schedulerInfo);
    }

    if (schedulerInfo.queues?.queue) {
      for (const queue of schedulerInfo.queues.queue) {
        const found = this.findQueueInHierarchy(queue, queueName);
        if (found) return found;
      }
    }

    return null;
  }

  private extractAllQueues(schedulerInfo: any): QueueMetrics[] {
    const queues: QueueMetrics[] = [];
    
    if (!schedulerInfo) {
      return queues;
    }
    
    // Add current queue if it has a valid queueName
    if (schedulerInfo.queueName || schedulerInfo.name) {
      queues.push(this.formatQueueMetrics(schedulerInfo));
    }

    // Recursively add child queues
    if (schedulerInfo.queues?.queue) {
      const childQueues = Array.isArray(schedulerInfo.queues.queue) 
        ? schedulerInfo.queues.queue 
        : [schedulerInfo.queues.queue];
        
      for (const childQueue of childQueues) {
        if (childQueue) {
          queues.push(...this.extractAllQueues(childQueue));
        }
      }
    }

    return queues;
  }

  private formatQueueMetrics(queueData: any): QueueMetrics {
    if (!queueData) {
      throw new Error('Queue data is undefined or null');
    }
    
    return {
      queueName: queueData.queueName || queueData.name || 'unknown',
      capacity: parseFloat(queueData.capacity) || 0,
      usedCapacity: parseFloat(queueData.usedCapacity) || 0,
      maxCapacity: parseFloat(queueData.maxCapacity) || 0,
      absoluteCapacity: parseFloat(queueData.absoluteCapacity) || 0,
      absoluteUsedCapacity: parseFloat(queueData.absoluteUsedCapacity) || 0,
      numApplications: parseInt(queueData.numApplications) || 0,
      resourcesUsed: {
        memory: parseInt(queueData.resourcesUsed?.memory) || 0,
        vCores: parseInt(queueData.resourcesUsed?.vCores) || 0,
      },
      queues: queueData.queues ? {
        queue: queueData.queues.queue?.map((q: any) => this.formatQueueMetrics(q)) || []
      } : undefined,
    };
  }

  async getApplicationsByQueue(queueName: string): Promise<any[]> {
    if (!this.enabled) {
      throw new Error('YARN integration is disabled');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.baseUrl}/apps?queue=${encodeURIComponent(queueName)}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.apps?.app || [];
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      throw new Error(`Failed to fetch applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}