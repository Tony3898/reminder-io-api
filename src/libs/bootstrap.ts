import AuthService from '@services/auth-service';
import DynamoService from '@services/dynamo-service';
import EmailService from '@services/email-service';
import JwtService from '@services/jwt-service';
import { LoggingService } from '@services/logging-service';
import ReminderService from '@services/reminder-service';
import SchedulerService from '@services/scheduler-service';
import UserService from '@services/user-service';
import { config } from 'dotenv';

config();

export async function bootstrap() {
  try {
    const logger = new LoggingService().getLogger();

    // Log environment configuration for debugging
    logger.debug('Bootstrap configuration', {
      usersTable: process.env.USERS_TABLE,
      remindersTable: process.env.REMINDERS_TABLE,
      schedulerGroupName: process.env.SCHEDULER_GROUP_NAME,
      schedulerRoleArn: process.env.SCHEDULER_ROLE_ARN,
      awsRegion: process.env.AWS_REGION,
      nodeEnv: process.env.NODE_ENV
    });

    const dynamoService = new DynamoService(logger);
    const jwtService = new JwtService();
    const userService = new UserService(dynamoService, logger);
    const emailService = new EmailService(logger, process.env.FROM_EMAIL);
    const authService = new AuthService(jwtService, userService, emailService, logger);
    const schedulerService = new SchedulerService(logger, process.env.SCHEDULER_GROUP_NAME, process.env.SCHEDULER_ROLE_ARN);
    const reminderService = new ReminderService(dynamoService, logger, schedulerService, userService, process.env?.LAMBDA_ARN || '');

    return {
      jwtService,
      dynamoService,
      userService,
      authService,
      emailService,
      reminderService,
      schedulerService,
      logger,
    };
  } catch (err) {
    new LoggingService().getLogger().error('error reading config', err);
    throw err;
  }
}

export default bootstrap;
