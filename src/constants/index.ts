export const EMAIL_TEMPLATE = (reminderTitle: string, reminderDescription: string) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reminder Notification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">🔔 Reminder Notification</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #3498db;">${reminderTitle}</h3>
            <p style="margin-bottom: 0;">${reminderDescription || 'No additional details provided.'}</p>
        </div>
        
        <p style="color: #7f8c8d; font-size: 14px;">
            This is an automated reminder from your Reminder.io Service.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        
        <p style="color: #95a5a6; font-size: 12px; text-align: center;">
            If you have any questions, please contact our support team.
        </p>
    </div>
</body>
</html>`

export const CSP_HEADERS: string =
    'connect-src \'self\' https://*.tejasrana.in; ' +
    'default-src \'none\'; ' +
    'manifest-src \'self\'; ' +
    'frame-ancestors \'none\'; ' +
    'base-uri \'none\'; ' +
    'form-action \'self\' https://*.tejasrana.in; ' +
    'img-src \'self\' https://s3.ap-south-1.amazonaws.com https://*.tejasrana.in; ' +
    'script-src \'self\' polyfill.io; ' +
    'style-src \'self\' \'unsafe-inline\' fonts.googleapis.com; ' +
    'font-src \'self\' maxcdn.bootstrapcdn.com fonts.googleapis.com fonts.gstatic.com;';