import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GlobalConfig, GlobalConfigFormData, globalConfigFormSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";

export default function GlobalSettings() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: globalConfig, isLoading } = useQuery<GlobalConfig>({
    queryKey: ["/api/global-config"],
  });

  const form = useForm<GlobalConfigFormData>({
    resolver: zodResolver(globalConfigFormSchema),
    defaultValues: {
      defaultQueueSchedulingPolicy: globalConfig?.defaultQueueSchedulingPolicy as "fair" | "fifo" | "drf" || "fair",
      userMaxAppsDefault: globalConfig?.userMaxAppsDefault || 5,
      queueMaxAppsDefault: globalConfig?.queueMaxAppsDefault || undefined,
      queueMaxAMShareDefault: globalConfig?.queueMaxAMShareDefault || undefined,
      queuePlacementRules: globalConfig?.queuePlacementRules || "specified,user,default",
      defaultQueue: globalConfig?.defaultQueue || "default",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: GlobalConfigFormData) => {
      const response = await fetch("/api/global-config", {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Global configuration updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/global-config"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({ 
        variant: "destructive",
        description: "Failed to update global configuration" 
      });
    },
  });

  // Update form when data loads
  React.useEffect(() => {
    if (globalConfig) {
      form.reset({
        defaultQueueSchedulingPolicy: globalConfig.defaultQueueSchedulingPolicy as "fair" | "fifo" | "drf",
        userMaxAppsDefault: globalConfig.userMaxAppsDefault || 5,
        queueMaxAppsDefault: globalConfig.queueMaxAppsDefault || undefined,
        queueMaxAMShareDefault: globalConfig.queueMaxAMShareDefault || undefined,
        queuePlacementRules: globalConfig.queuePlacementRules || "specified,user,default",
        defaultQueue: globalConfig.defaultQueue || "default",
      });
    }
  }, [globalConfig, form]);

  const onSubmit = (data: GlobalConfigFormData) => {
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    if (globalConfig) {
      form.reset({
        defaultQueueSchedulingPolicy: globalConfig.defaultQueueSchedulingPolicy as "fair" | "fifo" | "drf",
        userMaxAppsDefault: globalConfig.userMaxAppsDefault || 5,
        queueMaxAppsDefault: globalConfig.queueMaxAppsDefault || undefined,
        queueMaxAMShareDefault: globalConfig.queueMaxAMShareDefault || undefined,
        queuePlacementRules: globalConfig.queuePlacementRules || "specified,user,default",
        defaultQueue: globalConfig.defaultQueue || "default",
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="text-center">Loading global settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="w-5 h-5 text-carbon-blue" />
          <div>
            <CardTitle className="text-lg font-medium text-carbon-gray-70">
              Global Configuration
            </CardTitle>
            <p className="text-sm text-carbon-gray-50 mt-1">
              Configure global YARN Fair Scheduler settings and policies
            </p>
          </div>
        </div>
        {!isEditing && (
          <Button 
            onClick={() => setIsEditing(true)}
            className="bg-carbon-blue hover:bg-blue-700"
          >
            Edit Settings
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {!isEditing ? (
          // Display Mode
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-carbon-gray-50">Default Queue Scheduling Policy</label>
                <p className="text-base text-carbon-gray-70 mt-1">
                  {globalConfig?.defaultQueueSchedulingPolicy || "fair"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-carbon-gray-50">User Max Apps Default</label>
                <p className="text-base text-carbon-gray-70 mt-1">
                  {globalConfig?.userMaxAppsDefault || 5}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-carbon-gray-50">Queue Max Apps Default</label>
                <p className="text-base text-carbon-gray-70 mt-1">
                  {globalConfig?.queueMaxAppsDefault || "Not set"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-carbon-gray-50">Queue Max AM Share Default</label>
                <p className="text-base text-carbon-gray-70 mt-1">
                  {globalConfig?.queueMaxAMShareDefault || "Not set"}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-carbon-gray-50">Default Queue</label>
                <p className="text-base text-carbon-gray-70 mt-1">
                  {globalConfig?.defaultQueue || "default"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-carbon-gray-50">Queue Placement Rules</label>
                <p className="text-base text-carbon-gray-70 mt-1">
                  {globalConfig?.queuePlacementRules || "specified,user,default"}
                </p>
                <p className="text-xs text-carbon-gray-40 mt-1">
                  Comma-separated list of placement rules (e.g., specified,user,default)
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Edit Mode
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="defaultQueueSchedulingPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Queue Scheduling Policy</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select default policy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="fifo">FIFO</SelectItem>
                          <SelectItem value="drf">Dominant Resource Fairness</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userMaxAppsDefault"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Max Apps Default</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="queueMaxAppsDefault"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Queue Max Apps Default (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? parseInt(value) : undefined);
                          }}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="queueMaxAMShareDefault"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Queue Max AM Share Default (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? parseFloat(value) : undefined);
                          }}
                          value={field.value !== undefined ? (Number.isInteger(field.value) ? `${field.value}.0` : field.value) : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="defaultQueue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Queue</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="queuePlacementRules"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Queue Placement Rules</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="specified,user,default"
                          className="min-h-[60px]"
                        />
                      </FormControl>
                      <p className="text-xs text-carbon-gray-40">
                        Comma-separated list of placement rules with optional attributes.<br/>
                        Examples: "specified:create=false", "user:create=false", "default"<br/>
                        Available rules: specified, user, primaryGroup, secondaryGroupExistingQueue, nestedUserQueue, default
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  className="bg-carbon-blue hover:bg-blue-700"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}