import { CreateScheduleCommand, CreateScheduleCommandOutput, DeleteScheduleCommand, DeleteScheduleCommandOutput, GetScheduleCommand, ListSchedulesCommand, SchedulerClient, UpdateScheduleCommand, UpdateScheduleCommandOutput } from "@aws-sdk/client-scheduler";
import { Logger, ScheduleRequest } from "@type";

class SchedulerService {
    private schedulerClient: SchedulerClient;
    private logger: Logger;
    private schedulerGroupName: string;
    private schedulerRoleArn: string;

    constructor(logger: Logger, schedulerGroupName: string, schedulerRoleArn: string) {
        this.schedulerClient = new SchedulerClient();
        this.schedulerGroupName = schedulerGroupName;
        this.schedulerRoleArn = schedulerRoleArn;
        this.logger = logger;
    }

    /**
     * Creates a new schedule
     * @param scheduleRequest - The schedule request
     */
    async createSchedule(scheduleRequest: ScheduleRequest): Promise<CreateScheduleCommandOutput> {
        try {
            // Validate schedule expression format
            this.validateScheduleExpression(scheduleRequest.scheduleExpression);

            const command = new CreateScheduleCommand({
                Name: scheduleRequest.name,
                GroupName: this.schedulerGroupName,
                ScheduleExpression: scheduleRequest.scheduleExpression,
                Target: {
                    Arn: scheduleRequest.target.arn,
                    RoleArn: this.schedulerRoleArn,
                    Input: JSON.stringify(scheduleRequest.target.input),
                    RetryPolicy: {
                        MaximumRetryAttempts: scheduleRequest.target.retryPolicy?.maximumRetryAttempts || 3
                    }
                },
                FlexibleTimeWindow: {
                    Mode: scheduleRequest.flexibleTimeWindow?.mode || "OFF",
                    MaximumWindowInMinutes: scheduleRequest.flexibleTimeWindow?.maximumWindowInMinutes
                },
                Description: scheduleRequest.description,
                State: scheduleRequest.state || "ENABLED"
            });

            this.logger.debug('Creating AWS EventBridge Schedule', {
                scheduleName: scheduleRequest.name,
                scheduleExpression: scheduleRequest.scheduleExpression,
                flexibleTimeWindow: scheduleRequest.flexibleTimeWindow?.mode || "OFF",
                groupName: this.schedulerGroupName
            });

            const result = await this.schedulerClient.send(command);

            this.logger.debug(`Schedule created successfully: ${scheduleRequest.name}`, {
                scheduleArn: result.ScheduleArn,
                scheduleExpression: scheduleRequest.scheduleExpression
            });

            return result;
        } catch (error) {
            this.logger.error(`Failed to create schedule: ${error.message}`, {
                scheduleName: scheduleRequest.name,
                scheduleExpression: scheduleRequest.scheduleExpression,
                error: error.stack
            });
            throw new Error(`Failed to create schedule: ${error.message}`);
        }
    }

    /**
     * Updates an existing schedule
     * @param scheduleRequest - The schedule request
     */
    async updateSchedule(scheduleRequest: ScheduleRequest): Promise<UpdateScheduleCommandOutput> {
        try {
            const command = new UpdateScheduleCommand({
                Name: scheduleRequest.name,
                GroupName: this.schedulerGroupName,
                ScheduleExpression: scheduleRequest.scheduleExpression,
                Target: {
                    Arn: scheduleRequest.target.arn,
                    RoleArn: this.schedulerRoleArn,
                    Input: JSON.stringify(scheduleRequest.target.input),
                    RetryPolicy: {
                        MaximumRetryAttempts: scheduleRequest.target.retryPolicy?.maximumRetryAttempts || 3
                    }
                },
                FlexibleTimeWindow: {
                    Mode: scheduleRequest.flexibleTimeWindow?.mode || "OFF",
                    MaximumWindowInMinutes: scheduleRequest.flexibleTimeWindow?.maximumWindowInMinutes
                },
                Description: scheduleRequest.description,
                State: scheduleRequest.state || "ENABLED"
            });

            const result = await this.schedulerClient.send(command);
            this.logger.debug(`Schedule updated successfully: ${scheduleRequest.name}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to update schedule: ${error.message}`);
            throw new Error(`Failed to update schedule: ${error.message}`);
        }
    }

    /**
     * Deletes an existing schedule
     * @param scheduleName - The name of the schedule
     */
    async deleteSchedule(scheduleName: string): Promise<DeleteScheduleCommandOutput> {
        try {
            const command = new DeleteScheduleCommand({
                Name: scheduleName,
                GroupName: this.schedulerGroupName
            });

            const result = await this.schedulerClient.send(command);
            this.logger.debug(`Schedule deleted successfully: ${scheduleName}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to delete schedule: ${error.message}`);
            throw new Error(`Failed to delete schedule: ${error.message}`);
        }
    }

    /**
     * Cancels an existing schedule by disabling it
     * @param scheduleName - The name of the schedule
     */
    async cancelSchedule(scheduleName: string): Promise<UpdateScheduleCommandOutput> {
        try {
            // First get the current schedule to preserve its configuration
            const currentSchedule = await this.getSchedule(scheduleName);

            const command = new UpdateScheduleCommand({
                Name: scheduleName,
                GroupName: this.schedulerGroupName,
                ScheduleExpression: currentSchedule.ScheduleExpression,
                Target: currentSchedule.Target,
                FlexibleTimeWindow: currentSchedule.FlexibleTimeWindow,
                Description: currentSchedule.Description,
                State: "DISABLED" // This is the key change - disable the schedule
            });

            const result = await this.schedulerClient.send(command);
            this.logger.debug(`Schedule cancelled/disabled successfully: ${scheduleName}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to cancel schedule: ${error.message}`);
            throw new Error(`Failed to cancel schedule: ${error.message}`);
        }
    }

    /**
     * Gets an existing schedule
     * @param scheduleName - The name of the schedule
     * @returns The schedule object
     */
    async getSchedule(scheduleName: string): Promise<any> {
        try {
            const command = new GetScheduleCommand({
                Name: scheduleName,
                GroupName: this.schedulerGroupName
            });

            const result = await this.schedulerClient.send(command);
            this.logger.debug(`Schedule retrieved successfully: ${scheduleName}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to get schedule: ${error.message}`);
            throw new Error(`Failed to get schedule: ${error.message}`);
        }
    }

    /**
     * Lists all schedules in the group
     * @returns The schedules
     */
    async listSchedules(): Promise<any[]> {
        try {
            const command = new ListSchedulesCommand({
                GroupName: this.schedulerGroupName,
                MaxResults: 100
            });

            const result = await this.schedulerClient.send(command);
            this.logger.debug(`Schedules listed successfully`);
            return result.Schedules || [];
        } catch (error) {
            this.logger.error(`Failed to list schedules: ${error.message}`);
            throw new Error(`Failed to list schedules: ${error.message}`);
        }
    }

    /**
     * Validates the schedule expression format
     * @param scheduleExpression - The schedule expression to validate
     */
    private validateScheduleExpression(scheduleExpression: string): void {
        // AWS EventBridge Scheduler supports 'at()' and 'rate()' expressions
        // For one-time schedules, we use 'at(YYYY-MM-DDTHH:MM:SS)' format
        if (!scheduleExpression) {
            throw new Error('Schedule expression is required');
        }

        if (scheduleExpression.startsWith('at(')) {
            // Validate 'at()' expression format
            const match = scheduleExpression.match(/^at\((\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\)$/);
            if (!match) {
                throw new Error(`Invalid 'at()' schedule expression format: ${scheduleExpression}. Expected format: at(YYYY-MM-DDTHH:MM:SS)`);
            }

            // Validate the datetime format
            const dateTimeString = match[1];
            const scheduledDate = new Date(dateTimeString + 'Z'); // Add Z for UTC

            if (isNaN(scheduledDate.getTime())) {
                throw new Error(`Invalid datetime in schedule expression: ${dateTimeString}`);
            }

            // Check if the scheduled time is in the past (with 1 minute tolerance)
            const now = new Date();
            const oneMinuteAgo = new Date(now.getTime() - 60000);

            if (scheduledDate < oneMinuteAgo) {
                this.logger.error('Schedule expression is in the past', {
                    scheduledTime: scheduledDate.toISOString(),
                    currentTime: now.toISOString(),
                    scheduleExpression
                });
                throw new Error(`Schedule time is in the past: ${scheduledDate.toISOString()}`);
            }

            this.logger.debug('Schedule expression validation passed', {
                scheduleExpression,
                scheduledTime: scheduledDate.toISOString(),
                currentTime: now.toISOString()
            });
        }
    }
}

export default SchedulerService;