// Debug logger that writes to localStorage for persistence
// This helps debug issues that cause page navigation

interface LogEntry {
  timestamp: number;
  component: string;
  event: string;
  data: any;
}

class DebugLogger {
  private static instance: DebugLogger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private storageKey = 'opencut-debug-logs';

  private constructor() {
    // Load existing logs from localStorage
    this.loadLogs();
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load debug logs:', e);
    }
  }

  private saveLogs() {
    try {
      // Keep only last N logs to prevent storage overflow
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (e) {
      console.error('Failed to save debug logs:', e);
    }
  }

  log(component: string, event: string, data: any = {}) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      component,
      event,
      data
    };

    this.logs.push(entry);
    this.saveLogs();

    // Also log to console for immediate visibility
    console.log(`[DEBUG] ${component} - ${event}:`, data);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem(this.storageKey);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getFormattedLogs(): string {
    return this.logs.map(log => {
      const date = new Date(log.timestamp);
      return `[${date.toISOString()}] ${log.component} - ${log.event}: ${JSON.stringify(log.data, null, 2)}`;
    }).join('\n\n');
  }

  // Export logs as downloadable file to Downloads folder
  exportLogs() {
    const content = this.getFormattedLogs();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opencut-debug-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('📁 Debug logs downloaded to your Downloads folder');
  }

  // Save logs to project directory (if running in Electron with file access)
  async saveLogsToProject() {
    const content = this.getFormattedLogs();
    const timestamp = Date.now();
    const filename = `debug-logs-${timestamp}.txt`;
    
    try {
      // Try Electron API first
      if ((window as any).electronAPI?.writeFile) {
        await (window as any).electronAPI.writeFile(filename, content);
        console.log(`📁 Logs saved to project directory: ${filename}`);
        return filename;
      }
      
      // Fallback to browser download
      this.exportLogs();
      return null;
    } catch (error) {
      console.error('Failed to save logs to project:', error);
      // Fallback to browser download
      this.exportLogs();
      return null;
    }
  }
}

export const debugLogger = DebugLogger.getInstance();

// Add window export for easy access in console
if (typeof window !== 'undefined') {
  (window as any).debugLogger = debugLogger;
  console.log('✅ Debug logger attached to window.debugLogger');
}