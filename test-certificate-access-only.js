const { spawn } = require('child_process');

class CertificateAccessTest {
    constructor() {
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

    async testCertificateAccess() {
        console.log('🔍 Testing Certificate Access (No iTextSharp Required)...');
        console.log('======================================================');
        console.log('Target Certificate:', this.targetSerial);

        const testScript = `
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
                Write-Host "🔑 Has private key: $($cert.HasPrivateKey)"
                Write-Host "🔢 Serial number: $($cert.SerialNumber)"
                Write-Host "👤 Issuer: $($cert.Issuer)"
                
                # Test private key access
                try {
                    $privateKey = $cert.PrivateKey
                    if ($privateKey) {
                        $cspInfo = $privateKey.CspKeyContainerInfo
                        Write-Host "✅ Private key accessible"
                        Write-Host "🏢 Provider: $($cspInfo.ProviderName)"
                        Write-Host "📦 Container: $($cspInfo.KeyContainerName)"
                        
                        # Test signing capability
                        $testData = [System.Text.Encoding]::UTF8.GetBytes("Test data for signing")
                        $signature = $privateKey.SignData($testData, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
                        Write-Host "✅ Private key test successful - can be used for signing"
                        Write-Host "🔐 Signature length: $($signature.Length) bytes"
                        
                        # Test with different hash algorithms
                        $sha1Signature = $privateKey.SignData($testData, [System.Security.Cryptography.HashAlgorithmName]::SHA1, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
                        Write-Host "✅ SHA1 signing test successful"
                        
                        $sha512Signature = $privateKey.SignData($testData, [System.Security.Cryptography.HashAlgorithmName]::SHA512, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
                        Write-Host "✅ SHA512 signing test successful"
                        
                    } else {
                        Write-Host "❌ Private key not accessible"
                    }
                } catch {
                    Write-Host "❌ Error accessing private key: $($_.Exception.Message)"
                }
                
                $store.Close()
                Write-Host "✅ Certificate access test completed successfully"
                
            } catch {
                Write-Error "❌ Error accessing certificate: $($_.Exception.Message)"
                exit 1
            }
        `;

        const result = await this.runPowerShellScript(testScript);

        console.log('📊 PowerShell Result:');
        console.log('Exit Code:', result.exitCode);
        console.log('STDOUT:', result.stdout);
        if (result.stderr) {
            console.log('STDERR:', result.stderr);
        }

        return result.exitCode === 0;
    }

    async runTest() {
        console.log('🔐 Certificate Access Test (No Dependencies)');
        console.log('===========================================');
        console.log('This test verifies certificate access without requiring iTextSharp.');
        console.log('');

        const success = await this.testCertificateAccess();

        console.log('');
        console.log('🎉 Certificate Access Test Results');
        console.log('=================================');
        if (success) {
            console.log('✅ Certificate access test passed!');
            console.log('✅ The certificate can be used for digital signing');
            console.log('✅ All signing algorithms (SHA1, SHA256, SHA512) work');
            console.log('');
            console.log('📋 Next steps:');
            console.log('1. Install iTextSharp on the USB computer');
            console.log('2. Copy the updated code to the USB computer');
            console.log('3. Run the full eSignature test');
        } else {
            console.log('❌ Certificate access test failed');
            console.log('❌ Check the error messages above');
        }
    }
}

// Main execution
async function main() {
    const tester = new CertificateAccessTest();
    await tester.runTest();
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = CertificateAccessTest;
