import type { AWS } from '@serverless/typescript';
import { CSP_HEADERS } from './src/constants';
import functions from './src/functions';

const serverlessConfiguration: AWS = {
  service: 'reminder-io-api',
  frameworkVersion: '3',
  useDotenv: true,
  plugins: ['serverless-esbuild', 'serverless-offline', 'serverless-domain-manager', 'serverless-dotenv-plugin'],
  provider: {
    name: 'aws',
    runtime: 'nodejs20.x',
    stage: '${opt:stage, "dev"}',
    region: '${opt:region, "ap-south-1"}' as 'ap-south-1',
    stackName: '${self:provider.stage}-${self:service}',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      USERS_TABLE: '${self:provider.stage}-${self:service}-users',
      REMINDERS_TABLE: '${self:provider.stage}-${self:service}-reminders',
      SECRET_KEY: 'secret',
      SCHEDULER_GROUP_NAME: '${self:provider.stage}-${self:service}-scheduler-group',
      SCHEDULER_ROLE_ARN: { 'Fn::GetAtt': ['EventBridgeSchedulerRole', 'Arn'] },
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['iam:PassRole'],
            Resource: { 'Fn::GetAtt': ['EventBridgeSchedulerRole', 'Arn'] }
          },
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:Query',
              'dynamodb:Scan',
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem'
            ],
            Resource: [
              { 'Fn::GetAtt': ['UsersTable', 'Arn'] },
              { 'Fn::Join': ['/', [{ 'Fn::GetAtt': ['UsersTable', 'Arn'] }, 'index', '*']] },
              { 'Fn::GetAtt': ['RemindersTable', 'Arn'] },
              { 'Fn::Join': ['/', [{ 'Fn::GetAtt': ['RemindersTable', 'Arn'] }, 'index', '*']] }
            ]
          },
          {
            Effect: 'Allow',
            Action: [
              'scheduler:CreateSchedule',
              'scheduler:UpdateSchedule',
              'scheduler:DeleteSchedule',
              'scheduler:GetSchedule',
              'scheduler:ListSchedules',
              'scheduler:GetScheduleGroup',
              'scheduler:ListScheduleGroups'
            ],
            Resource: [
              { 'Fn::GetAtt': ['ReminderSchedulerGroup', 'Arn'] },
              { 'Fn::Join': ['/', [{ 'Fn::GetAtt': ['ReminderSchedulerGroup', 'Arn'] }, '*']] },
              { 'Fn::Join': ['/', [{ 'Fn::GetAtt': ['ReminderSchedulerGroup', 'Arn'] }, 'schedule-group', '*']] },
              { 'Fn::Sub': 'arn:aws:scheduler:${AWS::Region}:${AWS::AccountId}:schedule/${self:provider.stage}-${self:service}-scheduler-group/*' }
            ]
          },
          {
            Effect: 'Allow',
            Action: [
              'ses:SendEmail',
              'ses:SendRawEmail',
              'ses:VerifyEmailIdentity'
            ],
            Resource: '*'
          }
        ]
      }
    }
  },
  functions,
  package: { individually: true },
  resources: {
    Resources: {
      GatewayResponseDefault4XX: {
        Type: 'AWS::ApiGateway::GatewayResponse',
        Properties: {
          ResponseParameters: {
            'gatewayresponse.header.Content-Security-Policy': `'${CSP_HEADERS}'`,
            'gatewayresponse.header.Access-Control-Allow-Origin': "'https://reminder-io.tejasrana.in'",
            'gatewayresponse.header.Access-Control-Allow-Headers': '\'*\'',
            'gatewayresponse.header.Access-Control-Allow-Methods': '\'*\'',
            'gatewayresponse.header.Access-Control-Expose-Headers': "'Content-Security-Policy, Access-Control-Allow-Origin, Access-Control-Allow-Credentials, X-Auth-Token, Content-Type'",
            'gatewayresponse.header.Access-Control-Allow-Credentials': "'true'",
          },
          ResponseType: 'DEFAULT_4XX',
          RestApiId: {
            Ref: 'ApiGatewayRestApi',
          },
        },
      },
      GatewayResponseDefault5XX: {
        Type: 'AWS::ApiGateway::GatewayResponse',
        Properties: {
          ResponseParameters: {
            'gatewayresponse.header.Content-Security-Policy': `'${CSP_HEADERS}'`,
            'gatewayresponse.header.Access-Control-Allow-Origin': "'https://reminder-io.tejasrana.in'",
            'gatewayresponse.header.Access-Control-Allow-Headers': '\'*\'',
            'gatewayresponse.header.Access-Control-Allow-Methods': '\'*\'',
            'gatewayresponse.header.Access-Control-Expose-Headers': "'Content-Security-Policy, Access-Control-Allow-Origin, Access-Control-Allow-Credentials, X-Auth-Token, Content-Type'",
            'gatewayresponse.header.Access-Control-Allow-Credentials': "'true'",
          },
          ResponseType: 'DEFAULT_5XX',
          RestApiId: {
            Ref: 'ApiGatewayRestApi',
          },
        },
      },
      UsersTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${self:provider.stage}-${self:service}-users',
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: [
            { AttributeName: 'id', AttributeType: 'N' },
            { AttributeName: 'email', AttributeType: 'S' }
          ],
          KeySchema: [
            { AttributeName: 'id', KeyType: 'HASH' }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: 'EmailIndex',
              KeySchema: [
                { AttributeName: 'email', KeyType: 'HASH' }
              ],
              Projection: { ProjectionType: 'ALL' },
            }
          ],
        }
      },
      RemindersTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${self:provider.stage}-${self:service}-reminders',
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: [
            { AttributeName: 'id', AttributeType: 'S' },
            { AttributeName: 'userId', AttributeType: 'N' },
            { AttributeName: 'status', AttributeType: 'S' }
          ],
          KeySchema: [
            { AttributeName: 'id', KeyType: 'HASH' }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: 'UserIndex',
              KeySchema: [
                { AttributeName: 'userId', KeyType: 'HASH' }
              ],
              Projection: { ProjectionType: 'ALL' },
            },
            {
              IndexName: 'StatusIndex',
              KeySchema: [
                { AttributeName: 'status', KeyType: 'HASH' }
              ],
              Projection: { ProjectionType: 'ALL' },
            }
          ],
        }
      },
      ReminderSchedulerGroup: {
        Type: 'AWS::Scheduler::ScheduleGroup',
        Properties: {
          Name: '${self:provider.stage}-${self:service}-scheduler-group',
          Tags: [
            {
              Key: 'Environment',
              Value: '${self:provider.stage}'
            },
            {
              Key: 'Service',
              Value: '${self:service}'
            }
          ]
        }
      },
      EventBridgeSchedulerRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          RoleName: '${self:provider.stage}-${self:service}-eventbridge-scheduler-role',
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  Service: 'scheduler.amazonaws.com'
                },
                Action: 'sts:AssumeRole'
              }
            ]
          },
          Policies: [
            {
              PolicyName: 'LambdaInvokePolicy',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: [
                      'lambda:InvokeFunction'
                    ],
                    Resource: [
                      { 'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${self:provider.stage}-${self:service}-send-email' },
                      { 'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${self:provider.stage}-${self:service}-send-email:*' }
                    ]
                  }
                ]
              }
            }
          ],
          Tags: [
            {
              Key: 'Environment',
              Value: '${self:provider.stage}'
            },
            {
              Key: 'Service',
              Value: '${self:service}'
            }
          ]
        }
      }
    }
  },
  custom: {
    esbuild: {
      bundle: true,
      minify: true,
      sourcemap: false,
      exclude: ['aws-sdk'],
      target: 'node20',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
    customDomain: {
      domainName: '${ssm:/${self:provider.stage}/reminder/route53/domain}',
      stage: '${opt:stage, "dev"}',
      certificateName: '${ssm:/${self:provider.stage}/common/certificate/name}',
      basePath: '',
      createRoute53Record: true,
      endpointType: 'regional',
      securityPolicy: 'tls_1_2',
      hostedZoneId: '${ssm:/${self:provider.stage}/common/route53/hosted-zone-id}',
      autoDomain: true,
    },
    'serverless-offline': {
      noTimeout: true,
      httpsProtocol: './cert',
      httpsPort: 3002,
      host: 'localhost'
    }
  },
};

module.exports = serverlessConfiguration;
