import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Creates a test image buffer for consistent testing across e2e tests
 * @returns Buffer containing test image data
 */
export function createTestImageBuffer(): Buffer {
  // Use the existing test-image-real.jpg from fixtures
  const imagePath = join(__dirname, 'test-image-real.jpg');
  return readFileSync(imagePath);
}

/**
 * Creates a test image file object for Playwright's setInputFiles
 * @param filename Optional custom filename
 * @returns Object suitable for Playwright's setInputFiles method
 */
export function createTestImageFile(filename = 'test-image.jpg') {
  return {
    name: filename,
    mimeType: 'image/jpeg',
    buffer: createTestImageBuffer()
  };
}

/**
 * Creates a minimal 1x1 pixel PNG for lightweight tests
 * @returns Buffer containing a 1x1 transparent PNG
 */
export function createMinimalTestImageBuffer(): Buffer {
  // 1x1 transparent PNG - useful for tests that don't need a real image
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  return Buffer.from(base64, 'base64');
}