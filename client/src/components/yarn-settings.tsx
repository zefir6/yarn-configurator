import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, RefreshCw, Settings } from "lucide-react";
import { yarnConnectionSchema, type YarnConnection } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function YarnSettings() {
  const { toast } = useToast();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; error?: string } | null>(null);

  const { data: connection, isLoading } = useQuery({
    queryKey: ["/api/yarn/connection"],
  });

  const form = useForm<YarnConnection>({
    resolver: zodResolver(yarnConnectionSchema),
    defaultValues: connection || {
      resourceManagerHost: "localhost",
      resourceManagerPort: 8088,
      enabled: false,
    },
  });

  // Update form when data loads
  React.useEffect(() => {
    if (connection) {
      form.reset(connection);
    }
  }, [connection, form]);

  const updateConnectionMutation = useMutation({
    mutationFn: async (data: YarnConnection) => {
      const response = await fetch("/api/yarn/connection", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/yarn/connection"] });
      toast({
        title: "YARN Settings Updated",
        description: "YARN Resource Manager connection settings have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update YARN settings.",
        variant: "destructive",
      });
    },
  });

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    
    try {
      const response = await fetch("/api/yarn/test-connection");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setConnectionStatus(data);
      
      if (data.connected) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to YARN Resource Manager.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Unable to connect to YARN Resource Manager.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setConnectionStatus({ connected: false, error: error.message });
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to test connection.",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const onSubmit = (data: YarnConnection) => {
    updateConnectionMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            YARN Integration Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          YARN Integration Settings
        </CardTitle>
        <CardDescription>
          Configure connection to YARN Resource Manager for real-time cluster metrics and queue utilization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable YARN Integration</FormLabel>
                    <FormDescription>
                      Enable real-time metrics from YARN Resource Manager
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="resourceManagerHost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Manager Host</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="localhost"
                        {...field}
                        disabled={!form.watch("enabled")}
                      />
                    </FormControl>
                    <FormDescription>
                      Hostname or IP address of YARN Resource Manager
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resourceManagerPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Manager Port</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="8088"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 8088)}
                        disabled={!form.watch("enabled")}
                      />
                    </FormControl>
                    <FormDescription>
                      Port number for YARN Resource Manager Web UI
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-4">
              <Button 
                type="submit" 
                disabled={updateConnectionMutation.isPending}
              >
                {updateConnectionMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={isTestingConnection || !form.watch("enabled")}
              >
                {isTestingConnection ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
            </div>
          </form>
        </Form>

        {connectionStatus && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
            {connectionStatus.connected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Connected
                </Badge>
                <span className="text-sm text-muted-foreground">
                  YARN Resource Manager is accessible
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-600" />
                <Badge variant="destructive">
                  Disconnected
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {connectionStatus.error || "Unable to connect"}
                </span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}