import { NextRequest, NextResponse } from 'next/server';
import PdfSigningService from '@/lib/signing/PdfSigningService';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { certificate } = body;

        // Validate required fields
        if (!certificate) {
            return NextResponse.json(
                { success: false, error: 'Missing required field: certificate' },
                { status: 400 }
            );
        }

        if (!certificate.serialNumber || !certificate.type) {
            return NextResponse.json(
                { success: false, error: 'Certificate must have serialNumber and type fields' },
                { status: 400 }
            );
        }

        // Configure eSignature
        const pdfSigningService = PdfSigningService.getInstance();
        const success = await pdfSigningService.configureESignature({
            certificate
        });

        if (success) {
            return NextResponse.json({
                success: true,
                message: 'eSignature configured successfully',
                config: {
                    certificate: {
                        serialNumber: certificate.serialNumber,
                        type: certificate.type,
                        hasPinCode: !!certificate.pinCode
                    }
                }
            });
        } else {
            return NextResponse.json(
                { success: false, error: 'Failed to configure eSignature' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('❌ Error configuring eSignature:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const pdfSigningService = PdfSigningService.getInstance();
        const eSignatureInfo = await pdfSigningService.getESignatureInfo();

        return NextResponse.json({
            success: true,
            eSignature: {
                available: pdfSigningService.isESignatureAvailable(),
                info: eSignatureInfo
            }
        });

    } catch (error) {
        console.error('❌ Error getting eSignature status:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
