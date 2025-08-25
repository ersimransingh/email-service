import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import CryptoJS from 'crypto-js';
import sql from 'mssql';

interface DatabaseConfig {
    server: string;
    port: string;
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

interface ServiceStatus {
    status: 'running' | 'stopped';
    startedAt?: string;
    stoppedAt?: string;
    startedBy?: string;
    lastActivity?: string;
    totalRunTime?: number;
    emailStats?: {
        totalProcessed: number;
        totalSent: number;
        totalFailed: number;
        lastRun?: string;
        nextRun?: string;
    };
}

const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'email-service-default-key-2024';
const DB_CONFIG_FILE = path.join(process.cwd(), 'config', 'database.config');
const EMAIL_CONFIG_FILE = path.join(process.cwd(), 'config', 'email.config');
const SERVICE_STATUS_FILE = path.join(process.cwd(), 'config', 'service.status');

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

async function loadServiceStatus(): Promise<ServiceStatus> {
    try {
        const statusContent = await fs.readFile(SERVICE_STATUS_FILE, 'utf8');
        return JSON.parse(statusContent);
    } catch {
        // Return default status if file doesn't exist
        return {
            status: 'stopped',
            stoppedAt: new Date().toISOString(),
        };
    }
}

async function testDatabaseConnection(config: DatabaseConfig): Promise<{ connected: boolean; responseTime?: number }> {
    const startTime = Date.now();
    let pool: sql.ConnectionPool | null = null;

    try {
        const sqlConfig: sql.config = {
            server: config.server,
            port: parseInt(config.port),
            user: config.user,
            password: config.password,
            database: config.database,
            options: {
                encrypt: true,
                trustServerCertificate: true,
                connectTimeout: 10000,
                requestTimeout: 10000,
            },
        };

        pool = new sql.ConnectionPool(sqlConfig);
        await pool.connect();

        const result = await pool.request().query('SELECT 1 as test');
        const responseTime = Date.now() - startTime;

        return {
            connected: result.recordset && result.recordset.length > 0,
            responseTime
        };
    } catch {
        return { connected: false };
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch {
                // Ignore close errors
            }
        }
    }
}

function isServiceActive(startTime: string, endTime: string): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return currentTime >= startMinutes && currentTime <= endMinutes;
}

function calculateNextRun(startTime: string, endTime: string, interval: number, intervalUnit: string): string | null {
    const now = new Date();
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const todayStart = new Date(now);
    todayStart.setHours(startHour, startMin, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(endHour, endMin, 0, 0);

    const intervalMs = interval * (intervalUnit === 'hours' ? 60 * 60 * 1000 : 60 * 1000);

    if (now < todayStart) {
        return todayStart.toISOString();
    } else if (now >= todayStart && now <= todayEnd) {
        // Find next interval within today's schedule
        const nextRun = new Date(todayStart);
        while (nextRun <= now && nextRun <= todayEnd) {
            nextRun.setTime(nextRun.getTime() + intervalMs);
        }

        if (nextRun <= todayEnd) {
            return nextRun.toISOString();
        } else {
            // Tomorrow's first run
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(startHour, startMin, 0, 0);
            return tomorrow.toISOString();
        }
    } else {
        // Tomorrow's first run
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(startHour, startMin, 0, 0);
        return tomorrow.toISOString();
    }
}

export async function GET() {
    try {
        // Load configurations and service status
        const [dbConfig, emailConfig, serviceStatus] = await Promise.all([
            loadDatabaseConfig(),
            loadEmailConfig(),
            loadServiceStatus()
        ]);

        // Test database connection
        const dbStatus = await testDatabaseConnection(dbConfig);

        // Check if service should be active based on schedule
        const isInSchedule = isServiceActive(emailConfig.startTime, emailConfig.endTime);

        // Calculate next run time
        const nextRun = calculateNextRun(
            emailConfig.startTime,
            emailConfig.endTime,
            emailConfig.interval,
            emailConfig.intervalUnit
        );

        // Determine actual service status
        let actualServiceStatus: 'running' | 'stopped' | 'error' = 'error';

        if (!dbStatus.connected) {
            actualServiceStatus = 'error';
        } else if (serviceStatus.status === 'running' && isInSchedule) {
            actualServiceStatus = 'running';
        } else {
            actualServiceStatus = 'stopped';
        }

        const dashboardData = {
            database: {
                connected: dbStatus.connected,
                server: dbConfig.server,
                database: dbConfig.database,
                lastChecked: new Date().toISOString(),
                responseTime: dbStatus.responseTime,
            },
            schedule: {
                startTime: emailConfig.startTime,
                endTime: emailConfig.endTime,
                interval: emailConfig.interval,
                intervalUnit: emailConfig.intervalUnit,
                isActive: isInSchedule,
            },
            service: {
                status: actualServiceStatus,
                lastRun: serviceStatus.lastActivity,
                nextRun: serviceStatus.status === 'running' && isInSchedule ? nextRun : null,
                startedAt: serviceStatus.startedAt,
                stoppedAt: serviceStatus.stoppedAt,
                startedBy: serviceStatus.startedBy,
                totalRunTime: serviceStatus.totalRunTime,
                serviceFileStatus: serviceStatus.status,
                emailStats: serviceStatus.emailStats || {
                    totalProcessed: 0,
                    totalSent: 0,
                    totalFailed: 0
                }
            }
        };

        return NextResponse.json(dashboardData);

    } catch (error: unknown) {
        console.error('Dashboard API error:', error);
        return NextResponse.json(
            { error: 'Failed to load dashboard data' },
            { status: 500 }
        );
    }
}
