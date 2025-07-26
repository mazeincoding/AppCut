export interface StreamInfo {
  fastStart: 'in-memory' | false;
  saveBuffer: (buffer: ArrayBuffer) => Promise<string>;
}

export class StreamTarget {
  private fileName: string;

  constructor(fileName: string) {
    this.fileName = fileName;
  }

  async create(): Promise<StreamInfo> {
    // Check if File System Access API is available
    if ('showSaveFilePicker' in window) {
      return this.createFileSystemStream();
    } else {
      return this.createDownloadStream();
    }
  }

  private async createFileSystemStream(): Promise<StreamInfo> {
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: this.fileName,
        types: [{
          description: 'MP4 Video',
          accept: { 'video/mp4': ['.mp4'] }
        }]
      });

      return {
        fastStart: false,
        saveBuffer: async (buffer: ArrayBuffer) => {
          const writable = await fileHandle.createWritable();
          await writable.write(buffer);
          await writable.close();
          return `File saved: ${this.fileName}`;
        }
      };
    } catch (error) {
      console.warn('File System Access API failed, falling back to download:', error);
      return this.createDownloadStream();
    }
  }

  private async createDownloadStream(): Promise<StreamInfo> {
    return {
      fastStart: 'in-memory', // Required for download method
      saveBuffer: async (buffer: ArrayBuffer) => {
        // Create blob and download
        const blob = new Blob([buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = this.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        return `Downloaded: ${this.fileName}`;
      }
    };
  }
}