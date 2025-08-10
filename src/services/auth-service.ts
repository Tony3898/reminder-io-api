import { Logger } from '@type';
import * as bcrypt from 'bcryptjs';
import EmailService from "./email-service";
import JwtService from "./jwt-service";
import UserService from "./user-service";

class AuthService {
    private jwtService: JwtService;
    private userService: UserService;
    private emailService: EmailService;
    private logger: Logger;

    constructor(jwtService: JwtService, userService: UserService, emailService: EmailService, logger: Logger) {
        this.jwtService = jwtService;
        this.userService = userService;
        this.emailService = emailService;
        this.logger = logger;
    }

    /**
     * Generates a JWT token
     * @param userId - The user's ID
     * @returns The JWT token
     */
    async generateToken(userId: number) {
        try {
            const token = this.jwtService.generateToken({
                audience: 'reminder-app.tejasrana.in',
                issuer: 'tejasrana.in',
                subject: userId.toString(),
                payload: { userId },
            });
            return token;
        } catch (error) {
            this.logger.error('Failed to generate token', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Verifies a JWT token
     * @param token - The token to verify
     * @returns The decoded payload
     */
    async verifyToken(token: string) {
        try {
            return this.jwtService.verifyToken(token);
        } catch (error) {
            this.logger.error('Failed to verify token', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Logs in a user
     * @param email - The user's email address
     * @param password - The user's password
     * @returns The user object and token
     */
    async login(email: string, password: string) {
        try {
            const user = await this.userService.getUserByEmail(email);
            if (!user) {
                throw new Error('User not found');
            }
            if (!bcrypt.compareSync(password, user.password)) {
                throw new Error('Invalid password');
            }
            const token = await this.generateToken(user.id);
            return { ...user, token };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Registers a new user
     * @param email - The user's email address
     * @param password - The user's password
     * @param name - The user's name
     * @returns The user object and token
     */
    async register(email: string, password: string, name: string) {
        try {
            const user = await this.userService.createUser(email, password, name);

            // Verify email identity with SES for future email sending
            try {
                await this.emailService.verifyEmailIdentity(email);
                this.logger.debug('Email verification initiated for new user', { email, userId: user.id });
            } catch (emailError) {
                this.logger.error('Failed to verify email identity, but user creation succeeded', {
                    email,
                    userId: user.id,
                    error: emailError.message
                });
            }
            const token = await this.generateToken(user.id);
            return { ...user, token };
        } catch (error) {
            throw error;
        }
    }
}

export default AuthService;