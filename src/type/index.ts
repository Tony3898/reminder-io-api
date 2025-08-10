import { AWS } from '@serverless/typescript';
import AuthService from '@services/auth-service';
import DynamoService from '@services/dynamo-service';
import EmailService from '@services/email-service';
import ReminderService from '@services/reminder-service';
import SchedulerService from '@services/scheduler-service';
import UserService from '@services/user-service';
import { AxiosResponse, Method, ResponseType } from 'axios';
import * as log4js from 'log4js';

export enum LogLevels {
  ALL = 'ALL',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  OFF = 'OFF',
}

export type Logger = log4js.Logger;

export type AWSFunction = AWS['functions']['functionName'];

export type EventType = {
  requestContext: {
    authorizer: {
      [name: string]: any,
      accountId: string,
      principalId: string,
    }
  },
  resource?: string,
  body: any,
  queryStringParameters: any,
  pathParameters: any,
  headers: any,
  httpMethod: string,
  path: string,
  stageVariables: any,
  [key: string]: any,
};

export interface Services {
  logger?: Logger,
  dynamoService?: DynamoService,
  userService?: UserService,
  authService?: AuthService,
  reminderService?: ReminderService,
  schedulerService?: SchedulerService,
  emailService?: EmailService,
}

export interface RoutesParams {
  event: EventType,
  services: Services
}

export interface AxiosInterface {
  url: string;
  headers?: Record<string, string | number | boolean>;
  method?: Method;
  data?: any;
  params?: any;
  responseType?: ResponseType;
}

export interface AxiosWrapper {
  url: string;
  headers?: Record<string, string | number | boolean>;
  method?: Method;
  data?: any;
  params?: any;
  requiredToken?: boolean;
  requiredOnlyBody?: boolean;
  responseType?: ResponseType;
}

export type AxiosResponses = AxiosResponse;

export interface User {
  id: number,
  email: string,
  password: string,
  name: string,
}

export type ReadUser = Omit<User, 'password'>;

export interface Reminder {
  id: string,
  userId: number,
  title: string,
  description: string,
  reminderDate: number,
  status: ReminderStatusType,
  createdAt: string,
  updatedAt: string,
}

export interface ReminderData extends Partial<Reminder> {
  id?: string,
  userId?: number,
  title?: string,
  description?: string,
  reminderDate?: number,
  status?: ReminderStatusType,
}

export enum ReminderStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  DELIVERED = 'DELIVERED'
}

export type ReminderStatusType = 'SCHEDULED' | 'CANCELLED' | 'DELIVERED';

export interface ScheduleTarget {
  arn: string;
  input: any;
  retryPolicy?: {
    maximumRetryAttempts?: number;
  };
}

export interface FlexibleTimeWindow {
  mode: "OFF" | "FLEXIBLE";
  maximumWindowInMinutes?: number;
}

export interface ScheduleRequest {
  name: string;
  scheduleExpression: string;
  description?: string;
  target: ScheduleTarget;
  flexibleTimeWindow?: FlexibleTimeWindow;
  state?: "ENABLED" | "DISABLED";
}

export interface ReminderScheduleData {
  reminderId: string;
  userId: number;
  title: string;
  description: string;
  reminderDate: number;
}

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

export interface EmailEventPayload {
  reminderId: string;
  userId: number;
  title: string;
  description?: string;
  userEmail: string;
  scheduledTime?: string;
  scheduledTimestamp?: number;
}

export interface ReminderResponse {
  reminder: Reminder;
  schedule: ScheduleRequest;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  status?: ReminderStatusType;
  sortBy?: 'reminderDate' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
