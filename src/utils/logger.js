// src/utils/logger.js
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors } = format;
const chalk = require('chalk');

// Color map for levels
const levelColors = {
  info: chalk.cyan,
  error: chalk.red.bold,
  warn: chalk.yellow,
  debug: chalk.magenta,
  verbose: chalk.gray
};

const logFormat = printf(({ level, message, timestamp, stack }) => {
  const color = levelColors[level] || chalk.white;
  const levelUpper = level.toUpperCase().padEnd(5);
  const coloredLevel = color(levelUpper);
  const coloredTime = chalk.gray(timestamp);
  const divider = chalk.gray('│');
  
  // Format: 2026-05-08 16:45:21 │ INFO  │ Message
  let content = `${coloredTime} ${divider} ${coloredLevel} ${divider} ${message}`;
  if (stack) content += `\n${chalk.red(stack)}`;
  
  return content;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    format.splat(),
    logFormat
  ),
  transports: [
    new transports.Console()
  ]
// Hook into logger error events for Uranium Watcher AI incident monitoring
try {
  const { handleConsoleError } = require('./statusWatcher');
  logger.on('data', (log) => {
    if (log.level === 'error') {
      const msg = typeof log.message === 'string' ? log.message : (log.stack || JSON.stringify(log));
      setImmediate(() => {
        handleConsoleError(msg, { timestamp: log.timestamp }).catch(() => null);
      });
    }
  });
} catch (e) {
  // Silent fallback
}

module.exports = logger;
