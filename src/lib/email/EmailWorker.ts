import * as cron from 'node-cron';
import { promises as fs } from 'fs';
import path from 'path';
import CryptoJS from 'crypto-js';
import { EmailService } from './EmailService';

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

export class EmailWorker {
    private static instance: EmailWorker;
    private emailService: EmailService;
    private cronJob: cron.ScheduledTask | null = null;
    private isProcessing = false;
    private config: EmailConfig | null = null;

    private readonly ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'email-service-default-key-2024';
    private readonly EMAIL_CONFIG_FILE = path.join(process.cwd(), 'config', 'email.config');
    private readonly SERVICE_STATUS_FILE = path.join(process.cwd(), 'config', 'service.status');

    private constructor() {
        this.emailService = EmailService.getInstance();
    }

    public static getInstance(): EmailWorker {
        if (!EmailWorker.instance) {
            EmailWorker.instance = new EmailWorker();
        }
        return EmailWorker.instance;
    }

    /**
     * Load email configuration
     */
    private async loadEmailConfig(): Promise<EmailConfig> {
        if (this.config) {
            return this.config;
        }

        try {
            const configContent = await fs.readFile(this.EMAIL_CONFIG_FILE, 'utf8');
            const configData = JSON.parse(configContent);

            if (!configData.encrypted || !configData.data) {
                throw new Error('Invalid email configuration format');
            }

            const decryptedBytes = CryptoJS.AES.decrypt(configData.data, this.ENCRYPTION_KEY);
            const config = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
            this.config = config;

            return config;
        } catch {
            throw new Error('Email configuration not found. Please complete setup first.');
        }
    }

    /**
     * Load service status
     */
    private async loadServiceStatus(): Promise<ServiceStatus> {
        try {
            const statusContent = await fs.readFile(this.SERVICE_STATUS_FILE, 'utf8');
            return JSON.parse(statusContent);
        } catch {
            return {
                status: 'stopped',
                stoppedAt: new Date().toISOString(),
                emailStats: {
                    totalProcessed: 0,
                    totalSent: 0,
                    totalFailed: 0
                }
            };
        }
    }

    /**
     * Save service status
     */
    private async saveServiceStatus(status: ServiceStatus): Promise<void> {
        try {
            await fs.writeFile(this.SERVICE_STATUS_FILE, JSON.stringify(status, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ Error saving service status:', error);
        }
    }

    /**
     * Update the service status with current configuration
     */
    private async updateServiceStatusWithConfig(): Promise<void> {
        try {
            const serviceStatus = await this.loadServiceStatus();
            if (serviceStatus.status === 'running' && this.config) {
                serviceStatus.lastActivity = new Date().toISOString();
                serviceStatus.currentSchedule = `${this.config.startTime}-${this.config.endTime}`;
                serviceStatus.currentInterval = `${this.config.interval} ${this.config.intervalUnit}`;
                await this.saveServiceStatus(serviceStatus);
            }
        } catch (error) {
            console.warn('⚠️ Could not update service status with config:', error);
        }
    }

    /**
     * Check if current time is within service schedule
     */
    private isWithinSchedule(startTime: string, endTime: string): boolean {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        return currentTime >= startMinutes && currentTime <= endMinutes;
    }

    /**
     * Calculate cron expression based on interval
     */
    private getCronExpression(interval: number, intervalUnit: string): string {
        if (intervalUnit === 'hours') {
            return `0 0 */${interval} * * *`; // Every N hours
        } else {
            // Minutes
            if (interval === 1) {
                return '* * * * *'; // Every minute
            } else if (interval < 60) {
                return `*/${interval} * * * *`; // Every N minutes
            } else {
                // Convert to hours if >= 60 minutes
                const hours = Math.floor(interval / 60);
                return `0 0 */${hours} * * *`;
            }
        }
    }

    /**
     * Process emails
     */
    private async processEmails(): Promise<void> {
        if (this.isProcessing) {
            console.log('⏳ Email processing already in progress, skipping...');
            return;
        }

        try {
            this.isProcessing = true;

            // Load current status
            const serviceStatus = await this.loadServiceStatus();

            // Check if service should be running
            if (serviceStatus.status !== 'running') {
                console.log('⏸️ Service is stopped, skipping email processing');
                return;
            }

            // Load config and check schedule
            const config = await this.loadEmailConfig();

            // Check if config has changed and restart if needed
            if (this.config && (
                this.config.startTime !== config.startTime ||
                this.config.endTime !== config.endTime ||
                this.config.interval !== config.interval ||
                this.config.intervalUnit !== config.intervalUnit
            )) {
                console.log('🔄 Configuration changed detected, restarting worker...');
                console.log(`📅 Old: ${this.config.startTime}-${this.config.endTime}, ${this.config.interval} ${this.config.intervalUnit}`);
                console.log(`📅 New: ${config.startTime}-${config.endTime}, ${config.interval} ${config.intervalUnit}`);

                // Update stored config and restart
                this.config = config;
                await this.start(); // This will restart with new schedule
                return; // Exit this processing cycle, let the new schedule take over
            }

            if (!this.isWithinSchedule(config.startTime, config.endTime)) {
                console.log(`⏰ Outside service hours (${config.startTime}-${config.endTime}), skipping email processing`);
                return;
            }

            console.log('\n🔄 Starting email processing cycle...');
            const startTime = Date.now();

            // Process the email queue
            const result = await this.emailService.processEmailQueue();

            const processingTime = Date.now() - startTime;
            console.log(`⏱️ Email processing completed in ${processingTime}ms`);

            // Update service status with email stats
            const updatedStats = {
                ...serviceStatus.emailStats,
                totalProcessed: (serviceStatus.emailStats?.totalProcessed || 0) + result.processed,
                totalSent: (serviceStatus.emailStats?.totalSent || 0) + result.success,
                totalFailed: (serviceStatus.emailStats?.totalFailed || 0) + result.failed,
                lastRun: new Date().toISOString(),
            };

            const updatedStatus: ServiceStatus = {
                ...serviceStatus,
                lastActivity: new Date().toISOString(),
                emailStats: updatedStats
            };

            await this.saveServiceStatus(updatedStatus);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error in email processing cycle:', errorMessage);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Start the email worker
     */
    async start(): Promise<void> {
        try {
            console.log('🚀 Starting email worker...');

            // Stop existing job if running to reload config
            if (this.cronJob) {
                console.log('🔄 Stopping existing cron job to reload configuration...');
                this.cronJob.stop();
                this.cronJob.destroy();
                this.cronJob = null;
            }

            // Always reload configuration when starting
            this.config = await this.loadEmailConfig();
            console.log(`📅 Schedule: ${this.config.startTime} - ${this.config.endTime}, every ${this.config.interval} ${this.config.intervalUnit}`);

            // Create cron expression
            const cronExpression = this.getCronExpression(this.config.interval, this.config.intervalUnit);
            console.log(`⏰ Cron expression: ${cronExpression}`);

            // Create and start cron job
            this.cronJob = cron.schedule(cronExpression, async () => {
                await this.processEmails();
            });

            // Start the cron job
            this.cronJob.start();

            // Update service status with current config
            await this.updateServiceStatusWithConfig();

            console.log('✅ Email worker started successfully');

            // Update service status
            const serviceStatus = await this.loadServiceStatus();
            const updatedStatus: ServiceStatus = {
                ...serviceStatus,
                status: 'running',
                startedAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                emailStats: serviceStatus.emailStats || {
                    totalProcessed: 0,
                    totalSent: 0,
                    totalFailed: 0
                }
            };

            await this.saveServiceStatus(updatedStatus);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error starting email worker:', errorMessage);
            throw error;
        }
    }

    /**
     * Stop the email worker
     */
    async stop(): Promise<void> {
        try {
            console.log('⏹️ Stopping email worker...');

            if (this.cronJob) {
                this.cronJob.stop();
                this.cronJob.destroy();
                this.cronJob = null;
            }

            // Close email transporter
            this.emailService.closeEmailTransporter();

            console.log('✅ Email worker stopped successfully');

            // Update service status
            const serviceStatus = await this.loadServiceStatus();

            // Calculate total runtime
            let totalRunTime = serviceStatus.totalRunTime || 0;
            if (serviceStatus.startedAt) {
                const runTime = Date.now() - new Date(serviceStatus.startedAt).getTime();
                totalRunTime += runTime;
            }

            const updatedStatus: ServiceStatus = {
                ...serviceStatus,
                status: 'stopped',
                stoppedAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                totalRunTime
            };

            await this.saveServiceStatus(updatedStatus);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error stopping email worker:', errorMessage);
        }
    }

    /**
 * Get worker status
 */
    async getStatus(): Promise<{ running: boolean; jobScheduled: boolean; config?: EmailConfig }> {
        try {
            const config = await this.loadEmailConfig();
            const serviceStatus = await this.loadServiceStatus();

            // If service status says running but we don't have a cron job, restart it
            if (serviceStatus.status === 'running' && this.cronJob === null) {
                console.log('🔄 Service status indicates running but cron job is missing. Restarting...');
                try {
                    await this.start();
                } catch (error) {
                    console.error('❌ Failed to restart email worker:', error);
                }
            }

            return {
                running: this.cronJob !== null && serviceStatus.status === 'running',
                jobScheduled: this.cronJob !== null,
                config
            };
        } catch {
            return {
                running: false,
                jobScheduled: false
            };
        }
    }

    /**
     * Send test email
     */
    async sendTestEmail(toEmail: string): Promise<{ success: boolean; messageId?: string; recipient: string; error?: string }> {
        return await this.emailService.sendTestEmail(toEmail);
    }

    /**
     * Force process emails (for testing)
     */
    async forceProcessEmails(): Promise<void> {
        console.log('🔧 Force processing emails...');
        return await this.processEmails();
    }
}
