import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, BarChart3, AlertTriangle } from "lucide-react";
import type { QueueMetrics } from "@shared/schema";

export function QueueMetrics() {
  const { data: queueMetrics, isLoading, error } = useQuery<QueueMetrics[]>({
    queryKey: ["/api/yarn/queue-metrics"],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false,
  });

  const formatPercentage = (value: number) => {
    return Math.round(value * 100) / 100;
  };

  const getUtilizationColor = (usedCapacity: number) => {
    if (usedCapacity >= 90) return "text-red-600";
    if (usedCapacity >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Queue Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">Loading queue metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Queue Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 text-muted-foreground">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm">
              YARN integration disabled or Resource Manager unreachable
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!queueMetrics || queueMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Queue Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 text-muted-foreground">
            <p className="text-sm">No queue metrics available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter out root queue for display to focus on meaningful queues
  const displayQueues = queueMetrics.filter(q => q.queueName !== "root");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Queue Utilization
        </CardTitle>
        <CardDescription>
          Real-time utilization metrics from YARN Resource Manager
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayQueues.map((queue) => (
            <div key={queue.queueName} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{queue.queueName}</h4>
                  <Badge variant="outline" className="text-xs">
                    {queue.numApplications} apps
                  </Badge>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${getUtilizationColor(queue.usedCapacity)}`}>
                    {formatPercentage(queue.usedCapacity)}%
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    of {formatPercentage(queue.capacity)}%
                  </span>
                </div>
              </div>
              
              <Progress value={queue.usedCapacity} className="h-2" />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Memory: {queue.resourcesUsed.memory} MB | 
                  vCores: {queue.resourcesUsed.vCores}
                </span>
                <span>
                  Max: {formatPercentage(queue.maxCapacity)}%
                </span>
              </div>
            </div>
          ))}
          
          {displayQueues.length === 0 && (
            <div className="text-center p-4 text-muted-foreground">
              <p className="text-sm">Only root queue found - configure child queues for detailed metrics</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}