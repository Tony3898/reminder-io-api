import { EventType, Services } from "@type";

const MAX_USERS = 5;
const MAX_REMINDERS_PER_USER = 10;

export interface LimitCheckResult {
    allowed: boolean;
    message?: string;
    statusCode?: number;
}

/**
 * Middleware to enforce system limits:
 * - Maximum n users in the system
 * - Maximum n reminders per user
 */
export class LimitMiddleware {
    private services: Services;

    constructor(services: Services) {
        this.services = services;
    }

    async checkUserCreationLimit(): Promise<LimitCheckResult> {
        try {
            if (!this.services.userService) {
                return {
                    allowed: false,
                    message: 'User service not available',
                    statusCode: 500
                };
            }

            const { users } = await this.services.userService.getAllUsers(MAX_USERS + 1);

            if (users.length >= MAX_USERS) {
                return {
                    allowed: false,
                    message: `System limit reached: Maximum ${MAX_USERS} users allowed`,
                    statusCode: 403
                };
            }

            return { allowed: true };
        } catch (error) {
            this.services.logger?.error('Error checking user creation limit:', error);
            return {
                allowed: false,
                message: 'Failed to check user limits',
                statusCode: 500
            };
        }
    }

    async checkReminderCreationLimit(userId: number): Promise<LimitCheckResult> {
        try {
            if (!this.services.reminderService) {
                return {
                    allowed: false,
                    message: 'Reminder service not available',
                    statusCode: 500
                };
            }

            const userReminders = await this.services.reminderService.getUserReminders(userId);

            const activeReminders = userReminders;

            if (activeReminders.length >= MAX_REMINDERS_PER_USER) {
                return {
                    allowed: false,
                    message: `User limit reached: Maximum ${MAX_REMINDERS_PER_USER} reminders allowed per user`,
                    statusCode: 403
                };
            }

            return { allowed: true };
        } catch (error) {
            this.services.logger?.error('Error checking reminder creation limit:', error);
            return {
                allowed: false,
                message: 'Failed to check reminder limits',
                statusCode: 500
            };
        }
    }

    async checkLimits(event: EventType): Promise<LimitCheckResult> {
        const { resource, httpMethod } = event;

        if (resource === '/api/register' && httpMethod === 'POST') {
            return await this.checkUserCreationLimit();
        }

        if (resource === '/api/reminder' && httpMethod === 'POST') {
            const userId = event.requestContext?.authorizer?.userId;
            if (!userId) {
                return {
                    allowed: false,
                    message: 'User ID not found in request context',
                    statusCode: 401
                };
            }
            return await this.checkReminderCreationLimit(Number(userId));
        }

        return { allowed: true };
    }
}

/**
 * Create a middy middleware that enforces limits
 */
export const limitMiddleware = () => ({
    before: async (request: any) => {
        const { event } = request;

        // Skip limit checks if services are not available
        if (!request.context.services) {
            return;
        }

        const limitChecker = new LimitMiddleware(request.context.services);
        const result = await limitChecker.checkLimits(event);

        if (!result.allowed) {
            const error = new Error(result.message || 'Request not allowed');
            (error as any).statusCode = result.statusCode || 403;
            throw error;
        }
    }
});
