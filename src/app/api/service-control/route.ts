import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { EmailWorker } from '../../../lib/email/EmailWorker';

interface ServiceStatus {
    status: 'running' | 'stopped';
    startedAt?: string;
    stoppedAt?: string;
    startedBy?: string;
    lastActivity?: string;
    totalRunTime?: number;
}

interface ServiceControlRequest {
    action: 'start' | 'stop';
    user?: string;
}

const CONFIG_DIR = path.join(process.cwd(), 'config');
const SERVICE_STATUS_FILE = path.join(CONFIG_DIR, 'service.status');

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

async function saveServiceStatus(status: ServiceStatus): Promise<void> {
    // Ensure config directory exists
    try {
        await fs.access(CONFIG_DIR);
    } catch {
        await fs.mkdir(CONFIG_DIR, { recursive: true });
    }

    await fs.writeFile(SERVICE_STATUS_FILE, JSON.stringify(status, null, 2), 'utf8');
}

export async function POST(request: NextRequest) {
    try {
        const { action, user = 'system' }: ServiceControlRequest = await request.json();

        if (!action || (action !== 'start' && action !== 'stop')) {
            return NextResponse.json(
                { error: 'Invalid action. Must be "start" or "stop"' },
                { status: 400 }
            );
        }

        const currentStatus = await loadServiceStatus();
        const timestamp = new Date().toISOString();
        const emailWorker = EmailWorker.getInstance();

        let newStatus: ServiceStatus;

        if (action === 'start') {
            if (currentStatus.status === 'running') {
                return NextResponse.json({
                    success: false,
                    message: 'Service is already running',
                    status: currentStatus,
                });
            }

            // Start the email worker
            try {
                await emailWorker.start();
                console.log('✅ Email worker started successfully');
            } catch (workerError: unknown) {
                const errorMessage = workerError instanceof Error ? workerError.message : 'Unknown error';
                console.error('❌ Failed to start email worker:', errorMessage);
                return NextResponse.json(
                    { error: `Failed to start email worker: ${errorMessage}` },
                    { status: 500 }
                );
            }

            newStatus = {
                status: 'running',
                startedAt: timestamp,
                startedBy: user,
                lastActivity: timestamp,
                totalRunTime: currentStatus.totalRunTime || 0,
            };
        } else { // stop
            if (currentStatus.status === 'stopped') {
                return NextResponse.json({
                    success: false,
                    message: 'Service is already stopped',
                    status: currentStatus,
                });
            }

            // Stop the email worker
            try {
                await emailWorker.stop();
                console.log('✅ Email worker stopped successfully');
            } catch (workerError: unknown) {
                const errorMessage = workerError instanceof Error ? workerError.message : 'Unknown error';
                console.error('❌ Failed to stop email worker:', errorMessage);
                // Continue with status update even if worker stop fails
            }

            // Calculate run time if service was running
            let totalRunTime = currentStatus.totalRunTime || 0;
            if (currentStatus.startedAt) {
                const runTime = Date.now() - new Date(currentStatus.startedAt).getTime();
                totalRunTime += runTime;
            }

            newStatus = {
                status: 'stopped',
                stoppedAt: timestamp,
                startedAt: currentStatus.startedAt,
                startedBy: currentStatus.startedBy,
                lastActivity: timestamp,
                totalRunTime,
            };
        }

        await saveServiceStatus(newStatus);

        return NextResponse.json({
            success: true,
            message: `Service ${action}ed successfully`,
            status: newStatus,
            timestamp,
        });

    } catch (error: unknown) {
        console.error('Service control error:', error);
        return NextResponse.json(
            { error: 'Failed to control service' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const status = await loadServiceStatus();

        // Update last activity if service is running
        if (status.status === 'running') {
            status.lastActivity = new Date().toISOString();
            await saveServiceStatus(status);
        }

        return NextResponse.json({
            success: true,
            status,
        });

    } catch (error: unknown) {
        console.error('Service status error:', error);
        return NextResponse.json(
            { error: 'Failed to get service status' },
            { status: 500 }
        );
    }
}
