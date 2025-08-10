import { Logger, ReadUser, User } from "@type";
import * as bcrypt from 'bcryptjs';
import DynamoService from "./dynamo-service";

const USERS_TABLE = process.env.USERS_TABLE || 'dev-online-reminder-api-users';

class UserService {
    private dynamoService: DynamoService;
    private logger: Logger;

    constructor(dynamoService: DynamoService, logger: Logger) {
        this.dynamoService = dynamoService;
        this.logger = logger;
    }

    /**
     * Retrieves a user by email using the EmailIndex GSI for optimal performance
     * @param email - User's email address
     * @returns Promise<User | null> - User object or null if not found
     */
    async getUserByEmail(email: string): Promise<User | null> {
        if (!email || !email.trim()) {
            return null;
        }

        const normalizedEmail = email.toLowerCase().trim();

        try {
            this.logger.debug(`Querying DynamoDB for user by email`, {
                tableName: USERS_TABLE,
                indexName: 'EmailIndex',
                email: normalizedEmail
            });

            const result = await this.dynamoService.query({
                TableName: USERS_TABLE,
                IndexName: 'EmailIndex',
                KeyConditionExpression: 'email = :email',
                ExpressionAttributeValues: {
                    ':email': { S: normalizedEmail }
                },
                Limit: 1
            });

            this.logger.debug(`DynamoDB query result`, {
                itemCount: result.Items?.length || 0,
                consumedCapacity: result.ConsumedCapacity
            });

            if (result.Items && result.Items.length > 0) {
                const item = result.Items[0];
                return {
                    id: parseInt(item.id?.N || '0'),
                    email: item.email?.S || '',
                    password: item.password?.S || '',
                    name: item.name?.S || ''
                };
            }
            return null;
        } catch (error) {
            this.logger.error(`DynamoDB query failed`, {
                tableName: USERS_TABLE,
                indexName: 'EmailIndex',
                email: normalizedEmail,
                errorName: error.name,
                errorCode: error.code,
                errorMessage: error.message,
                statusCode: error.$metadata?.httpStatusCode,
                requestId: error.$metadata?.requestId,
                fullError: error
            });
            throw new Error(`Failed to retrieve user: ${error.message}`);
        }
    }

    /**
     * Retrieves a user by ID using the primary key for optimal performance
     * @param id - User's unique ID
     * @returns Promise<User | null> - User object or null if not found
     */
    async getUserById(id: number): Promise<ReadUser | null> {
        if (!id || id <= 0) {
            return null;
        }

        try {
            const result = await this.dynamoService.get({
                TableName: USERS_TABLE,
                Key: {
                    id: { N: id.toString() }
                }
            });

            if (result.Item) {
                return {
                    id: parseInt(result.Item.id?.N || '0'),
                    email: result.Item.email?.S || '',
                    name: result.Item.name?.S || ''
                };
            }
            return null;
        } catch (error) {
            this.logger.error(`Failed to get user by ID: ${error.message}`, { id, error });
            throw new Error('Failed to retrieve user');
        }
    }

    /**
     * Retrieves all users with pagination support
     * @param limit - Maximum number of users to return (default: 100)
     * @param lastEvaluatedKey - For pagination, pass the last key from previous request
     * @returns Promise<{users: User[], lastEvaluatedKey?: any}> - Users and pagination key
     */
    async getAllUsers(limit: number = 100, lastEvaluatedKey?: any): Promise<{ users: ReadUser[], lastEvaluatedKey?: any }> {
        try {
            const params: any = {
                TableName: USERS_TABLE,
                Limit: limit
            };

            if (lastEvaluatedKey) {
                params.ExclusiveStartKey = lastEvaluatedKey;
            }

            const result = await this.dynamoService.scan(params);

            const users = result.Items?.map(item => ({
                id: parseInt(item.id?.N || '0'),
                email: item.email?.S || '',
                name: item.name?.S || ''
            })) || [];

            return {
                users,
                lastEvaluatedKey: result.LastEvaluatedKey
            };
        } catch (error) {
            this.logger.error(`Failed to get all users: ${error.message}`, { error });
            throw new Error('Failed to retrieve users');
        }
    }

    /**
     * Creates a new user
     * @param email - User's email address
     * @param password - User's password
     * @param name - User's name
     * @returns Promise<ReadUser> - User object
     */
    async createUser(email: string, password: string, name: string): Promise<ReadUser> {
        try {
            if (!email || !password || !name) {
                throw new Error('Email, password, and name are required');
            }

            const normalizedEmail = email.toLowerCase().trim();

            // Check if user already exists
            const existingUser = await this.getUserByEmail(normalizedEmail);
            if (existingUser) {
                throw new Error('User already exists');
            }

            // Generate simple ID based on timestamp + random
            const userId = Date.now() + Math.floor(Math.random() * 1000);
            const hashedPassword = bcrypt.hashSync(password, 10);

            const user = {
                id: { N: userId.toString() },
                email: { S: normalizedEmail },
                password: { S: hashedPassword },
                name: { S: name.trim() }
            };

            await this.dynamoService.put({
                TableName: USERS_TABLE,
                Item: user
            });

            return {
                id: userId,
                email: normalizedEmail,
                name: name.trim()
            };
        } catch (error) {
            this.logger.error(`Failed to create user: ${error.message}`, { error });
            throw error;
        }
    }

    /**
     * Updates user profile information
     * @param userId - User's ID
     * @param updates - Fields to update (name and/or email)
     * @returns Promise<ReadUser> - Updated user object
     */
    async updateUserProfile(userId: number, updates: { name?: string; email?: string }): Promise<ReadUser> {
        try {
            if (!userId || userId <= 0) {
                throw new Error('Invalid user ID');
            }

            // Get current user
            const currentUser = await this.getUserById(userId);
            if (!currentUser) {
                throw new Error('User not found');
            }

            // Prepare update expression and values
            const updateExpressions: string[] = [];
            const expressionAttributeValues: any = {};
            const expressionAttributeNames: any = {};

            if (updates.name && updates.name.trim()) {
                updateExpressions.push('#name = :name');
                expressionAttributeNames['#name'] = 'name';
                expressionAttributeValues[':name'] = { S: updates.name.trim() };
            }

            if (updates.email && updates.email.trim()) {
                const normalizedEmail = updates.email.toLowerCase().trim();

                // Check if email is already in use by another user
                if (normalizedEmail !== currentUser.email) {
                    const existingUser = await this.getUserByEmail(normalizedEmail);
                    if (existingUser && existingUser.id !== userId) {
                        throw new Error('Email already in use');
                    }
                }

                updateExpressions.push('#email = :email');
                expressionAttributeNames['#email'] = 'email';
                expressionAttributeValues[':email'] = { S: normalizedEmail };
            }

            if (updateExpressions.length === 0) {
                throw new Error('No valid updates provided');
            }

            // Perform the update
            const updatedUserRaw = await this.dynamoService.update({
                TableName: USERS_TABLE,
                Key: {
                    id: { N: userId.toString() }
                },
                ReturnValues: 'ALL_NEW',
                UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues
            });

            if (!updatedUserRaw) {
                throw new Error('Failed to retrieve updated user');
            }

            const updatedUser = {
                id: parseInt(updatedUserRaw.Attributes?.id?.N || '0'),
                email: updatedUserRaw.Attributes?.email?.S || '',
                name: updatedUserRaw.Attributes?.name?.S || ''
            };

            this.logger.debug('User profile updated successfully', {
                userId,
                updatedFields: Object.keys(updates)
            });

            return updatedUser;
        } catch (error) {
            this.logger.error(`Failed to update user profile: ${error.message}`, { userId, updates, error });
            throw error;
        }
    }
}

export default UserService;