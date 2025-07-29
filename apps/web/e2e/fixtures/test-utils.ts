import { readFileSync, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Creates a test image buffer for consistent testing across e2e tests
 * @returns Buffer containing test image data
 */
export function createTestImageBuffer(): Buffer {
  // Use the existing test-image-real.jpg from fixtures
  const imagePath = join(__dirname, 'test-image-real.jpg');
  
  // Check if the file exists, otherwise use minimal image as fallback
  if (!existsSync(imagePath)) {
    console.warn(`Test image not found at ${imagePath}, using minimal image as fallback`);
    return createMinimalTestImageBuffer();
  }
  
  try {
    return readFileSync(imagePath);
  } catch (error) {
    console.error(`Error reading test image: ${error}`);
    return createMinimalTestImageBuffer();
  }
}

/**
 * Async version of createTestImageBuffer
 * @returns Promise<Buffer> containing test image data
 */
export async function createTestImageBufferAsync(): Promise<Buffer> {
  const imagePath = join(__dirname, 'test-image-real.jpg');
  
  try {
    return await readFile(imagePath);
  } catch (error) {
    console.warn(`Test image not found or error reading: ${error}, using minimal image as fallback`);
    return createMinimalTestImageBuffer();
  }
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
 * Async version of createTestImageFile
 * @param filename Optional custom filename
 * @returns Promise<Object> suitable for Playwright's setInputFiles method
 */
export async function createTestImageFileAsync(filename = 'test-image.jpg') {
  return {
    name: filename,
    mimeType: 'image/jpeg',
    buffer: await createTestImageBufferAsync()
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