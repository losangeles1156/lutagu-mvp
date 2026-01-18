/**
 * Logger Utility
 *
 * Provides environment-aware logging to prevent console pollution in production.
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/utils/logger';
 *
 * logger.log('Debug info');
 * logger.error('Error occurred', error);
 * logger.warn('Warning message');
 * ```
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
  }

  /**
   * Log debug information (development only)
   */
  log(...args: any[]): void {
    if (this.isDev) {
      console.log(...args);
    }
  }

  /**
   * Log informational messages (development only)
   */
  info(...args: any[]): void {
    if (this.isDev) {
      console.info(...args);
    }
  }

  /**
   * Log warnings (always shown)
   */
  warn(...args: any[]): void {
    console.warn(...args);
  }

  /**
   * Log errors (always shown)
   * TODO: Integrate with error tracking service (e.g., Sentry)
   */
  error(...args: any[]): void {
    console.error(...args);
    // Future: Send to error tracking service
    // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    //   Sentry.captureException(args[0]);
    // }
  }

  /**
   * Log debug information (development only)
   */
  debug(...args: any[]): void {
    if (this.isDev) {
      console.debug(...args);
    }
  }

  /**
   * Conditional logging based on condition
   */
  logIf(condition: boolean, ...args: any[]): void {
    if (condition && this.isDev) {
      console.log(...args);
    }
  }

  /**
   * Group logs together (development only)
   */
  group(label: string, callback: () => void): void {
    if (this.isDev) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Performance timing
   */
  time(label: string): void {
    if (this.isDev) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDev) {
      console.timeEnd(label);
    }
  }
}

export const logger = new Logger();
