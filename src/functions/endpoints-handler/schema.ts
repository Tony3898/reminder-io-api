export const loginSchema = {
  $schema: "http://json-schema.org/draft-04/schema#",
  type: "object",
  properties: {
    email: { type: 'string' },
    password: { type: 'string' }
  },
  required: ['email', 'password'],
  additionalProperties: false
} as const;

export const registerSchema = {
  $schema: "http://json-schema.org/draft-04/schema#",
  type: "object",
  properties: {
    email: { type: 'string' },
    password: { type: 'string' },
    name: { type: 'string' }
  },
  required: ['email', 'password', 'name'],
  additionalProperties: false
} as const;

export const createReminderSchema = {
  $schema: "http://json-schema.org/draft-04/schema#",
  type: "object",
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    reminderDate: { type: 'number' }
  },
  required: ['title', 'description', 'reminderDate'],
  additionalProperties: false
} as const;

export const updateReminderSchema = {
  $schema: "http://json-schema.org/draft-04/schema#",
  type: "object",
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    reminderDate: { type: 'number' },
    status: { type: 'string' }
  },
  additionalProperties: false
} as const;

export const getRemindersSchema = {
  $schema: "http://json-schema.org/draft-04/schema#",
  type: "object",
  properties: {
    page: { type: 'number', minimum: 1 },
    limit: { type: 'number', minimum: 1, maximum: 100 },
    status: { type: 'string', enum: ['SCHEDULED', 'CANCELLED', 'DELIVERED'] },
    sortBy: { type: 'string', enum: ['reminderDate', 'createdAt', 'title'] },
    sortOrder: { type: 'string', enum: ['asc', 'desc'] }
  },
  additionalProperties: false
} as const;

export const updateProfileSchema = {
  $schema: "http://json-schema.org/draft-04/schema#",
  type: "object",
  properties: {
    name: { type: 'string' },
    email: { type: 'string' }
  },
  additionalProperties: false
} as const;