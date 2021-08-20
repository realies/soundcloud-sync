/* eslint-disable import/prefer-default-export */
import pino from 'pino';

export const logger = pino({
  prettyPrint: {
    colorize: true,
    translateTime: true,
    ignore: 'pid,hostname',
  },
});
