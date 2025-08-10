import { PaginationParams, RoutesParams } from "@type";

export const createReminder = async (params: RoutesParams) => {
    const { event, services } = params;
    const { title, description, reminderDate } = event.body;
    const userId: number = event.requestContext.authorizer?.userId as number;
    const reminder = await services.reminderService.createReminder(userId, {
        title,
        description,
        reminderDate,
        status: 'SCHEDULED'
    });
    return {
        status: 201,
        body: reminder
    }
}

export const getReminders = async (params: RoutesParams) => {
    const { event, services } = params;
    const userId: number = event.requestContext.authorizer?.userId as number;

    // Extract pagination parameters from query string
    const queryParams = event.queryStringParameters || {};
    const paginationParams: PaginationParams = {
        page: queryParams.page ? parseInt(queryParams.page) : undefined,
        limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
        status: queryParams.status || undefined,
        sortBy: queryParams.sortBy || undefined,
        sortOrder: queryParams.sortOrder || undefined
    };

    // Check if pagination is requested
    const isPaginated = paginationParams.page || paginationParams.limit ||
        paginationParams.status || paginationParams.sortBy ||
        paginationParams.sortOrder;

    if (isPaginated) {
        const paginatedReminders = await services.reminderService.getUserRemindersPaginated(userId, paginationParams);
        return {
            status: 200,
            body: paginatedReminders
        }
    } else {
        // Legacy support - return all reminders without pagination
        const reminders = await services.reminderService.getUserReminders(userId);
        return {
            status: 200,
            body: reminders
        }
    }
}

export const cancelReminder = async (params: RoutesParams) => {
    const { event, services } = params;
    const userId: number = event.requestContext.authorizer?.userId as number;
    const reminderId: string = event.pathParameters?.reminderId as string;
    const reminder = await services.reminderService.cancelReminder(userId, reminderId);
    return {
        status: 200,
        body: reminder
    }
}

export const updateReminder = async (params: RoutesParams) => {
    const { event, services } = params;
    const reminderId: string = event.pathParameters?.reminderId as string;
    const { title, description, reminderDate, status } = event.body;
    const userId: number = event.requestContext.authorizer?.userId as number;
    const reminder = await services.reminderService.updateReminder(reminderId, {
        title,
        description,
        reminderDate,
        status: status,
    }, userId, true);
    return {
        status: 200,
        body: reminder
    }
}

export const getReminderById = async (params: RoutesParams) => {
    const { event, services } = params;
    const reminderId: string = event.pathParameters?.reminderId as string;
    const userId: number = event.requestContext.authorizer?.userId as number;
    const reminder = await services.reminderService.getReminderByIdAndUserId(reminderId, userId);
    return {
        status: 200,
        body: reminder
    }
}