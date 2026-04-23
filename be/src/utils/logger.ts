export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogMeta = Record<string, unknown>;

const shouldLogDebug = process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug';

const writeLog = (level: LogLevel, message: string, meta?: LogMeta): void => {
  if (level === 'debug' && !shouldLogDebug) return;

  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    message,
  };

  if (meta && Object.keys(meta).length > 0) {
    payload.meta = meta;
  }

  const serialized = JSON.stringify(payload);
  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
};

export const logger = {
  debug: (message: string, meta?: LogMeta): void => writeLog('debug', message, meta),
  info: (message: string, meta?: LogMeta): void => writeLog('info', message, meta),
  warn: (message: string, meta?: LogMeta): void => writeLog('warn', message, meta),
  error: (message: string, meta?: LogMeta): void => writeLog('error', message, meta),
};
