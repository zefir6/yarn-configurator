import express from 'express';

export function createMockYarnEndpoints(app: express.Application) {
  // Mock YARN Resource Manager endpoints
  
  // Cluster info endpoint
  app.get('/mock-yarn/ws/v1/cluster/info', (req, res) => {
    res.json({
      clusterInfo: {
        id: 1234567890,
        startedOn: Date.now() - 86400000, // 24 hours ago
        state: "STARTED",
        haState: "ACTIVE",
        rmStateStoreName: "FileSystemRMStateStore",
        resourceManagerVersion: "3.3.4",
        resourceManagerBuildVersion: "3.3.4",
        resourceManagerVersionBuiltOn: "2023-08-25T10:26:32Z",
        hadoopVersion: "3.3.4",
        hadoopBuildVersion: "3.3.4",
        hadoopVersionBuiltOn: "2023-08-25T10:26:32Z"
      }
    });
  });

  // Cluster metrics endpoint
  app.get('/mock-yarn/ws/v1/cluster/metrics', (req, res) => {
    res.json({
      clusterMetrics: {
        appsSubmitted: 127,
        appsCompleted: 115,
        appsPending: 3,
        appsRunning: 9,
        appsFailed: 0,
        appsKilled: 0,
        reservedMB: 0,
        availableMB: 14336,
        allocatedMB: 1664,
        totalMB: 16000,
        reservedVirtualCores: 0,
        availableVirtualCores: 6,
        allocatedVirtualCores: 2,
        totalVirtualCores: 8,
        containersAllocated: 9,
        containersReserved: 0,
        containersPending: 3,
        totalNodes: 1,
        activeNodes: 1,
        lostNodes: 0,
        unhealthyNodes: 0,
        decommissioningNodes: 0,
        decommissionedNodes: 0,
        rebootedNodes: 0
      }
    });
  });

  // Scheduler info endpoint
  app.get('/mock-yarn/ws/v1/cluster/scheduler', (req, res) => {
    res.json({
      schedulerInfo: {
        type: "fairScheduler",
        queueName: "root",
        capacity: 100.0,
        usedCapacity: 10.4,
        maxCapacity: 100.0,
        absoluteCapacity: 100.0,
        absoluteUsedCapacity: 10.4,
        numApplications: 12,
        queueNames: ["root.default", "root.production", "root.development", "root.analytics"],
        resourcesUsed: {
          memory: 1664,
          vCores: 2
        },
        queues: {
          queue: [
            {
              queueName: "default",
              capacity: 40.0,
              usedCapacity: 15.2,
              maxCapacity: 40.0,
              absoluteCapacity: 40.0,
              absoluteUsedCapacity: 6.08,
              numApplications: 4,
              resourcesUsed: {
                memory: 512,
                vCores: 1
              },
              minResources: {
                memory: 0,
                vCores: 0
              },
              maxResources: {
                memory: 6400,
                vCores: 3
              },
              fairResources: {
                memory: 6400,
                vCores: 3
              },
              clusterResources: {
                memory: 16000,
                vCores: 8
              }
            },
            {
              queueName: "production",
              capacity: 35.0,
              usedCapacity: 8.7,
              maxCapacity: 35.0,
              absoluteCapacity: 35.0,
              absoluteUsedCapacity: 3.045,
              numApplications: 5,
              resourcesUsed: {
                memory: 768,
                vCores: 1
              },
              minResources: {
                memory: 0,
                vCores: 0
              },
              maxResources: {
                memory: 5600,
                vCores: 3
              },
              fairResources: {
                memory: 5600,
                vCores: 3
              },
              clusterResources: {
                memory: 16000,
                vCores: 8
              }
            },
            {
              queueName: "development",
              capacity: 15.0,
              usedCapacity: 2.1,
              maxCapacity: 15.0,
              absoluteCapacity: 15.0,
              absoluteUsedCapacity: 0.315,
              numApplications: 2,
              resourcesUsed: {
                memory: 256,
                vCores: 0
              },
              minResources: {
                memory: 0,
                vCores: 0
              },
              maxResources: {
                memory: 2400,
                vCores: 1
              },
              fairResources: {
                memory: 2400,
                vCores: 1
              },
              clusterResources: {
                memory: 16000,
                vCores: 8
              }
            },
            {
              queueName: "analytics",
              capacity: 10.0,
              usedCapacity: 1.8,
              maxCapacity: 10.0,
              absoluteCapacity: 10.0,
              absoluteUsedCapacity: 0.18,
              numApplications: 1,
              resourcesUsed: {
                memory: 128,
                vCores: 0
              },
              minResources: {
                memory: 0,
                vCores: 0
              },
              maxResources: {
                memory: 1600,
                vCores: 1
              },
              fairResources: {
                memory: 1600,
                vCores: 1
              },
              clusterResources: {
                memory: 16000,
                vCores: 8
              }
            }
          ]
        }
      }
    });
  });

  // Applications endpoint
  app.get('/mock-yarn/ws/v1/cluster/apps', (req, res) => {
    const queueName = req.query.queue as string;
    
    const allApps = [
      {
        id: "application_1640995200000_0001",
        user: "hadoop",
        name: "Spark SQL Query",
        queue: "default",
        state: "RUNNING",
        finalStatus: "UNDEFINED",
        progress: 75.5,
        trackingUI: "ApplicationMaster",
        trackingUrl: "http://localhost:4040",
        diagnostics: "",
        clusterId: 1234567890,
        applicationType: "SPARK",
        applicationTags: "",
        priority: 0,
        startedTime: Date.now() - 3600000,
        finishedTime: 0,
        elapsedTime: 3600000,
        amContainerLogs: "http://localhost:8042/node/containerlogs/container_1640995200000_0001_01_000001/hadoop",
        amHostHttpAddress: "localhost:8042",
        allocatedMB: 512,
        allocatedVCores: 1,
        runningContainers: 2,
        memorySeconds: 1843200,
        vcoreSeconds: 3600
      },
      {
        id: "application_1640995200000_0002",
        user: "analytics",
        name: "Data Processing Job",
        queue: "production",
        state: "RUNNING",
        finalStatus: "UNDEFINED",
        progress: 45.2,
        trackingUI: "ApplicationMaster",
        trackingUrl: "http://localhost:4041",
        diagnostics: "",
        clusterId: 1234567890,
        applicationType: "MAPREDUCE",
        applicationTags: "",
        priority: 10,
        startedTime: Date.now() - 1800000,
        finishedTime: 0,
        elapsedTime: 1800000,
        amContainerLogs: "http://localhost:8042/node/containerlogs/container_1640995200000_0002_01_000001/analytics",
        amHostHttpAddress: "localhost:8042",
        allocatedMB: 768,
        allocatedVCores: 1,
        runningContainers: 3,
        memorySeconds: 1382400,
        vcoreSeconds: 1800
      }
    ];

    const filteredApps = queueName ? allApps.filter(app => app.queue === queueName) : allApps;
    
    res.json({
      apps: {
        app: filteredApps
      }
    });
  });
}