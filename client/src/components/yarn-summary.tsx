import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Server, HardDrive, Cpu, Activity, AlertTriangle } from "lucide-react";
import type { ClusterMetrics, QueueMetrics } from "@shared/schema";

export function YarnSummary() {
  const { data: clusterMetrics, error: clusterError } = useQuery<ClusterMetrics>({
    queryKey: ["/api/yarn/cluster-metrics"],
    refetchInterval: 30000,
    retry: false,
  });

  const { data: queueMetrics, error: queueError } = useQuery<QueueMetrics[]>({
    queryKey: ["/api/yarn/queue-metrics"],
    refetchInterval: 30000,
    retry: false,
  });

  const formatMemoryMB = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  const formatPercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  // If YARN integration is disabled, show a notice
  if (clusterError && queueError) {
    return (
      <Card className="border border-yellow-200 bg-yellow-50 shadow-sm">
        <CardHeader className="border-b border-yellow-200">
          <CardTitle className="text-lg font-medium text-yellow-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            YARN Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 mb-1">YARN Resource Manager not connected</p>
              <p className="text-xs text-yellow-600">
                Configure YARN connection in Settings to view live cluster metrics and queue utilization
              </p>
            </div>
            <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
              Disconnected
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="text-lg font-medium text-carbon-gray-70 flex items-center gap-2">
          <Activity className="h-5 w-5 text-carbon-blue" />
          YARN Cluster Status
        </CardTitle>
        <p className="text-sm text-carbon-gray-50 mt-1">
          Real-time cluster metrics and queue utilization
        </p>
      </CardHeader>
      <CardContent className="p-6">
        {clusterMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Memory</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(clusterMetrics.allocatedMB, clusterMetrics.totalMB)}%
                </span>
              </div>
              <Progress 
                value={formatPercentage(clusterMetrics.allocatedMB, clusterMetrics.totalMB)} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">
                {formatMemoryMB(clusterMetrics.allocatedMB)} of {formatMemoryMB(clusterMetrics.totalMB)}
              </p>
            </div>

            {/* CPU Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">CPU</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(
                    clusterMetrics.totalVirtualCores - clusterMetrics.availableVirtualCores,
                    clusterMetrics.totalVirtualCores
                  )}%
                </span>
              </div>
              <Progress 
                value={formatPercentage(
                  clusterMetrics.totalVirtualCores - clusterMetrics.availableVirtualCores,
                  clusterMetrics.totalVirtualCores
                )} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">
                {clusterMetrics.totalVirtualCores - clusterMetrics.availableVirtualCores} of {clusterMetrics.totalVirtualCores} vCores
              </p>
            </div>

            {/* Applications */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Applications</span>
                </div>
                <div className="flex gap-1">
                  <Badge variant="default" className="text-xs">{clusterMetrics.appsRunning}</Badge>
                  <Badge variant="secondary" className="text-xs">{clusterMetrics.appsPending}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {clusterMetrics.appsRunning} running, {clusterMetrics.appsPending} pending
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-4 text-muted-foreground mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm">YARN cluster metrics unavailable</span>
          </div>
        )}

        {/* Queue Summary */}
        {queueMetrics && queueMetrics.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-carbon-gray-70">Queue Utilization Summary</h4>
            <div className="space-y-2">
              {queueMetrics
                .filter(q => q.queueName !== "root")
                .slice(0, 5)
                .map((queue) => (
                <div key={queue.queueName} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{queue.queueName}</span>
                    <Badge variant="outline" className="text-xs">
                      {queue.numApplications} apps
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded">
                      <div 
                        className="h-full bg-primary rounded" 
                        style={{ width: `${Math.min(queue.usedCapacity, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {Math.round(queue.usedCapacity)}%
                    </span>
                  </div>
                </div>
              ))}
              {queueMetrics.filter(q => q.queueName !== "root").length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  ...and {queueMetrics.filter(q => q.queueName !== "root").length - 5} more queues
                </p>
              )}
            </div>
          </div>
        ) : queueError ? (
          <div className="flex items-center gap-2 p-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm">Queue metrics unavailable</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}