import { RoutesParams } from '@type';

export const getProfile = async (params: RoutesParams) => {
    const { event, services } = params;
    const userId = event.requestContext.authorizer?.userId as number

    const user = await services.userService?.getUserById(userId);
    if (!user) {
        return {
            status: 404,
            body: { message: 'User not found' }
        };
    }

    return {
        status: 200,
        body: { user }
    };
};

export const updateProfile = async (params: RoutesParams) => {
    const { event, services } = params;
    const { body } = event;
    const userId = event.requestContext.authorizer?.userId as number;
    const { name, email } = body;

    // Validate input
    if (!name && !email) {
        return {
            status: 400,
            body: { message: 'At least one field (name or email) must be provided' }
        };
    }

    if (email && !email.includes('@')) {
        return {
            status: 400,
            body: { message: 'Invalid email format' }
        };
    }

    try {
        const updates: { name?: string; email?: string } = {};
        if (name) updates.name = name;
        if (email) updates.email = email;

        const currentUser = await services.userService?.getUserById(userId);
        if (!currentUser) {
            return {
                status: 404,
                body: { message: 'User not found' }
            };
        }
        const updatedUser = await services.userService?.updateUserProfile(userId, updates);

        if (email && email !== currentUser?.email) {
            try {
                await services.emailService?.verifyEmailIdentity(email);
                services.logger?.debug('Email verification initiated for updated email', { userId, newEmail: email });
            } catch (emailError) {
                services.logger?.error('Failed to verify updated email identity', {
                    userId,
                    newEmail: email,
                    error: emailError.message
                });
                // Don't fail the profile update if email verification fails
            }
        }

        return {
            status: 200,
            body: {
                message: 'Profile updated successfully',
                user: updatedUser
            }
        };
    } catch (error) {
        return {
            status: 400,
            body: { message: error.message }
        };
    }
};
