import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioWaveformProps {
  audioUrl: string;
  height?: number;
  className?: string;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ 
  audioUrl, 
  height = 32, 
  className = '' 
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initWaveSurfer = async () => {
      if (!waveformRef.current || !audioUrl) return;

      try {
        // Clean up any existing instance
        if (wavesurfer.current) {
          try {
            wavesurfer.current.destroy();
          } catch (e) {
            // Silently ignore destroy errors
          }
          wavesurfer.current = null;
        }

        wavesurfer.current = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: 'rgba(255, 255, 255, 0.6)',
          progressColor: 'rgba(255, 255, 255, 0.9)',
          cursorColor: 'transparent',
          barWidth: 2,
          barGap: 1,
          height: height,
          normalize: true,
          interact: false,
        });

        // Event listeners
        wavesurfer.current.on('ready', () => {
          if (mounted) {
            setIsLoading(false);
            setError(false);
          }
        });

        wavesurfer.current.on('error', (err) => {
          console.error('WaveSurfer error:', err);
          if (mounted) {
            setError(true);
            setIsLoading(false);
          }
        });

        await wavesurfer.current.load(audioUrl);

      } catch (err) {
        console.error('Failed to initialize WaveSurfer:', err);
        if (mounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    initWaveSurfer();

    return () => {
      mounted = false;
      if (wavesurfer.current) {
        try {
          wavesurfer.current.destroy();
        } catch (e) {
          // Silently ignore destroy errors
        }
        wavesurfer.current = null;
      }
    };
  }, [audioUrl, height]);

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <span className="text-xs text-foreground/60">Audio unavailable</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-foreground/60">Loading...</span>
        </div>
      )}
      <div 
        ref={waveformRef} 
        className={`w-full transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        style={{ height }}
      />
    </div>
  );
};

export default AudioWaveform;