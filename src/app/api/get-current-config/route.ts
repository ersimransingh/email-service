import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import CryptoJS from 'crypto-js';

interface DatabaseConfig {
    server: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

interface EmailConfig {
    startTime: string;
    endTime: string;
    interval: number;
    intervalUnit: 'minutes' | 'hours';
    dbRequestTimeout: number;
    dbConnectionTimeout: number;
    username: string;
    password: string;
}

const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'email-service-default-key-2024';
const DB_CONFIG_FILE = path.join(process.cwd(), 'config', 'database.config');
const EMAIL_CONFIG_FILE = path.join(process.cwd(), 'config', 'email.config');

async function loadDatabaseConfig(): Promise<DatabaseConfig> {
    const configContent = await fs.readFile(DB_CONFIG_FILE, 'utf8');
    const configData = JSON.parse(configContent);

    if (!configData.encrypted || !configData.data) {
        throw new Error('Invalid database configuration format');
    }

    const decryptedBytes = CryptoJS.AES.decrypt(configData.data, ENCRYPTION_KEY);
    return JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
}

async function loadEmailConfig(): Promise<EmailConfig> {
    const configContent = await fs.readFile(EMAIL_CONFIG_FILE, 'utf8');
    const configData = JSON.parse(configContent);

    if (!configData.encrypted || !configData.data) {
        throw new Error('Invalid email configuration format');
    }

    const decryptedBytes = CryptoJS.AES.decrypt(configData.data, ENCRYPTION_KEY);
    return JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
}

export async function GET() {
    try {
        const [dbConfig, emailConfig] = await Promise.all([
            loadDatabaseConfig(),
            loadEmailConfig()
        ]);

        // Return configurations with passwords masked for security
        const response = {
            database: {
                server: dbConfig.server,
                port: dbConfig.port,
                user: dbConfig.user,
                password: '••••••••', // Mask password for security
                database: dbConfig.database
            },
            email: {
                startTime: emailConfig.startTime,
                endTime: emailConfig.endTime,
                interval: emailConfig.interval,
                intervalUnit: emailConfig.intervalUnit,
                dbRequestTimeout: emailConfig.dbRequestTimeout,
                dbConnectionTimeout: emailConfig.dbConnectionTimeout,
                username: emailConfig.username,
                password: '••••••••' // Mask password for security
            }
        };

        return NextResponse.json({
            success: true,
            config: response
        });

    } catch (error: unknown) {
        console.error('Get config API error:', error);
        return NextResponse.json(
            { error: 'Failed to load configurations' },
            { status: 500 }
        );
    }
}
