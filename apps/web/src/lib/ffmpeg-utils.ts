import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";

let ffmpeg: FFmpeg | null = null;

export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  await ffmpeg.load(); // Use default config

  return ffmpeg;
};

export const generateThumbnail = async (
  videoFile: File,
  timeInSeconds = 1
): Promise<string> => {
  const ffmpeg = await initFFmpeg();

  const inputName = "input.mp4";
  const outputName = "thumbnail.jpg";

  // Write input file
  await ffmpeg.writeFile(
    inputName,
    new Uint8Array(await videoFile.arrayBuffer())
  );

  // Generate thumbnail at specific time
  await ffmpeg.exec([
    "-i",
    inputName,
    "-ss",
    timeInSeconds.toString(),
    "-vframes",
    "1",
    "-vf",
    "scale=320:240",
    "-q:v",
    "2",
    outputName,
  ]);

  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: "image/jpeg" });

  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  return URL.createObjectURL(blob);
};

export const trimVideo = async (
  videoFile: File,
  startTime: number,
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();

  const inputName = "input.mp4";
  const outputName = "output.mp4";

  // Set up progress callback
  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  // Write input file
  await ffmpeg.writeFile(
    inputName,
    new Uint8Array(await videoFile.arrayBuffer())
  );

  const duration = endTime - startTime;

  // Trim video
  await ffmpeg.exec([
    "-i",
    inputName,
    "-ss",
    startTime.toString(),
    "-t",
    duration.toString(),
    "-c",
    "copy", // Use stream copy for faster processing
    outputName,
  ]);

  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: "video/mp4" });

  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  return blob;
};

export const getVideoInfo = async (
  videoFile: File
): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
}> => {
  const ffmpeg = await initFFmpeg();

  const inputName = "input.mp4";
  const ffprobeOutputJson = "out.json";

  // Write input file
  await ffmpeg.writeFile(
    inputName,
    new Uint8Array(await videoFile.arrayBuffer())
  );

  // Run ffprobe to get info (stderr will contain the info)
  try {
    await ffmpeg.ffprobe([
      "-v",
       "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      "-select_streams",
      "v:0",
      inputName,
      "-o",
      ffprobeOutputJson,
    ]);
    const json = await ffmpeg.readFile(ffprobeOutputJson, "utf8");

    const info = JSON.parse(json as string);
    const width = info.streams[0].width;
    const height = info.streams[0].height;
    const fps = parseFrameRate(info.streams[0].r_frame_rate);
    const duration = parseFloat(info.format.duration);

    return {
      duration,
      width,
      height,
      fps,
    }
  } catch (error) {
    console.error("FFprobe execution failed:", error);
    throw new Error(
      "Failed to extract video info. The file may be corrupted or in an unsupported format."
    );
  } finally {
    // Cleanup
    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(ffprobeOutputJson);
    } catch(e) {
      console.error("Error deleting temporary files:", e);
    }
  }
};


export const convertToWebM = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();

  const inputName = "input.mp4";
  const outputName = "output.webm";

  // Set up progress callback
  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  // Write input file
  await ffmpeg.writeFile(
    inputName,
    new Uint8Array(await videoFile.arrayBuffer())
  );

  // Convert to WebM
  await ffmpeg.exec([
    "-i",
    inputName,
    "-c:v",
    "libvpx-vp9",
    "-crf",
    "30",
    "-b:v",
    "0",
    "-c:a",
    "libopus",
    outputName,
  ]);

  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: "video/webm" });

  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  return blob;
};

export const extractAudio = async (
  videoFile: File,
  format: "mp3" | "wav" = "mp3"
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();

  const inputName = "input.mp4";
  const outputName = `output.${format}`;

  // Write input file
  await ffmpeg.writeFile(
    inputName,
    new Uint8Array(await videoFile.arrayBuffer())
  );

  // Extract audio
  await ffmpeg.exec([
    "-i",
    inputName,
    "-vn", // Disable video
    "-acodec",
    format === "mp3" ? "libmp3lame" : "pcm_s16le",
    outputName,
  ]);

  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: `audio/${format}` });

  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  return blob;
};

export const extractTimelineAudio = async (
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  // Create fresh FFmpeg instance for this operation
  const ffmpeg = new FFmpeg();

  try {
    await ffmpeg.load();
  } catch (error) {
    console.error("Failed to load fresh FFmpeg instance:", error);
    throw new Error("Unable to initialize audio processing. Please try again.");
  }

  const timeline = useTimelineStore.getState();
  const mediaStore = useMediaStore.getState();

  const tracks = timeline.tracks;
  const totalDuration = timeline.getTotalDuration();

  if (totalDuration === 0) {
    const emptyAudioData = new ArrayBuffer(44);
    return new Blob([emptyAudioData], { type: "audio/wav" });
  }

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  const audioElements: Array<{
    file: File;
    startTime: number;
    duration: number;
    trimStart: number;
    trimEnd: number;
    trackMuted: boolean;
  }> = [];

  for (const track of tracks) {
    if (track.muted) continue;

    for (const element of track.elements) {
      if (element.type === "media") {
        const mediaItem = mediaStore.mediaItems.find(
          (m) => m.id === element.mediaId
        );
        if (!mediaItem) continue;

        if (mediaItem.type === "video" || mediaItem.type === "audio") {
          audioElements.push({
            file: mediaItem.file,
            startTime: element.startTime,
            duration: element.duration,
            trimStart: element.trimStart,
            trimEnd: element.trimEnd,
            trackMuted: track.muted || false,
          });
        }
      }
    }
  }

  if (audioElements.length === 0) {
    // Return silent audio if no audio elements
    const silentDuration = Math.max(1, totalDuration); // At least 1 second
    try {
      const silentAudio = await generateSilentAudio(silentDuration);
      return silentAudio;
    } catch (error) {
      console.error("Failed to generate silent audio:", error);
      throw new Error("Unable to generate audio for empty timeline.");
    }
  }

  // Create a complex filter to mix all audio sources
  const inputFiles: string[] = [];
  const filterInputs: string[] = [];

  try {
    for (let i = 0; i < audioElements.length; i++) {
      const element = audioElements[i];
      const inputName = `input_${i}.${element.file.name.split(".").pop()}`;
      inputFiles.push(inputName);

      try {
        await ffmpeg.writeFile(
          inputName,
          new Uint8Array(await element.file.arrayBuffer())
        );
      } catch (error) {
        console.error(`Failed to write file ${element.file.name}:`, error);
        throw new Error(
          `Unable to process file: ${element.file.name}. The file may be corrupted or in an unsupported format.`
        );
      }

      const actualStart = element.trimStart;
      const actualDuration =
        element.duration - element.trimStart - element.trimEnd;

      const filterName = `audio_${i}`;
      filterInputs.push(
        `[${i}:a]atrim=start=${actualStart}:duration=${actualDuration},asetpts=PTS-STARTPTS,adelay=${element.startTime * 1000}|${element.startTime * 1000}[${filterName}]`
      );
    }

    const mixFilter =
      audioElements.length === 1
        ? `[audio_0]aresample=44100,aformat=sample_fmts=s16:channel_layouts=stereo[out]`
        : `${filterInputs.map((_, i) => `[audio_${i}]`).join("")}amix=inputs=${audioElements.length}:duration=longest:dropout_transition=2,aresample=44100,aformat=sample_fmts=s16:channel_layouts=stereo[out]`;

    const complexFilter = [...filterInputs, mixFilter].join(";");
    const outputName = "timeline_audio.wav";

    const ffmpegArgs = [
      ...inputFiles.flatMap((name) => ["-i", name]),
      "-filter_complex",
      complexFilter,
      "-map",
      "[out]",
      "-t",
      totalDuration.toString(),
      "-c:a",
      "pcm_s16le",
      "-ar",
      "44100",
      outputName,
    ];

    try {
      await ffmpeg.exec(ffmpegArgs);
    } catch (error) {
      console.error("FFmpeg execution failed:", error);
      throw new Error(
        "Audio processing failed. Some audio files may be corrupted or incompatible."
      );
    }

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: "audio/wav" });

    return blob;
  } catch (error) {
    for (const inputFile of inputFiles) {
      try {
        await ffmpeg.deleteFile(inputFile);
      } catch (cleanupError) {
        console.warn(`Failed to cleanup file ${inputFile}:`, cleanupError);
      }
    }
    try {
      await ffmpeg.deleteFile("timeline_audio.wav");
    } catch (cleanupError) {
      console.warn("Failed to cleanup output file:", cleanupError);
    }

    throw error;
  } finally {
    for (const inputFile of inputFiles) {
      try {
        await ffmpeg.deleteFile(inputFile);
      } catch (cleanupError) {}
    }
    try {
      await ffmpeg.deleteFile("timeline_audio.wav");
    } catch (cleanupError) {}
  }
};

const generateSilentAudio = async (durationSeconds: number): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();
  const outputName = "silent.wav";

  try {
    await ffmpeg.exec([
      "-f",
      "lavfi",
      "-i",
      `anullsrc=channel_layout=stereo:sample_rate=44100`,
      "-t",
      durationSeconds.toString(),
      "-c:a",
      "pcm_s16le",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: "audio/wav" });

    return blob;
  } catch (error) {
    console.error("Failed to generate silent audio:", error);
    throw error;
  } finally {
    try {
      await ffmpeg.deleteFile(outputName);
    } catch (cleanupError) {
      // Silent cleanup
    }
  }
};

// r_frame_rate from ffprobe, for example "60000/1001", "30"
const parseFrameRate = (r_frame_rate: string) => {
  let r: number;
  if (r_frame_rate.indexOf("/") > 0) {
    const [n, m] = r_frame_rate.split("/");
    r = parseFloat(n) / parseFloat(m);
  } else {
    r =  parseFloat(r_frame_rate);
  }
  return Number.isFinite(r) && r > 0 ? r : 0;
};
