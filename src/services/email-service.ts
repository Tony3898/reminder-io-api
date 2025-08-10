import { SESClient, SendEmailCommand, VerifyEmailIdentityCommand } from "@aws-sdk/client-ses";
import { EmailData, Logger } from "@type";
import { EMAIL_TEMPLATE } from "src/constants";

class EmailService {
    private sesClient: SESClient;
    private logger: Logger;
    private fromEmail: string;

    constructor(logger: Logger, fromEmail: string) {
        this.logger = logger;
        this.sesClient = new SESClient();
        this.fromEmail = fromEmail;
    }

    /**
     * Send email using AWS SES
     * @param emailData - Email data containing recipient, subject, and body
     */
    async sendEmail(emailData: EmailData): Promise<void> {
        try {
            const command = new SendEmailCommand({
                Source: this.fromEmail,
                Destination: {
                    ToAddresses: [emailData.to]
                },
                Message: {
                    Subject: {
                        Data: emailData.subject,
                        Charset: 'UTF-8'
                    },
                    Body: emailData.isHtml ? {
                        Html: {
                            Data: emailData.body,
                            Charset: 'UTF-8'
                        }
                    } : {
                        Text: {
                            Data: emailData.body,
                            Charset: 'UTF-8'
                        }
                    }
                }
            });

            const result = await this.sesClient.send(command);
            this.logger.debug(`Email sent successfully`, {
                messageId: result.MessageId,
                to: emailData.to,
                subject: emailData.subject
            });
        } catch (error) {
            this.logger.error('Failed to send email', {
                error: error.message,
                to: emailData.to,
                subject: emailData.subject
            });
            throw error;
        }
    }

    /**
     * Format reminder email content
     * @param reminderTitle - Title of the reminder
     * @param reminderDescription - Description of the reminder
     * @param userEmail - User's email address
     */
    formatReminderEmail(reminderTitle: string, reminderDescription: string, userEmail: string): EmailData {
        const subject = `Reminder: ${reminderTitle}`;
        const body = EMAIL_TEMPLATE(reminderTitle, reminderDescription);

        return {
            to: userEmail,
            subject,
            body,
            isHtml: true
        };
    }

    /**
     * Verify email identity with AWS SES
     * @param email - Email address to verify
     */
    async verifyEmailIdentity(email: string): Promise<void> {
        try {
            const command = new VerifyEmailIdentityCommand({
                EmailAddress: email
            });

            await this.sesClient.send(command);
            this.logger.debug(`Email verification initiated`, {
                email: email
            });
        } catch (error) {
            this.logger.error('Failed to verify email identity', {
                error: error.message,
                email: email
            });
            throw error;
        }
    }

}

export default EmailService;
