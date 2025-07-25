import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatEuropeanDateTime } from "@/lib/date-utils";
import { 
  Settings, 
  Upload, 
  Download, 
  RefreshCw, 
  BarChart3, 
  Network, 
  Scale, 
  Code, 
  CheckSquare,
  Save,
  Eye,
  Activity
} from "lucide-react";

type TabType = "overview" | "queues" | "policies" | "xml-editor" | "validation" | "global-settings" | "yarn-metrics";

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current config
  const { data: config, isLoading } = useQuery({
    queryKey: ["/api/config"],
  });

  // Get pending changes
  const { data: pendingChanges } = useQuery<{count: number, hasPending: boolean}>({
    queryKey: ["/api/pending-changes"],
    refetchInterval: 2000, // Poll every 2 seconds for updates
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('configFile', file);
      const response = await fetch('/api/config/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({
        title: "Success",
        description: "Configuration file uploaded successfully",
      });
      setUploadFile(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload configuration file",
        variant: "destructive",
      });
    },
  });

  // Reload mutation
  const reloadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/config');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({
        title: "Success",
        description: "Configuration reloaded from disk",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reload configuration",
        variant: "destructive",
      });
    },
  });

  // Apply changes mutation
  const applyChangesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/pending-changes/apply');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-changes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({
        title: "Success",
        description: "Changes applied successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to apply changes",
        variant: "destructive",
      });
    },
  });

  // Discard changes mutation
  const discardChangesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/pending-changes/discard');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-changes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({
        title: "Success",
        description: "Changes discarded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to discard changes",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = () => {
    if (uploadFile) {
      uploadMutation.mutate(uploadFile);
    }
  };

  const handleFileDownload = async () => {
    try {
      const response = await fetch('/api/config/download');
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fair-scheduler.xml';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Configuration file downloaded",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download configuration file",
        variant: "destructive",
      });
    }
  };

  const handleReload = () => {
    reloadMutation.mutate();
  };

  const navItems = [
    { id: "overview", icon: BarChart3, label: "Overview" },
    { id: "queues", icon: Network, label: "Queue Configuration" },
    { id: "global-settings", icon: Settings, label: "Global Settings" },
    { id: "yarn-metrics", icon: Activity, label: "YARN Metrics" },
    { id: "policies", icon: Scale, label: "Scheduling Policies" },
    { id: "xml-editor", icon: Code, label: "XML Editor" },
    { id: "validation", icon: CheckSquare, label: "Validation & Preview" },
  ];

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-carbon-gray-70 flex items-center">
          <Settings className="text-carbon-blue mr-2 w-6 h-6" />
          YARN Fair Scheduler
        </h1>
        <p className="text-sm text-carbon-gray-50 mt-1">Configuration Manager</p>
      </div>

      {/* File Operations Panel */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-sm font-medium text-carbon-gray-70 mb-4">File Operations</h3>
        
        {/* Current Config Status */}
        <div className="bg-carbon-gray-10 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-carbon-gray-70">Current Config</span>
            <Badge variant={(config as any)?.isValid ? "default" : "destructive"} className="text-xs">
              {(config as any)?.isValid ? "Valid" : "Invalid"}
            </Badge>
          </div>
          <p className="text-xs text-carbon-gray-50">
            {(config as any)?.filePath || "/etc/hadoop/conf/fair-scheduler.xml"}
          </p>
          <p className="text-xs text-carbon-gray-50 mt-1">
            {(config as any)?.lastModified ? `Last modified: ${formatEuropeanDateTime((config as any).lastModified)}` : "No modification date"}
          </p>
        </div>

        {/* File Upload */}
        <div className="space-y-2 mb-4">
          <Input
            type="file"
            accept=".xml"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <Button
            onClick={handleFileUpload}
            disabled={!uploadFile || uploadMutation.isPending}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploadMutation.isPending ? "Uploading..." : "Upload Config"}
          </Button>
        </div>

        {/* File Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleFileDownload}
            variant="default"
            size="sm"
            className="w-full bg-carbon-blue hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Config
          </Button>
          <Button
            onClick={handleReload}
            disabled={reloadMutation.isPending}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${reloadMutation.isPending ? 'animate-spin' : ''}`} />
            {reloadMutation.isPending ? "Reloading..." : "Reload from Disk"}
          </Button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-6">
        <h3 className="text-sm font-medium text-carbon-gray-70 mb-4">Configuration Sections</h3>
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id as TabType)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-blue-50 text-carbon-blue"
                      : "text-carbon-gray-50 hover:bg-gray-50 hover:text-carbon-gray-70"
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Apply Changes Section */}
      <div className="p-6 border-t border-gray-200 bg-carbon-gray-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-carbon-gray-70">Pending Changes</span>
          <Badge 
            variant={pendingChanges?.hasPending ? "default" : "secondary"} 
            className={pendingChanges?.hasPending ? "bg-carbon-warning text-carbon-gray-70" : "bg-gray-200 text-carbon-gray-70"}
          >
            {pendingChanges?.count || 0} Modified
          </Badge>
        </div>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            disabled={!pendingChanges?.hasPending}
            onClick={() => onTabChange('xml-editor')}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Changes
          </Button>
          <Button 
            size="sm" 
            className="w-full bg-carbon-success hover:bg-green-700"
            disabled={!pendingChanges?.hasPending || applyChangesMutation.isPending}
            onClick={() => applyChangesMutation.mutate()}
          >
            <Save className="w-4 h-4 mr-2" />
            {applyChangesMutation.isPending ? "Applying..." : "Apply Changes"}
          </Button>
          {pendingChanges?.hasPending && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              disabled={discardChangesMutation.isPending}
              onClick={() => discardChangesMutation.mutate()}
            >
              {discardChangesMutation.isPending ? "Discarding..." : "Discard Changes"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
