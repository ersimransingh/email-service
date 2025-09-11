import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

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
    provider: string;
    container: string;
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

            // Use a simpler PowerShell script that doesn't try to access private keys directly
            const psScript = `
                try {
                    Get-ChildItem -Path "Cert:\\CurrentUser\\My" | Where-Object { $_.HasPrivateKey } | ForEach-Object {
                        $cert = $_
                        $provider = "Unknown"
                        $container = "Unknown"
                        
                        # Try to get provider info without accessing private key directly
                        try {
                            $privateKey = $cert.PrivateKey
                            if ($privateKey -and $privateKey.CspKeyContainerInfo) {
                                $cspInfo = $privateKey.CspKeyContainerInfo
                                $provider = $cspInfo.ProviderName
                                $container = $cspInfo.KeyContainerName
                            } else {
                                # This might be a hardware token
                                $provider = "Hardware Token"
                                $container = "Hardware Token"
                            }
                        } catch {
                            # Private key access failed, likely hardware token
                            $provider = "Hardware Token"
                            $container = "Hardware Token"
                        }
                        
                        $info = @{
                            SerialNumber = $cert.SerialNumber
                            Subject = $cert.Subject
                            Issuer = $cert.Issuer
                            ValidFrom = $cert.NotBefore.ToString('yyyy-MM-dd HH:mm:ss')
                            ValidTo = $cert.NotAfter.ToString('yyyy-MM-dd HH:mm:ss')
                            Thumbprint = $cert.Thumbprint
                            HasPrivateKey = $cert.HasPrivateKey
                            Provider = $provider
                            Container = $container
                        }
                        $info | ConvertTo-Json -Compress
                    }
                } catch {
                    Write-Error "Error accessing certificate store: $($_.Exception.Message)"
                    exit 1
                }
            `;

            const result = await this.executePowerShell(psScript);

            console.log('🔍 PowerShell execution result:');
            console.log('  Success:', result.success);
            console.log('  Exit Code:', result.exitCode);
            console.log('  STDOUT length:', result.stdout ? result.stdout.length : 0);
            console.log('  STDERR length:', result.stderr ? result.stderr.length : 0);

            if (result.stdout) {
                console.log('  STDOUT content:', result.stdout);
            }
            if (result.stderr) {
                console.log('  STDERR content:', result.stderr);
            }

            if (result.success && result.stdout) {
                const lines = result.stdout.trim().split('\n').filter(line => line.trim());
                console.log('🔍 Found', lines.length, 'certificate lines');

                for (const line of lines) {
                    try {
                        console.log('🔍 Parsing line:', line);
                        const certData = JSON.parse(line);
                        console.log('🔍 Parsed certificate data:', certData);
                        certificates.push({
                            serialNumber: certData.SerialNumber,
                            subject: certData.Subject,
                            issuer: certData.Issuer,
                            validFrom: new Date(certData.ValidFrom),
                            validTo: new Date(certData.ValidTo),
                            thumbprint: certData.Thumbprint,
                            hasPrivateKey: certData.HasPrivateKey,
                            provider: certData.Provider,
                            container: certData.Container
                        });
                    } catch (parseError) {
                        console.warn('⚠️ Error parsing certificate data:', parseError);
                        console.warn('⚠️ Problematic line:', line);
                    }
                }
            } else {
                console.error('❌ PowerShell script failed:', result.stderr);
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
                console.log(`📋 Provider: ${cert.provider}`);
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
     * Sign PDF using native Node.js implementation with PROXKey support
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
                    options.signVisible || true,
                    certificate.provider,
                    certificate.container
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
     * Create PowerShell script for PDF signing with PROXKey support
     */
    private createSigningScript(
        inputPath: string,
        outputPath: string,
        serialNumber: string,
        pinCode: string,
        pdfPassword: string,
        signVisible: boolean,
        provider: string,
        container: string
    ): string {
        return `
            # Load required assemblies
            Add-Type -AssemblyName System.Security
            Add-Type -AssemblyName System.Security.Cryptography
            Add-Type -AssemblyName System.Drawing
            
            # Try to load iTextSharp from common locations
            $iTextSharpPaths = @(
                "C:\\Program Files\\iTextSharp\\itextsharp.dll",
                "C:\\Program Files (x86)\\iTextSharp\\itextsharp.dll",
                "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\itextsharp.dll",
                "C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\itextsharp.dll"
            )
            
            $iTextSharpLoaded = $false
            foreach ($path in $iTextSharpPaths) {
                if (Test-Path $path) {
                    try {
                        Add-Type -Path $path
                        $iTextSharpLoaded = $true
                        Write-Host "Loaded iTextSharp from: $path"
                        break
                    } catch {
                        Write-Host "Failed to load iTextSharp from: $path"
                    }
                }
            }
            
            if (-not $iTextSharpLoaded) {
                Write-Error "iTextSharp not found. Please install iTextSharp for PDF signing."
                exit 1
            }
            
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
                Write-Host "Provider: ${provider}"
                Write-Host "Container: ${container}"
                
                # Test private key access
                try {
                    $privateKey = $cert.PrivateKey
                    if ($privateKey) {
                        $cspInfo = $privateKey.CspKeyContainerInfo
                        Write-Host "Private key accessible, Provider: $($cspInfo.ProviderName)"
                        
                        # For PROXKey CSP, create a new CSP with correct parameters
                        if ($cspInfo.ProviderName -like "*PROXKey*") {
                            Write-Host "Detected PROXKey CSP - creating new CSP with correct parameters"
                            $cspParams = New-Object System.Security.Cryptography.CspParameters(1, $cspInfo.ProviderName, $cspInfo.KeyContainerName)
                            $rsaCsp = New-Object System.Security.Cryptography.RSACryptoServiceProvider($cspParams)
                            Write-Host "PROXKey CSP initialized successfully"
                        }
                        
                        # Test signing capability
                        $testData = [System.Text.Encoding]::UTF8.GetBytes("Test data for signing")
                        $signature = $privateKey.SignData($testData, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
                        Write-Host "Private key test successful - can be used for signing"
                        
                    } else {
                        throw "Private key not accessible"
                    }
                } catch ($keyError) {
                    Write-Host "Error accessing private key: $($keyError.Message)"
                    throw "Cannot access private key for signing: $($keyError.Message)"
                }
                
                # Now use iTextSharp to actually sign the PDF
                Write-Host "Starting iTextSharp PDF signing..."
                
                # Read the input PDF
                $inputPdfBytes = [System.IO.File]::ReadAllBytes("${inputPath}")
                Write-Host "Input PDF size: $($inputPdfBytes.Length) bytes"
                
                # Create a memory stream from the input PDF
                $inputStream = New-Object System.IO.MemoryStream($inputPdfBytes)
                $outputStream = New-Object System.IO.MemoryStream
                
                # Create PDF reader and stamper
                $reader = New-Object iTextSharp.text.pdf.PdfReader($inputStream)
                $stamper = New-Object iTextSharp.text.pdf.PdfStamper($reader, $outputStream, [iTextSharp.text.pdf.PdfWriter]::VERSION_1_5)
                
                # Set compression
                $stamper.SetFullCompression()
                
                # Create signature appearance
                $signatureAppearance = $stamper.SignatureAppearance
                $signatureAppearance.SignatureRenderingMode = [iTextSharp.text.pdf.PdfSignatureAppearance]::RenderingMode.DESCRIPTION
                
                # Set visible signature if requested
                if (${signVisible}) {
                    $rect = New-Object iTextSharp.text.Rectangle(100, 100, 250, 150)
                    $signatureAppearance.SetVisibleSignature($rect, $reader.NumberOfPages, "Signature")
                }
                
                # Set signature reason and location
                $signatureAppearance.Reason = "Digital Signature"
                $signatureAppearance.Location = "Email Service"
                $signatureAppearance.SignatureCreator = "Email Service eSignature"
                
                # Create external signature
                $externalSignature = New-Object iTextSharp.text.pdf.security.X509Certificate2Signature($cert, "SHA-256")
                
                # Create certificate chain
                $certChain = @($cert)
                
                # Sign the PDF using iTextSharp
                [iTextSharp.text.pdf.security.MakeSignature]::SignDetached($signatureAppearance, $externalSignature, $certChain, $null, $null, $null, 0, [iTextSharp.text.pdf.security.CryptoStandard]::CMS)
                
                # Close the stamper and reader
                $stamper.Close()
                $reader.Close()
                
                # Get the signed PDF bytes
                $signedPdfBytes = $outputStream.ToArray()
                $outputStream.Close()
                $inputStream.Close()
                
                # Write the signed PDF to output file
                [System.IO.File]::WriteAllBytes("${outputPath}", $signedPdfBytes)
                
                Write-Host "PDF signed successfully with iTextSharp"
                Write-Host "Output PDF size: $($signedPdfBytes.Length) bytes"
                
                $store.Close()
                
            } catch {
                Write-Error "Error signing PDF: $($_.Exception.Message)"
                Write-Error "Stack trace: $($_.Exception.StackTrace)"
                exit 1
            }
        `;
    }

    /**
     * Execute PowerShell script
     */
    private async executePowerShell(script: string): Promise<{ success: boolean; stdout: string; stderr: string; exitCode?: number }> {
        return new Promise((resolve) => {
            console.log('🔧 Executing PowerShell script...');
            console.log('🔧 Script length:', script.length);

            const process = spawn('powershell', [
                '-ExecutionPolicy', 'Bypass',
                '-Command', script
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                console.log('🔧 STDOUT chunk:', chunk);
            });

            process.stderr.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                console.log('🔧 STDERR chunk:', chunk);
            });

            process.on('close', (code) => {
                console.log('🔧 PowerShell process closed with code:', code);
                resolve({
                    success: code === 0,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    exitCode: code
                });
            });

            process.on('error', (error) => {
                console.log('🔧 PowerShell process error:', error.message);
                resolve({
                    success: false,
                    stdout: '',
                    stderr: error.message,
                    exitCode: -1
                });
            });

            // Set timeout
            setTimeout(() => {
                if (!process.killed) {
                    console.log('🔧 PowerShell process timeout, killing...');
                    process.kill();
                    resolve({
                        success: false,
                        stdout: '',
                        stderr: 'Process timeout',
                        exitCode: -2
                    });
                }
            }, 30000); // 30 seconds timeout
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

            // Check if any certificate is a hardware token
            const hasHardwareToken = certificates.some(cert =>
                cert.provider.toLowerCase().includes('proxkey') ||
                cert.provider.toLowerCase().includes('smart card') ||
                cert.provider.toLowerCase().includes('token')
            );

            if (hasHardwareToken) {
                console.log('✅ Hardware token detected - signing available');
            } else {
                console.log('✅ Software certificates detected - signing available');
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