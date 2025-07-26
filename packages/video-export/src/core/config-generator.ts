import type { ExportSettings, EncoderConfig } from '../types';

export class ConfigGenerator {
  
  async generateConfig(settings: ExportSettings): Promise<EncoderConfig> {
    const videoConfig = await this.generateVideoConfig(settings);
    const audioConfig = await this.generateAudioConfig(settings);

    return {
      video: videoConfig,
      audio: audioConfig
    };
  }

  private async generateVideoConfig(settings: ExportSettings): Promise<VideoEncoderConfig> {
    const width = Math.round(settings.width * settings.resolution);
    const height = Math.round(settings.height * settings.resolution);

    // Try different codec configurations in order of preference
    const configOptions: VideoEncoderConfig[] = [
      {
        codec: 'avc1.64002a', // H.264 High Profile Level 4.2 - Best codec for compatibility across all browsers, devices, phones, and web platforms
        width,
        height,
        bitrate: settings.videoBitrate,
        framerate: settings.fps,
        hardwareAcceleration: settings.hardwareAcceleration ? 'prefer-hardware' : 'prefer-software',
      },
    ];

    // Test each configuration until we find one that works
    for (const config of configOptions) {
      try {
        console.log('Testing video config:', config.codec);
        const support = await VideoEncoder.isConfigSupported(config);
        console.log('Support result:', support);
        if (support.supported) {
          console.log('Selected video config:', config);
          return config;
        } else {
          console.log('Config not supported:', config.codec, support);
        }
      } catch (error) {
        console.warn('Video config test failed:', config.codec, error);
      }
    }

    throw new Error('No supported video encoder configuration found');
  }

  private async generateAudioConfig(settings: ExportSettings): Promise<AudioEncoderConfig | undefined> {
    // Check if AudioEncoder is available
    if (typeof AudioEncoder === 'undefined') {
      console.warn('AudioEncoder not available, audio will be disabled');
      return undefined;
    }

    const configOptions: AudioEncoderConfig[] = [
      {
        codec: 'mp4a.40.2', // AAC LC
        numberOfChannels: settings.numberOfChannels,
        sampleRate: settings.sampleRate,
        bitrate: settings.audioBitrate
      },
      {
        codec: 'mp4a.40.5', // AAC HE
        numberOfChannels: settings.numberOfChannels,
        sampleRate: settings.sampleRate,
        bitrate: settings.audioBitrate
      }
    ];

    // Test each configuration
    for (const config of configOptions) {
      try {
        const support = await AudioEncoder.isConfigSupported(config);
        if (support.supported) {
          console.log('Selected audio config:', config);
          return config;
        }
      } catch (error) {
        console.warn('Audio config not supported:', config, error);
      }
    }

    console.warn('No supported audio encoder configuration found, audio will be disabled');
    return undefined;
  }

  static getDefaultSettings(): ExportSettings {
    return {
      resolution: 1, // 1080p
      fps: 30,
      videoBitrate: 4_000_000, // 4 Mbps - much more reasonable for 1080p30
      sampleRate: 48000,
      numberOfChannels: 2,
      audioBitrate: 128_000, // 128 kbps
      width: 1920,
      height: 1080,
      backgroundColor: '#000000',
      hardwareAcceleration: true,
      fileName: 'export.mp4'
    };
  }

  static validateSettings(settings: Partial<ExportSettings>): ExportSettings {
    const defaults = ConfigGenerator.getDefaultSettings();
    
    return {
      ...defaults,
      ...settings,
      // Ensure reasonable limits
      resolution: Math.max(0.25, Math.min(4, settings.resolution || defaults.resolution)),
      fps: Math.max(1, Math.min(120, settings.fps || defaults.fps)),
      videoBitrate: Math.max(500_000, Math.min(100_000_000, settings.videoBitrate || defaults.videoBitrate)),
      sampleRate: [8000, 16000, 22050, 44100, 48000].includes(settings.sampleRate || defaults.sampleRate) 
        ? settings.sampleRate || defaults.sampleRate 
        : defaults.sampleRate,
      numberOfChannels: Math.max(1, Math.min(8, settings.numberOfChannels || defaults.numberOfChannels)),
      audioBitrate: Math.max(64_000, Math.min(320_000, settings.audioBitrate || defaults.audioBitrate)),
      width: Math.max(64, Math.min(7680, settings.width || defaults.width)),
      height: Math.max(64, Math.min(4320, settings.height || defaults.height))
    };
  }
}