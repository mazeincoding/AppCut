import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { ExportLogger } from './logger';

export class FontManager {
  private ffmpeg: FFmpeg;
  private logger: ExportLogger;
  private fontLoaded = false;
  private loadedFonts = new Set<string>();

  // Font mapping from UI names to font files
  private fontMapping = {
    'Inter': '/fonts/inter.ttf',
    'Roboto': '/fonts/roboto.ttf',
    'Open Sans': '/fonts/opensans.ttf',
    'Playfair Display': '/fonts/playfair.ttf',
    'Comic Neue': '/fonts/comicneue.ttf',
    'Arial': '/fonts/arial.ttf',
    'Helvetica': '/fonts/helvetica.ttf',
    'Times New Roman': '/fonts/times.ttf',
    'Georgia': '/fonts/georgia.ttf',
  };

  constructor(ffmpeg: FFmpeg, logger: ExportLogger) {
    this.ffmpeg = ffmpeg;
    this.logger = logger;
  }

  async loadFont(fontFamily: string = 'Inter'): Promise<string> {
    const fontPath = this.fontMapping[fontFamily as keyof typeof this.fontMapping] || this.fontMapping['Inter'];
    const fontFileName = `${fontFamily.replace(/\s+/g, '_').toLowerCase()}.ttf`; // TODO: Make this more robust

    if (this.loadedFonts.has(fontFileName)) {
      return fontFileName;
    }

    try {
      this.logger.log(`Loading font: ${fontFamily} from ${fontPath}`);
      const fontData = await fetchFile(fontPath);
      await this.ffmpeg.writeFile(fontFileName, fontData);
      this.loadedFonts.add(fontFileName);
      this.fontLoaded = true;
      this.logger.log(`Successfully loaded font: ${fontFamily}`);
      return fontFileName;
    } catch (error) {
      this.logger.warn(`Failed to load font ${fontFamily}: ${error}`);
      // Fallback to Inter if specific font fails
      if (fontFamily !== 'Inter') {
        return await this.loadFont('Inter');
      }
      throw error;
    }
  }

  isFontLoaded(): boolean {
    return this.fontLoaded;
  }
}