import { ValidationResult } from './types';
import { ExportLogger } from './logger';

export class FilterValidator {
  private logger: ExportLogger;

  constructor(logger: ExportLogger) {
    this.logger = logger;
  }

  /**
   * Validates a single filter string
   */
  validateFilter(filter: string, filterType: string): boolean {
    if (!filter || !filter.trim() || filter.length === 0) {
      this.logger.debug(`Empty ${filterType} filter detected`);
      return false;
    }

    if (filter.includes('undefined') || filter.includes('null')) {
      this.logger.debug(`Invalid ${filterType} filter contains undefined/null: ${filter}`);
      return false;
    }

    return true;
  }

  /**
   * Validates an array of filters
   */
  validateFilters(filters: string[], filterType: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validFilters: string[] = [];

    filters.forEach((filter, index) => {
      if (this.validateFilter(filter, filterType)) {
        validFilters.push(filter);
      } else {
        errors.push(`Invalid ${filterType} filter at index ${index}: "${filter}"`);
      }
    });

    if (validFilters.length === 0 && filters.length > 0) {
      warnings.push(`No valid ${filterType} filters found out of ${filters.length} total`);
    }

    return {
      isValid: validFilters.length > 0 || filters.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates timing parameters
   */
  validateTiming(startTime: number, duration: number, videoDuration: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (duration <= 0.01) {
      errors.push(`Duration too short: ${duration}s (minimum 0.01s)`);
    }

    if (startTime < 0) {
      errors.push(`Negative start time: ${startTime}s`);
    }

    if (!isFinite(startTime) || !isFinite(duration)) {
      errors.push(`Non-finite timing values: startTime=${startTime}, duration=${duration}`);
    }

    if (startTime >= videoDuration) {
      warnings.push(`Start time (${startTime}s) exceeds video duration (${videoDuration}s)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Cleans a filter complex string to remove empty segments
   */
  cleanFilterComplex(filterComplex: string): string {
    if (!filterComplex || !filterComplex.trim()) {
      return '';
    }

    // Remove empty segments and clean up separators
    return filterComplex
      .replace(/;+/g, ';')        // Replace multiple semicolons with single
      .replace(/^;|;$/g, '')      // Remove leading/trailing semicolons
      .trim();
  }
}