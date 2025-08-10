import { handlerPath } from '@libs/handler-resolver';
import type { AWS } from '@serverless/typescript';


type AWSFunctions = AWS['functions']['authorizer'];

const handler: AWSFunctions = {
  name: '${self:provider.stage}-${self:service}-authorizer',
  handler: `${handlerPath(__dirname)}/handler.main`,
  timeout: 5,
  reservedConcurrency: 10,
  memorySize: 256,
};
export default handler;
