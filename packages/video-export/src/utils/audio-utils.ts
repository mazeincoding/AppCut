/**
 * Audio utility functions
 */

/**
 * Convert AudioBuffer to f32-planar format for WebCodecs
 * Planar format: [L0, L1, L2, ..., Ln, R0, R1, R2, ..., Rn]
 */
export function bufferToF32Planar(input: AudioBuffer): Float32Array {
  const result = new Float32Array(input.length * input.numberOfChannels);

  let offset = 0;
  for (let i = 0; i < input.numberOfChannels; i++) {
    const data = input.getChannelData(i);
    result.set(data, offset);
    offset += data.length;
  }

  return result;
}

/**
 * Convert AudioBuffer to i16-interleaved format  
 * Interleaved format: [L0, R0, L1, R1, L2, R2, ..., Ln, Rn]
 */
export function bufferToI16Interleaved(audioBuffer: AudioBuffer): Int16Array {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const interleaved = new Int16Array(length * numberOfChannels);

  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      let sample = audioBuffer.getChannelData(channel)[i] * 32767; // Convert float [-1,1] to 16-bit PCM
      
      // Clamp values to the Int16 range
      if (sample > 32767) sample = 32767;
      if (sample < -32767) sample = -32767;

      interleaved[i * numberOfChannels + channel] = sample;
    }
  }

  return interleaved;
}
