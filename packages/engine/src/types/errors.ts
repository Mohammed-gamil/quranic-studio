// FILE: packages/engine/src/types/errors.ts

export type ErrorCode =
  | 'VALIDATION_ERROR'    // bad input payload
  | 'ADAPTER_ERROR'       // external API failure
  | 'NETWORK_ERROR'       // network timeout / unreachable
  | 'FFMPEG_ERROR'        // non-zero FFmpeg exit
  | 'DB_ERROR'            // SQLite failure
  | 'FILE_ERROR'          // missing file, write error
  | 'NOT_FOUND';          // job or file not found

export interface WazakkirError extends Error {
  code: ErrorCode;
  message: string;
  context?: Record<string, unknown>;
  retryable: boolean;     // true = queue can retry; false = user must fix input
}

// Custom error class to be able to instantiate easily as objects extending Error
export class WazakkirException extends Error implements WazakkirError {
  code: ErrorCode;
  context?: Record<string, unknown>;
  retryable: boolean;

  constructor(code: ErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'WazakkirException';
    this.code = code;
    this.context = context;
    
    const retryableMap: Record<ErrorCode, boolean> = {
      VALIDATION_ERROR: false,
      ADAPTER_ERROR:    true,
      NETWORK_ERROR:    true,
      FFMPEG_ERROR:     false,
      DB_ERROR:         false,
      FILE_ERROR:       false,
      NOT_FOUND:        false,
    };
    this.retryable = retryableMap[code];
  }
}

export function makeError(
  code: ErrorCode,
  message: string,
  context?: Record<string, unknown>
): WazakkirError {
  return new WazakkirException(code, message, context);
}
