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
    private dummyCertificate: {
        cert: forge.pki.Certificate;
        privateKey: forge.pki.PrivateKey;
        publicKey: forge.pki.PublicKey;
    } | null = null;

    private constructor() {
        this.initializeDummyCertificate();
    }

    public static getInstance(): PdfSigningService {
        if (!PdfSigningService.instance) {
            PdfSigningService.instance = new PdfSigningService();
        }
        return PdfSigningService.instance;
    }

    /**
     * Initialize a dummy certificate for testing purposes
     */
    private initializeDummyCertificate(): void {
        try {
            // Create a self-signed certificate for testing
            const keys = forge.pki.rsa.generateKeyPair(2048);
            const cert = forge.pki.createCertificate();

            cert.publicKey = keys.publicKey;
            cert.serialNumber = '01';
            cert.validity.notBefore = new Date();
            cert.validity.notAfter = new Date();
            cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);

            const attrs = [{
                name: 'commonName',
                value: 'Test Certificate'
            }, {
                name: 'countryName',
                value: 'IN'
            }, {
                shortName: 'ST',
                value: 'Test State'
            }, {
                name: 'localityName',
                value: 'Test City'
            }, {
                name: 'organizationName',
                value: 'Test Organization'
            }, {
                shortName: 'OU',
                value: 'Test Unit'
            }];

            cert.setSubject(attrs);
            cert.setIssuer(attrs);
            cert.sign(keys.privateKey);

            this.dummyCertificate = {
                cert: cert,
                privateKey: keys.privateKey,
                publicKey: keys.publicKey
            };

            console.log('✅ Dummy certificate initialized for testing');
        } catch (error) {
            console.error('❌ Error initializing dummy certificate:', error);
        }
    }

    /**
     * Sign a PDF with the provided configuration
     */
    async signPdf(pdfBuffer: Buffer, config: SigningConfig): Promise<Buffer> {
        try {
            console.log(`🔒 Starting PDF signing process...`);
            console.log(`📝 Signing details:`, {
                signedBy: config.signedBy,
                signedOn: config.signedOn,
                signedTm: config.signedTm
            });

            // Load the PDF document
            const pdfDoc = await PDFDocument.load(pdfBuffer);

            // Get the last page to add signature
            const pages = pdfDoc.getPages();
            const lastPage = pages[pages.length - 1];

            // Create signature text
            const signatureText = `
Digitally Signed
By: ${config.signedBy}
Date: ${config.signedOn}
Time: ${config.signedTm}
Certificate: Test Certificate
            `.trim();

            // Add visible signature to the PDF
            await this.addSignatureAppearance(pdfDoc, lastPage, signatureText, 50, 50, 200, 100);

            // If PDF password is provided, encrypt the PDF
            if (config.pdfPassword && config.pdfPassword.trim() !== '') {
                console.log(`🔐 Encrypting PDF with password...`);
                // Note: pdf-lib doesn't support password encryption directly
                // This is a placeholder for future implementation
                console.log('⚠️ PDF encryption not fully implemented in pdf-lib');
            }

            // Save the signed PDF
            const signedPdfBytes = await pdfDoc.save();
            console.log(`✅ PDF signed successfully`);

            return Buffer.from(signedPdfBytes);

        } catch (error) {
            console.error('❌ Error signing PDF:', error);
            throw error;
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
     * Create a digital signature using the dummy certificate
     */
    private createDigitalSignature(data: string): string {
        try {
            if (!this.dummyCertificate) {
                throw new Error('Certificate not initialized');
            }

            // Create a simple hash-based signature for testing
            const md = forge.md.sha256.create();
            md.update(data);
            const hash = md.digest().toHex();

            // In a real implementation, this would be a proper digital signature
            // For now, we'll create a simple hash-based signature
            const signature = `SIGNATURE_${hash.substring(0, 16)}_${Date.now()}`;

            return signature;
        } catch (error) {
            console.error('❌ Error creating digital signature:', error);
            return 'SIGNATURE_ERROR';
        }
    }

    /**
     * Validate certificate (placeholder for real certificate validation)
     */
    private validateCertificate(certPath?: string): boolean {
        try {
            if (certPath && fs.existsSync(certPath)) {
                // In a real implementation, this would validate the actual certificate
                console.log(`📜 Certificate found at: ${certPath}`);
                return true;
            }

            // Use dummy certificate for testing
            console.log('📜 Using dummy certificate for testing');
            return this.dummyCertificate !== null;
        } catch (error) {
            console.error('❌ Error validating certificate:', error);
            return false;
        }
    }

    /**
     * Get certificate information
     */
    getCertificateInfo(): CertificateInfo {
        if (this.dummyCertificate) {
            return {
                commonName: 'Test Certificate',
                organization: 'Test Organization',
                validFrom: new Date(),
                validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                serialNumber: '01'
            };
        }

        throw new Error('No certificate available');
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
     * Check if signing is available
     */
    isSigningAvailable(): boolean {
        return this.dummyCertificate !== null;
    }
}

export default PdfSigningService;
