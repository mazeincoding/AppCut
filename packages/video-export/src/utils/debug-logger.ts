export class DebugLogger {
  private logs: string[] = [];
  private maxLogs = 100; // Keep last 100 log entries
  private listeners: ((logs: string[]) => void)[] = [];

  log(message: string, ...args: any[]) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}${args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : ''}`;
    
    this.logs.push(logEntry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Also log to console
    console.log(message, ...args);
    
    // Notify listeners
    this.notifyListeners();
  }

  error(message: string, ...args: any[]) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ERROR: ${message}${args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : ''}`;
    
    this.logs.push(logEntry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    console.error(message, ...args);
    this.notifyListeners();
  }

  warn(message: string, ...args: any[]) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] WARN: ${message}${args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : ''}`;
    
    this.logs.push(logEntry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    console.warn(message, ...args);
    this.notifyListeners();
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.notifyListeners();
  }

  addListener(callback: (logs: string[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }
}

// Global debug logger instance
export const debugLogger = new DebugLogger();