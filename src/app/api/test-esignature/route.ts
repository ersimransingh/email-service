import { NextRequest, NextResponse } from 'next/server';
import PdfSigningService from '@/lib/signing/PdfSigningService';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { certificate, testPdfPath } = body;

        // Validate required fields
        if (!certificate) {
            return NextResponse.json(
                { success: false, error: 'Missing required field: certificate' },
                { status: 400 }
            );
        }

        // Get PDF signing service
        const pdfSigningService = PdfSigningService.getInstance();

        // Test native signing availability
        const appTest = await pdfSigningService.getESignatureInfo();
        if (!appTest.available) {
            return NextResponse.json({
                success: false,
                error: 'Native signing not available',
                details: appTest.error
            });
        }

        // Test certificate info
        const certInfo = await pdfSigningService.getESignatureInfo();

        // If test PDF path provided, test actual signing
        let signingTest = null;
        if (testPdfPath) {
            try {
                const fs = await import('fs');
                if (fs.existsSync(testPdfPath)) {
                    const testPdfBuffer = fs.readFileSync(testPdfPath);

                    // Configure eSignature for testing
                    const configSuccess = await pdfSigningService.configureESignature({
                        certificate
                    });

                    if (configSuccess) {
                        // Test signing
                        await pdfSigningService.signPdf(testPdfBuffer, {
                            signedBy: 'Test User',
                            signedOn: new Date().toISOString().split('T')[0],
                            signedTm: new Date().toTimeString().split(' ')[0],
                            eSignature: {
                                enabled: true,
                                certificate
                            }
                        });

                        signingTest = {
                            success: true,
                            error: null,
                            outputPath: 'PDF signed successfully'
                        };
                    } else {
                        signingTest = {
                            success: false,
                            error: 'Failed to configure eSignature for testing'
                        };
                    }
                } else {
                    signingTest = {
                        success: false,
                        error: 'Test PDF file not found'
                    };
                }
            } catch (signingError) {
                signingTest = {
                    success: false,
                    error: signingError instanceof Error ? signingError.message : 'Unknown error'
                };
            }
        }

        return NextResponse.json({
            success: true,
            tests: {
                csharpApp: appTest,
                certificate: certInfo,
                signing: signingTest
            }
        });

    } catch (error) {
        console.error('❌ Error testing eSignature:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
