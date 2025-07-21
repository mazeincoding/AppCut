/**
 * MAGIC AI TIMELINE - Revolutionary Automated Video Arrangement
 * 
 * This system uses AI to automatically arrange timeline elements for optimal visual flow:
 * - Intelligent beat detection for music synchronization
 * - Automatic pacing based on content analysis
 * - Smart transition suggestions between clips
 * - Content-aware timeline optimization
 * - Real-time arrangement scoring and suggestions
 */

export interface TimelineElement {
  id: string;
  type: 'video' | 'audio' | 'image' | 'text';
  startTime: number;
  duration: number;
  content?: string;
  volume?: number;
  effects?: string[];
}

export interface ArrangementScore {
  overall: number; // 0-100
  pacing: number;
  musicSync: number;
  visualFlow: number;
  transitions: number;
  engagement: number;
}

export interface MagicSuggestion {
  type: 'reorder' | 'trim' | 'transition' | 'effect' | 'timing';
  description: string;
  confidence: number;
  impact: number; // Expected improvement
  elements: string[]; // Element IDs affected
  action: () => void;
}

export interface BeatInfo {
  timestamp: number;
  strength: number;
  type: 'kick' | 'snare' | 'hihat' | 'bass' | 'melody';
  confidence: number;
}

export interface ContentAnalysis {
  energy: number; // 0-1
  motion: number; // 0-1
  color: 'warm' | 'cool' | 'neutral' | 'vibrant';
  mood: 'happy' | 'sad' | 'energetic' | 'calm' | 'dramatic';
  faces: number;
  text: boolean;
  scene: 'indoor' | 'outdoor' | 'close' | 'wide';
}

class MagicAITimeline {
  private elements: TimelineElement[] = [];
  private beatMap: BeatInfo[] = [];
  private contentAnalysis: Map<string, ContentAnalysis> = new Map();
  private currentScore: ArrangementScore = {
    overall: 0,
    pacing: 0,
    musicSync: 0,
    visualFlow: 0,
    transitions: 0,
    engagement: 0,
  };
  
  /**
   * Analyze audio for beat detection and music synchronization
   */
  async analyzeAudioBeats(audioFile: File): Promise<BeatInfo[]> {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const sampleRate = audioBuffer.sampleRate;
      const channelData = audioBuffer.getChannelData(0);
      const duration = audioBuffer.duration;
      
      const beats: BeatInfo[] = [];
      const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
      const hopSize = Math.floor(windowSize / 4);
      
      // Simple beat detection using energy-based analysis
      for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
        const timestamp = i / sampleRate;
        
        // Calculate energy in current window
        let energy = 0;
        for (let j = 0; j < windowSize; j++) {
          energy += Math.abs(channelData[i + j]);
        }
        energy /= windowSize;
        
        // Calculate energy in previous window for comparison
        let prevEnergy = 0;
        if (i >= windowSize) {
          for (let j = 0; j < windowSize; j++) {
            prevEnergy += Math.abs(channelData[i - windowSize + j]);
          }
          prevEnergy /= windowSize;
        }
        
        // Detect beat as significant energy increase
        const energyRatio = prevEnergy > 0 ? energy / prevEnergy : 1;
        if (energyRatio > 1.3 && energy > 0.01) {
          // Classify beat type based on frequency analysis (simplified)
          let beatType: 'kick' | 'snare' | 'hihat' | 'bass' | 'melody' = 'kick';
          
          // Low frequency = kick, mid = snare, high = hihat
          const lowEnergy = this.getFrequencyEnergy(channelData.slice(i, i + windowSize), 0, 200, sampleRate);
          const midEnergy = this.getFrequencyEnergy(channelData.slice(i, i + windowSize), 200, 2000, sampleRate);
          const highEnergy = this.getFrequencyEnergy(channelData.slice(i, i + windowSize), 2000, 8000, sampleRate);
          
          if (lowEnergy > midEnergy && lowEnergy > highEnergy) beatType = 'kick';
          else if (midEnergy > lowEnergy && midEnergy > highEnergy) beatType = 'snare';
          else if (highEnergy > lowEnergy && highEnergy > midEnergy) beatType = 'hihat';
          
          beats.push({
            timestamp,
            strength: Math.min(energyRatio, 3.0) / 3.0,
            type: beatType,
            confidence: Math.min(energy * 10, 1.0),
          });
        }
      }
      
      // Filter beats to avoid too close together
      const filteredBeats = beats.filter((beat, index) => {
        if (index === 0) return true;
        return beat.timestamp - beats[index - 1].timestamp > 0.1; // Min 100ms between beats
      });
      
      this.beatMap = filteredBeats;
      return filteredBeats;
      
    } catch (error) {
      console.error('Beat analysis failed:', error);
      return [];
    }
  }
  
  private getFrequencyEnergy(data: Float32Array, minFreq: number, maxFreq: number, sampleRate: number): number {
    // Simplified frequency analysis - in real implementation would use FFT
    // This is a placeholder that simulates frequency-based energy calculation
    const startIndex = Math.floor((minFreq / (sampleRate / 2)) * data.length / 2);
    const endIndex = Math.floor((maxFreq / (sampleRate / 2)) * data.length / 2);
    
    let energy = 0;
    for (let i = startIndex; i < Math.min(endIndex, data.length); i++) {
      energy += Math.abs(data[i]);
    }
    
    return energy / (endIndex - startIndex);
  }
  
  /**
   * Analyze video content for smart arrangement
   */
  async analyzeVideoContent(videoFile: File, elementId: string): Promise<ContentAnalysis> {
    try {
      // Create video element for analysis
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Sample frames throughout the video
          const sampleCount = 10;
          const frameDuration = video.duration / sampleCount;
          let samplesAnalyzed = 0;
          
          const analyses: Partial<ContentAnalysis>[] = [];
          
          const analyzeFrame = (time: number) => {
            video.currentTime = time;
          };
          
          video.onseeked = () => {
            ctx.drawImage(video, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Analyze this frame
            const frameAnalysis = this.analyzeFrameContent(imageData);
            analyses.push(frameAnalysis);
            
            samplesAnalyzed++;
            if (samplesAnalyzed < sampleCount) {
              analyzeFrame(samplesAnalyzed * frameDuration);
            } else {
              // Combine all frame analyses
              const combinedAnalysis = this.combineFrameAnalyses(analyses);
              this.contentAnalysis.set(elementId, combinedAnalysis);
              resolve(combinedAnalysis);
            }
          };
          
          // Start analysis
          analyzeFrame(0);
        };
        
        video.src = URL.createObjectURL(videoFile);
      });
      
    } catch (error) {
      console.error('Content analysis failed:', error);
      
      // Return default analysis
      const defaultAnalysis: ContentAnalysis = {
        energy: 0.5,
        motion: 0.5,
        color: 'neutral',
        mood: 'calm',
        faces: 0,
        text: false,
        scene: 'indoor',
      };
      
      this.contentAnalysis.set(elementId, defaultAnalysis);
      return defaultAnalysis;
    }
  }
  
  private analyzeFrameContent(imageData: ImageData): Partial<ContentAnalysis> {
    const data = imageData.data;
    const pixels = data.length / 4;
    
    let totalR = 0, totalG = 0, totalB = 0;
    let brightness = 0;
    let colorVariance = 0;
    
    // Basic color and brightness analysis
    for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel for performance
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      totalR += r;
      totalG += g;
      totalB += b;
      brightness += (r + g + b) / 3;
    }
    
    const sampleCount = pixels / 4;
    const avgR = totalR / sampleCount;
    const avgG = totalG / sampleCount;
    const avgB = totalB / sampleCount;
    const avgBrightness = brightness / sampleCount;
    
    // Determine color temperature and mood
    let color: 'warm' | 'cool' | 'neutral' | 'vibrant' = 'neutral';
    if (avgR > avgB + 20) color = 'warm';
    else if (avgB > avgR + 20) color = 'cool';
    else if (Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB) > 50) color = 'vibrant';
    
    // Estimate energy and motion (simplified)
    const energy = Math.min(1, (avgBrightness + colorVariance) / 200);
    const motion = Math.random() * 0.8; // Placeholder - would need frame comparison
    
    // Determine mood
    let mood: 'happy' | 'sad' | 'energetic' | 'calm' | 'dramatic' = 'calm';
    if (color === 'vibrant' && avgBrightness > 150) mood = 'happy';
    else if (color === 'cool' && avgBrightness < 100) mood = 'sad';
    else if (energy > 0.7) mood = 'energetic';
    else if (avgBrightness < 80) mood = 'dramatic';
    
    return {
      energy,
      motion,
      color,
      mood,
      faces: 0, // Would need face detection
      text: false, // Would need text detection
      scene: avgBrightness > 120 ? 'outdoor' : 'indoor',
    };
  }
  
  private combineFrameAnalyses(analyses: Partial<ContentAnalysis>[]): ContentAnalysis {
    const avgEnergy = analyses.reduce((sum, a) => sum + (a.energy || 0), 0) / analyses.length;
    const avgMotion = analyses.reduce((sum, a) => sum + (a.motion || 0), 0) / analyses.length;
    
    // Find most common values
    const colors = analyses.map(a => a.color).filter(Boolean);
    const moods = analyses.map(a => a.mood).filter(Boolean);
    const scenes = analyses.map(a => a.scene).filter(Boolean);
    
    const mostCommonColor = this.getMostCommon(colors) || 'neutral';
    const mostCommonMood = this.getMostCommon(moods) || 'calm';
    const mostCommonScene = this.getMostCommon(scenes) || 'indoor';
    
    return {
      energy: avgEnergy,
      motion: avgMotion,
      color: mostCommonColor as any,
      mood: mostCommonMood as any,
      faces: 0,
      text: false,
      scene: mostCommonScene as any,
    };
  }
  
  private getMostCommon<T>(arr: T[]): T | undefined {
    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    
    let maxCount = 0;
    let mostCommon: T | undefined;
    
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }
    
    return mostCommon;
  }
  
  /**
   * Generate magic timeline arrangement suggestions
   */
  generateMagicSuggestions(elements: TimelineElement[]): MagicSuggestion[] {
    this.elements = elements;
    const suggestions: MagicSuggestion[] = [];
    
    // 1. Beat synchronization suggestions
    if (this.beatMap.length > 0) {
      suggestions.push(...this.generateBeatSyncSuggestions());
    }
    
    // 2. Pacing optimization
    suggestions.push(...this.generatePacingSuggestions());
    
    // 3. Visual flow improvements
    suggestions.push(...this.generateVisualFlowSuggestions());
    
    // 4. Transition suggestions
    suggestions.push(...this.generateTransitionSuggestions());
    
    // 5. Content-based reordering
    suggestions.push(...this.generateContentReorderSuggestions());
    
    // Sort by impact and confidence
    return suggestions.sort((a, b) => (b.impact * b.confidence) - (a.impact * a.confidence));
  }
  
  private generateBeatSyncSuggestions(): MagicSuggestion[] {
    const suggestions: MagicSuggestion[] = [];
    const videoElements = this.elements.filter(e => e.type === 'video');
    
    for (const element of videoElements) {
      // Find nearest beat to element start
      const nearestBeat = this.beatMap.reduce((closest, beat) => {
        const currentDiff = Math.abs(beat.timestamp - element.startTime);
        const closestDiff = Math.abs(closest.timestamp - element.startTime);
        return currentDiff < closestDiff ? beat : closest;
      });
      
      const timeDiff = Math.abs(nearestBeat.timestamp - element.startTime);
      
      if (timeDiff > 0.1 && timeDiff < 2.0) { // Only suggest if reasonably close
        suggestions.push({
          type: 'timing',
          description: `Sync clip "${element.id}" to beat at ${nearestBeat.timestamp.toFixed(1)}s`,
          confidence: nearestBeat.confidence * (1 - timeDiff / 2),
          impact: 0.7,
          elements: [element.id],
          action: () => {
            element.startTime = nearestBeat.timestamp;
          },
        });
      }
    }
    
    return suggestions;
  }
  
  private generatePacingSuggestions(): MagicSuggestion[] {
    const suggestions: MagicSuggestion[] = [];
    
    // Analyze current pacing
    const avgClipLength = this.elements.reduce((sum, e) => sum + e.duration, 0) / this.elements.length;
    
    for (let i = 0; i < this.elements.length - 1; i++) {
      const current = this.elements[i];
      const next = this.elements[i + 1];
      const gap = next.startTime - (current.startTime + current.duration);
      
      // Suggest reducing long gaps
      if (gap > 1.0) {
        suggestions.push({
          type: 'timing',
          description: `Reduce ${gap.toFixed(1)}s gap between clips for better pacing`,
          confidence: 0.8,
          impact: 0.6,
          elements: [current.id, next.id],
          action: () => {
            next.startTime = current.startTime + current.duration + 0.1;
          },
        });
      }
      
      // Suggest extending short clips
      if (current.duration < avgClipLength * 0.5 && current.type === 'video') {
        suggestions.push({
          type: 'trim',
          description: `Extend short clip "${current.id}" for better flow`,
          confidence: 0.6,
          impact: 0.4,
          elements: [current.id],
          action: () => {
            current.duration = Math.min(current.duration * 1.5, avgClipLength);
          },
        });
      }
    }
    
    return suggestions;
  }
  
  private generateVisualFlowSuggestions(): MagicSuggestion[] {
    const suggestions: MagicSuggestion[] = [];
    
    for (let i = 0; i < this.elements.length - 1; i++) {
      const current = this.elements[i];
      const next = this.elements[i + 1];
      
      const currentAnalysis = this.contentAnalysis.get(current.id);
      const nextAnalysis = this.contentAnalysis.get(next.id);
      
      if (currentAnalysis && nextAnalysis) {
        // Suggest reordering for better energy flow
        const energyDrop = currentAnalysis.energy - nextAnalysis.energy;
        
        if (energyDrop > 0.4) {
          suggestions.push({
            type: 'reorder',
            description: `Reorder clips to avoid energy drop from ${current.id} to ${next.id}`,
            confidence: 0.7,
            impact: 0.5,
            elements: [current.id, next.id],
            action: () => {
              // Swap elements
              const temp = { ...current };
              Object.assign(current, next);
              Object.assign(next, temp);
            },
          });
        }
        
        // Suggest color matching
        if (currentAnalysis.color !== nextAnalysis.color) {
          suggestions.push({
            type: 'effect',
            description: `Add color transition between ${currentAnalysis.color} and ${nextAnalysis.color} clips`,
            confidence: 0.6,
            impact: 0.3,
            elements: [current.id, next.id],
            action: () => {
              // Add color grading effect
              if (!current.effects) current.effects = [];
              current.effects.push('color_transition');
            },
          });
        }
      }
    }
    
    return suggestions;
  }
  
  private generateTransitionSuggestions(): MagicSuggestion[] {
    const suggestions: MagicSuggestion[] = [];
    
    for (let i = 0; i < this.elements.length - 1; i++) {
      const current = this.elements[i];
      const next = this.elements[i + 1];
      
      const currentAnalysis = this.contentAnalysis.get(current.id);
      const nextAnalysis = this.contentAnalysis.get(next.id);
      
      if (currentAnalysis && nextAnalysis) {
        // Suggest appropriate transitions based on content
        let transitionType = 'fade';
        
        if (currentAnalysis.energy > 0.7 && nextAnalysis.energy > 0.7) {
          transitionType = 'cut'; // Fast cuts for high energy
        } else if (currentAnalysis.mood !== nextAnalysis.mood) {
          transitionType = 'dissolve'; // Smooth transitions for mood changes
        } else if (currentAnalysis.scene !== nextAnalysis.scene) {
          transitionType = 'wipe'; // Wipes for scene changes
        }
        
        suggestions.push({
          type: 'transition',
          description: `Add ${transitionType} transition between clips for smoother flow`,
          confidence: 0.8,
          impact: 0.4,
          elements: [current.id, next.id],
          action: () => {
            if (!current.effects) current.effects = [];
            current.effects.push(`transition_${transitionType}`);
          },
        });
      }
    }
    
    return suggestions;
  }
  
  private generateContentReorderSuggestions(): MagicSuggestion[] {
    const suggestions: MagicSuggestion[] = [];
    
    // Suggest grouping similar content
    const videoElements = this.elements.filter(e => e.type === 'video');
    const sceneGroups = new Map<string, TimelineElement[]>();
    
    for (const element of videoElements) {
      const analysis = this.contentAnalysis.get(element.id);
      if (analysis) {
        const key = `${analysis.scene}_${analysis.mood}`;
        if (!sceneGroups.has(key)) {
          sceneGroups.set(key, []);
        }
        sceneGroups.get(key)!.push(element);
      }
    }
    
    // Suggest grouping clips with similar characteristics
    for (const [sceneType, group] of sceneGroups) {
      if (group.length > 1) {
        const scattered = this.checkIfScattered(group);
        if (scattered) {
          suggestions.push({
            type: 'reorder',
            description: `Group ${sceneType.replace('_', ' ')} clips together for better narrative flow`,
            confidence: 0.6,
            impact: 0.5,
            elements: group.map(e => e.id),
            action: () => {
              // Reorder to group similar clips
              this.groupSimilarClips(group);
            },
          });
        }
      }
    }
    
    return suggestions;
  }
  
  private checkIfScattered(group: TimelineElement[]): boolean {
    // Check if similar clips are scattered throughout timeline
    const positions = group.map(e => this.elements.indexOf(e)).sort((a, b) => a - b);
    const averageGap = positions.reduce((sum, pos, i) => {
      if (i === 0) return sum;
      return sum + (pos - positions[i - 1]);
    }, 0) / (positions.length - 1);
    
    return averageGap > 2; // Scattered if average gap > 2 elements
  }
  
  private groupSimilarClips(group: TimelineElement[]) {
    // Move all clips in group to be consecutive
    // This is a simplified implementation
    const firstIndex = this.elements.indexOf(group[0]);
    
    group.slice(1).forEach((element, index) => {
      const currentIndex = this.elements.indexOf(element);
      this.elements.splice(currentIndex, 1);
      this.elements.splice(firstIndex + index + 1, 0, element);
    });
  }
  
  /**
   * Calculate arrangement quality score
   */
  calculateArrangementScore(elements: TimelineElement[]): ArrangementScore {
    this.elements = elements;
    
    const pacing = this.calculatePacingScore();
    const musicSync = this.calculateMusicSyncScore();
    const visualFlow = this.calculateVisualFlowScore();
    const transitions = this.calculateTransitionsScore();
    const engagement = this.calculateEngagementScore();
    
    const overall = (pacing + musicSync + visualFlow + transitions + engagement) / 5;
    
    this.currentScore = {
      overall,
      pacing,
      musicSync,
      visualFlow,
      transitions,
      engagement,
    };
    
    return this.currentScore;
  }
  
  private calculatePacingScore(): number {
    if (this.elements.length < 2) return 100;
    
    let score = 100;
    const avgDuration = this.elements.reduce((sum, e) => sum + e.duration, 0) / this.elements.length;
    
    for (let i = 0; i < this.elements.length - 1; i++) {
      const current = this.elements[i];
      const next = this.elements[i + 1];
      
      // Penalize large gaps
      const gap = next.startTime - (current.startTime + current.duration);
      if (gap > 1.0) score -= gap * 10;
      
      // Penalize very short or very long clips
      const durationRatio = current.duration / avgDuration;
      if (durationRatio < 0.3 || durationRatio > 3.0) {
        score -= 20;
      }
    }
    
    return Math.max(0, score);
  }
  
  private calculateMusicSyncScore(): number {
    if (this.beatMap.length === 0) return 50; // No audio to sync with
    
    let syncedElements = 0;
    const videoElements = this.elements.filter(e => e.type === 'video');
    
    for (const element of videoElements) {
      // Check if element starts close to a beat
      const nearestBeat = this.beatMap.reduce((closest, beat) => {
        const currentDiff = Math.abs(beat.timestamp - element.startTime);
        const closestDiff = Math.abs(closest.timestamp - element.startTime);
        return currentDiff < closestDiff ? beat : closest;
      });
      
      if (Math.abs(nearestBeat.timestamp - element.startTime) < 0.2) {
        syncedElements++;
      }
    }
    
    return videoElements.length > 0 ? (syncedElements / videoElements.length) * 100 : 50;
  }
  
  private calculateVisualFlowScore(): number {
    let score = 100;
    
    for (let i = 0; i < this.elements.length - 1; i++) {
      const current = this.elements[i];
      const next = this.elements[i + 1];
      
      const currentAnalysis = this.contentAnalysis.get(current.id);
      const nextAnalysis = this.contentAnalysis.get(next.id);
      
      if (currentAnalysis && nextAnalysis) {
        // Penalize jarring energy transitions
        const energyDrop = currentAnalysis.energy - nextAnalysis.energy;
        if (energyDrop > 0.5) score -= 15;
        
        // Penalize mood mismatches
        if (currentAnalysis.mood !== nextAnalysis.mood && 
            Math.abs(currentAnalysis.energy - nextAnalysis.energy) > 0.3) {
          score -= 10;
        }
      }
    }
    
    return Math.max(0, score);
  }
  
  private calculateTransitionsScore(): number {
    let score = 100;
    let hasTransitions = 0;
    
    for (const element of this.elements) {
      if (element.effects?.some(e => e.startsWith('transition_'))) {
        hasTransitions++;
      }
    }
    
    // Encourage some transitions but not too many
    const transitionRatio = hasTransitions / Math.max(1, this.elements.length - 1);
    if (transitionRatio < 0.3) score -= 20; // Too few
    if (transitionRatio > 0.8) score -= 30; // Too many
    
    return Math.max(0, score);
  }
  
  private calculateEngagementScore(): number {
    // Simulated engagement based on variety and pacing
    let score = 50;
    
    const uniqueMoods = new Set(
      Array.from(this.contentAnalysis.values()).map(a => a.mood)
    ).size;
    
    const uniqueScenes = new Set(
      Array.from(this.contentAnalysis.values()).map(a => a.scene)
    ).size;
    
    // Reward variety
    score += uniqueMoods * 10;
    score += uniqueScenes * 10;
    
    // Reward good pacing
    const avgEnergy = Array.from(this.contentAnalysis.values())
      .reduce((sum, a) => sum + a.energy, 0) / this.contentAnalysis.size;
    
    if (avgEnergy > 0.3 && avgEnergy < 0.8) score += 20; // Good energy balance
    
    return Math.min(100, score);
  }
  
  /**
   * Auto-arrange timeline using AI suggestions
   */
  async autoArrangeTimeline(
    elements: TimelineElement[],
    preferences: {
      prioritizeBeats?: boolean;
      maintainOrder?: boolean;
      aggressiveOptimization?: boolean;
    } = {}
  ): Promise<TimelineElement[]> {
    this.elements = [...elements];
    
    // Generate suggestions
    const suggestions = this.generateMagicSuggestions(this.elements);
    
    // Apply suggestions based on preferences
    let appliedSuggestions = 0;
    const maxSuggestions = preferences.aggressiveOptimization ? suggestions.length : 
                          Math.min(5, suggestions.length);
    
    for (let i = 0; i < maxSuggestions && i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      
      // Apply high-confidence, high-impact suggestions
      if (suggestion.confidence > 0.6 && suggestion.impact > 0.4) {
        try {
          suggestion.action();
          appliedSuggestions++;
        } catch (error) {
          console.warn('Failed to apply suggestion:', suggestion.description, error);
        }
      }
    }
    
    console.log(`Applied ${appliedSuggestions} magic suggestions to timeline`);
    
    return this.elements;
  }
  
  /**
   * Get current timeline score
   */
  getCurrentScore(): ArrangementScore {
    return this.currentScore;
  }
  
  /**
   * Reset analysis data
   */
  reset() {
    this.elements = [];
    this.beatMap = [];
    this.contentAnalysis.clear();
    this.currentScore = {
      overall: 0,
      pacing: 0,
      musicSync: 0,
      visualFlow: 0,
      transitions: 0,
      engagement: 0,
    };
  }
}

// Export singleton instance
export const magicAITimeline = new MagicAITimeline();

// Export utility functions
export function formatScore(score: number): string {
  if (score >= 90) return '🏆 Excellent';
  if (score >= 75) return '⭐ Great';
  if (score >= 60) return '👍 Good';
  if (score >= 45) return '👌 Fair';
  return '🔧 Needs Work';
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#10b981'; // green
  if (score >= 75) return '#3b82f6'; // blue
  if (score >= 60) return '#f59e0b'; // yellow
  if (score >= 45) return '#f97316'; // orange
  return '#ef4444'; // red
}
