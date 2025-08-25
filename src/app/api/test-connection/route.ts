import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';

interface DatabaseConfig {
    server: string;
    port: string;
    user: string;
    password: string;
    database: string;
}

export async function POST(request: NextRequest) {
    try {
        const config: DatabaseConfig = await request.json();

        // Validate required fields
        if (!config.server || !config.port || !config.user || !config.password || !config.database) {
            return NextResponse.json(
                { error: 'All database configuration fields are required' },
                { status: 400 }
            );
        }

        // Create SQL Server connection configuration
        const sqlConfig: sql.config = {
            server: config.server,
            port: parseInt(config.port),
            user: config.user,
            password: config.password,
            database: config.database,
            options: {
                encrypt: true, // Use encryption for Azure SQL
                trustServerCertificate: true, // For local development
                connectTimeout: 10000, // 10 seconds timeout
                requestTimeout: 10000,
            },
        };

        // Test the connection
        let pool: sql.ConnectionPool | null = null;

        try {
            pool = new sql.ConnectionPool(sqlConfig);
            await pool.connect();

            // Test with a simple query
            const result = await pool.request().query('SELECT 1 as test');

            if (result.recordset && result.recordset.length > 0) {
                return NextResponse.json({
                    success: true,
                    message: 'Database connection successful! Ready to proceed.',
                });
            } else {
                throw new Error('Connection established but test query failed');
            }
        } catch (dbError: unknown) {
            console.error('Database connection error:', dbError);

            // Provide more specific error messages based on error type
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

            return NextResponse.json(
                { error: errorMessage },
                { status: 400 }
            );
        } finally {
            // Always close the pool
            if (pool) {
                try {
                    await pool.close();
                } catch (closeError) {
                    console.error('Error closing database pool:', closeError);
                }
            }
        }
    } catch (error: unknown) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error. Please try again.' },
            { status: 500 }
        );
    }
}
