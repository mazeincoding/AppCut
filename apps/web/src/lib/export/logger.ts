export class ExportLogger {
  private logs: string[] = [];

  log(message: string): void {
    this.logs.push(message);
    // console.log(`[VideoExport] ${message}`);
  }

  warn(message: string): void {
    this.logs.push(`Warning: ${message}`);
    // console.warn(`[VideoExport] WARNING: ${message}`);
  }

  error(message: string): void {
    this.logs.push(`Error: ${message}`);
    // console.error(`[VideoExport] ERROR: ${message}`);
  }

  debug(message: string): void {
    this.logs.push(`Debug: ${message}`);
    // console.debug(`[VideoExport] DEBUG: ${message}`);
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}