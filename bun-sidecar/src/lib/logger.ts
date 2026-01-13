import winston from 'winston';
import { join } from 'path';
import { homedir } from 'os';
import { getNoetectPath, hasActiveWorkspace } from '@/storage/root-path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Get log directory - uses workspace .noetect if available, otherwise app support directory
function getLogDir(): string {
  if (hasActiveWorkspace()) {
    return getNoetectPath();
  }
  return join(homedir(), 'Library/Application Support/com.firstloop.noetect');
}

function getLogFile(): string {
  return join(getLogDir(), 'logs.txt');
}

// Initial paths (may be updated after workspace init)
let LOG_DIR = getLogDir();
let LOG_FILE = getLogFile();

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const serviceTag = service ? `[${service}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${serviceTag} ${message}${metaStr}`;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport for persistent logs
    new winston.transports.File({
      filename: LOG_FILE,
      format: fileFormat,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create service-specific loggers
export const createServiceLogger = (service: string) => {
  return {
    error: (message: string, meta?: Record<string, unknown>) => logger.error(message, { service, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, { service, ...meta }),
    info: (message: string, meta?: Record<string, unknown>) => logger.info(message, { service, ...meta }),
    http: (message: string, meta?: Record<string, unknown>) => logger.http(message, { service, ...meta }),
    debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, { service, ...meta }),
  };
};

// Default logger without service tag
export const log = {
  error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
  info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
  http: (message: string, meta?: Record<string, unknown>) => logger.http(message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta),
};

// Ensure log directory exists
import { mkdirSync } from 'fs';
try {
  mkdirSync(LOG_DIR, { recursive: true });
} catch (error) {
  console.error('Failed to create log directory:', error);
}

// Log the initialization
log.info('Logger initialized', { 
  logFile: LOG_FILE, 
  logLevel: logger.level,
  environment: process.env.NODE_ENV || 'development'
});

export default logger;
export { LOG_FILE, LOG_DIR, getLogDir, getLogFile };