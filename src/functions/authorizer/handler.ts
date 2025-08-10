import bootstrapAuthorizer from '@libs/bootstrap-authorizer';
import JwtService from '@services/jwt-service';
import { Logger } from '@type';
import { JwtPayload } from 'jsonwebtoken';

const initPromise = bootstrapAuthorizer();


type Methods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'UPDATE' | 'OPTIONS' | 'PATCH';

const getResources = (awsApiConfigs: Array<string>, allowedMethods: Array<Methods>) => {
  return allowedMethods.map((method: Methods) =>
    `arn:aws:execute-api:${awsApiConfigs[3]}:${awsApiConfigs[4]}:*/*/${method}/*`);
};
const getPrincipal = ({ authorizationToken, action, effect, context, awsApiConfigs, allowedMethods }: {
  authorizationToken: string,
  action: 'execute-api:Invoke',
  effect: 'Allow' | 'Deny',
  awsApiConfigs: Array<string>,
  context?: {
    userId: number,
  },
  allowedMethods: Array<Methods>
}) => {
  return {
    principalId: authorizationToken,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: action,
          Effect: effect,
          Resource: getResources(awsApiConfigs, allowedMethods),
        },
      ],
    },
    context,
  };
};
const getContext = async (authorizationToken: string, httpMethod: string, { jwtService, logger }: {
  jwtService: JwtService,
  logger: Logger
}) => {
  let authToken;
  const token = authorizationToken.split(' ');
  if (token.length === 2) {
    if (token[0].toLowerCase() !== 'bearer') return null;
    authToken = token[1];
  } else {
    throw new Error('Invalid Token');
  }

  const decoded: JwtPayload = await jwtService.verifyToken(authToken) as JwtPayload;

  let allowedMethods: Array<Methods> = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];
  return {
    context: {
      userId: decoded?.payload?.userId as number,
    },
    allowedMethods,
  };

};

const authorizer = async (event: { methodArn: string, authorizationToken: string }) => {
  const awsApiConfigs = JSON.stringify(event.methodArn).split(':');
  const httpMethod = JSON.stringify(event.methodArn).split('/')[2] as Methods;
  const { logger, jwtService } = await initPromise;
  try {
    logger.debug('event', event);
    const { authorizationToken } = event;
    const { context, allowedMethods }: {
      context: { userId: number },
      allowedMethods: Array<Methods>
    } = await getContext(authorizationToken, httpMethod, { jwtService, logger });
    logger.debug({ context, allowedMethods });
    return getPrincipal({
      authorizationToken, awsApiConfigs, context, effect: 'Allow', action: 'execute-api:Invoke', allowedMethods,
    });
  } catch (err) {
    logger.error('authorizer error', err);
    return getPrincipal({
      authorizationToken: event.authorizationToken,
      action: 'execute-api:Invoke',
      effect: 'Deny',
      awsApiConfigs,
      allowedMethods: [httpMethod],
    });
  }
};

export const main = authorizer;
