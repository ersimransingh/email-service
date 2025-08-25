import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import CryptoJS from 'crypto-js';

interface LoginCredentials {
    username: string;
    password: string;
}

interface EmailConfig {
    username: string;
    password: string;
}

const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'email-service-default-key-2024';
const CONFIG_FILE = path.join(process.cwd(), 'config', 'email.config');

export async function POST(request: NextRequest) {
    try {
        const credentials: LoginCredentials = await request.json();

        if (!credentials.username || !credentials.password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Read email configuration to get stored credentials
        let storedConfig: EmailConfig;
        try {
            const configContent = await fs.readFile(CONFIG_FILE, 'utf8');
            const configData = JSON.parse(configContent);

            if (!configData.encrypted || !configData.data) {
                return NextResponse.json(
                    { error: 'Invalid configuration format' },
                    { status: 500 }
                );
            }

            const decryptedBytes = CryptoJS.AES.decrypt(configData.data, ENCRYPTION_KEY);
            storedConfig = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
        } catch {
            return NextResponse.json(
                { error: 'Email service not configured. Please complete setup first.' },
                { status: 404 }
            );
        }

        // Verify credentials
        if (credentials.username === storedConfig.username && credentials.password === storedConfig.password) {
            // Generate a simple session token (in production, use JWT or more secure method)
            const sessionData = {
                username: credentials.username,
                timestamp: Date.now(),
            };

            const token = CryptoJS.AES.encrypt(JSON.stringify(sessionData), ENCRYPTION_KEY).toString();

            return NextResponse.json({
                success: true,
                message: 'Authentication successful',
                token: token,
                user: {
                    username: credentials.username,
                }
            });
        } else {
            return NextResponse.json(
                { error: 'Invalid username or password' },
                { status: 401 }
            );
        }

    } catch (error: unknown) {
        console.error('Authentication error:', error);
        return NextResponse.json(
            { error: 'Authentication failed. Please try again.' },
            { status: 500 }
        );
    }
}

// GET method to verify token (for future use)
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'No authorization token provided' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);

        try {
            const decryptedBytes = CryptoJS.AES.decrypt(token, ENCRYPTION_KEY);
            const sessionData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));

            // Check if token is not too old (24 hours)
            const tokenAge = Date.now() - sessionData.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

            if (tokenAge > maxAge) {
                return NextResponse.json(
                    { error: 'Token expired' },
                    { status: 401 }
                );
            }

            return NextResponse.json({
                success: true,
                user: {
                    username: sessionData.username,
                }
            });
        } catch {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

    } catch (error: unknown) {
        console.error('Token verification error:', error);
        return NextResponse.json(
            { error: 'Token verification failed' },
            { status: 500 }
        );
    }
}
