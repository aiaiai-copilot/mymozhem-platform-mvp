/**
 * App Settings Validation
 *
 * Validates room appSettings against app manifest JSON Schema
 */

import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export interface AppManifest {
  name: string;
  version: string;
  settings?: Record<string, unknown>; // JSON Schema for settings
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null;
}

/**
 * Validate appSettings against the app manifest's settings schema
 *
 * @param settings - The appSettings to validate
 * @param manifest - The app's manifest containing the JSON Schema
 * @returns Validation result with errors if invalid
 */
export function validateAppSettings(
  settings: unknown,
  manifest: AppManifest
): ValidationResult {
  // If manifest doesn't define a settings schema, accept anything
  if (!manifest.settings) {
    return { valid: true, errors: null };
  }

  const validate = ajv.compile(manifest.settings);
  const valid = validate(settings);

  return {
    valid: valid === true,
    errors: valid ? null : validate.errors ?? null,
  };
}

/**
 * Format AJV errors into a human-readable message
 */
export function formatValidationErrors(errors: ErrorObject[] | null): string {
  if (!errors || errors.length === 0) {
    return 'Unknown validation error';
  }

  return errors
    .map((err) => {
      const path = err.instancePath || 'root';
      return `${path}: ${err.message}`;
    })
    .join('; ');
}
