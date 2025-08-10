import { handlerPath } from '@libs/handler-resolver';
import { createReminderSchema, loginSchema, registerSchema, updateProfileSchema, updateReminderSchema } from './schema';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  name: '${self:provider.stage}-${self:service}-endpoints-handler',
  description: 'Endpoints handler',
  timeout: 30,
  memorySize: 128,
  environment: {
    LAMBDA_ARN: { 'Fn::GetAtt': ['SendEmailLambdaFunction', 'Arn'] },
  },
  events: [
    {
      http: {
        cors: true,
        method: 'post',
        path: '/api/login',
        request: {
          schemas: {
            'application/json': loginSchema,
          },
        },
      },
    },
    {
      http: {
        cors: true,
        method: 'post',
        path: '/api/register',
        request: {
          schemas: {
            'application/json': registerSchema,
          },
        },
      },
    },
    {
      http: {
        cors: true,
        method: 'post',
        path: '/api/reminder',
        authorizer: {
          name: 'authorizer', resultTtlInSeconds: 0,
        },
        request: {
          schemas: {
            'application/json': createReminderSchema,
          },
        },
      },
    },
    {
      http: {
        cors: true,
        method: 'get',
        path: '/api/reminder',
        authorizer: {
          name: 'authorizer', resultTtlInSeconds: 0,
        },
      },
    },
    {
      http: {
        cors: true,
        method: 'put',
        path: '/api/reminder/{reminderId}',
        authorizer: {
          name: 'authorizer', resultTtlInSeconds: 0,
        },
        request: {
          schemas: {
            'application/json': updateReminderSchema,
          },
        },
      },
    },
    {
      http: {
        cors: true,
        method: 'delete',
        path: '/api/reminder/{reminderId}',
        authorizer: {
          name: 'authorizer', resultTtlInSeconds: 0,
        },
      },
    },
    {
      http: {
        cors: true,
        method: 'get',
        path: '/api/user/profile',
        authorizer: {
          name: 'authorizer', resultTtlInSeconds: 0,
        },
      },
    },
    {
      http: {
        cors: true,
        method: 'put',
        path: '/api/user/profile',
        authorizer: {
          name: 'authorizer', resultTtlInSeconds: 0,
        },
        request: {
          schemas: {
            'application/json': updateProfileSchema,
          },
        },
      },
    },
  ],
};
