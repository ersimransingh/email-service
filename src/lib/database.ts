import sql from 'mssql';
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

const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'email-service-default-key-2024';
const CONFIG_FILE = path.join(process.cwd(), 'config', 'database.config');

export class DatabaseManager {
    private static instance: DatabaseManager;
    private pool: sql.ConnectionPool | null = null;
    private config: DatabaseConfig | null = null;

    private constructor() { }

    public static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    async loadConfig(): Promise<DatabaseConfig> {
        if (this.config) {
            return this.config;
        }

        try {
            const configContent = await fs.readFile(CONFIG_FILE, 'utf8');
            const configData = JSON.parse(configContent);

            if (!configData.encrypted || !configData.data) {
                throw new Error('Invalid configuration format');
            }

            const decryptedBytes = CryptoJS.AES.decrypt(configData.data, ENCRYPTION_KEY);
            const config = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
            this.config = config;

            return config;
        } catch {
            throw new Error('No database configuration found. Please set up the database connection first.');
        }
    }

    async getConnection(): Promise<sql.ConnectionPool> {
        if (this.pool && this.pool.connected) {
            return this.pool;
        }

        const config = await this.loadConfig();

        const sqlConfig: sql.config = {
            server: config.server,
            port: parseInt(config.port),
            user: config.user,
            password: config.password,
            database: config.database,
            options: {
                encrypt: true,
                trustServerCertificate: true,
                connectTimeout: 30000,
                requestTimeout: 30000,
            },
        };

        this.pool = new sql.ConnectionPool(sqlConfig);
        await this.pool.connect();

        return this.pool;
    }

    async closeConnection(): Promise<void> {
        if (this.pool) {
            await this.pool.close();
            this.pool = null;
        }
    }

    async testConnection(config: DatabaseConfig): Promise<boolean> {
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

        let testPool: sql.ConnectionPool | null = null;

        try {
            testPool = new sql.ConnectionPool(sqlConfig);
            await testPool.connect();

            const result = await testPool.request().query('SELECT 1 as test');
            return result.recordset && result.recordset.length > 0;
        } finally {
            if (testPool) {
                await testPool.close();
            }
        }
    }
}

export default DatabaseManager;
