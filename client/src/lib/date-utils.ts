/**
 * Utility functions for European (ISO) date and time formatting
 * Uses 24-hour format and DD-MM-YYYY date format
 */

export function formatEuropeanDateTime(date: Date | string | number): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }
  
  // Format: DD-MM-YYYY HH:mm:ss
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

export function formatEuropeanDate(date: Date | string | number): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }
  
  // Format: DD-MM-YYYY
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
}

export function formatEuropeanTime(date: Date | string | number): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid time';
  }
  
  // Format: HH:mm:ss (24-hour format)
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
}

export function formatEuropeanTimeShort(date: Date | string | number): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid time';
  }
  
  // Format: HH:mm (24-hour format)
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    // For older dates, use European format
    return formatEuropeanDateTime(d);
  }
}