import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import CryptoJS from 'crypto-js';

interface DatabaseConfig {
    server: string;
    port: string;
    user: string;
    password: string;
    database: string;
}

// Secret key for encryption (in production, this should be from environment variables)
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'email-service-default-key-2024';

// Configuration file path
const CONFIG_DIR = path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'database.config');

export async function POST(request: NextRequest) {
    try {
        const config: DatabaseConfig = await request.json();

        // Validate required fields
        if (!config.server || !config.port || !config.user || !config.database) {
            return NextResponse.json(
                { error: 'Server, port, user, and database fields are required' },
                { status: 400 }
            );
        }

        // If password is masked (••••••••), get the existing password
        if (config.password === '••••••••') {
            try {
                const configContent = await fs.readFile(CONFIG_FILE, 'utf8');
                const configData = JSON.parse(configContent);

                if (configData.encrypted && configData.data) {
                    const decryptedBytes = CryptoJS.AES.decrypt(configData.data, ENCRYPTION_KEY);
                    const existingConfig = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
                    config.password = existingConfig.password;
                }
            } catch {
                return NextResponse.json(
                    { error: 'Password is required for new configuration' },
                    { status: 400 }
                );
            }
        }

        // Validate password is not empty
        if (!config.password) {
            return NextResponse.json(
                { error: 'Password is required' },
                { status: 400 }
            );
        }

        // Ensure config directory exists
        try {
            await fs.access(CONFIG_DIR);
        } catch {
            await fs.mkdir(CONFIG_DIR, { recursive: true });
        }

        // Encrypt the configuration
        const configString = JSON.stringify(config);
        const encryptedConfig = CryptoJS.AES.encrypt(configString, ENCRYPTION_KEY).toString();

        // Add metadata
        const configData = {
            encrypted: true,
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: encryptedConfig,
        };

        // Save to file
        await fs.writeFile(CONFIG_FILE, JSON.stringify(configData, null, 2), 'utf8');

        return NextResponse.json({
            success: true,
            message: 'Configuration saved successfully',
            timestamp: configData.timestamp,
        });

    } catch (error: unknown) {
        console.error('Error saving configuration:', error);
        return NextResponse.json(
            { error: 'Failed to save configuration. Please try again.' },
            { status: 500 }
        );
    }
}

// GET method to retrieve configuration (for future use)
export async function GET() {
    try {
        // Check if config file exists
        try {
            await fs.access(CONFIG_FILE);
        } catch {
            return NextResponse.json(
                { error: 'No configuration found' },
                { status: 404 }
            );
        }

        // Read and decrypt configuration
        const configContent = await fs.readFile(CONFIG_FILE, 'utf8');
        const configData = JSON.parse(configContent);

        if (!configData.encrypted || !configData.data) {
            return NextResponse.json(
                { error: 'Invalid configuration format' },
                { status: 400 }
            );
        }

        const decryptedBytes = CryptoJS.AES.decrypt(configData.data, ENCRYPTION_KEY);
        const decryptedConfig = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));

        // Return config without sensitive data for security
        return NextResponse.json({
            success: true,
            config: {
                server: decryptedConfig.server,
                port: decryptedConfig.port,
                database: decryptedConfig.database,
                // Don't return username and password for security
            },
            timestamp: configData.timestamp,
        });

    } catch (error: unknown) {
        console.error('Error reading configuration:', error);
        return NextResponse.json(
            { error: 'Failed to read configuration' },
            { status: 500 }
        );
    }
}
