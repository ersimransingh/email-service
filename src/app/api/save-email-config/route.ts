import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import CryptoJS from 'crypto-js';

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
const CONFIG_DIR = path.join(process.cwd(), 'config');
const EMAIL_CONFIG_FILE = path.join(CONFIG_DIR, 'email.config');

export async function POST(request: NextRequest) {
    try {
        const config: EmailConfig = await request.json();

        // Validate required fields
        if (!config.username || !config.startTime || !config.endTime) {
            return NextResponse.json(
                { error: 'Username, start time, and end time are required' },
                { status: 400 }
            );
        }

        // If password is masked (••••••••), get the existing password
        if (config.password === '••••••••') {
            try {
                const configContent = await fs.readFile(EMAIL_CONFIG_FILE, 'utf8');
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

        // Validate time format and logic
        if (config.startTime >= config.endTime) {
            return NextResponse.json(
                { error: 'End time must be after start time' },
                { status: 400 }
            );
        }

        // Validate interval
        if (!config.interval || config.interval <= 0) {
            return NextResponse.json(
                { error: 'Interval must be greater than 0' },
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
            type: 'email_service',
            data: encryptedConfig,
        };

        // Save to file
        await fs.writeFile(EMAIL_CONFIG_FILE, JSON.stringify(configData, null, 2), 'utf8');

        // Restart email worker if it's currently running to reload the new configuration
        try {
            const SERVICE_STATUS_FILE = path.join(CONFIG_DIR, 'service.status');
            let serviceStatus = { status: 'stopped' };

            try {
                const statusContent = await fs.readFile(SERVICE_STATUS_FILE, 'utf8');
                serviceStatus = JSON.parse(statusContent);
            } catch {
                console.log('ℹ️ No service status file found, assuming service is stopped');
            }

            console.log(`📊 Current service status: ${serviceStatus.status}`);

            if (serviceStatus.status === 'running') {
                console.log('🔄 Restarting email worker to apply new configuration...');
                const { EmailWorker } = await import('../../../lib/email/EmailWorker');
                const emailWorker = EmailWorker.getInstance();

                // Force restart the worker with new config
                await emailWorker.stop();  // Stop current
                await emailWorker.start(); // Start with new config

                console.log('✅ Email worker restarted with new configuration');
                console.log('📅 New schedule will take effect immediately');
            } else {
                console.log('ℹ️ Service is stopped, configuration saved. Start service to apply changes.');
            }
        } catch (restartError) {
            const errorMessage = restartError instanceof Error ? restartError.message : 'Unknown error';
            console.log(`⚠️ Could not restart email worker: ${errorMessage}`);
        }

        return NextResponse.json({
            success: true,
            message: 'Email service configuration saved and service restarted successfully',
            timestamp: configData.timestamp,
        });

    } catch (error: unknown) {
        console.error('Error saving email configuration:', error);
        return NextResponse.json(
            { error: 'Failed to save email configuration. Please try again.' },
            { status: 500 }
        );
    }
}

// GET method to retrieve email configuration (for future use)
export async function GET() {
    try {
        // Check if config file exists
        try {
            await fs.access(EMAIL_CONFIG_FILE);
        } catch {
            return NextResponse.json(
                { error: 'No email configuration found' },
                { status: 404 }
            );
        }

        // Read and decrypt configuration
        const configContent = await fs.readFile(EMAIL_CONFIG_FILE, 'utf8');
        const configData = JSON.parse(configContent);

        if (!configData.encrypted || !configData.data) {
            return NextResponse.json(
                { error: 'Invalid email configuration format' },
                { status: 400 }
            );
        }

        const decryptedBytes = CryptoJS.AES.decrypt(configData.data, ENCRYPTION_KEY);
        const decryptedConfig = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));

        // Return config without sensitive data for security
        return NextResponse.json({
            success: true,
            config: {
                startTime: decryptedConfig.startTime,
                endTime: decryptedConfig.endTime,
                interval: decryptedConfig.interval,
                intervalUnit: decryptedConfig.intervalUnit,
                dbRequestTimeout: decryptedConfig.dbRequestTimeout,
                dbConnectionTimeout: decryptedConfig.dbConnectionTimeout,
                // Don't return username and password for security
            },
            timestamp: configData.timestamp,
        });

    } catch (error: unknown) {
        console.error('Error reading email configuration:', error);
        return NextResponse.json(
            { error: 'Failed to read email configuration' },
            { status: 500 }
        );
    }
}
