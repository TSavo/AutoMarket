/**
 * Validation utilities for API responses
 * 
 * This file contains utility functions for validating API responses
 * using Zod schemas.
 */

import { z } from 'zod';

/**
 * Validate data against a schema
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @param errorPrefix Optional prefix for error messages
 * @returns Validated data (typed)
 * @throws Error if validation fails
 */
export function validateData<T>(
  schema: z.ZodType<T>,
  data: unknown,
  errorPrefix = 'Validation error'
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => {
        return `${err.path.join('.')}: ${err.message}`;
      }).join(', ');
      
      throw new Error(`${errorPrefix}: ${formattedErrors}`);
    }
    throw error;
  }
}

/**
 * Validate data against a schema, returning null if validation fails
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validated data (typed) or null if validation fails
 */
export function validateDataSafe<T>(
  schema: z.ZodType<T>,
  data: unknown
): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error('Validation error:', error);
    return null;
  }
}

/**
 * Validate API response
 * @param schema Zod schema to validate against
 * @param response API response to validate
 * @param apiName Name of the API for error messages
 * @returns Validated response data (typed)
 * @throws Error if validation fails
 */
export async function validateApiResponse<T>(
  schema: z.ZodType<T>,
  response: Response,
  apiName: string
): Promise<T> {
  if (!response.ok) {
    throw new Error(`${apiName} API error: ${response.status} ${response.statusText}`);
  }
  
  try {
    const data = await response.json();
    return validateData(schema, data, `${apiName} API response validation error`);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${apiName} API returned invalid JSON: ${error.message}`);
    }
    throw error;
  }
}
