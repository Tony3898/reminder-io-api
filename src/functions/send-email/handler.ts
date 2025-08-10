import { formatJSONResponse } from "@libs/api-gateway";
import { bootstrap } from "@libs/bootstrap";
import { EmailEventPayload, ReminderStatus } from "@type";

const init = bootstrap;
const handler = async (event: any) => {
    const { logger, reminderService, emailService } = await init();

    try {
        const eventReceivedTime = new Date();

        logger.debug('Send email event received with timing analysis', {
            event: JSON.stringify(event, null, 2),
            eventReceivedTime: eventReceivedTime.toISOString(),
            eventReceivedTimestamp: eventReceivedTime.getTime()
        });

        const payload: EmailEventPayload = typeof event === 'string' ? JSON.parse(event) : event;

        // Enhanced timing analysis if scheduled time is available
        if (payload?.scheduledTime || payload?.scheduledTimestamp) {
            const scheduledTime = new Date(payload.scheduledTimestamp || payload.scheduledTime);
            const delayMinutes = Math.round((eventReceivedTime.getTime() - scheduledTime.getTime()) / (1000 * 60));

            logger.debug('Timing analysis for scheduled event', {
                reminderId: payload.reminderId,
                scheduledTime: scheduledTime.toISOString(),
                actualTriggeredTime: eventReceivedTime.toISOString(),
                delayInMinutes: delayMinutes,
                delayInSeconds: Math.round((eventReceivedTime.getTime() - scheduledTime.getTime()) / 1000)
            });

            if (Math.abs(delayMinutes) > 1) {
                logger.warn('Significant scheduling delay detected', {
                    reminderId: payload?.reminderId,
                    expectedTime: scheduledTime?.toISOString(),
                    actualTime: eventReceivedTime?.toISOString(),
                    delayMinutes
                });
            }
        }

        if (!payload.reminderId || !payload.userId || !payload.userEmail) {
            logger.error('Invalid payload: missing required fields', { payload });
            return formatJSONResponse({
                message: 'Invalid payload: missing required fields (reminderId, userId, userEmail)'
            }, 400);
        }

        const reminder = await reminderService.getReminderByIdAndUserId(payload.reminderId, payload.userId);

        if (!reminder) {
            logger.error('Reminder not found', {
                reminderId: payload.reminderId,
                userId: payload.userId
            });
            return formatJSONResponse({
                message: 'Reminder not found'
            }, 404);
        }

        if (reminder.status !== ReminderStatus.SCHEDULED) {
            logger.debug('Reminder status is not SCHEDULED, skipping email', {
                reminderId: payload.reminderId,
                currentStatus: reminder.status,
                expectedStatus: ReminderStatus.SCHEDULED
            });
            return formatJSONResponse({
                message: `Reminder status is ${reminder.status}, expected ${ReminderStatus.SCHEDULED}. Email not sent.`
            }, 200);
        }

        const emailData = emailService.formatReminderEmail(
            payload.title,
            payload.description || reminder.description,
            payload.userEmail
        );

        await emailService.sendEmail(emailData);

        await reminderService.updateReminder(payload.reminderId, { status: ReminderStatus.DELIVERED }, payload.userId, false);

        await reminderService.deleteReminderSchedule(payload.reminderId);

        logger.debug('Email sent successfully and reminder status updated', {
            reminderId: payload.reminderId,
            userId: payload.userId,
            userEmail: payload.userEmail,
            newStatus: ReminderStatus.DELIVERED
        });

        return formatJSONResponse({
            message: 'Email sent successfully and reminder status updated to DELIVERED',
            reminderId: payload.reminderId,
            status: ReminderStatus.DELIVERED
        }, 200);

    } catch (error) {
        logger.error('Failed to send email', {
            error: error.message,
            stack: error.stack,
            event
        });

        return formatJSONResponse({
            message: 'Failed to send email',
            error: error.message
        }, 500);
    }
};

export const main = handler;