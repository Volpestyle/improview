#!/usr/bin/env node
/**
 * Shared logging helper for Improview Node scripts.
 */

const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR;

const palette = {
  reset: '\x1b[0m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  success: '\x1b[32m',
  highlight: '\x1b[35m',
  debug: '\x1b[90m',
};

const colorize = (color, message) => {
  if (!supportsColor || !color) {
    return message;
  }
  return `${color}${message}${palette.reset}`;
};

const formatStepLabel = (label) =>
  `${colorize(palette.info, '==>')} ${colorize(palette.highlight, label)}`;

const createLogger = ({ debug = false } = {}) => {
  const log = (levelColor, stream, message) => {
    // eslint-disable-next-line no-console
    stream.call(console, colorize(levelColor, message));
  };

  return {
    step(message) {
      log(null, console.log, formatStepLabel(message));
    },
    info(message) {
      log(palette.info, console.log, message);
    },
    warn(message) {
      log(palette.warn, console.warn, message);
    },
    error(message) {
      log(palette.error, console.error, message);
    },
    success(message) {
      log(palette.success, console.log, message);
    },
    debug(message) {
      if (debug) {
        log(palette.debug, console.log, message);
      }
    },
    raw(...args) {
      // eslint-disable-next-line no-console
      console.log(...args);
    },
    palette,
    colorize,
  };
};

module.exports = {
  createLogger,
  palette,
  colorize,
  supportsColor,
  formatStepLabel,
};

