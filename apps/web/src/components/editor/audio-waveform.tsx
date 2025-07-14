import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioWaveformProps {
  audioUrl: string;
  height?: number;
  className?: string;
  fadeIn?: number;
  fadeOut?: number;
  duration?: number;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ 
  audioUrl, 
  height = 32, 
  className = '',
  fadeIn = 0,
  fadeOut = 0,
  duration = 0
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
          wavesurfer.current = null;
        }

        // Clear the container
        waveformRef.current.innerHTML = '';

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
      wavesurfer.current = null;
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
      {/* Fade overlays */}
      {!isLoading && duration > 0 && (fadeIn > 0 || fadeOut > 0) && (
        <>
          {fadeIn > 0 && (
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-black/40 to-transparent pointer-events-none"
              style={{ width: `${(fadeIn / duration) * 100}%` }}
            />
          )}
          {fadeOut > 0 && (
            <div 
              className="absolute top-0 right-0 h-full bg-gradient-to-l from-black/40 to-transparent pointer-events-none"
              style={{ width: `${(fadeOut / duration) * 100}%` }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AudioWaveform;