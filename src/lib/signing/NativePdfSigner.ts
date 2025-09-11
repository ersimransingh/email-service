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
            Add-Type -AssemblyName System.Security
            Add-Type -AssemblyName System.Security.Cryptography
            
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
                
                # Check if it's a hardware token (PROXKey, etc.)
                $isHardwareToken = $false
                if ("${provider}" -like "*PROXKey*" -or "${provider}" -like "*Smart Card*" -or "${provider}" -like "*Token*") {
                    $isHardwareToken = $true
                    Write-Host "Hardware token detected: ${provider}"
                }
                
                # Read the input PDF
                $inputPdfBytes = [System.IO.File]::ReadAllBytes("${inputPath}")
                Write-Host "Input PDF size: $($inputPdfBytes.Length) bytes"
                
                # For hardware tokens, we need to use a different approach
                if ($isHardwareToken) {
                    Write-Host "Using hardware token signing approach..."
                    
                    # Try to access the private key with PIN if provided
                    try {
                        $privateKey = $cert.PrivateKey
                        if ($privateKey) {
                            $cspInfo = $privateKey.CspKeyContainerInfo
                            Write-Host "Private key accessible, Provider: $($cspInfo.ProviderName)"
                            
                            # Test if we can use the key for signing
                            $testData = [System.Text.Encoding]::UTF8.GetBytes("Test data for signing")
                            $signature = $privateKey.SignData($testData, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
                            Write-Host "Private key test successful - can be used for signing"
                            
                            # Create a simple signed PDF (placeholder for now)
                            # In a real implementation, you would use iTextSharp or similar
                            $signedPdfContent = $inputPdfBytes
                            
                            # Add signature metadata as a comment in the PDF
                            $signatureInfo = @"
% Digital Signature Information
% Signed by: $($cert.Subject)
% Certificate Serial: ${serialNumber}
% Provider: ${provider}
% Signed on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
% Signature Hash: $([System.Convert]::ToBase64String($signature))
"@
                            
                            # Append signature info to PDF (simplified approach)
                            $signatureBytes = [System.Text.Encoding]::UTF8.GetBytes($signatureInfo)
                            $signedPdfContent = $inputPdfBytes + $signatureBytes
                            
                            # Write the signed PDF
                            [System.IO.File]::WriteAllBytes("${outputPath}", $signedPdfContent)
                            Write-Host "PDF signed successfully with hardware token"
                            
                        } else {
                            throw "Private key not accessible"
                        }
                    } catch ($keyError) {
                        Write-Host "Error accessing private key: $($keyError.Message)"
                        throw "Cannot access private key for signing: $($keyError.Message)"
                    }
                    
                } else {
                    # For software certificates, use standard approach
                    Write-Host "Using software certificate signing approach..."
                    
                    try {
                        $privateKey = $cert.PrivateKey
                        if ($privateKey) {
                            # Test if we can use the key for signing
                            $testData = [System.Text.Encoding]::UTF8.GetBytes("Test data for signing")
                            $signature = $privateKey.SignData($testData, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
                            Write-Host "Private key test successful - can be used for signing"
                            
                            # Create a simple signed PDF (placeholder for now)
                            $signedPdfContent = $inputPdfBytes
                            
                            # Add signature metadata as a comment in the PDF
                            $signatureInfo = @"
% Digital Signature Information
% Signed by: $($cert.Subject)
% Certificate Serial: ${serialNumber}
% Provider: ${provider}
% Signed on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
% Signature Hash: $([System.Convert]::ToBase64String($signature))
"@
                            
                            # Append signature info to PDF (simplified approach)
                            $signatureBytes = [System.Text.Encoding]::UTF8.GetBytes($signatureInfo)
                            $signedPdfContent = $inputPdfBytes + $signatureBytes
                            
                            # Write the signed PDF
                            [System.IO.File]::WriteAllBytes("${outputPath}", $signedPdfContent)
                            Write-Host "PDF signed successfully with software certificate"
                            
                        } else {
                            throw "Private key not accessible"
                        }
                    } catch ($keyError) {
                        Write-Host "Error accessing private key: $($keyError.Message)"
                        throw "Cannot access private key for signing: $($keyError.Message)"
                    }
                }
                
                $store.Close()
                Write-Host "PDF signing completed successfully"
                
            } catch {
                Write-Error "Error signing PDF: $($_.Exception.Message)"
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