import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { ExportProject, ExportProgress } from './types';
import { ExportLogger } from './logger';
import { FontManager } from './font-manager';
import { FilterValidator } from './filter-validator';
import { MediaProcessor } from './media-processor';
import { TextProcessor } from './text-processor';
import { FFmpegCommandBuilder } from './ffmpeg-builder';

export class VideoExportService {
  private ffmpeg: FFmpeg | null = null;
  private isInitialized = false;
  private onProgressCallback?: (progress: ExportProgress) => void;
  
  // Modular components
  private logger: ExportLogger;
  private fontManager: FontManager | null = null;
  private validator: FilterValidator;
  private mediaProcessor: MediaProcessor;
  private textProcessor: TextProcessor | null = null;
  private commandBuilder: FFmpegCommandBuilder;

  constructor() {
    this.logger = new ExportLogger();
    this.validator = new FilterValidator(this.logger);
    this.mediaProcessor = new MediaProcessor(this.logger, this.validator);
    this.commandBuilder = new FFmpegCommandBuilder(this.logger, this.validator);
  }

  /**
   * Initialize FFmpeg and all required components
   */
  async initialize(onProgress?: (progress: ExportProgress) => void): Promise<void> {
    if (this.isInitialized && this.ffmpeg) {
      this.logger.log('FFmpeg already initialized');
      return;
    }

    this.onProgressCallback = onProgress;
    this.updateProgress('initializing', 0, 'Initializing FFmpeg...');

    try {
      // Create FFmpeg instance
      this.ffmpeg = await this.createFFmpegInstance();
      
      // Initialize components that need FFmpeg
      this.fontManager = new FontManager(this.ffmpeg, this.logger);
      this.textProcessor = new TextProcessor(this.logger, this.validator, this.fontManager);
      
      // Ensure basic font is loaded for text rendering
      await this.fontManager.loadFont("Inter");
      
      this.isInitialized = true;
      this.updateProgress('initializing', 100, 'FFmpeg initialized successfully');
      
    } catch (error) {
      this.logger.error(`FFmpeg initialization failed: ${error}`);
      this.updateProgress('error', 0, `Initialization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Export video using the modular processing pipeline
   */
  async exportVideo(project: ExportProject): Promise<Blob> {
    if (!this.isInitialized || !this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    try {
      this.updateProgress('processing', 0, 'Starting video export...');
      
      // Step 1: Load media files
      await this.loadMediaFiles(project);
      this.updateProgress('processing', 20, 'Media files loaded');

      // Step 2: Process media elements
      const mediaResult = this.mediaProcessor.processMediaElements(project);
      this.updateProgress('processing', 40, 'Media elements processed');

      // Step 3: Process text overlays
      if (!this.textProcessor) {
        throw new Error('Text processor not initialized');
      }
      
      const textResult = await this.textProcessor.processTextElements(project, mediaResult.videoLayerCount);
      this.updateProgress('processing', 60, 'Text overlays processed');

      // Step 4: Build FFmpeg command
      const command = this.commandBuilder.buildCommand(
        project,
        [...mediaResult.videoFilters, ...textResult.textFilters],
        mediaResult.audioFilters,
        mediaResult.inputArgs,
        textResult.finalVideoLayerCount
      );
      
      this.updateProgress('rendering', 70, 'Rendering video...');
      
      // Step 5: Execute FFmpeg command
      await this.executeFFmpegCommand(command);
      this.updateProgress('rendering', 90, 'Video rendered');

      // Step 6: Read output file
      const outputData = await this.ffmpeg.readFile('output.mp4');
      const blob = new Blob([outputData], { type: 'video/mp4' });
      
      this.updateProgress('completed', 100, 'Export completed successfully');
      return blob;

    } catch (error) {
      this.logger.error(`Export failed: ${error}`);
      this.updateProgress('error', 0, `Export failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get export logs
   */
  getExportLogs(): string[] {
    return this.logger.getLogs();
  }

  /**
   * Clear export logs
   */
  clearLogs(): void {
    this.logger.clearLogs();
  }

  /**
   * Terminate the export process and clean up resources
   */
  terminate(): void {
    try {
      if (this.ffmpeg) {
        // FFmpeg.js doesn't have a direct terminate method, but we can clean up
        this.logger.log('Terminating export process...');
        this.ffmpeg = null;
        this.isInitialized = false;
        this.fontManager = null;
        this.textProcessor = null;
        this.onProgressCallback = undefined;
        this.logger.log('Export process terminated');
      }
    } catch (error) {
      this.logger.error(`Error during termination: ${error}`);
    }
  }

  /**
   * Get debug data for the export project
   */
  async getDebugData(project: ExportProject): Promise<any> {
    try {
      const { tracks, settings, duration, mediaItems } = project;
      
      // Process elements to get debug information
      const mediaResult = this.mediaProcessor.processMediaElements(project);
      
      let textResult: { textFilters: string[]; finalVideoLayerCount: number } = { 
        textFilters: [], 
        finalVideoLayerCount: mediaResult.videoLayerCount 
      };
      if (this.textProcessor) {
        textResult = await this.textProcessor.processTextElements(project, mediaResult.videoLayerCount);
      }

      // Build command for debugging
      const command = this.commandBuilder.buildCommand(
        project,
        [...mediaResult.videoFilters, ...textResult.textFilters],
        mediaResult.audioFilters,
        mediaResult.inputArgs,
        textResult.finalVideoLayerCount
      );

      return {
        project: {
          duration,
          settings,
          trackCount: tracks.length,
          mediaItemCount: mediaItems.length,
          elementCount: tracks.reduce((count, track) => count + track.elements.length, 0)
        },
        processing: {
          videoFilters: mediaResult.videoFilters,
          textFilters: textResult.textFilters,
          audioFilters: mediaResult.audioFilters,
          inputArgs: mediaResult.inputArgs,
          videoLayerCount: textResult.finalVideoLayerCount
        },
        ffmpeg: {
          command: command.join(' '),
          args: command
        },
        state: {
          isInitialized: this.isInitialized,
          fontLoaded: this.fontManager?.isFontLoaded() || false
        },
        logs: this.logger.getLogs()
      };
    } catch (error) {
      this.logger.error(`Error generating debug data: ${error}`);
      return {
        error: `Failed to generate debug data: ${error}`,
        logs: this.logger.getLogs()
      };
    }
  }

  // Private methods

  private async createFFmpegInstance(): Promise<FFmpeg> {
    try {
      this.logger.log('Initializing FFmpeg...');
      
      const ffmpeg = new FFmpeg();
      
      // Load FFmpeg using the UMD files with toBlobURL
      const baseURL = '/ffmpeg';
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
      
      await ffmpeg.load({
        coreURL,
        wasmURL,
      });
      
      this.logger.log('FFmpeg loaded successfully');
      
      // Set up event listeners after loading
      ffmpeg.on('log', ({ message }) => {
        this.logger.debug(`FFmpeg: ${message}`);
      });

      // TODO: Handle progress updates correctly
      ffmpeg.on('progress', ({ progress }) => {
        const percentage = Math.round(progress * 100);
        this.updateProgress('rendering', 70 + (percentage * 0.2), `Rendering... ${percentage}%`);
      });
      
      return ffmpeg;
    } catch (error) {
      this.logger.error(`Failed to create FFmpeg instance: ${error}`);
      throw new Error(`FFmpeg initialization failed: ${error}`);
    }
  }


  private async loadMediaFiles(project: ExportProject): Promise<void> {
    const { mediaItems } = project;
    
    for (const mediaItem of mediaItems) {
      if (mediaItem.file) {
        try {
          const fileName = `media_${mediaItem.id}`;
          await this.ffmpeg!.writeFile(fileName, new Uint8Array(await mediaItem.file.arrayBuffer()));
          this.logger.log(`Loaded media file: ${fileName}`);
        } catch (error) {
          this.logger.error(`Failed to load media file ${mediaItem.id}: ${error}`);
          throw error;
        }
      }
    }
  }

  private async executeFFmpegCommand(command: string[]): Promise<void> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    this.logger.log(`Executing FFmpeg command: ${command.join(' ')}`);
    
    try {
      await this.ffmpeg.exec(command);
      this.logger.log('FFmpeg command executed successfully');
    } catch (error) {
      this.logger.error(`FFmpeg execution failed: ${error}`);
      throw error;
    }
  }

  private updateProgress(
    phase: ExportProgress['phase'],
    progress: number,
    message: string
  ): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({
        phase,
        progress: Math.min(100, Math.max(0, progress)),
        message,
        logs: this.logger.getLogs()
      });
    }
  }
}

// Export types for external use
export type { ExportSettings, ExportProject, ExportProgress } from './types';
