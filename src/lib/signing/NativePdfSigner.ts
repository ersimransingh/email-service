import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
// import * as forge from 'node-forge'; // Not used in native implementation

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

interface CertificateInfo {
    serialNumber: string;
    subject: string;
    issuer: string;
    validFrom: Date;
    validTo: Date;
    thumbprint: string;
    hasPrivateKey: boolean;
}

interface SigningResult {
    success: boolean;
    outputPath?: string;
    error?: string;
    certificateInfo?: CertificateInfo;
}

export class NativePdfSigner {
    private tempDir: string;

    constructor(tempDir?: string) {
        this.tempDir = tempDir || path.join(process.cwd(), 'temp');

        // Ensure temp directory exists
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Get available certificates from Windows Certificate Store
     */
    async getAvailableCertificates(): Promise<CertificateInfo[]> {
        try {
            console.log('🔍 Searching for certificates in Windows Certificate Store...');

            const certificates: CertificateInfo[] = [];

            // Use PowerShell to query Windows Certificate Store
            const psScript = `
                Get-ChildItem -Path "Cert:\\CurrentUser\\My" | Where-Object { $_.HasPrivateKey } | ForEach-Object {
                    $cert = $_
                    $info = @{
                        SerialNumber = $cert.SerialNumber
                        Subject = $cert.Subject
                        Issuer = $cert.Issuer
                        ValidFrom = $cert.NotBefore.ToString('yyyy-MM-dd HH:mm:ss')
                        ValidTo = $cert.NotAfter.ToString('yyyy-MM-dd HH:mm:ss')
                        Thumbprint = $cert.Thumbprint
                        HasPrivateKey = $cert.HasPrivateKey
                    }
                    $info | ConvertTo-Json -Compress
                }
            `;

            const result = await this.executePowerShell(psScript);

            if (result.success && result.stdout) {
                const lines = result.stdout.trim().split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const certData = JSON.parse(line);
                        certificates.push({
                            serialNumber: certData.SerialNumber,
                            subject: certData.Subject,
                            issuer: certData.Issuer,
                            validFrom: new Date(certData.ValidFrom),
                            validTo: new Date(certData.ValidTo),
                            thumbprint: certData.Thumbprint,
                            hasPrivateKey: certData.HasPrivateKey
                        });
                    } catch (parseError) {
                        console.warn('⚠️ Error parsing certificate data:', parseError);
                    }
                }
            }

            console.log(`✅ Found ${certificates.length} certificates with private keys`);
            return certificates;

        } catch (error) {
            console.error('❌ Error getting certificates:', error);
            return [];
        }
    }

    /**
     * Find certificate by serial number
     */
    async findCertificateBySerial(serialNumber: string): Promise<CertificateInfo | null> {
        try {
            const certificates = await this.getAvailableCertificates();
            const normalizedSerial = serialNumber.replace(/\s/g, '').toUpperCase();

            const cert = certificates.find(c =>
                c.serialNumber.replace(/\s/g, '').toUpperCase() === normalizedSerial
            );

            if (cert) {
                console.log(`✅ Found certificate: ${cert.subject}`);
                console.log(`📋 Serial: ${cert.serialNumber}`);
                console.log(`📋 Valid: ${cert.validFrom.toISOString()} - ${cert.validTo.toISOString()}`);
            } else {
                console.log(`❌ Certificate with serial ${serialNumber} not found`);
            }

            return cert || null;
        } catch (error) {
            console.error('❌ Error finding certificate:', error);
            return null;
        }
    }

    /**
     * Sign PDF using native Node.js implementation
     */
    async signPdf(inputPdfBuffer: Buffer, outputPath: string, options: {
        certificateSerial: string;
        pinCode?: string;
        pdfPassword?: string;
        signVisible?: boolean;
    }): Promise<SigningResult> {
        try {
            console.log('🔒 Starting native PDF signing...');
            console.log(`📋 Certificate Serial: ${options.certificateSerial}`);
            console.log(`📋 Output Path: ${outputPath}`);

            // Find the certificate
            const certificate = await this.findCertificateBySerial(options.certificateSerial);
            if (!certificate) {
                throw new Error(`Certificate with serial ${options.certificateSerial} not found`);
            }

            // Create temporary files
            const tempInputPath = path.join(this.tempDir, `input_${Date.now()}.pdf`);
            const tempOutputPath = path.join(this.tempDir, `output_${Date.now()}.pdf`);

            try {
                // Write input PDF to temporary file
                await writeFile(tempInputPath, inputPdfBuffer);

                // Use PowerShell to sign PDF with Windows Certificate Store
                const psScript = this.createSigningScript(
                    tempInputPath,
                    tempOutputPath,
                    certificate.serialNumber,
                    options.pinCode || '',
                    options.pdfPassword || '',
                    options.signVisible || true
                );

                console.log('🚀 Executing PDF signing...');
                const result = await this.executePowerShell(psScript);

                if (result.success && fs.existsSync(tempOutputPath)) {
                    // Copy signed PDF to final output path
                    const signedPdfBuffer = fs.readFileSync(tempOutputPath);
                    fs.writeFileSync(outputPath, signedPdfBuffer);

                    console.log('✅ PDF signed successfully with native implementation');

                    return {
                        success: true,
                        outputPath: outputPath,
                        certificateInfo: certificate
                    };
                } else {
                    throw new Error(`PDF signing failed: ${result.stderr || 'Unknown error'}`);
                }

            } finally {
                // Clean up temporary files
                try {
                    if (fs.existsSync(tempInputPath)) await unlink(tempInputPath);
                    if (fs.existsSync(tempOutputPath)) await unlink(tempOutputPath);
                } catch (cleanupError) {
                    console.warn('⚠️ Error during cleanup:', cleanupError);
                }
            }

        } catch (error) {
            console.error('❌ Error signing PDF:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Create PowerShell script for PDF signing
     */
    private createSigningScript(
        inputPath: string,
        outputPath: string,
        serialNumber: string,
        pinCode: string,
        pdfPassword: string,
        signVisible: boolean
    ): string {
        return `
            Add-Type -AssemblyName System.Security
            Add-Type -AssemblyName iTextSharp
            
            try {
                # Find certificate by serial number
                $store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser)
                $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
                
                $certificates = $store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindBySerialNumber, "${serialNumber}", $false)
                
                if ($certificates.Count -eq 0) {
                    throw "Certificate with serial ${serialNumber} not found"
                }
                
                $cert = $certificates[0]
                Write-Host "Found certificate: $($cert.Subject)"
                
                # Load PDF
                $reader = New-Object iTextSharp.text.pdf.PdfReader("${inputPath}")
                
                # Create output stream
                $outputStream = New-Object System.IO.FileStream("${outputPath}", [System.IO.FileMode]::Create)
                
                # Create stamper
                $stamper = [iTextSharp.text.pdf.PdfStamper]::CreateSignature($reader, $outputStream, [char]0)
                
                # Set encryption if password provided
                if ("${pdfPassword}" -ne "") {
                    $stamper.SetEncryption([iTextSharp.text.pdf.PdfWriter]::STRENGTH128BITS, "${pdfPassword}", "${pdfPassword}", [iTextSharp.text.pdf.PdfWriter]::AllowPrinting)
                }
                
                # Configure signature appearance
                $signatureAppearance = $stamper.SignatureAppearance
                $signatureAppearance.SignatureRenderingMode = [iTextSharp.text.pdf.PdfSignatureAppearance]::RenderingMode::DESCRIPTION
                
                if (${signVisible}) {
                    $rect = New-Object iTextSharp.text.Rectangle(100, 100, 250, 150)
                    $signatureAppearance.SetVisibleSignature($rect, $reader.NumberOfPages, $null)
                }
                
                # Create external signature
                $externalSignature = New-Object iTextSharp.text.pdf.security.X509Certificate2Signature($cert, "SHA-1")
                
                # Create certificate chain
                $certParser = New-Object Org.BouncyCastle.X509.X509CertificateParser
                $chain = @($certParser.ReadCertificate($cert.RawData))
                
                # Sign the PDF
                [iTextSharp.text.pdf.security.MakeSignature]::SignDetached($signatureAppearance, $externalSignature, $chain, $null, $null, $null, 0, [iTextSharp.text.pdf.security.CryptoStandard]::CMS)
                
                # Close resources
                $stamper.Close()
                $reader.Close()
                $outputStream.Close()
                $store.Close()
                
                Write-Host "PDF signed successfully"
                
            } catch {
                Write-Error "Error signing PDF: $($_.Exception.Message)"
                exit 1
            }
        `;
    }

    /**
     * Execute PowerShell script
     */
    private async executePowerShell(script: string): Promise<{ success: boolean; stdout: string; stderr: string }> {
        return new Promise((resolve) => {
            const process = spawn('powershell', ['-Command', script], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                resolve({
                    success: code === 0,
                    stdout: stdout.trim(),
                    stderr: stderr.trim()
                });
            });

            process.on('error', (error) => {
                resolve({
                    success: false,
                    stdout: '',
                    stderr: error.message
                });
            });

            // Set timeout
            setTimeout(() => {
                if (!process.killed) {
                    process.kill();
                    resolve({
                        success: false,
                        stdout: '',
                        stderr: 'Process timeout'
                    });
                }
            }, 60000); // 60 seconds timeout
        });
    }

    /**
     * Test if signing is available
     */
    async testSigning(): Promise<{ available: boolean; error?: string }> {
        try {
            const certificates = await this.getAvailableCertificates();

            if (certificates.length === 0) {
                return {
                    available: false,
                    error: 'No certificates with private keys found'
                };
            }

            return {
                available: true
            };
        } catch (error) {
            return {
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

export default NativePdfSigner;
