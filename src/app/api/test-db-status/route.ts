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

const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'email-service-default-key-2024';
const CONFIG_FILE = path.join(process.cwd(), 'config', 'database.config');

export async function POST() {
    try {
        // Load database configuration
        const configContent = await fs.readFile(CONFIG_FILE, 'utf8');
        const configData = JSON.parse(configContent);

        if (!configData.encrypted || !configData.data) {
            return NextResponse.json(
                { error: 'Invalid database configuration format' },
                { status: 400 }
            );
        }

        const decryptedBytes = CryptoJS.AES.decrypt(configData.data, ENCRYPTION_KEY);
        const config: DatabaseConfig = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));

        // Test the connection
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

            if (result.recordset && result.recordset.length > 0) {
                return NextResponse.json({
                    success: true,
                    connected: true,
                    responseTime: responseTime,
                    message: 'Database connection successful',
                    timestamp: new Date().toISOString(),
                });
            } else {
                throw new Error('Connection established but test query failed');
            }
        } catch (dbError: unknown) {
            console.error('Database connection error:', dbError);

            let errorMessage = 'Connection failed. Please check your settings.';

            if (typeof dbError === 'object' && dbError !== null && 'code' in dbError) {
                const error = dbError as { code?: string; message?: string };
                if (error.code === 'ECONNREFUSED') {
                    errorMessage = 'Connection refused. Check if the server is running and accessible.';
                } else if (error.code === 'ETIMEOUT') {
                    errorMessage = 'Connection timeout. Check server address and network connectivity.';
                } else if (error.code === 'ELOGIN') {
                    errorMessage = 'Login failed. Check your username and password.';
                } else if (error.code === 'EDBNAME') {
                    errorMessage = 'Database not found. Check the database name.';
                } else if (error.message) {
                    errorMessage = error.message;
                }
            }

            return NextResponse.json({
                success: false,
                connected: false,
                error: errorMessage,
                timestamp: new Date().toISOString(),
            });
        } finally {
            if (pool) {
                try {
                    await pool.close();
                } catch {
                    // Ignore close errors
                }
            }
        }

    } catch (error: unknown) {
        console.error('Test DB Status API error:', error);
        return NextResponse.json(
            { error: 'Failed to test database connection' },
            { status: 500 }
        );
    }
}
