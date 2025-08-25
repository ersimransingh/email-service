import { NextResponse } from 'next/server';
import { EmailWorker } from '../../../lib/email/EmailWorker';

export async function POST() {
    try {
        console.log('🔧 Manual email processing triggered');

        const emailWorker = EmailWorker.getInstance();

        // Check if worker is available and try to auto-start if needed
        const status = await emailWorker.getStatus();
        if (!status.running) {
            console.log('⚠️ Email service not running, attempting to auto-start...');
            try {
                await emailWorker.start();
                console.log('✅ Email service auto-started successfully');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('❌ Failed to auto-start email service:', errorMessage);
                return NextResponse.json(
                    { error: 'Email service is not running and failed to auto-start. Please start the service manually.' },
                    { status: 400 }
                );
            }
        }

        // Force process emails
        await emailWorker.forceProcessEmails();

        return NextResponse.json({
            success: true,
            message: 'Email processing completed successfully',
            timestamp: new Date().toISOString(),
        });

    } catch (error: unknown) {
        console.error('Force process email API error:', error);
        return NextResponse.json(
            { error: 'Failed to process emails' },
            { status: 500 }
        );
    }
}
