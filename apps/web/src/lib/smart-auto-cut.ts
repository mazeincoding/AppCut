/**
 * Smart Auto-Cut System for OpenCut
 * 
 * This system provides intelligent cutting suggestions based on audio analysis.
 * It detects silence gaps, speech segments, and audio peaks to suggest optimal cut points.
 */

export interface AudioSegment {
  startTime: number;
  endTime: number;
  volume: number;
  type: 'speech' | 'music' | 'silence' | 'noise';
  confidence: number;
}

export interface CutSuggestion {
  timestamp: number;
  reason: 'silence_gap' | 'speech_end' | 'audio_peak' | 'background_noise';
  confidence: number;
  description: string;
}

export interface SmartCutResult {
  segments: AudioSegment[];
  suggestions: CutSuggestion[];
  summary: {
    totalDuration: number;
    silencePercentage: number;
    speechPercentage: number;
    suggestedCuts: number;
    estimatedTimeReduction: number;
  };
}

class SmartAutoCut {
  private audioContext: AudioContext | null = null;
  
  /**
   * Analyze audio from a video/audio file and generate smart cut suggestions
   */
  async analyzeAudio(file: File, onProgress?: (progress: number) => void): Promise<SmartCutResult> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const duration = audioBuffer.duration;
      const sampleRate = audioBuffer.sampleRate;
      const channelData = audioBuffer.getChannelData(0); // Use first channel
      
      // Analyze audio in chunks
      const chunkSize = sampleRate * 0.1; // 100ms chunks
      const segments: AudioSegment[] = [];
      const suggestions: CutSuggestion[] = [];
      
      let totalSilence = 0;
      let totalSpeech = 0;
      
      for (let i = 0; i < channelData.length; i += chunkSize) {
        const chunk = channelData.slice(i, Math.min(i + chunkSize, channelData.length));
        const startTime = i / sampleRate;
        const endTime = Math.min((i + chunkSize) / sampleRate, duration);
        
        // Analyze this chunk
        const analysis = this.analyzeAudioChunk(chunk);
        
        segments.push({
          startTime,
          endTime,
          volume: analysis.volume,
          type: analysis.type,
          confidence: analysis.confidence
        });
        
        // Track silence and speech time
        if (analysis.type === 'silence') {
          totalSilence += (endTime - startTime);
        } else if (analysis.type === 'speech') {
          totalSpeech += (endTime - startTime);
        }
        
        // Generate cut suggestions based on patterns
        if (analysis.type === 'silence' && analysis.volume < 0.01 && (endTime - startTime) > 0.5) {
          // Suggest cutting long silence
          suggestions.push({
            timestamp: startTime + (endTime - startTime) / 2,
            reason: 'silence_gap',
            confidence: 0.9,
            description: `Long silence detected (${Math.round(endTime - startTime)}s)`
          });
        }
        
        if (onProgress) {
          onProgress((i / channelData.length) * 100);
        }
      }
      
      // Post-process to find speech boundaries
      this.detectSpeechBoundaries(segments, suggestions);
      
      // Calculate summary
      const silencePercentage = (totalSilence / duration) * 100;
      const speechPercentage = (totalSpeech / duration) * 100;
      const suggestedCuts = suggestions.length;
      const estimatedTimeReduction = totalSilence * 0.8; // Estimate 80% of silence can be removed
      
      this.audioContext?.close();
      
      return {
        segments,
        suggestions: suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 20), // Top 20 suggestions
        summary: {
          totalDuration: duration,
          silencePercentage,
          speechPercentage,
          suggestedCuts,
          estimatedTimeReduction
        }
      };
      
    } catch (error) {
      this.audioContext?.close();
      console.error('Smart Auto-Cut analysis failed:', error);
      throw new Error('Audio analysis failed: ' + (error as Error).message);
    }
  }

  /**
   * Analyze a small chunk of audio data
   */
  private analyzeAudioChunk(chunk: Float32Array): {
    volume: number;
    type: 'speech' | 'music' | 'silence' | 'noise';
    confidence: number;
  } {
    // Calculate RMS volume
    let sum = 0;
    for (let i = 0; i < chunk.length; i++) {
      sum += chunk[i] * chunk[i];
    }
    const volume = Math.sqrt(sum / chunk.length);
    
    // Simple frequency analysis for speech detection
    const frequencies = this.simpleFFT(chunk);
    const speechFrequencyEnergy = this.getSpeechFrequencyEnergy(frequencies);
    
    // Classify audio type
    let type: 'speech' | 'music' | 'silence' | 'noise' = 'noise';
    let confidence = 0.5;
    
    if (volume < 0.01) {
      type = 'silence';
      confidence = 0.95;
    } else if (speechFrequencyEnergy > 0.3 && volume > 0.05) {
      type = 'speech';
      confidence = 0.8;
    } else if (volume > 0.02) {
      type = 'music';
      confidence = 0.6;
    }
    
    return { volume, type, confidence };
  }

  /**
   * Simplified FFT for basic frequency analysis
   */
  private simpleFFT(chunk: Float32Array): number[] {
    // This is a very simplified approach - in production you'd use a proper FFT library
    const frequencies: number[] = [];
    const bucketSize = Math.floor(chunk.length / 32);
    
    for (let i = 0; i < 32; i++) {
      let energy = 0;
      const start = i * bucketSize;
      const end = Math.min(start + bucketSize, chunk.length);
      
      for (let j = start; j < end; j++) {
        energy += Math.abs(chunk[j]);
      }
      
      frequencies.push(energy / (end - start));
    }
    
    return frequencies;
  }

  /**
   * Calculate energy in speech frequency range (roughly 300Hz - 3400Hz)
   */
  private getSpeechFrequencyEnergy(frequencies: number[]): number {
    // Assuming our 32 buckets cover 0-22kHz, speech is roughly buckets 1-5
    let speechEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < frequencies.length; i++) {
      totalEnergy += frequencies[i];
      if (i >= 1 && i <= 5) {
        speechEnergy += frequencies[i];
      }
    }
    
    return totalEnergy > 0 ? speechEnergy / totalEnergy : 0;
  }

  /**
   * Detect speech boundaries and add cut suggestions
   */
  private detectSpeechBoundaries(segments: AudioSegment[], suggestions: CutSuggestion[]): void {
    let currentSpeechStart: number | null = null;
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      if (segment.type === 'speech' && currentSpeechStart === null) {
        // Start of speech segment
        currentSpeechStart = segment.startTime;
      } else if (segment.type !== 'speech' && currentSpeechStart !== null) {
        // End of speech segment
        const speechDuration = segment.startTime - currentSpeechStart;
        
        if (speechDuration > 2) { // Only suggest cuts for longer speech segments
          suggestions.push({
            timestamp: segment.startTime,
            reason: 'speech_end',
            confidence: 0.7,
            description: `End of speech segment (${Math.round(speechDuration)}s)`
          });
        }
        
        currentSpeechStart = null;
      }
    }
  }

  /**
   * Generate timeline elements from cut suggestions
   */
  generateTimelineElements(
    originalDuration: number, 
    suggestions: CutSuggestion[], 
    mediaId: string
  ): Array<{
    type: "media";
    mediaId: string;
    name: string;
    duration: number;
    startTime: number;
    trimStart: number;
    trimEnd: number;
  }> {
    const elements: Array<{
      type: "media";
      mediaId: string;
      name: string;
      duration: number;
      startTime: number;
      trimStart: number;
      trimEnd: number;
    }> = [];
    
    // Sort suggestions by timestamp
    const sortedSuggestions = suggestions
      .filter(s => s.confidence > 0.6)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    let currentPosition = 0;
    let elementIndex = 1;
    
    for (const suggestion of sortedSuggestions) {
      if (suggestion.reason === 'silence_gap') {
        // Create element before the silence
        const segmentDuration = suggestion.timestamp - currentPosition;
        
        if (segmentDuration > 0.5) { // Only create segments longer than 0.5s
          elements.push({
            type: "media",
            mediaId,
            name: `Auto Segment ${elementIndex}`,
            duration: segmentDuration,
            startTime: elements.length * 0.1, // Space elements slightly apart
            trimStart: currentPosition,
            trimEnd: originalDuration - suggestion.timestamp
          });
          
          elementIndex++;
        }
        
        // Skip the silence (estimate 1-2 seconds of silence)
        currentPosition = suggestion.timestamp + 1.5;
      }
    }
    
    // Add final segment if there's remaining content
    if (currentPosition < originalDuration - 1) {
      elements.push({
        type: "media",
        mediaId,
        name: `Auto Segment ${elementIndex}`,
        duration: originalDuration - currentPosition,
        startTime: elements.length * 0.1,
        trimStart: currentPosition,
        trimEnd: 0
      });
    }
    
    return elements;
  }
}

// Singleton instance
export const smartAutoCut = new SmartAutoCut();

/**
 * Convenience function to analyze audio and get cut suggestions
 */
export async function analyzeAudioForSmartCuts(
  file: File,
  onProgress?: (progress: number) => void
): Promise<SmartCutResult> {
  return smartAutoCut.analyzeAudio(file, onProgress);
}

/**
 * Apply smart cuts to timeline
 */
export function applySmartCutsToTimeline(
  result: SmartCutResult,
  mediaId: string,
  originalDuration: number
) {
  return smartAutoCut.generateTimelineElements(
    originalDuration,
    result.suggestions,
    mediaId
  );
}
