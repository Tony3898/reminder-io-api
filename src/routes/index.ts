import { RoutesParams } from '@type';
import { login, register } from 'src/controller/auth';
import { cancelReminder, createReminder, getReminderById, getReminders, updateReminder } from 'src/controller/reminder';
import { getProfile, updateProfile } from 'src/controller/user';

export const routes: Record<string, Record<string, (params: RoutesParams) => Promise<any>>> = {
  '/api/login': {
    POST: login,
  },
  '/api/register': {
    POST: register,
  },
  '/api/user/profile': {
    GET: getProfile,
    PUT: updateProfile,
  },
  '/api/reminder': {
    POST: createReminder,
    GET: getReminders
  },
  '/api/reminder/{reminderId}': {
    GET: getReminderById,
    PUT: updateReminder,
    DELETE: cancelReminder,
  },
};
