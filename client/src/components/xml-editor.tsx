import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Save, 
  CheckSquare, 
  RotateCcw, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Code2,
  RefreshCw
} from "lucide-react";

interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export default function XmlEditor() {
  const [xmlContent, setXmlContent] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current config
  const { data: config, isLoading } = useQuery({
    queryKey: ["/api/config"],
  });

  // Generate XML from queues
  const { data: generatedXml } = useQuery({
    queryKey: ["/api/config/generate"],
  });

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/config/validate', { content });
      return response.json();
    },
    onSuccess: (result: ValidationResult) => {
      setValidationResult(result);
      toast({
        title: result.isValid ? "Valid XML" : "Invalid XML",
        description: result.isValid 
          ? "XML syntax and schema are valid"
          : `Found ${result.errors?.length || 0} validation errors`,
        variant: result.isValid ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Validation Error",
        description: "Failed to validate XML content",
        variant: "destructive",
      });
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/config', { 
        content,
        filePath: config?.filePath || '/etc/hadoop/conf/fair-scheduler.xml'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Configuration saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  // Reload from disk mutation
  const reloadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/config/reload');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Configuration reloaded from disk successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to reload configuration from disk",
        variant: "destructive",
      });
    },
  });

  // Load initial content
  useEffect(() => {
    if (config?.content && !hasChanges) {
      setXmlContent(config.content);
    }
  }, [config, hasChanges]);

  // Auto-validate on content change
  useEffect(() => {
    if (xmlContent && hasChanges) {
      const timeoutId = setTimeout(() => {
        validateMutation.mutate(xmlContent);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [xmlContent, hasChanges]);

  const handleContentChange = (value: string) => {
    setXmlContent(value);
    setHasChanges(true);
    setValidationResult(null);
  };

  const handleValidate = () => {
    if (xmlContent) {
      validateMutation.mutate(xmlContent);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(xmlContent);
  };

  const handleReset = () => {
    if (config?.content) {
      setXmlContent(config.content);
      setHasChanges(false);
      setValidationResult(null);
    }
  };

  const handleFormat = () => {
    try {
      // Simple XML formatting
      const formatted = xmlContent
        .replace(/></g, '>\n<')
        .replace(/^\s*\n/gm, '')
        .split('\n')
        .map((line, index) => {
          const depth = line.split('<')[0].length;
          const indent = '  '.repeat(Math.max(0, depth));
          return indent + line.trim();
        })
        .join('\n');
      
      setXmlContent(formatted);
      setHasChanges(true);
      
      toast({
        title: "Formatted",
        description: "XML content has been formatted",
      });
    } catch (error) {
      toast({
        title: "Format Error",
        description: "Failed to format XML content",
        variant: "destructive",
      });
    }
  };

  const handleReload = () => {
    reloadMutation.mutate();
  };

  const handleDownload = () => {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fair-scheduler.xml';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Downloaded",
      description: "XML configuration downloaded",
    });
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading XML configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium text-carbon-gray-70">
              XML Configuration Editor
            </CardTitle>
            <p className="text-sm text-carbon-gray-50 mt-1">
              Direct editing of fair-scheduler.xml with syntax validation
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-carbon-gray-50">Syntax:</span>
            <Badge variant={validationResult?.isValid ? "default" : "destructive"}>
              {validationResult?.isValid ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Valid
                </>
              ) : validationResult?.isValid === false ? (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Invalid
                </>
              ) : (
                "Unknown"
              )}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* XML Editor */}
          <div className="border border-gray-300 rounded-md">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
              <span className="text-sm font-medium text-carbon-gray-70">
                fair-scheduler.xml
                {hasChanges && <span className="text-carbon-warning ml-2">*</span>}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFormat}
                  className="text-xs text-carbon-blue hover:text-blue-700"
                >
                  <Code2 className="w-3 h-3 mr-1" />
                  Format
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleValidate}
                  disabled={validateMutation.isPending}
                  className="text-xs text-carbon-success hover:text-green-700"
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  {validateMutation.isPending ? "Validating..." : "Validate"}
                </Button>
              </div>
            </div>
            <Textarea
              value={xmlContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-96 p-4 font-mono text-sm border-0 focus:outline-none focus:ring-2 focus:ring-carbon-blue resize-none rounded-none"
              placeholder="Enter XML configuration..."
            />
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="mt-4">
              {validationResult.isValid ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    XML syntax and schema are valid
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">Validation Errors:</div>
                      {validationResult.errors?.map((error, index) => (
                        <div key={index} className="text-sm">• {error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between space-x-4 mt-6">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleReload}
                disabled={reloadMutation.isPending}
                className="text-carbon-gray-70 border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {reloadMutation.isPending ? "Reloading..." : "Reload from Disk"}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="text-carbon-gray-70"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges}
                className="text-carbon-gray-70"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Changes
              </Button>
              <Button
                variant="outline"
                onClick={handleValidate}
                disabled={validateMutation.isPending}
                className="border-carbon-blue text-carbon-blue hover:bg-blue-50"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                {validateMutation.isPending ? "Validating..." : "Validate XML"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !hasChanges}
                className="bg-carbon-blue hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
