import * as Sentry from "@sentry/nextjs";

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
  }

  /**
   * PII Scrubber: Mask sensitive patterns in logs
   */
  private scrub(args: any[]): any[] {
    const PII_PATTERNS = [
      { name: 'UUID', re: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, mask: '[MASKED-UUID]' },
      { name: 'EMAIL', re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, mask: '[MASKED-EMAIL]' },
      { name: 'COORD', re: /([-+]?\d{1,2}\.\d+, ?[-+]?\d{1,3}\.\d+)/g, mask: '[MASKED-COORD]' },
      { name: 'TOKEN', re: /(bearer\s+[a-zA-Z0-9\-._~+/]+=*|token[:=]\s*[a-zA-Z0-9\-._~+/]+=*)/gi, mask: '[MASKED-TOKEN]' }
    ];

    return args.map(arg => {
      if (typeof arg === 'string') {
        let scrubbed = arg;
        for (const p of PII_PATTERNS) {
          scrubbed = scrubbed.replace(p.re, p.mask);
        }
        return scrubbed;
      }
      if (arg && typeof arg === 'object') {
        try {
          const str = JSON.stringify(arg);
          let scrubbedStr = str;
          for (const p of PII_PATTERNS) {
            scrubbedStr = scrubbedStr.replace(p.re, p.mask);
          }
          return JSON.parse(scrubbedStr);
        } catch {
          return arg; // Fallback if not stringifiable
        }
      }
      return arg;
    });
  }

  log(...args: any[]): void {
    if (this.isDev) {
      console.log(...this.scrub(args));
    }
  }

  info(...args: any[]): void {
    if (this.isDev) {
      console.info(...this.scrub(args));
    }
  }

  warn(...args: any[]): void {
    console.warn(...this.scrub(args));
  }

  error(...args: any[]): void {
    const scrubbed = this.scrub(args);
    console.error(...scrubbed);

    // Send to Sentry if in production or configured
    if (!this.isDev || process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const errorObj = args.find(a => a instanceof Error);
      if (errorObj) {
        Sentry.captureException(errorObj, {
          extra: { logArgs: scrubbed }
        });
      } else {
        Sentry.captureMessage(String(scrubbed[0]), {
          level: 'error',
          extra: { logArgs: scrubbed }
        });
      }
    }
  }

  debug(...args: any[]): void {
    if (this.isDev) {
      console.debug(...this.scrub(args));
    }
  }

  logIf(condition: boolean, ...args: any[]): void {
    if (condition && this.isDev) {
      console.log(...this.scrub(args));
    }
  }

  group(label: string, callback: () => void): void {
    if (this.isDev) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }

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

