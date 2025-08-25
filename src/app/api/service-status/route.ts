import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface ServiceStatus {
    status: 'running' | 'stopped';
    startedAt?: string;
    stoppedAt?: string;
    startedBy?: string;
    lastActivity?: string;
    totalRunTime?: number;
}

const SERVICE_STATUS_FILE = path.join(process.cwd(), 'config', 'service.status');

export async function GET() {
    try {
        const statusContent = await fs.readFile(SERVICE_STATUS_FILE, 'utf8');
        const status: ServiceStatus = JSON.parse(statusContent);

        return NextResponse.json({
            success: true,
            ...status,
        });

    } catch {
        // Return default status if file doesn't exist
        return NextResponse.json({
            success: true,
            status: 'stopped',
            stoppedAt: new Date().toISOString(),
        });
    }
}
