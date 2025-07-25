import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Server, Cpu, HardDrive, Activity, AlertTriangle } from "lucide-react";
import type { ClusterMetrics } from "@shared/schema";

export function ClusterMetrics() {
  const { data: metrics, isLoading, error, refetch } = useQuery<ClusterMetrics>({
    queryKey: ["/api/yarn/cluster-metrics"],
    refetchInterval: 30000, // Refresh every 30 seconds
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Cluster Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">Loading cluster metrics...</span>
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
            <Server className="h-5 w-5" />
            Cluster Metrics
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

  if (!metrics) {
    return null;
  }

  const memoryUsagePercent = formatPercentage(metrics.allocatedMB, metrics.totalMB);
  const vcoreUsagePercent = formatPercentage(
    metrics.totalVirtualCores - metrics.availableVirtualCores,
    metrics.totalVirtualCores
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Memory Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatMemoryMB(metrics.allocatedMB)}</div>
          <p className="text-xs text-muted-foreground">
            of {formatMemoryMB(metrics.totalMB)} total
          </p>
          <div className="mt-2">
            <Progress value={memoryUsagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{memoryUsagePercent}% used</p>
          </div>
        </CardContent>
      </Card>

      {/* CPU Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
          <Cpu className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.totalVirtualCores - metrics.availableVirtualCores}
          </div>
          <p className="text-xs text-muted-foreground">
            of {metrics.totalVirtualCores} vCores
          </p>
          <div className="mt-2">
            <Progress value={vcoreUsagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{vcoreUsagePercent}% used</p>
          </div>
        </CardContent>
      </Card>

      {/* Applications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Applications</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.appsRunning}</div>
          <p className="text-xs text-muted-foreground">running</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {metrics.appsPending} pending
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Cluster Nodes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cluster Nodes</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalNodes}</div>
          <p className="text-xs text-muted-foreground">active nodes</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {metrics.containersReserved} containers reserved
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}