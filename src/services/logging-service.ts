
import { Logger } from '@type';
import * as log4js from 'log4js';

export class LoggingService {
    private logger: Logger;
    private static isConfigured = false;

    constructor() {
        this.configureLog4js();
        this.logger = log4js.getLogger();
    }

    private configureLog4js() {
        if (LoggingService.isConfigured) {
            return;
        }

        const logLevel = process.env.LOG_LEVEL || 'info';
        const isLocal = process.env.NODE_ENV === 'development' || process.env.IS_OFFLINE === 'true';

        log4js.configure({
            appenders: {
                console: {
                    type: 'console',
                    layout: {
                        type: 'pattern',
                        pattern: isLocal
                            ? '%d{yyyy-MM-dd hh:mm:ss} [%p] %c - %m'
                            : '[%d{ISO}] [%p] %m'
                    }
                }
            },
            categories: {
                default: {
                    appenders: ['console'],
                    level: logLevel
                }
            }
        });

        LoggingService.isConfigured = true;
    }

    /**
     * Gets the logger instance
     * @returns The logger instance
     */
    getLogger() {
        if (!this.logger) {
            this.configureLog4js();
            this.logger = log4js.getLogger();
        }
        return this.logger;
    }

    /**
     * Logs an info message
     * @param message - The message to log
     * @param data - The data to log
     */
    info(message: string, data?: any) {
        this.logger.info(message, data || '');
    }

    /**
     * Logs an error message
     * @param message - The message to log
     * @param data - The data to log
     */
    error(message: string | any, data?: any) {
        this.logger.error(message, data || '');
    }

    /**
     * Logs a debug message
     * @param message - The message to log
     * @param data - The data to log
     */
    debug(message: string, data?: any) {
        this.logger.debug(message, data || '');
    }

    /**
     * Logs a warning message
     * @param message - The message to log
     * @param data - The data to log
     */
    warn(message: string, data?: any) {
        this.logger.warn(message, data || '');
    }

    /**
     * Logs a fatal message
     * @param message - The message to log
     * @param data - The data to log
     */
    fatal(message: string, data?: any) {
        this.logger.fatal(message, data || '');
    }

}