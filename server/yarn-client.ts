import type { ClusterMetrics, QueueMetrics, YarnConnection } from '@shared/schema';

export class YarnResourceManagerClient {
  private baseUrl: string;
  private enabled: boolean;

  constructor(connection: YarnConnection) {
    this.baseUrl = `http://${connection.resourceManagerHost}:${connection.resourceManagerPort}/ws/v1/cluster`;
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
    
    // Add current queue if it has metrics
    if (schedulerInfo.queueName) {
      queues.push(this.formatQueueMetrics(schedulerInfo));
    }

    // Recursively add child queues
    if (schedulerInfo.queues?.queue) {
      for (const childQueue of schedulerInfo.queues.queue) {
        queues.push(...this.extractAllQueues(childQueue));
      }
    }

    return queues;
  }

  private formatQueueMetrics(queueData: any): QueueMetrics {
    return {
      queueName: queueData.queueName || '',
      capacity: queueData.capacity || 0,
      usedCapacity: queueData.usedCapacity || 0,
      maxCapacity: queueData.maxCapacity || 0,
      absoluteCapacity: queueData.absoluteCapacity,
      absoluteUsedCapacity: queueData.absoluteUsedCapacity,
      numApplications: queueData.numApplications || 0,
      resourcesUsed: {
        memory: queueData.resourcesUsed?.memory || 0,
        vCores: queueData.resourcesUsed?.vCores || 0,
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