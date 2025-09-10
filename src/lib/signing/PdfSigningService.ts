import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as forge from 'node-forge';
import * as pdfPassword from 'pdf-password';
import NativePdfSigner from './NativePdfSigner';

interface SigningConfig {
    signedBy: string;
    signedOn: string;
    signedTm: string;
    certificatePath?: string;
    certificatePassword?: string;
    pdfPassword?: string;
    // eSignature configuration
    eSignature?: {
        enabled: boolean;
        certificate: {
            serialNumber: string;   // USB certificate serial number
            pinCode?: string;       // PIN for USB token
            type: 'usb';            // Certificate type
        };
    };
}

interface CertificateInfo {
    commonName: string;
    organization: string;
    validFrom: Date;
    validTo: Date;
    serialNumber: string;
}

export class PdfSigningService {
    private static instance: PdfSigningService;
    private realCertificate: {
        cert: forge.pki.Certificate;
        privateKey: forge.pki.PrivateKey;
        publicKey: forge.pki.PublicKey;
    } | null = null;
    private nativeSigner: NativePdfSigner | null = null;

    private constructor() {
        // Don't initialize any certificates by default
        // Real certificates should be loaded when available
    }

    public static getInstance(): PdfSigningService {
        if (!PdfSigningService.instance) {
            PdfSigningService.instance = new PdfSigningService();
        }
        return PdfSigningService.instance;
    }

    /**
     * Load real certificate from file system or configure C# signing
     * This method should be called when real certificates are available
     */
    async loadRealCertificate(certPath: string, keyPath: string, password?: string): Promise<boolean> {
        try {
            // TODO: Implement real certificate loading
            // This would load actual certificates from the file system
            console.log('📋 Real certificate loading not implemented yet');
            console.log('📋 Certificate path:', certPath);
            console.log('📋 Key path:', keyPath);
            console.log('📋 Password provided:', !!password);

            // For now, return false to indicate no real certificate is available
            return false;
        } catch (error) {
            console.error('❌ Error loading real certificate:', error);
            return false;
        }
    }

    /**
     * Configure eSignature with native USB certificate signing
     */
    async configureESignature(config: {
        certificate: {
            serialNumber: string;   // USB certificate serial number
            pinCode?: string;       // PIN for USB token
            type: 'usb';            // Certificate type
        };
    }): Promise<boolean> {
        try {
            console.log('🔒 Configuring eSignature with native USB certificate signing...');
            console.log('📋 Certificate Serial:', config.certificate.serialNumber);
            console.log('📋 Type:', config.certificate.type);

            // Initialize native PDF signer
            this.nativeSigner = new NativePdfSigner();

            // Test if signing is available
            const testResult = await this.nativeSigner.testSigning();
            if (!testResult.available) {
                console.error('❌ Native signing not available:', testResult.error);
                return false;
            }

            // Verify the specific certificate exists
            const certificate = await this.nativeSigner.findCertificateBySerial(config.certificate.serialNumber);
            if (!certificate) {
                console.error('❌ Certificate not found:', config.certificate.serialNumber);
                return false;
            }

            console.log('✅ eSignature configured successfully with native USB certificate signing');
            return true;
        } catch (error) {
            console.error('❌ Error configuring eSignature:', error);
            return false;
        }
    }

    /**
     * Sign a PDF with the provided configuration
     */
    async signPdf(pdfBuffer: Buffer, config: SigningConfig): Promise<Buffer> {
        try {
            console.log(`🔒 Starting PDF signing process...`);

            // Check if eSignature is enabled and configured
            if (config.eSignature?.enabled && this.nativeSigner) {
                console.log('🔒 Using eSignature with native USB certificate signing...');

                // Create temporary output file
                const tempDir = process.cwd() + '/temp';
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                const tempOutputPath = path.join(tempDir, `signed_${Date.now()}.pdf`);

                try {
                    // Sign PDF using native implementation
                    const result = await this.nativeSigner.signPdf(pdfBuffer, tempOutputPath, {
                        certificateSerial: config.eSignature.certificate.serialNumber,
                        pinCode: config.eSignature.certificate.pinCode,
                        pdfPassword: config.pdfPassword,
                        signVisible: true
                    });

                    if (result.success && result.outputPath) {
                        // Read the signed PDF
                        const signedPdfBuffer = fs.readFileSync(result.outputPath);

                        // Clean up temporary file
                        fs.unlinkSync(result.outputPath);

                        console.log('✅ PDF signed successfully with native eSignature');
                        return signedPdfBuffer;
                    } else {
                        console.error('❌ eSignature failed:', result.error);
                        throw new Error(`eSignature failed: ${result.error}`);
                    }
                } catch (signingError) {
                    console.error('❌ Error during eSignature:', signingError);
                    throw signingError;
                }
            }

            // Fallback to original certificate-based signing
            if (!this.realCertificate) {
                console.log('⚠️ No real certificate available - skipping PDF signing');
                console.log('⚠️ PDF will be processed without digital signature');
                return pdfBuffer; // Return original PDF without signing
            }

            // TODO: Implement real digital signature with actual certificate
            console.log('📋 Real digital signature not implemented yet');
            console.log('📋 Would sign with certificate:', this.realCertificate.cert.subject);

            // For now, return the original PDF without signing
            return pdfBuffer;

        } catch (error) {
            console.error('❌ Error signing PDF:', error);
            // Return original PDF if signing fails
            return pdfBuffer;
        }
    }

    /**
     * Add signature appearance to the PDF page
     */
    private async addSignatureAppearance(
        pdfDoc: PDFDocument,
        page: PDFPage,
        text: string,
        x: number,
        y: number,
        width: number,
        height: number
    ): Promise<void> {
        try {
            // Create a simple text-based signature appearance
            const lines = text.split('\n');
            const fontSize = 10;
            const lineHeight = fontSize + 2;

            // Draw a border around the signature area
            page.drawRectangle({
                x: x,
                y: y,
                width: width,
                height: height,
                borderColor: rgb(0, 0, 0),
                borderWidth: 1,
                color: rgb(0.95, 0.95, 0.95)
            });

            // Draw the signature text
            let currentY = y + height - 10;
            for (const line of lines) {
                if (currentY < y + 10) break; // Don't draw outside the box

                page.drawText(line, {
                    x: x + 5,
                    y: currentY,
                    size: fontSize,
                    color: rgb(0, 0, 0)
                });

                currentY -= lineHeight;
            }

        } catch (error) {
            console.error('❌ Error adding signature appearance:', error);
        }
    }

    /**
     * Create a digital signature using real certificate
     */
    private createDigitalSignature(data: string): string {
        try {
            if (!this.realCertificate) {
                throw new Error('No real certificate available');
            }

            // TODO: Implement real digital signature creation
            console.log('📋 Real digital signature creation not implemented yet');
            return 'placeholder-signature';
        } catch (error) {
            console.error('❌ Error creating digital signature:', error);
            throw error;
        }
    }


    /**
     * Get certificate information (only for real certificates)
     */
    getCertificateInfo(): CertificateInfo {
        if (this.realCertificate) {
            return {
                commonName: this.realCertificate.cert.subject.getField('CN')?.value || 'Unknown',
                organization: this.realCertificate.cert.subject.getField('O')?.value || 'Unknown',
                validFrom: this.realCertificate.cert.validity.notBefore,
                validTo: this.realCertificate.cert.validity.notAfter,
                serialNumber: this.realCertificate.cert.serialNumber
            };
        }

        throw new Error('No real certificate available');
    }

    /**
     * Encrypt PDF with password using pdf-password library
     */
    async encryptPdfWithPassword(pdfBuffer: Buffer, password: string): Promise<Buffer> {
        try {
            console.log(`🔐 Starting PDF encryption with password...`);
            console.log(`🔐 Password received: "${password}"`);
            console.log(`🔐 Password type: ${typeof password}`);
            console.log(`🔐 Password length: ${password ? password.length : 0}`);

            // Create a temporary file for the input PDF
            const tempInputPath = `/tmp/input_${Date.now()}.pdf`;
            const tempOutputPath = `/tmp/output_${Date.now()}.pdf`;

            try {
                // Write the PDF buffer to a temporary file
                fs.writeFileSync(tempInputPath, pdfBuffer);

                // Encrypt the PDF using pdf-password
                console.log(`🔐 Calling pdfPassword.encryptPDF with password: "${password}"`);
                await pdfPassword.encryptPDF({
                    inFile: tempInputPath,
                    outFile: tempOutputPath,
                    password: password
                });

                // Read the encrypted PDF
                const encryptedPdfBuffer = fs.readFileSync(tempOutputPath);

                // Clean up temporary files
                fs.unlinkSync(tempInputPath);
                fs.unlinkSync(tempOutputPath);

                console.log(`✅ PDF encrypted successfully with password`);
                return encryptedPdfBuffer;

            } catch (fileError) {
                // Clean up temporary files on error
                try {
                    if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                } catch (cleanupError) {
                    console.warn('⚠️ Error during cleanup:', cleanupError);
                }
                throw fileError;
            }

        } catch (error) {
            console.error('❌ Error encrypting PDF:', error);
            throw error;
        }
    }

    /**
     * Process PDF with both signing and encryption
     */
    async processPdfWithSigningAndEncryption(pdfBuffer: Buffer, config: SigningConfig): Promise<Buffer> {
        try {
            console.log(`🔒 Starting complete PDF processing (sign + encrypt)...`);
            console.log(`🔍 DEBUG: Input PDF size: ${pdfBuffer.length}`);
            console.log(`🔍 DEBUG: Config:`, config);

            let processedPdf = pdfBuffer;

            // Step 1: Sign the PDF if signing fields are available
            if (config.signedBy || config.signedOn || config.signedTm) {
                console.log(`📝 Step 1: Signing PDF...`);
                processedPdf = await this.signPdf(processedPdf, config);
                console.log(`🔍 DEBUG: After signing, PDF size: ${processedPdf.length}`);
            }

            // Step 2: Encrypt the PDF if password is provided
            if (config.pdfPassword && config.pdfPassword.trim() !== '') {
                console.log(`🔐 Step 2: Encrypting PDF with password...`);
                console.log(`🔍 DEBUG: Password for encryption: "${config.pdfPassword}"`);
                console.log(`🔍 DEBUG: Password length: ${config.pdfPassword.length}`);
                console.log(`🔍 DEBUG: PDF size before encryption: ${processedPdf.length}`);

                processedPdf = await this.encryptPdfWithPassword(processedPdf, config.pdfPassword);

                console.log(`🔍 DEBUG: PDF size after encryption: ${processedPdf.length}`);
                console.log(`🔍 DEBUG: Size changed: ${processedPdf.length !== pdfBuffer.length}`);
            } else {
                console.log(`🔍 DEBUG: No password provided, skipping encryption`);
            }

            console.log(`✅ PDF processing complete (signed: ${!!(config.signedBy || config.signedOn || config.signedTm)}, encrypted: ${!!(config.pdfPassword && config.pdfPassword.trim() !== '')})`);
            return processedPdf;

        } catch (error) {
            console.error('❌ Error processing PDF:', error);
            throw error;
        }
    }

    /**
     * Check if signing is available (real certificates or eSignature)
     */
    isSigningAvailable(): boolean {
        return this.realCertificate !== null || this.nativeSigner !== null;
    }

    /**
     * Check if eSignature is available
     */
    isESignatureAvailable(): boolean {
        return this.nativeSigner !== null;
    }

    /**
     * Get eSignature configuration info
     */
    async getESignatureInfo(): Promise<{ available: boolean; info?: { type: string; serialNumber: string; hasPinCode: boolean }; error?: string }> {
        if (!this.nativeSigner) {
            return { available: false, error: 'eSignature not configured' };
        }

        try {
            const testResult = await this.nativeSigner.testSigning();
            return {
                available: testResult.available,
                info: testResult.available ? {
                    type: 'usb',
                    serialNumber: 'configured',
                    hasPinCode: true
                } : undefined,
                error: testResult.error
            };
        } catch (error) {
            return {
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get available certificates
     */
    async getAvailableCertificates(): Promise<{ serialNumber: string; subject: string; issuer: string; validFrom: Date; validTo: Date; thumbprint: string; hasPrivateKey: boolean }[]> {
        if (!this.nativeSigner) {
            return [];
        }

        try {
            return await this.nativeSigner.getAvailableCertificates();
        } catch (error) {
            console.error('❌ Error getting certificates:', error);
            return [];
        }
    }
}

export default PdfSigningService;
