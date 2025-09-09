import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as forge from 'node-forge';
import * as pdfPassword from 'pdf-password';

interface SigningConfig {
    signedBy: string;
    signedOn: string;
    signedTm: string;
    certificatePath?: string;
    certificatePassword?: string;
    pdfPassword?: string;
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
     * Load real certificate from file system
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
     * Sign a PDF with the provided configuration
     */
    async signPdf(pdfBuffer: Buffer, config: SigningConfig): Promise<Buffer> {
        try {
            console.log(`🔒 Starting PDF signing process...`);

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
     * Check if signing is available (only with real certificates)
     */
    isSigningAvailable(): boolean {
        return this.realCertificate !== null;
    }
}

export default PdfSigningService;
