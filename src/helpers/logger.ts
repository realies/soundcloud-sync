import process from 'node:process';

type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');

  const offset = -date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60)
    .toString()
    .padStart(2, '0');
  const offsetMinutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
  const offsetSign = offset >= 0 ? '+' : '-';

  return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms} ${offsetSign}${offsetHours}${offsetMinutes}]`;
}

function formatMessage(level: LogLevel, ...args: unknown[]): string {
  const timestamp = formatDate(new Date());
  const parts = args.map(arg => {
    if (typeof arg === 'string') return arg;
    return JSON.stringify(arg, null, 2);
  });
  return `${timestamp} ${level}: ${parts.join(' ')}`;
}

class Logger {
  private level: LogLevel = 'INFO';

  trace(...args: unknown[]): void {
    if (this.isEnabled('TRACE')) {
      console.log(formatMessage('TRACE', ...args));
    }
  }

  debug(...args: unknown[]): void {
    if (this.isEnabled('DEBUG')) {
      console.log(formatMessage('DEBUG', ...args));
    }
  }

  info(...args: unknown[]): void {
    if (this.isEnabled('INFO')) {
      console.log(formatMessage('INFO', ...args));
    }
  }

  warn(...args: unknown[]): void {
    if (this.isEnabled('WARN')) {
      console.log(formatMessage('WARN', ...args));
    }
  }

  error(...args: unknown[]): void {
    if (this.isEnabled('ERROR')) {
      console.error(formatMessage('ERROR', ...args));
    }
  }

  fatal(...args: unknown[]): void {
    if (this.isEnabled('FATAL')) {
      console.error(formatMessage('FATAL', ...args));
    }
  }

  private isEnabled(level: LogLevel): boolean {
    const levels: LogLevel[] = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const currentLevel = (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || this.level;
    return levels.indexOf(level) >= levels.indexOf(currentLevel);
  }
}

export default new Logger();
