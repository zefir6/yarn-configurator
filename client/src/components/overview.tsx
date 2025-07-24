import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Layers, 
  MemoryStick, 
  Cpu, 
  Scale, 
  FolderOpen, 
  Folder, 
  Edit, 
  Plus 
} from "lucide-react";
import type { Queue } from "@shared/schema";

export default function Overview() {
  const { data: queues = [], isLoading } = useQuery<Queue[]>({
    queryKey: ["/api/queues"],
  });

  const { data: config } = useQuery({
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
                  {formatMemory(stats.totalMemory)}
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
                <p className="text-2xl font-semibold text-carbon-gray-70">{stats.totalVCores}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Scale className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-carbon-gray-50">Default Policy</p>
                <p className="text-lg font-semibold text-carbon-gray-70">{stats.defaultPolicy}</p>
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
              {getRootQueues().map((queue) => (
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
                    {(queue.maxMemory || queue.maxVcores) && (
                      <Badge variant="secondary" className="bg-green-100 text-carbon-success">
                        Max: {queue.maxMemory ? formatMemory(queue.maxMemory) : "∞"}, {queue.maxVcores || "∞"} vCores
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" className="border-carbon-blue text-carbon-blue hover:bg-blue-50">
              <Plus className="w-4 h-4 mr-2" />
              Add New Queue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-carbon-gray-70">
            Recent Configuration Changes
          </CardTitle>
          <p className="text-sm text-carbon-gray-50 mt-1">
            Track modifications to your scheduler configuration
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {config?.lastModified ? (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-carbon-success rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-carbon-gray-70">
                    Configuration file was last modified
                  </p>
                  <p className="text-xs text-carbon-gray-50 mt-1">
                    {new Date(config.lastModified).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-carbon-gray-50">No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
