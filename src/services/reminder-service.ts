import { Logger, PaginatedResponse, PaginationParams, Reminder, ReminderData, ReminderResponse, ReminderStatus, ReminderStatusType, ScheduleRequest } from "@type";
import DynamoService from "./dynamo-service";
import SchedulerService from "./scheduler-service";
import UserService from "./user-service";

const REMINDERS_TABLE = process.env.REMINDERS_TABLE || 'dev-online-reminder-api-reminders';
const REMINDER_SCHEDULE_PREFIX = 'reminder-schedule-';

class ReminderService {
    private dynamoService: DynamoService;
    private logger: Logger;
    private schedulerService: SchedulerService;
    private userService: UserService;
    private lambdaArn: string;

    constructor(dynamoService: DynamoService, logger: Logger, schedulerService: SchedulerService, userService: UserService, lambdaArn: string) {
        this.dynamoService = dynamoService;
        this.logger = logger;
        this.schedulerService = schedulerService;
        this.userService = userService;
        this.lambdaArn = lambdaArn;
    }

    /**
     * Gets a reminder by its ID and user ID for validation
     * @param id - The ID of the reminder
     * @param userId - The ID of the user to validate ownership (optional for backwards compatibility)
     * @returns The reminder object or null if not found or doesn't belong to user
     */
    async getReminderByIdAndUserId(id: string, userId?: number): Promise<Reminder | null> {
        try {
            const result = await this.dynamoService.get({
                TableName: REMINDERS_TABLE,
                Key: { id: { S: id } }
            });

            if (!result.Item) return null;

            const reminder = {
                id: result.Item.id?.S || '',
                userId: parseInt(result.Item.userId?.N || '0'),
                title: result.Item.title?.S || '',
                description: result.Item.description?.S || '',
                reminderDate: parseInt(result.Item.reminderDate?.N || '0'),
                status: (result.Item.status?.S as ReminderStatusType) || 'SCHEDULED',
                createdAt: result.Item.createdAt?.S || '',
                updatedAt: result.Item.updatedAt?.S || ''
            };

            // Validate that the reminder belongs to the user (if userId is provided)
            if (userId !== undefined && reminder.userId.toString() !== userId.toString()) {
                return null;
            }


            return reminder;
        } catch (error) {
            this.logger.error(`Failed to get reminder: ${error.message}`);
            throw new Error('Failed to retrieve reminder');
        }
    }

    /**
     * Gets all reminders for a user
     * @param userId - The ID of the user
     * @returns The reminders for the user
     */
    async getUserReminders(userId: number): Promise<Reminder[]> {
        try {
            const result = await this.dynamoService.query({
                TableName: REMINDERS_TABLE,
                IndexName: 'UserIndex',
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': { N: userId.toString() }
                }
            });

            return result.Items?.map(item => ({
                id: item.id?.S || '',
                userId: parseInt(item.userId?.N || '0'),
                title: item.title?.S || '',
                description: item.description?.S || '',
                reminderDate: parseInt(item.reminderDate?.N || '0'),
                status: (item.status?.S as ReminderStatus) || 'SCHEDULED',
                createdAt: item.createdAt?.S || '',
                updatedAt: item.updatedAt?.S || ''
            })) || [];
        } catch (error) {
            this.logger.error(`Failed to get user reminders: ${error.message}`);
            throw new Error('Failed to retrieve reminders');
        }
    }

    /**
     * Gets paginated reminders for a user
     * @param userId - The ID of the user
     * @param params - Pagination and filtering parameters
     * @returns Paginated reminders for the user
     */
    async getUserRemindersPaginated(userId: number, params: PaginationParams = {}): Promise<PaginatedResponse<Reminder>> {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                sortBy = 'reminderDate',
                sortOrder = 'desc'
            } = params;

            // Get all reminders for the user using the existing UserIndex
            const result = await this.dynamoService.query({
                TableName: REMINDERS_TABLE,
                IndexName: 'UserIndex',
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': { N: userId.toString() }
                }
            });

            // Convert DynamoDB items to Reminder objects
            let reminders: Reminder[] = result.Items?.map(item => ({
                id: item.id?.S || '',
                userId: parseInt(item.userId?.N || '0'),
                title: item.title?.S || '',
                description: item.description?.S || '',
                reminderDate: parseInt(item.reminderDate?.N || '0'),
                status: (item.status?.S as ReminderStatus) || 'SCHEDULED',
                createdAt: item.createdAt?.S || '',
                updatedAt: item.updatedAt?.S || ''
            })) || [];

            // Filter by status if provided (client-side filtering for now)
            if (status) {
                reminders = reminders.filter(reminder => reminder.status === status);
            }

            // Sort the results
            reminders.sort((a, b) => {
                let aValue: any, bValue: any;

                switch (sortBy) {
                    case 'reminderDate':
                        aValue = a.reminderDate;
                        bValue = b.reminderDate;
                        break;
                    case 'createdAt':
                        aValue = new Date(a.createdAt).getTime();
                        bValue = new Date(b.createdAt).getTime();
                        break;
                    case 'title':
                        aValue = a.title.toLowerCase();
                        bValue = b.title.toLowerCase();
                        break;
                    default:
                        aValue = a.reminderDate;
                        bValue = b.reminderDate;
                }

                if (sortOrder === 'asc') {
                    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                } else {
                    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                }
            });

            // Calculate pagination
            const totalItems = reminders.length;
            const totalPages = Math.ceil(totalItems / limit);
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;

            // Get the items for the current page
            const paginatedReminders = reminders.slice(startIndex, endIndex);

            return {
                data: paginatedReminders,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            };
        } catch (error) {
            this.logger.error(`Failed to get paginated user reminders: ${error.message}`);
            throw new Error('Failed to retrieve reminders');
        }
    }

    /**
     * Creates a new reminder
     * @param userId - The ID of the user
     * @param title - The title of the reminder
     * @param description - The description of the reminder
     * @param reminderDate - The date and time of the reminder (timestamp)
     * @returns The created reminder
     */
    async createReminder(userId: number, data: ReminderData): Promise<ReminderResponse> {
        try {
            if (!data.title || !data.reminderDate) {
                throw new Error('Title and reminder date are required');
            }

            const now = new Date().toISOString();
            const reminderId = `reminder_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            const reminder = {
                id: { S: reminderId },
                userId: { N: userId.toString() },
                title: { S: data.title },
                description: { S: data.description || '' },
                reminderDate: { N: data.reminderDate.toString() },
                status: { S: 'SCHEDULED' },
                createdAt: { S: now },
                updatedAt: { S: now }
            };

            await this.dynamoService.put({
                TableName: REMINDERS_TABLE,
                Item: reminder,
            });

            const reminderData = {
                id: reminderId,
                userId,
                title: data.title,
                description: data.description || '',
                reminderDate: data.reminderDate,
                status: 'SCHEDULED',
                createdAt: now,
                updatedAt: now
            };

            const createReminderSchedule = await this.createReminderSchedule(reminderId, data.reminderDate, reminderData, userId);

            return {
                reminder: reminderData as Reminder,
                schedule: createReminderSchedule as ScheduleRequest
            };

        } catch (error) {
            this.logger.error(`Failed to create reminder: ${error.message}`);
            throw error;
        }
    }

    /**
     * Updates the status of a reminder
     * @param id - The ID of the reminder
     * @param status - The new status of the reminder
     */
    async updateReminder(id: string, data: ReminderData, userId: number, isUpdateSchedule: boolean = false): Promise<ReminderResponse> {
        const now = new Date().toISOString();

        try {
            const reminder = await this.getReminderByIdAndUserId(id, userId);
            if (!reminder) {
                throw new Error('Reminder not found or access denied');
            }

            if (['DELIVERED', 'CANCELLED'].includes(reminder.status)) {
                throw new Error(`Reminder is ${reminder?.status?.toLowerCase()}, cannot be updated now!`);
            }

            const result = await this.dynamoService.update({
                TableName: REMINDERS_TABLE,
                Key: { id: { S: reminder.id } },
                UpdateExpression: 'SET #userId=:userId, #title=:title, #description=:description, #reminderDate=:reminderDate, #status=:status, #updatedAt=:updatedAt',
                ExpressionAttributeNames: {
                    '#userId': 'userId',
                    '#title': 'title',
                    '#description': 'description',
                    '#reminderDate': 'reminderDate',
                    '#status': 'status',
                    '#updatedAt': 'updatedAt'
                },
                ExpressionAttributeValues: {
                    ':userId': { N: reminder.userId.toString() },
                    ':title': { S: data?.title || reminder.title },
                    ':description': { S: data?.description || reminder.description },
                    ':reminderDate': { N: (data?.reminderDate || reminder.reminderDate).toString() },
                    ':status': { S: data?.status || reminder.status },
                    ':updatedAt': { S: now }
                },
                ReturnValues: 'ALL_NEW'
            });

            const updatedReminder = {
                id: result.Attributes.id.S,
                userId: parseInt(result.Attributes.userId.N),
                title: result.Attributes.title.S,
                description: result.Attributes.description.S,
                reminderDate: parseInt(result.Attributes.reminderDate.N),
                status: result.Attributes.status.S as ReminderStatus,
                createdAt: result.Attributes.createdAt.S,
                updatedAt: result.Attributes.updatedAt.S
            }

            this.logger.debug('Reminder updated successfully', {
                reminderId: updatedReminder.id,
                userId: updatedReminder.userId,
                title: updatedReminder.title,
                description: updatedReminder.description,
                reminderDate: updatedReminder.reminderDate,
            });

            let updatedScheduleReminder: any = null;
            if (isUpdateSchedule) {
                updatedScheduleReminder = await this.updateReminderSchedule(reminder.id, updatedReminder.reminderDate, updatedReminder, userId);
            }

            return {
                reminder: updatedReminder,
                schedule: updatedScheduleReminder
            };

        } catch (error) {
            this.logger.error(`Failed to update reminder status: ${error.message}`);
            throw error;
        }
    }

    /**
     * Cancels a reminder by marking it as cancelled in DB and disabling the schedule
     * @param userId - The ID of the user
     * @param reminderId - The ID of the reminder (as string)
     */
    async cancelReminder(userId: number, reminderId: string): Promise<Reminder> {
        try {
            // First get the reminder to ensure it exists and belongs to the user
            const reminder = await this.getReminderByIdAndUserId(reminderId, userId);
            if (!reminder) {
                throw new Error('Reminder not found or access denied');
            }

            const now = new Date().toISOString();

            // Update the reminder status to CANCELLED instead of deleting
            const result = await this.dynamoService.update({
                TableName: REMINDERS_TABLE,
                Key: { id: { S: reminderId } },
                UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
                ExpressionAttributeNames: {
                    '#status': 'status',
                    '#updatedAt': 'updatedAt'
                },
                ExpressionAttributeValues: {
                    ':status': { S: 'CANCELLED' },
                    ':updatedAt': { S: now }
                },
                ReturnValues: 'ALL_NEW'
            });

            // Cancel the schedule instead of deleting it
            await this.cancelReminderSchedule(reminderId);

            const cancelledReminder = {
                id: result.Attributes.id.S,
                userId: parseInt(result.Attributes.userId.N),
                title: result.Attributes.title.S,
                description: result.Attributes.description.S,
                reminderDate: parseInt(result.Attributes.reminderDate.N),
                status: result.Attributes.status.S as ReminderStatusType,
                createdAt: result.Attributes.createdAt.S,
                updatedAt: result.Attributes.updatedAt.S
            };

            this.logger.debug('Reminder cancelled successfully', {
                reminderId: cancelledReminder.id,
                userId: cancelledReminder.userId,
                status: cancelledReminder.status
            });

            return cancelledReminder;
        } catch (error) {
            this.logger.error(`Failed to cancel reminder: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gets all scheduled reminders
     * @returns The scheduled reminders
     */
    async getScheduledReminders(): Promise<Reminder[]> {
        try {
            const result = await this.dynamoService.query({
                TableName: REMINDERS_TABLE,
                IndexName: 'StatusIndex',
                KeyConditionExpression: '#status = :status',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':status': { S: 'SCHEDULED' }
                }
            });

            return result.Items?.map(item => ({
                id: item.id?.S || '',
                userId: parseInt(item.userId?.N || '0'),
                title: item.title?.S || '',
                description: item.description?.S || '',
                reminderDate: parseInt(item.reminderDate?.N || '0'),
                status: (item.status?.S as ReminderStatus) || 'SCHEDULED',
                createdAt: item.createdAt?.S || '',
                updatedAt: item.updatedAt?.S || ''
            })) || [];
        } catch (error) {
            this.logger.error(`Failed to get scheduled reminders: ${error.message}`);
            throw error;
        }
    }

    /**
     * Creates a reminder schedule
     * @param reminderId - The ID of the reminder
     * @param reminderDate - The date and time of the reminder (timestamp)
     * @param reminderData - The data to pass to the Lambda function
     * @param userId - The ID of the user to get email address
     */
    async createReminderSchedule(
        reminderId: string,
        reminderDate: number,
        reminderData: any,
        userId: number
    ): Promise<any> {
        try {
            const scheduleName = `${REMINDER_SCHEDULE_PREFIX}${reminderId}`;

            // Get user email for the schedule payload
            const user = await this.userService.getUserById(userId);
            if (!user) {
                throw new Error(`User not found with ID: ${userId}`);
            }

            const reminderDateTime = new Date(reminderDate);

            // Enhanced logging for debugging timing issues
            const currentTime = new Date();
            this.logger.debug('Creating schedule with timing details', {
                reminderId,
                requestedTime: reminderDateTime.toISOString(),
                requestedTimestamp: reminderDate,
                currentTime: currentTime.toISOString(),
                currentTimestamp: currentTime.getTime(),
                timeDifferenceMinutes: Math.round((reminderDate - currentTime.getTime()) / (1000 * 60))
            });

            const scheduleExpression = `at(${reminderDateTime.toISOString().slice(0, 19)})`;

            this.logger.debug('Schedule expression created', {
                reminderId,
                scheduleExpression,
                originalFormat: reminderDateTime.toISOString()
            });

            const scheduleRequest: ScheduleRequest = {
                name: scheduleName,
                scheduleExpression,
                description: `Reminder schedule for ${reminderId}`,
                target: {
                    arn: this.lambdaArn,
                    input: {
                        reminderId,
                        userId,
                        title: reminderData.title,
                        description: reminderData.description,
                        userEmail: user.email,
                        scheduledTime: reminderDateTime.toISOString(),
                        scheduledTimestamp: reminderDate
                    },
                    retryPolicy: {
                        maximumRetryAttempts: 3
                    }
                },
                flexibleTimeWindow: {
                    mode: "OFF"
                },
                state: "ENABLED"
            };

            const result = await this.schedulerService.createSchedule(scheduleRequest);

            this.logger.debug('Schedule created successfully with enhanced debugging', {
                reminderId,
                scheduleName,
                scheduleExpression,
                awsScheduleArn: result.ScheduleArn
            });

            return result;
        } catch (error) {
            this.logger.error(`Failed to create reminder schedule: ${error.message}`, {
                reminderId,
                reminderDate,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Deletes a reminder schedule
     * @param reminderId - The ID of the reminder
     */
    async deleteReminderSchedule(reminderId: string): Promise<any> {
        try {
            const scheduleName = `${REMINDER_SCHEDULE_PREFIX}${reminderId}`;
            return await this.schedulerService.deleteSchedule(scheduleName);
        } catch (error) {
            this.logger.error(`Failed to delete reminder schedule: ${error.message}`);
            throw error;
        }
    }

    /**
     * Cancels a reminder schedule by disabling it
     * @param reminderId - The ID of the reminder
     */
    async cancelReminderSchedule(reminderId: string): Promise<any> {
        try {
            const scheduleName = `${REMINDER_SCHEDULE_PREFIX}${reminderId}`;
            return await this.schedulerService.cancelSchedule(scheduleName);
        } catch (error) {
            this.logger.error(`Failed to cancel reminder schedule: ${error.message}`);
            throw error;
        }
    }

    /**
     * Updates a reminder schedule
     * @param reminderId - The ID of the reminder
     * @param reminderDate - The date and time of the reminder (timestamp)
     * @param reminderData - The data to pass to the Lambda function
     * @param userId - The ID of the user to get email address
     */
    async updateReminderSchedule(
        reminderId: string,
        reminderDate: number,
        reminderData: any,
        userId: number
    ): Promise<any> {
        try {
            const scheduleName = `${REMINDER_SCHEDULE_PREFIX}${reminderId}`;

            // Get user email for the schedule payload
            const user = await this.userService.getUserById(userId);
            if (!user) {
                throw new Error(`User not found with ID: ${userId}`);
            }

            const reminderDateTime = new Date(reminderDate);

            const currentTime = new Date();
            this.logger.debug('Updating schedule with timing details', {
                reminderId,
                requestedTime: reminderDateTime.toISOString(),
                requestedTimestamp: reminderDate,
                currentTime: currentTime.toISOString(),
                currentTimestamp: currentTime.getTime(),
                timeDifferenceMinutes: Math.round((reminderDate - currentTime.getTime()) / (1000 * 60))
            });

            const scheduleExpression = `at(${reminderDateTime.toISOString().slice(0, 19)})`;

            this.logger.debug('Update schedule expression created', {
                reminderId,
                scheduleExpression,
                originalFormat: reminderDateTime.toISOString()
            });

            const scheduleRequest: ScheduleRequest = {
                name: scheduleName,
                scheduleExpression,
                description: `Reminder schedule for ${reminderId}`,
                target: {
                    arn: this.lambdaArn,
                    input: {
                        reminderId,
                        userId,
                        title: reminderData.title,
                        description: reminderData.description,
                        userEmail: user.email,
                        // Add timing metadata for debugging
                        scheduledTime: reminderDateTime.toISOString(),
                        scheduledTimestamp: reminderDate
                    },
                    retryPolicy: {
                        maximumRetryAttempts: 3
                    }
                },
                flexibleTimeWindow: {
                    mode: "OFF"
                },
                state: "ENABLED"
            };

            const result = await this.schedulerService.updateSchedule(scheduleRequest);

            this.logger.debug('Schedule updated successfully with enhanced debugging', {
                reminderId,
                scheduleName,
                scheduleExpression
            });

            return result;
        } catch (error) {
            this.logger.error(`Failed to update reminder schedule: ${error.message}`, {
                reminderId,
                reminderDate,
                error: error.stack
            });
            throw error;
        }
    }
}

export default ReminderService;