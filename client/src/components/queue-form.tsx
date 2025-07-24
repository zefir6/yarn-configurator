import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queueFormSchema, type QueueFormData, type Queue } from "@shared/schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Plus, Save, CheckCircle, X } from "lucide-react";

export default function QueueForm() {
  const [selectedQueueId, setSelectedQueueId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: queues = [], isLoading } = useQuery<Queue[]>({
    queryKey: ["/api/queues"],
  });

  const { data: selectedQueue } = useQuery<Queue>({
    queryKey: ["/api/queues", selectedQueueId],
    enabled: !!selectedQueueId,
  });

  const form = useForm<QueueFormData>({
    resolver: zodResolver(queueFormSchema),
    defaultValues: {
      name: "",
      parent: "root",
      weight: 1.0,
      schedulingPolicy: "fair",
      minMemory: undefined,
      minVcores: undefined,
      maxMemory: undefined,
      maxVcores: undefined,
      maxRunningApps: undefined,
      maxAMShare: undefined,
      allowPreemptionFrom: false,
      allowPreemptionTo: false,
      reservation: false,
    },
  });

  // Create/Update mutation
  const saveQueueMutation = useMutation({
    mutationFn: async (data: QueueFormData) => {
      if (selectedQueueId) {
        return apiRequest('PUT', `/api/queues/${selectedQueueId}`, data);
      } else {
        return apiRequest('POST', '/api/queues', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({
        title: "Success",
        description: selectedQueueId ? "Queue updated successfully" : "Queue created successfully",
      });
      handleCancel();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save queue configuration",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteQueueMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/queues/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({
        title: "Success",
        description: "Queue deleted successfully",
      });
      handleCancel();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete queue",
        variant: "destructive",
      });
    },
  });

  // Update form when selected queue changes
  useEffect(() => {
    if (selectedQueue) {
      form.reset({
        name: selectedQueue.name,
        parent: selectedQueue.parent || "root",
        weight: selectedQueue.weight || 1.0,
        schedulingPolicy: selectedQueue.schedulingPolicy || "fair",
        minMemory: selectedQueue.minMemory || undefined,
        minVcores: selectedQueue.minVcores || undefined,
        maxMemory: selectedQueue.maxMemory || undefined,
        maxVcores: selectedQueue.maxVcores || undefined,
        maxRunningApps: selectedQueue.maxRunningApps || undefined,
        maxAMShare: selectedQueue.maxAMShare || undefined,
        allowPreemptionFrom: selectedQueue.allowPreemptionFrom || false,
        allowPreemptionTo: selectedQueue.allowPreemptionTo || false,
        reservation: selectedQueue.reservation || false,
      });
    }
  }, [selectedQueue, form]);

  const handleEditQueue = (queue: Queue) => {
    setSelectedQueueId(queue.id);
    setIsEditing(true);
  };

  const handleAddQueue = () => {
    setSelectedQueueId(null);
    setIsEditing(true);
    form.reset();
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedQueueId(null);
    form.reset();
  };

  const onSubmit = (data: QueueFormData) => {
    saveQueueMutation.mutate(data);
  };

  const handleDeleteQueue = () => {
    if (selectedQueueId) {
      deleteQueueMutation.mutate(selectedQueueId);
    }
  };

  const getParentQueues = () => {
    return queues.filter(q => q.name !== form.watch("name"));
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading queues...</div>;
  }

  return (
    <div className="space-y-6">
      {!isEditing ? (
        // Queue List View
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium text-carbon-gray-70">
                Queue Configuration
              </CardTitle>
              <p className="text-sm text-carbon-gray-50 mt-1">
                Manage queue properties, resources, and scheduling policies
              </p>
            </div>
            <Button onClick={handleAddQueue} className="bg-carbon-blue hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Queue
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {queues.filter(q => q.name !== "root").map((queue) => (
                <div
                  key={queue.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <h4 className="font-medium text-carbon-gray-70">{queue.name}</h4>
                      <span className="text-sm text-carbon-gray-50">
                        Parent: {queue.parent || "root"}
                      </span>
                      <span className="text-sm text-carbon-gray-50">
                        Weight: {queue.weight}
                      </span>
                      <span className="text-sm text-carbon-gray-50">
                        Policy: {queue.schedulingPolicy}
                      </span>
                    </div>
                    {(queue.maxMemory || queue.maxVcores) && (
                      <div className="mt-2 text-sm text-carbon-gray-50">
                        Max Resources: {queue.maxMemory ? `${queue.maxMemory} MB` : "∞"}, {queue.maxVcores || "∞"} vCores
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditQueue(queue)}
                  >
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        // Queue Form View
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-lg font-medium text-carbon-gray-70">
              {selectedQueueId ? "Edit Queue" : "Add New Queue"}
            </CardTitle>
            <p className="text-sm text-carbon-gray-50 mt-1">
              Configure queue properties, resources, and scheduling policies
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-carbon-gray-70">Basic Information</h4>
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Queue Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter queue name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="parent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent Queue</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select parent queue" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="root">root</SelectItem>
                              {getParentQueues().map((queue) => (
                                <SelectItem key={queue.id} value={queue.name}>
                                  {queue.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              placeholder="1.0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Relative weight for fair share calculation
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="schedulingPolicy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduling Policy</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select scheduling policy" />
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
                  </div>

                  {/* Resource Limits */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-carbon-gray-70">Resource Limits</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minMemory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Memory (MB)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="1024"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minVcores"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min vCores</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="1"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxMemory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Memory (MB)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="16384"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxVcores"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max vCores</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="8"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="maxRunningApps"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Running Apps</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="50"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxAMShare"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max AM Share</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              placeholder="0.5"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum fraction of resources for ApplicationMasters (0.0-1.0)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="pt-6 border-t border-gray-200">
                  <h4 className="text-md font-medium text-carbon-gray-70 mb-4">Advanced Settings</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="allowPreemptionFrom"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Allow Preemption From</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="allowPreemptionTo"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Allow Preemption To</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reservation"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Enable Reservation</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <div>
                    {selectedQueueId && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDeleteQueue}
                        disabled={deleteQueueMutation.isPending}
                      >
                        {deleteQueueMutation.isPending ? "Deleting..." : "Delete Queue"}
                      </Button>
                    )}
                  </div>
                  <div className="flex space-x-4">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-carbon-blue text-carbon-blue hover:bg-blue-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Validate
                    </Button>
                    <Button
                      type="submit"
                      disabled={saveQueueMutation.isPending}
                      className="bg-carbon-blue hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveQueueMutation.isPending ? "Saving..." : "Save Queue"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
