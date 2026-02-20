import { logger } from "../utils/logger.js";

export interface AuthContext {
  apiKey: string;
  isValid: boolean;
}

/**
 * Validates an API key.
 * TODO: Implement actual validation against Dojo backend.
 */
export function validateApiKey(apiKey: string | undefined): AuthContext {
  if (!apiKey) {
    logger.warn("No API key provided");
    return { apiKey: "", isValid: false };
  }

  // STUB: accept any non-empty key
  logger.debug("API key validation (stub)", {
    keyPrefix: apiKey.substring(0, 8),
  });
  return { apiKey, isValid: true };
}

export function getApiKeyFromEnv(): string | undefined {
  return process.env.DOJO_API_KEY;
}

export function getApiKeyFromHeader(
  authHeader: string | undefined,
): string | undefined {
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  return authHeader.slice(7);
}
