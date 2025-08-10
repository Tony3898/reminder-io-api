import { LoggingService } from '@services/logging-service';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { CSP_HEADERS } from '../constants';

type ValidatedAPIGatewayProxyEvent<S extends JSONSchema> = Omit<
  APIGatewayProxyEvent,
  'body'
> & { body: FromSchema<S> };
export type ValidatedEventAPIGatewayProxyEvent<S extends JSONSchema> = Handler<
  ValidatedAPIGatewayProxyEvent<S>,
  APIGatewayProxyResult
>;

const logger = new LoggingService().getLogger();

export const formatJSONResponse = (
  response: Record<string, unknown> | string | unknown,
  statusCode: number,
  headers?: object,
  isBase64Encoded?: boolean,
): APIGatewayProxyResult => {
  if (statusCode >= 400 && statusCode <= 500)
    logger.error('[Error]', response);
  else logger.info('[Success]', response);
  return {
    statusCode,
    headers: {
      'Content-Security-Policy': process.env.IS_OFFLINE === 'true' ? '*' : CSP_HEADERS,
      'Access-Control-Expose-Headers': 'Content-Security-Policy, Access-Control-Allow-Origin, Access-Control-Allow-Credentials, X-Auth-Token, Content-Type',
      'Access-Control-Allow-Origin': process.env.IS_OFFLINE === 'true' ? '*' : 'https://reminder-io.tejasrana.in',
      'Access-Control-Allow-Credentials': true,
      ...headers,
    },
    isBase64Encoded,
    body: response
      ? typeof response == 'string'
        ? response
        : JSON.stringify(response, null, 2)
      : '',
  };
};
