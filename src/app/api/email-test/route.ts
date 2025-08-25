import { NextRequest, NextResponse } from 'next/server';
import { EmailWorker } from '../../../lib/email/EmailWorker';

interface TestEmailRequest {
    email: string;
}

export async function POST(request: NextRequest) {
    try {
        const { email }: TestEmailRequest = await request.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json(
                { error: 'Valid email address is required' },
                { status: 400 }
            );
        }

        console.log(`🧪 Sending test email to: ${email}`);

        const emailWorker = EmailWorker.getInstance();
        const result = await emailWorker.sendTestEmail(email);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Test email sent successfully',
                messageId: result.messageId,
                recipient: result.recipient,
            });
        } else {
            return NextResponse.json(
                {
                    error: result.error || 'Failed to send test email',
                    recipient: result.recipient
                },
                { status: 500 }
            );
        }

    } catch (error: unknown) {
        console.error('Test email API error:', error);
        return NextResponse.json(
            { error: 'Failed to send test email' },
            { status: 500 }
        );
    }
}
