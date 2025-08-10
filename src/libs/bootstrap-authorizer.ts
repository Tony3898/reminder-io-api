import JwtService from '@services/jwt-service';
import { LoggingService } from '@services/logging-service';
import { config } from 'dotenv';

config();

export async function bootstrapAuthorizer() {
    try {
        const logger = new LoggingService().getLogger();
        logger.debug('Bootstrap configuration');
        const jwtService = new JwtService();
        return {
            jwtService,
            logger,
        };
    } catch (err) {
        new LoggingService().getLogger().error('error reading config', err);
        throw err;
    }
}

export default bootstrapAuthorizer;
