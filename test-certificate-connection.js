const { spawn } = require('child_process');
const path = require('path');

class CertificateTester {
    constructor() {
        this.serialNumber = '489EEE98E426DACC';
    }

    async runPowerShellScript(scriptPath, args = []) {
        return new Promise((resolve, reject) => {
            const ps = spawn('powershell', [
                '-ExecutionPolicy', 'Bypass',
                '-File', scriptPath,
                ...args
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
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`PowerShell script failed with code ${code}: ${stderr}`));
                }
            });

            ps.on('error', (error) => {
                reject(error);
            });
        });
    }

    async checkCertificate() {
        console.log('🔍 Testing USB Certificate Connection...');
        console.log('=====================================');
        console.log('');

        try {
            // Create a simple PowerShell script for certificate checking
            const psScript = `
Write-Host "Certificate Check" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host ""

$SerialNumber = "${this.serialNumber}"
Write-Host "Looking for certificate: $SerialNumber" -ForegroundColor Yellow

$store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser)
$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)

$certificates = $store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindBySerialNumber, $SerialNumber, $false)

if ($certificates.Count -eq 0) {
    Write-Host "Certificate not found" -ForegroundColor Red
    Write-Host "Available certificates:" -ForegroundColor Yellow
    
    $allCerts = Get-ChildItem -Path "Cert:\\CurrentUser\\My" | Where-Object { $_.HasPrivateKey }
    foreach ($cert in $allCerts) {
        Write-Host "Serial: $($cert.SerialNumber)" -ForegroundColor Gray
        Write-Host "Subject: $($cert.Subject)" -ForegroundColor Gray
        Write-Host "---" -ForegroundColor Gray
    }
} else {
    $cert = $certificates[0]
    Write-Host "Certificate found!" -ForegroundColor Green
    Write-Host "Subject: $($cert.Subject)" -ForegroundColor White
    Write-Host "Serial: $($cert.SerialNumber)" -ForegroundColor White
    Write-Host "Valid: $($cert.NotBefore) to $($cert.NotAfter)" -ForegroundColor White
    
    try {
        $privateKey = $cert.PrivateKey
        if ($privateKey) {
            $cspInfo = $privateKey.CspKeyContainerInfo
            Write-Host "Private key accessible" -ForegroundColor Green
            Write-Host "Provider: $($cspInfo.ProviderName)" -ForegroundColor White
            
            if ($cspInfo.ProviderName -like "*PROXKey*") {
                Write-Host "PROXKey hardware token detected!" -ForegroundColor Green
            }
        } else {
            Write-Host "Private key not accessible" -ForegroundColor Red
        }
    } catch {
        Write-Host "Error accessing private key: $($_.Exception.Message)" -ForegroundColor Red
    }
}

$store.Close()
Write-Host "Check completed" -ForegroundColor Gray
            `;

            // Write the PowerShell script to a temporary file
            const fs = require('fs');
            const tempScriptPath = path.join(__dirname, 'temp-cert-check.ps1');
            fs.writeFileSync(tempScriptPath, psScript);

            // Run the PowerShell script
            const result = await this.runPowerShellScript(tempScriptPath);

            // Clean up the temporary file
            fs.unlinkSync(tempScriptPath);

            console.log(result.stdout);
            if (result.stderr) {
                console.error('Errors:', result.stderr);
            }

            // Parse the output to determine if certificate is found
            const isFound = result.stdout.includes('Certificate found!');
            const hasPrivateKey = result.stdout.includes('Private key accessible');
            const isProxKey = result.stdout.includes('PROXKey hardware token detected!');

            console.log('');
            console.log('📊 Summary:');
            console.log('===========');
            console.log(`✅ Certificate Found: ${isFound ? 'Yes' : 'No'}`);
            console.log(`✅ Private Key Access: ${hasPrivateKey ? 'Yes' : 'No'}`);
            console.log(`✅ PROXKey Token: ${isProxKey ? 'Yes' : 'No'}`);

            if (isFound && hasPrivateKey && isProxKey) {
                console.log('');
                console.log('🎉 SUCCESS: Your USB certificate is ready for eSignature!');
                console.log('You can now configure eSignature in the email service.');
            } else {
                console.log('');
                console.log('⚠️  ISSUES DETECTED:');
                if (!isFound) console.log('   - Certificate not found in Windows Certificate Store');
                if (!hasPrivateKey) console.log('   - Private key not accessible');
                if (!isProxKey) console.log('   - PROXKey token not detected');
                console.log('');
                console.log('💡 Troubleshooting:');
                console.log('   1. Make sure the USB token is inserted');
                console.log('   2. Check if the certificate is installed in Current User store');
                console.log('   3. Verify the serial number is correct');
                console.log('   4. Try running as Administrator');
            }

        } catch (error) {
            console.error('❌ Error running certificate check:', error.message);
            console.log('');
            console.log('💡 Make sure:');
            console.log('   - PowerShell is available');
            console.log('   - You have permission to access the certificate store');
            console.log('   - The USB token is properly inserted');
        }
    }

    async testESignatureConfiguration() {
        console.log('');
        console.log('🧪 Testing eSignature Configuration...');
        console.log('=====================================');

        try {
            // Test the eSignature API endpoint
            const { NativePdfSigner } = require('./src/lib/signing/NativePdfSigner.ts');
            const signer = new NativePdfSigner();

            console.log('Testing certificate lookup...');
            const certificates = await signer.getAvailableCertificates();
            console.log(`Found ${certificates.length} certificates`);

            if (certificates.length > 0) {
                console.log('Available certificates:');
                certificates.forEach((cert, index) => {
                    console.log(`  ${index + 1}. Serial: ${cert.serialNumber}`);
                    console.log(`     Subject: ${cert.subject}`);
                    console.log(`     Provider: ${cert.providerName || 'Unknown'}`);
                    console.log('');
                });

                // Test if our specific certificate is available
                const targetCert = certificates.find(cert =>
                    cert.serialNumber.replace(/\s/g, '').toUpperCase() ===
                    this.serialNumber.replace(/\s/g, '').toUpperCase()
                );

                if (targetCert) {
                    console.log('✅ Target certificate found in available certificates!');
                    console.log(`   Serial: ${targetCert.serialNumber}`);
                    console.log(`   Subject: ${targetCert.subject}`);
                    console.log(`   Provider: ${targetCert.providerName || 'Unknown'}`);
                } else {
                    console.log('❌ Target certificate not found in available certificates');
                    console.log('   Make sure the serial number is correct and the certificate is accessible');
                }
            } else {
                console.log('❌ No certificates found');
            }

        } catch (error) {
            console.error('❌ Error testing eSignature configuration:', error.message);
        }
    }
}

// Main execution
async function main() {
    const tester = new CertificateTester();

    console.log('🔐 USB Certificate Connection Tester');
    console.log('====================================');
    console.log('');
    console.log(`Target Serial Number: ${tester.serialNumber}`);
    console.log('');

    await tester.checkCertificate();
    await tester.testESignatureConfiguration();

    console.log('');
    console.log('🏁 Testing completed!');
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = CertificateTester;
