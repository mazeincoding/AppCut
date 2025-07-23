/**
 * WebCodecs API Compatibility Detection
 * 
 * SAFETY: Comprehensive detection with graceful fallback
 * Based on mermaid diagram: WebCodecs Implementation Architecture
 */

export interface WebCodecsSupport {
  supported: boolean;
  codecs: string[];
  hardwareAcceleration: boolean;
  limitations: string[];
}

export interface ExportCapabilities {
  webcodecs: boolean;
  hardwareAcceleration: boolean;
  supportedCodecs: string[];
  maxResolution: { width: number; height: number };
  recommendedEngine: 'webcodecs' | 'optimized' | 'basic';
}

export class WebCodecsCompatibility {
  private static readonly SUPPORTED_CODECS = [
    'avc1.42001E', // H.264 baseline (most compatible)
    'avc1.42401E', // H.264 constrained baseline
    'avc1.4D401E', // H.264 main
    'avc1.64001E', // H.264 high
    'hev1.1.6.L93.B0', // H.265/HEVC
    'av01.0.04M.08'  // AV1
  ];

  /**
   * Main compatibility check method
   * Returns detailed support information
   */
  static async checkSupport(): Promise<WebCodecsSupport> {
    if (!('VideoEncoder' in window)) {
      return {
        supported: false,
        codecs: [],
        hardwareAcceleration: false,
        limitations: ['WebCodecs API not available']
      };
    }

    const supportedConfigs = [];
    const limitations: string[] = [];

    for (const codec of this.SUPPORTED_CODECS) {
      try {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width: 1920,
          height: 1080,
          bitrate: 8_000_000,
          framerate: 30,
          hardwareAcceleration: 'prefer-hardware'
        });

        if (support.supported) {
          supportedConfigs.push({
            codec,
            config: support.config,
            hardwareAcceleration: support.config?.hardwareAcceleration === 'prefer-hardware'
          });
        }
      } catch (error) {
        console.warn(`Codec ${codec} test failed:`, error);
        limitations.push(`Codec ${codec} test failed`);
      }
    }

    return {
      supported: supportedConfigs.length > 0,
      codecs: supportedConfigs.map(c => c.codec),
      hardwareAcceleration: supportedConfigs.some(c => c.hardwareAcceleration),
      limitations: supportedConfigs.length === 0 ? ['No supported codecs'] : limitations
    };
  }

  /**
   * SAFETY: Simple boolean check for WebCodecs availability
   * Used in mermaid diagram decision points
   */
  static shouldUseWebCodecs(): boolean {
    try {
      return 'VideoEncoder' in window && 'VideoFrame' in window;
    } catch (error) {
      console.warn('WebCodecs detection failed, using fallback:', error);
      return false;
    }
  }

  /**
   * SAFETY: Graceful degradation check
   * Implements the "WebCodecs Available?" decision in mermaid diagram
   */
  static async safeWebCodecsCheck(): Promise<boolean> {
    try {
      if (!this.shouldUseWebCodecs()) {
        return false;
      }

      const support = await this.checkSupport();
      return support.supported;
    } catch (error) {
      console.warn('WebCodecs compatibility check failed, falling back to existing system:', error);
      return false;
    }
  }

  /**
   * Get comprehensive capabilities for UI display
   * Used in export dialog to show user what's available
   */
  static async getCapabilities(): Promise<ExportCapabilities> {
    try {
      const webCodecsAvailable = await this.safeWebCodecsCheck();
      
      if (!webCodecsAvailable) {
        return {
          webcodecs: false,
          hardwareAcceleration: false,
          supportedCodecs: [],
          maxResolution: { width: 1920, height: 1080 },
          recommendedEngine: 'optimized'
        };
      }

      const support = await this.checkSupport();
      
      return {
        webcodecs: support.supported,
        hardwareAcceleration: support.hardwareAcceleration,
        supportedCodecs: support.codecs,
        maxResolution: support.hardwareAcceleration 
          ? { width: 3840, height: 2160 } // 4K with hardware
          : { width: 1920, height: 1080 }, // 1080p software only
        recommendedEngine: support.hardwareAcceleration ? 'webcodecs' : 'optimized'
      };
    } catch (error) {
      console.warn('Failed to get WebCodecs capabilities:', error);
      return {
        webcodecs: false,
        hardwareAcceleration: false,
        supportedCodecs: [],
        maxResolution: { width: 1920, height: 1080 },
        recommendedEngine: 'optimized'
      };
    }
  }

  /**
   * Get user-friendly status message for UI
   * Implements status display from mermaid diagram
   */
  static async getStatusMessage(): Promise<string> {
    try {
      const capabilities = await this.getCapabilities();
      
      if (!capabilities.webcodecs) {
        return '⚠️ WebCodecs not available, using optimized engine';
      }
      
      if (capabilities.hardwareAcceleration) {
        return `✅ WebCodecs with hardware acceleration available (${capabilities.supportedCodecs.length} codecs)`;
      } else {
        return `✅ WebCodecs software encoding available (${capabilities.supportedCodecs.length} codecs)`;
      }
    } catch (error) {
      return '⚠️ Using stable optimized engine';
    }
  }

  /**
   * Check if hardware acceleration is available
   * Used in mermaid diagram "Hardware Acceleration?" decision
   */
  static async hasHardwareAcceleration(): Promise<boolean> {
    try {
      const support = await this.checkSupport();
      return support.hardwareAcceleration;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get best available codec for encoding
   * Prioritizes hardware-accelerated codecs
   */
  static async getBestCodec(): Promise<string | null> {
    try {
      const support = await this.checkSupport();
      
      if (!support.supported) {
        return null;
      }

      // Prefer H.264 baseline for maximum compatibility
      if (support.codecs.includes('avc1.42001E')) {
        return 'avc1.42001E';
      }

      // Return first available codec
      return support.codecs[0] || null;
    } catch (error) {
      console.warn('Failed to get best codec:', error);
      return null;
    }
  }
}