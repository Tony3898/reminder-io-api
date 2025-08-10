import { RoutesParams } from '@type';

export const login = async (params: RoutesParams) => {
    const { event, services } = params;
    const { body } = event;
    const { email, password } = body;
    const user = await services.authService?.login(email, password);
    return {
        status: 200, body: { message: 'Login successful', user: { email: user.email, id: user.id, name: user.name } },
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': `${user.token}` }
    };
};

export const register = async (params: RoutesParams) => {
    const { event, services } = params;
    const { body } = event;
    const { email, password, name } = body;
    const user = await services.authService?.register(email, password, name);
    return {
        status: 200, body: { message: 'Register successful', user: { email: user.email, id: user.id, name: user.name } },
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': `${user.token}` }
    };
};