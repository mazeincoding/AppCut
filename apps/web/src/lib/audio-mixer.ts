import { TimelineElement } from "@/types/timeline";

export interface AudioTrackInfo {
  element: TimelineElement;
  audioBuffer: AudioBuffer;
  startTime: number;
  endTime: number;
  volume: number;
  pan: number;
}

export interface AudioMixerOptions {
  sampleRate: number;
  channels: number;
  duration: number; // in seconds
}

export class AudioMixer {
  private audioContext: AudioContext;
  private options: AudioMixerOptions;
  private audioTracks: AudioTrackInfo[] = [];

  constructor(options: AudioMixerOptions) {
    this.options = options;
    this.audioContext = new AudioContext({
      sampleRate: options.sampleRate,
    });
  }

  /**
   * Add an audio track to the mixer
   */
  addAudioTrack(trackInfo: AudioTrackInfo): void {
    this.audioTracks.push(trackInfo);
  }

  /**
   * Remove an audio track from the mixer
   */
  removeAudioTrack(elementId: string): void {
    this.audioTracks = this.audioTracks.filter(
      track => track.element.id !== elementId
    );
  }

  /**
   * Clear all audio tracks
   */
  clearTracks(): void {
    this.audioTracks = [];
  }

  /**
   * Load audio buffer from file
   */
  async loadAudioBuffer(audioFile: File): Promise<AudioBuffer> {
    const arrayBuffer = await audioFile.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Load audio buffer from URL
   */
  async loadAudioBufferFromUrl(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Mix all audio tracks into a single buffer
   */
  async mixTracks(): Promise<AudioBuffer> {
    const { sampleRate, channels, duration } = this.options;
    const totalSamples = Math.floor(sampleRate * duration);
    
    // Create output buffer
    const outputBuffer = this.audioContext.createBuffer(
      channels,
      totalSamples,
      sampleRate
    );

    // Get output channel data
    const outputChannels = [];
    for (let i = 0; i < channels; i++) {
      outputChannels.push(outputBuffer.getChannelData(i));
    }

    // Mix each track
    for (const track of this.audioTracks) {
      await this.mixTrack(track, outputChannels, sampleRate);
    }

    return outputBuffer;
  }

  /**
   * Mix a single track into the output channels
   */
  private async mixTrack(
    track: AudioTrackInfo,
    outputChannels: Float32Array[],
    sampleRate: number
  ): Promise<void> {
    const { audioBuffer, startTime, endTime, volume, pan } = track;
    
    // Calculate sample positions
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const trackDuration = endSample - startSample;
    
    // Ensure we don't exceed buffer bounds
    const maxSamples = Math.min(
      trackDuration,
      audioBuffer.length,
      outputChannels[0].length - startSample
    );

    // Calculate pan values (0 = center, -1 = full left, 1 = full right)
    const leftGain = volume * (1 - Math.max(0, pan));
    const rightGain = volume * (1 + Math.min(0, pan));

    // Mix audio data
    for (let sample = 0; sample < maxSamples; sample++) {
      const outputIndex = startSample + sample;
      
      if (outputIndex >= outputChannels[0].length) break;

      // Get input samples
      const inputLeft = audioBuffer.numberOfChannels > 0 
        ? audioBuffer.getChannelData(0)[sample] 
        : 0;
      const inputRight = audioBuffer.numberOfChannels > 1 
        ? audioBuffer.getChannelData(1)[sample] 
        : inputLeft;

      // Apply volume and pan, then mix
      outputChannels[0][outputIndex] += inputLeft * leftGain;
      
      if (outputChannels.length > 1) {
        outputChannels[1][outputIndex] += inputRight * rightGain;
      }
    }
  }

  /**
   * Export mixed audio as AudioBuffer
   */
  async exportAudio(): Promise<AudioBuffer> {
    return await this.mixTracks();
  }

  /**
   * Export mixed audio as WAV blob
   */
  async exportAsWav(): Promise<Blob> {
    const audioBuffer = await this.mixTracks();
    return this.audioBufferToWav(audioBuffer);
  }

  /**
   * Convert AudioBuffer to WAV blob
   */
  private audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const length = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const bytesPerSample = 2; // 16-bit PCM
    
    // Calculate buffer size
    const dataLength = length * numberOfChannels * bytesPerSample;
    const bufferLength = 44 + dataLength; // 44 bytes for WAV header
    
    const buffer = new ArrayBuffer(bufferLength);
    const view = new DataView(buffer);
    
    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM format
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
    view.setUint16(32, numberOfChannels * bytesPerSample, true);
    view.setUint16(34, 16, true); // 16-bit
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Get audio context for advanced operations
   */
  getAudioContext(): AudioContext {
    return this.audioContext;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.audioContext.close();
    this.audioTracks = [];
  }
}