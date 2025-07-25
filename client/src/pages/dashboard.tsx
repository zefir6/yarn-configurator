import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Overview from "@/components/overview";
import QueueForm from "@/components/queue-form";
import XmlEditor from "@/components/xml-editor";
import GlobalSettings from "@/components/global-settings";
import { YarnSettings } from "@/components/yarn-settings";
import { ClusterMetrics } from "@/components/cluster-metrics";
import { QueueMetrics } from "@/components/queue-metrics";
import { CheckCircle, HelpCircle } from "lucide-react";

type TabType = "overview" | "queues" | "policies" | "xml-editor" | "validation" | "global-settings" | "yarn-metrics";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [editingQueueId, setEditingQueueId] = useState<number | null>(null);

  const getTabTitle = (tab: TabType): string => {
    const titles = {
      'overview': 'Configuration Overview',
      'queues': 'Queue Configuration',
      'policies': 'Scheduling Policies',
      'xml-editor': 'XML Editor',
      'validation': 'Validation & Preview',
      'global-settings': 'Global Settings',
      'yarn-metrics': 'YARN Metrics'
    };
    return titles[tab];
  };

  const handleEditQueue = (queueId: number) => {
    setEditingQueueId(queueId);
    setActiveTab("queues");
  };

  const handleSwitchToQueues = () => {
    setActiveTab("queues");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <Overview 
            onEditQueue={handleEditQueue}
            onSwitchToQueues={handleSwitchToQueues}
          />
        );
      case "queues":
        return (
          <QueueForm 
            editingQueueId={editingQueueId}
            onClearEdit={() => setEditingQueueId(null)}
          />
        );
      case "xml-editor":
        return <XmlEditor />;
      case "global-settings":
        return <GlobalSettings />;
      case "yarn-metrics":
        return (
          <div className="space-y-6">
            <YarnSettings />
            <ClusterMetrics />
            <QueueMetrics />
          </div>
        );
      default:
        return <Overview onEditQueue={handleEditQueue} onSwitchToQueues={handleSwitchToQueues} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-carbon-gray-70">
                {getTabTitle(activeTab)}
              </h2>
              <p className="text-sm text-carbon-gray-50 mt-1">
                Manage YARN Fair Scheduler settings and queue configurations
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Validation Status */}
              <div className="flex items-center">
                <div className="w-3 h-3 bg-carbon-success rounded-full mr-2"></div>
                <span className="text-sm text-carbon-gray-50">Configuration Valid</span>
              </div>
              <button className="p-2 text-carbon-gray-50 hover:text-carbon-gray-70 rounded-md hover:bg-gray-100">
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-8">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
