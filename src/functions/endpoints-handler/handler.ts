import { formatJSONResponse, type ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { LimitMiddleware } from '@libs/limit-middleware';

import { bootstrap } from '@libs/bootstrap';
import { EventType } from '@type';
import { routes } from 'src/routes';
import { createReminderSchema, loginSchema, registerSchema, updateReminderSchema } from './schema';

const init = bootstrap;

const handler: ValidatedEventAPIGatewayProxyEvent<typeof loginSchema | typeof registerSchema | typeof createReminderSchema | typeof updateReminderSchema> = async (event) => {
  let responseCode = 200;
  let responseBody: any = {};
  let responseHeaders: any = {};
  const { logger, ...services } = await init();
  try {
    logger.info('Event Data',
      {
        path: event?.path,
        resource: event?.resource,
        accountId: event?.requestContext?.authorizer?.accountId,
        userId: event?.requestContext?.authorizer?.userId,
        httpMethod: event?.httpMethod,
        body: JSON.stringify(event?.body, null, 2),
      });

    const limitMiddleware = new LimitMiddleware({ logger, ...services });
    const limitCheck = await limitMiddleware.checkLimits(event as unknown as EventType);

    if (!limitCheck.allowed) {
      responseCode = limitCheck.statusCode || 403;
      responseBody = {
        message: limitCheck.message || 'Request not allowed due to system limits'
      };
      return formatJSONResponse(responseBody, responseCode, responseHeaders);
    }

    if (!routes[event.resource] || !routes[event.resource][event.httpMethod]) {
      responseCode = 404;
      responseBody = {
        message: 'Route not found'
      };
      return formatJSONResponse(responseBody, responseCode, responseHeaders);
    }

    responseBody = await routes[event.resource][event.httpMethod]({
      event: event as unknown as EventType,
      services,
    });

    if (responseBody?.status) {
      responseCode = responseBody.status || 400;
    }
    if (responseBody?.headers) {
      responseHeaders = responseBody.headers;
      responseBody = responseBody.body;
    }

  } catch (e) {
    logger.error(e);
    responseCode = e?.response?.status || e.statusCode || e.status || 400;
    responseBody = e?.response?.data || e?.message || 'Something went wrong';
  }
  return formatJSONResponse(responseBody, responseCode, responseHeaders);
};

export const main = middyfy(handler);
