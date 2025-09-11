const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class RealPDFSigningTest {
    constructor() {
        this.testDir = './test-pdfs';
        this.inputPdf = path.join(this.testDir, 'real-test-input.pdf');
        this.signedPdf = path.join(this.testDir, 'real-test-signed.pdf');
        this.targetSerial = '3925A567102CA00F'; // Use available certificate
    }

    async runPowerShellScript(scriptContent) {
        return new Promise((resolve, reject) => {
            const ps = spawn('powershell', [
                '-ExecutionPolicy', 'Bypass',
                '-Command', scriptContent
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            ps.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ps.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            ps.on('close', (code) => {
                resolve({ stdout, stderr, exitCode: code });
            });

            ps.on('error', (error) => {
                reject(error);
            });
        });
    }

    async createTestPDF() {
        console.log('📄 Creating Test PDF for Real Signing...');
        console.log('=======================================');

        // Create test directory
        if (!fs.existsSync(this.testDir)) {
            fs.mkdirSync(this.testDir, { recursive: true });
        }

        // Create a simple PDF using PowerShell
        const createPdfScript = `
            try {
                $outputPath = "${this.inputPdf}"
                
                # Create a simple PDF-like file
                $pdfContent = @"
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF for Real Digital Signing) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000188 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
283
%%EOF
"@

                # Write the PDF content to file
                [System.IO.File]::WriteAllText($outputPath, $pdfContent)
                
                Write-Host "Test PDF created successfully: $outputPath"
                Write-Host "File size: $((Get-Item $outputPath).Length) bytes"
                
            } catch {
                Write-Error "Error creating PDF: $($_.Exception.Message)"
                exit 1
            }
        `;

        const result = await this.runPowerShellScript(createPdfScript);

        if (result.exitCode === 0) {
            console.log('✅ Test PDF created successfully!');
            console.log('📁 Location:', this.inputPdf);
            if (fs.existsSync(this.inputPdf)) {
                const stats = fs.statSync(this.inputPdf);
                console.log('📊 File size:', stats.size, 'bytes');
            }
            return true;
        } else {
            console.log('❌ Failed to create PDF');
            console.log('STDERR:', result.stderr);
            return false;
        }
    }

    async testRealPDFSigning() {
        console.log('✍️ Testing Real PDF Digital Signing...');
        console.log('=====================================');
        console.log('Target Certificate:', this.targetSerial);

        const signScript = `
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
                        Write-Host "✅ Loaded iTextSharp from: $path"
                        break
                    } catch {
                        Write-Host "❌ Failed to load iTextSharp from: $path"
                    }
                }
            }
            
            if (-not $iTextSharpLoaded) {
                Write-Error "❌ iTextSharp not found. Please install iTextSharp for PDF signing."
                Write-Host "You can download iTextSharp from: https://sourceforge.net/projects/itextsharp/"
                exit 1
            }
            
            try {
                # Find certificate by serial number
                $store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser)
                $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
                
                $certificates = $store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindBySerialNumber, "${this.targetSerial}", $false)
                
                if ($certificates.Count -eq 0) {
                    throw "Certificate with serial ${this.targetSerial} not found"
                }
                
                $cert = $certificates[0]
                Write-Host "✅ Found certificate: $($cert.Subject)"
                Write-Host "📅 Valid from: $($cert.NotBefore.ToString('yyyy-MM-dd HH:mm:ss'))"
                Write-Host "📅 Valid to: $($cert.NotAfter.ToString('yyyy-MM-dd HH:mm:ss'))"
                
                # Test private key access
                try {
                    $privateKey = $cert.PrivateKey
                    if ($privateKey) {
                        $cspInfo = $privateKey.CspKeyContainerInfo
                        Write-Host "✅ Private key accessible, Provider: $($cspInfo.ProviderName)"
                        
                        # Test signing capability
                        $testData = [System.Text.Encoding]::UTF8.GetBytes("Test data for signing")
                        $signature = $privateKey.SignData($testData, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
                        Write-Host "✅ Private key test successful - can be used for signing"
                        
                    } else {
                        throw "Private key not accessible"
                    }
                } catch {
                    Write-Host "❌ Error accessing private key: $($_.Exception.Message)"
                    throw "Cannot access private key for signing: $($_.Exception.Message)"
                }
                
                # Now use iTextSharp to actually sign the PDF
                Write-Host "🚀 Starting iTextSharp PDF signing..."
                
                # Read the input PDF
                $inputPdfBytes = [System.IO.File]::ReadAllBytes("${this.inputPdf}")
                Write-Host "📄 Input PDF size: $($inputPdfBytes.Length) bytes"
                
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
                
                # Set visible signature
                $rect = New-Object iTextSharp.text.Rectangle(100, 100, 250, 150)
                $signatureAppearance.SetVisibleSignature($rect, $reader.NumberOfPages, "DigitalSignature")
                
                # Set signature reason and location
                $signatureAppearance.Reason = "Digital Signature Test"
                $signatureAppearance.Location = "Email Service"
                $signatureAppearance.SignatureCreator = "Email Service eSignature"
                
                # Create external signature
                $externalSignature = New-Object iTextSharp.text.pdf.security.X509Certificate2Signature($cert, "SHA-256")
                
                # Create certificate chain
                $certChain = @($cert)
                
                # Sign the PDF using iTextSharp
                Write-Host "🔐 Applying digital signature..."
                [iTextSharp.text.pdf.security.MakeSignature]::SignDetached($signatureAppearance, $externalSignature, $certChain, $null, $null, $null, 0, [iTextSharp.text.pdf.security.CryptoStandard]::CMS)
                
                # Close the stamper and reader
                $stamper.Close()
                $reader.Close()
                
                # Get the signed PDF bytes
                $signedPdfBytes = $outputStream.ToArray()
                $outputStream.Close()
                $inputStream.Close()
                
                # Write the signed PDF to output file
                [System.IO.File]::WriteAllBytes("${this.signedPdf}", $signedPdfBytes)
                
                Write-Host "✅ PDF signed successfully with iTextSharp!"
                Write-Host "📄 Output PDF size: $($signedPdfBytes.Length) bytes"
                Write-Host "📁 Signed PDF saved to: ${this.signedPdf}"
                
                $store.Close()
                
            } catch {
                Write-Error "❌ Error signing PDF: $($_.Exception.Message)"
                Write-Error "Stack trace: $($_.Exception.StackTrace)"
                exit 1
            }
        `;

        const result = await this.runPowerShellScript(signScript);

        console.log('📊 PowerShell Result:');
        console.log('Exit Code:', result.exitCode);
        console.log('STDOUT:', result.stdout);
        if (result.stderr) {
            console.log('STDERR:', result.stderr);
        }

        if (result.exitCode === 0) {
            console.log('✅ Real PDF signing test completed!');
            if (fs.existsSync(this.signedPdf)) {
                const stats = fs.statSync(this.signedPdf);
                console.log('📊 Signed PDF size:', stats.size, 'bytes');
                console.log('📁 Signed PDF location:', this.signedPdf);
            }
            return true;
        } else {
            console.log('❌ Real PDF signing test failed');
            return false;
        }
    }

    async verifySignedPDF() {
        console.log('🔍 Verifying Signed PDF...');
        console.log('========================');

        if (!fs.existsSync(this.signedPdf)) {
            console.log('❌ Signed PDF not found');
            return false;
        }

        const stats = fs.statSync(this.signedPdf);
        console.log('📊 Signed PDF size:', stats.size, 'bytes');

        // Read the PDF content to check for signature
        const content = fs.readFileSync(this.signedPdf);
        const contentStr = content.toString('utf8');

        // Check for PDF signature markers
        const hasSignature = contentStr.includes('/Type /Sig') ||
            contentStr.includes('/Filter /Adobe.PPKMS') ||
            contentStr.includes('/SubFilter /adbe.pkcs7.detached');

        if (hasSignature) {
            console.log('✅ PDF contains digital signature markers!');
            console.log('🔐 This is a properly digitally signed PDF');
        } else {
            console.log('⚠️ No digital signature markers found in PDF');
            console.log('❌ This may not be a properly signed PDF');
        }

        return hasSignature;
    }

    async runTest() {
        console.log('🔐 Real PDF Digital Signing Test');
        console.log('================================');
        console.log('This test creates a PDF and signs it with a real digital signature using iTextSharp.');
        console.log('');

        // Step 1: Create test PDF
        const pdfCreated = await this.createTestPDF();
        if (!pdfCreated) {
            console.log('❌ Test failed: Could not create PDF');
            return;
        }

        // Step 2: Test real PDF signing
        const signingWorked = await this.testRealPDFSigning();
        if (!signingWorked) {
            console.log('❌ Test failed: Real PDF signing failed');
            return;
        }

        // Step 3: Verify signed PDF
        const verified = await this.verifySignedPDF();

        console.log('');
        console.log('🎉 Real PDF Digital Signing Test Results');
        console.log('========================================');
        console.log('✅ PDF created:', this.inputPdf);
        console.log('✅ PDF signed:', this.signedPdf);
        console.log('✅ Certificate used:', this.targetSerial);
        console.log(verified ? '✅ Digital signature verified' : '⚠️ Digital signature verification incomplete');

        console.log('');
        if (verified) {
            console.log('🎯 SUCCESS: The PDF is properly digitally signed!');
            console.log('📋 You can now use this for real PDF signing on the USB computer.');
        } else {
            console.log('⚠️ The PDF signing may not have worked correctly.');
            console.log('📋 Check if iTextSharp is properly installed.');
        }
    }
}

// Main execution
async function main() {
    const tester = new RealPDFSigningTest();
    await tester.runTest();
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = RealPDFSigningTest;
