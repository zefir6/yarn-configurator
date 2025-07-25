import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Layers, 
  MemoryStick, 
  Cpu, 
  Scale, 
  FolderOpen, 
  Folder, 
  Edit, 
  Plus,
  Eye
} from "lucide-react";
import { formatEuropeanDateTime } from "@/lib/date-utils";
import { YarnSummary } from "@/components/yarn-summary";
import type { Queue, QueueMetrics } from "@shared/schema";

interface OverviewProps {
  onEditQueue?: (queueId: number) => void;
  onSwitchToQueues?: () => void;
}

export default function Overview({ onEditQueue, onSwitchToQueues }: OverviewProps) {
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: queues = [], isLoading } = useQuery<Queue[]>({
    queryKey: ["/api/queues"],
  });

  const { data: queueMetrics = [] } = useQuery<QueueMetrics[]>({
    queryKey: ["/api/yarn/queue-metrics"],
    refetchInterval: 30000,
    retry: false,
  });

  const { data: config } = useQuery<{
    id: number;
    filePath: string;
    lastModified?: string;
    isValid: boolean;
  }>({
    queryKey: ["/api/config"],
  });

  // Calculate statistics
  const stats = {
    totalQueues: queues.length,
    totalMemory: queues.reduce((sum, q) => sum + (q.maxMemory || 0), 0),
    totalVCores: queues.reduce((sum, q) => sum + (q.maxVcores || 0), 0),
    defaultPolicy: "Fair",
  };

  const formatMemory = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(0)} GB`;
    }
    return `${mb} MB`;
  };

  const getRootQueues = () => {
    return queues.filter(q => q.parent === "root" && q.name !== "root");
  };

  const getQueueMetrics = (queueName: string): QueueMetrics | undefined => {
    return queueMetrics.find(m => m.queueName === queueName);
  };

  const handleViewQueue = (queue: Queue) => {
    setSelectedQueue(queue);
    setIsDetailsOpen(true);
  };

  const handleEditQueue = (queue: Queue) => {
    if (onEditQueue) {
      onEditQueue(queue.id);
    }
    if (onSwitchToQueues) {
      onSwitchToQueues();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* YARN Summary */}
      <YarnSummary />
      
      {/* Configuration Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Layers className="h-8 w-8 text-carbon-blue" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-carbon-gray-50">Total Queues</p>
                <p className="text-2xl font-semibold text-carbon-gray-70">{stats.totalQueues}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MemoryStick className="h-8 w-8 text-carbon-success" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-carbon-gray-50">Total Memory</p>
                <p className="text-2xl font-semibold text-carbon-gray-70">
                  {stats.totalMemory > 0 ? formatMemory(stats.totalMemory) : "Unlimited"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Cpu className="h-8 w-8 text-carbon-warning" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-carbon-gray-50">Total vCores</p>
                <p className="text-2xl font-semibold text-carbon-gray-70">
                  {stats.totalVCores > 0 ? stats.totalVCores : "Unlimited"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Scale className="h-8 w-8 text-carbon-purple" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-carbon-gray-50">Default Policy</p>
                <p className="text-2xl font-semibold text-carbon-gray-70">{stats.defaultPolicy}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Queue Hierarchy Visualization */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-carbon-gray-70">Queue Hierarchy</CardTitle>
          <p className="text-sm text-carbon-gray-50 mt-1">
            Visual representation of your queue structure
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Root Queue */}
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <FolderOpen className="text-carbon-blue w-5 h-5" />
                <span className="font-medium text-carbon-gray-70">root</span>
                <Badge variant="secondary" className="bg-carbon-gray-10 text-carbon-gray-50">
                  Weight: 1.0
                </Badge>
              </div>
            </div>

            {/* Child Queues */}
            <div className="ml-6 space-y-3">
              {getRootQueues().map((queue) => {
                const metrics = getQueueMetrics(queue.name);
                return (
                  <div
                    key={queue.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <Folder className="text-carbon-blue w-5 h-5" />
                      <span className="font-medium text-carbon-gray-70">{queue.name}</span>
                      <Badge variant="secondary" className="bg-blue-100 text-carbon-blue">
                        Weight: {queue.weight}
                      </Badge>
                      {metrics && (
                        <>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                            Used: {Math.round(metrics.usedCapacity)}%
                          </Badge>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                            Apps: {metrics.numApplications}
                          </Badge>
                          {metrics.resourcesUsed && (metrics.resourcesUsed.memory > 0 || metrics.resourcesUsed.vCores > 0) && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                              {formatMemory(metrics.resourcesUsed.memory)}, {metrics.resourcesUsed.vCores} vCores
                            </Badge>
                          )}
                        </>
                      )}
                      {(queue.maxMemory || queue.maxVcores) && (
                        <Badge variant="secondary" className="bg-green-100 text-carbon-success">
                          Max: {queue.maxMemory ? formatMemory(queue.maxMemory) : "∞"}, {queue.maxVcores || "∞"} vCores
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewQueue(queue)}
                        title="View queue details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditQueue(queue)}
                        title="Edit queue configuration"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Folder className="w-5 h-5 text-carbon-blue" />
              <span>Queue Details: {selectedQueue?.name}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedQueue && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-carbon-gray-50">Queue Name</label>
                  <p className="text-base text-carbon-gray-70">{selectedQueue.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-carbon-gray-50">Parent Queue</label>
                  <p className="text-base text-carbon-gray-70">{selectedQueue.parent || "root"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-carbon-gray-50">Weight</label>
                  <p className="text-base text-carbon-gray-70">{selectedQueue.weight || "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-carbon-gray-50">Scheduling Policy</label>
                  <p className="text-base text-carbon-gray-70">{selectedQueue.schedulingPolicy || "fair"}</p>
                </div>
              </div>

              {/* Resource Limits */}
              <div>
                <h4 className="text-sm font-medium text-carbon-gray-70 mb-3">Resource Limits</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-carbon-gray-50">Min Memory</label>
                    <p className="text-base text-carbon-gray-70">
                      {selectedQueue.minMemory ? formatMemory(selectedQueue.minMemory) : "Not set"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-carbon-gray-50">Min vCores</label>
                    <p className="text-base text-carbon-gray-70">{selectedQueue.minVcores || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-carbon-gray-50">Max Memory</label>
                    <p className="text-base text-carbon-gray-70">
                      {selectedQueue.maxMemory ? formatMemory(selectedQueue.maxMemory) : "Not set"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-carbon-gray-50">Max vCores</label>
                    <p className="text-base text-carbon-gray-70">{selectedQueue.maxVcores || "Not set"}</p>
                  </div>
                </div>
              </div>

              {/* Application Limits */}
              <div>
                <h4 className="text-sm font-medium text-carbon-gray-70 mb-3">Application Limits</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-carbon-gray-50">Max Running Apps</label>
                    <p className="text-base text-carbon-gray-70">{selectedQueue.maxRunningApps || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-carbon-gray-50">Max AM Share</label>
                    <p className="text-base text-carbon-gray-70">{selectedQueue.maxAMShare || "Not set"}</p>
                  </div>
                </div>
              </div>

              {/* Preemption Settings */}
              <div>
                <h4 className="text-sm font-medium text-carbon-gray-70 mb-3">Preemption Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-carbon-gray-50">Allow Preemption From</label>
                    <p className="text-base text-carbon-gray-70">
                      {selectedQueue.allowPreemptionFrom ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-carbon-gray-50">Allow Preemption To</label>
                    <p className="text-base text-carbon-gray-70">
                      {selectedQueue.allowPreemptionTo ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setIsDetailsOpen(false);
                    handleEditQueue(selectedQueue);
                  }}
                  className="bg-carbon-blue hover:bg-blue-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Queue
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}