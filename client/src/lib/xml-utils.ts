export interface ParsedQueue {
  name: string;
  weight?: number;
  schedulingPolicy?: string;
  minMemory?: number;
  minVcores?: number;
  maxMemory?: number;
  maxVcores?: number;
  maxRunningApps?: number;
  maxAMShare?: number;
  allowPreemptionFrom?: boolean;
  allowPreemptionTo?: boolean;
}

export function parseResourceString(resourceStr: string): { memory?: number; vcores?: number } {
  const result: { memory?: number; vcores?: number } = {};
  
  if (!resourceStr) return result;
  
  const parts = resourceStr.split(',').map(p => p.trim());
  
  for (const part of parts) {
    if (part.includes('mb')) {
      result.memory = parseInt(part.replace(/\s*mb/i, ''));
    } else if (part.includes('vcores')) {
      result.vcores = parseInt(part.replace(/\s*vcores/i, ''));
    }
  }
  
  return result;
}

export function formatResourceString(memory?: number, vcores?: number): string {
  const parts: string[] = [];
  
  if (memory !== undefined) {
    parts.push(`${memory} mb`);
  }
  
  if (vcores !== undefined) {
    parts.push(`${vcores} vcores`);
  }
  
  return parts.join(',');
}

export function validateXMLStructure(xmlString: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic XML structure validation
  if (!xmlString.includes('<allocations>')) {
    errors.push("Missing root <allocations> element");
  }
  
  if (!xmlString.includes('</allocations>')) {
    errors.push("Missing closing </allocations> tag");
  }
  
  // Check for balanced tags
  const openTags = xmlString.match(/<(\w+)[^>]*>/g) || [];
  const closeTags = xmlString.match(/<\/(\w+)>/g) || [];
  
  if (openTags.length !== closeTags.length) {
    errors.push("Unbalanced XML tags detected");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function formatXML(xml: string): string {
  let formatted = '';
  let indent = 0;
  const tab = '  ';
  
  xml.split(/>\s*</).forEach((node, index) => {
    if (index > 0) {
      formatted += '>';
    }
    
    if (index < xml.split(/>\s*</).length - 1) {
      formatted += '<';
    }
    
    if (node.match(/^\/\w/)) {
      indent--;
    }
    
    formatted += tab.repeat(indent) + node;
    
    if (node.match(/^<?\w[^>]*[^\/]$/)) {
      indent++;
    }
    
    if (index < xml.split(/>\s*</).length - 1) {
      formatted += '\n';
    }
  });
  
  return formatted;
}
