import { handlerPath } from '@libs/handler-resolver';

export default {
    handler: `${handlerPath(__dirname)}/handler.main`,
    name: '${self:provider.stage}-${self:service}-send-email',
    description: 'Send email notification for reminders',
    timeout: 30,
    memorySize: 128,
    environment: {
        FROM_EMAIL: 'contact@tejasrana.in',
    }
};