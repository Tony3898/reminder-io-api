import jwt, { JwtPayload } from 'jsonwebtoken';

class JwtService {
    constructor() { }

    /**
     * Generates a JWT token
     * @param payload - The payload to sign
     * @returns The JWT token
     * @throws {Error} If the token generation fails
     * Using the secret key from the environment variables as this is a sample project but for real world application, we should use a more secure way to store the secret key.
     * We can use AWS Secrets Manager to store the secret key.
     * We can also use AWS KMS to encrypt the secret key.
     * We can use private key and public key to sign and verify the token. (Recommended)
     */
    async generateToken(payload: JwtPayload) {
        return jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '7d' });
    }

    /**
     * Verifies a JWT token
     * @param token - The token to verify
     * @returns The decoded payload
     * @throws {Error} If the token verification fails
     */
    async verifyToken(token: string) {
        return jwt.verify(token, process.env.SECRET_KEY);
    }
}

export default JwtService;  