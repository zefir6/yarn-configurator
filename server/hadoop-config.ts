import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';

export interface HadoopYarnConfig {
  resourceManagerHost?: string;
  resourceManagerPort?: number;
  resourceManagerWebappAddress?: string;
  resourceManagerWebappHttpsAddress?: string;
}

/**
 * Reads YARN configuration from yarn-site.xml
 */
export async function readYarnSiteConfig(configPath: string = '/etc/hadoop/conf/yarn-site.xml'): Promise<HadoopYarnConfig | null> {
  try {
    // Check if file exists
    if (!fs.existsSync(configPath)) {
      console.log(`YARN config file not found at: ${configPath}`);
      return null;
    }

    const xmlContent = fs.readFileSync(configPath, 'utf-8');
    const parsed = await parseStringPromise(xmlContent);

    if (!parsed?.configuration?.property) {
      console.log('Invalid yarn-site.xml format: missing configuration/property');
      return null;
    }

    const properties = parsed.configuration.property;
    const config: HadoopYarnConfig = {};

    // Extract relevant properties
    for (const prop of properties) {
      const name = prop.name?.[0];
      const value = prop.value?.[0];

      if (!name || !value) continue;

      switch (name) {
        case 'yarn.resourcemanager.hostname':
          config.resourceManagerHost = value;
          break;
        case 'yarn.resourcemanager.webapp.address':
          config.resourceManagerWebappAddress = value;
          break;
        case 'yarn.resourcemanager.webapp.https.address':
          config.resourceManagerWebappHttpsAddress = value;
          break;
      }
    }

    // Parse host and port from webapp address if hostname not set
    if (!config.resourceManagerHost && config.resourceManagerWebappAddress) {
      const parts = config.resourceManagerWebappAddress.split(':');
      if (parts.length >= 1) {
        config.resourceManagerHost = parts[0];
        if (parts.length >= 2) {
          const port = parseInt(parts[1], 10);
          if (!isNaN(port)) {
            config.resourceManagerPort = port;
          }
        }
      }
    }

    // Parse port from webapp address if available  
    if (!config.resourceManagerPort && config.resourceManagerWebappAddress) {
      const parts = config.resourceManagerWebappAddress.split(':');
      if (parts.length >= 2) {
        const port = parseInt(parts[1], 10);
        if (!isNaN(port)) {
          config.resourceManagerPort = port;
        }
      }
    }
    
    // Default port if not specified
    if (config.resourceManagerHost && !config.resourceManagerPort) {
      config.resourceManagerPort = 8088; // Default YARN ResourceManager web UI port
    }

    console.log('Successfully read YARN config from yarn-site.xml:', config);
    return config;

  } catch (error) {
    console.error('Error reading yarn-site.xml:', error);
    return null;
  }
}

/**
 * Try to auto-configure YARN connection from Hadoop configuration files
 */
export async function autoConfigureYarn(): Promise<{ host: string; port: number } | null> {
  // Try common Hadoop configuration locations
  const configPaths = [
    '/etc/hadoop/conf/yarn-site.xml',
    '/opt/hadoop/etc/hadoop/yarn-site.xml',
    '/usr/local/hadoop/etc/hadoop/yarn-site.xml',
    './conf/yarn-site.xml',
    './etc/hadoop/yarn-site.xml'
  ];

  for (const configPath of configPaths) {
    const config = await readYarnSiteConfig(configPath);
    if (config?.resourceManagerHost && config?.resourceManagerPort) {
      console.log(`Auto-configured YARN from: ${configPath}`);
      return {
        host: config.resourceManagerHost,
        port: config.resourceManagerPort
      };
    }
  }

  console.log('No valid YARN configuration found in standard locations');
  return null;
}