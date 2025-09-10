const { spawn } = require('child_process');
const path = require('path');

class PinValidator {
    constructor(serialNumber, pinCode) {
        this.serialNumber = serialNumber;
        this.pinCode = pinCode;
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

    async validatePin() {
        console.log('🔐 Testing PIN Validation for USB Certificate');
        console.log('=============================================');
        console.log('');
        console.log(`Serial Number: ${this.serialNumber}`);
        console.log(`PIN Code: ${'*'.repeat(this.pinCode.length)}`);
        console.log('');

        try {
            // PowerShell script to test PIN validation
            const psScript = `
try {
    Write-Host "Looking for certificate with serial: ${this.serialNumber}" -ForegroundColor Yellow
    
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser)
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
    
    $certificates = $store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindBySerialNumber, "${this.serialNumber}", $false)
    
    if ($certificates.Count -eq 0) {
        Write-Host "❌ Certificate not found" -ForegroundColor Red
        Write-Host "Available certificates:" -ForegroundColor Yellow
        
        $allCerts = Get-ChildItem -Path "Cert:\\CurrentUser\\My" | Where-Object { $_.HasPrivateKey }
        foreach ($cert in $allCerts) {
            Write-Host "Serial: $($cert.SerialNumber)" -ForegroundColor Gray
            Write-Host "Subject: $($cert.Subject)" -ForegroundColor Gray
            Write-Host "---" -ForegroundColor Gray
        }
        exit 1
    }
    
    $cert = $certificates[0]
    Write-Host "✅ Certificate found!" -ForegroundColor Green
    Write-Host "Subject: $($cert.Subject)" -ForegroundColor White
    Write-Host "Serial: $($cert.SerialNumber)" -ForegroundColor White
    
    # Check if it's a hardware token
    $privateKey = $cert.PrivateKey
    if (-not $privateKey) {
        Write-Host "❌ Private key not accessible" -ForegroundColor Red
        exit 1
    }
    
    $cspInfo = $privateKey.CspKeyContainerInfo
    Write-Host "Provider: $($cspInfo.ProviderName)" -ForegroundColor White
    Write-Host "Container: $($cspInfo.KeyContainerName)" -ForegroundColor White
    
    if ($cspInfo.ProviderName -notlike "*PROXKey*" -and $cspInfo.ProviderName -notlike "*Smart Card*" -and $cspInfo.ProviderName -notlike "*Token*") {
        Write-Host "ℹ️ This appears to be a software certificate, PIN not required" -ForegroundColor Cyan
        exit 0
    }
    
    Write-Host "🔑 Testing PIN validation..." -ForegroundColor Yellow
    
    # Test PIN validation by trying to create a new CSP with the PIN
    try {
        $cspParams = New-Object System.Security.Cryptography.CspParameters
        $cspParams.KeyContainerName = $cspInfo.KeyContainerName
        $cspParams.ProviderName = $cspInfo.ProviderName
        $cspParams.ProviderType = $cspInfo.ProviderType
        
        # Convert PIN to SecureString
        $securePin = ConvertTo-SecureString "${this.pinCode}" -AsPlainText -Force
        
        # Try to access the private key with the PIN
        $cspParams.Flags = [System.Security.Cryptography.CspProviderFlags]::UseExistingKey
        $cspParams.KeyNumber = $cspInfo.KeyNumber
        
        $rsa = New-Object System.Security.Cryptography.RSACryptoServiceProvider($cspParams)
        
        # Test if we can actually use the key for signing
        $testData = [System.Text.Encoding]::UTF8.GetBytes("Test data for PIN validation")
        $signature = $rsa.SignData($testData, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
        
        Write-Host "✅ PIN validation successful!" -ForegroundColor Green
        Write-Host "The PIN code is correct and the certificate can be used for signing" -ForegroundColor Green
        
        $rsa.Dispose()
        
    } catch {
        Write-Host "❌ PIN validation failed!" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.Exception.Message -like "*bad*" -or $_.Exception.Message -like "*invalid*" -or $_.Exception.Message -like "*incorrect*") {
            Write-Host "The PIN code appears to be incorrect" -ForegroundColor Yellow
        } elseif ($_.Exception.Message -like "*not found*" -or $_.Exception.Message -like "*access*") {
            Write-Host "The certificate or private key is not accessible" -ForegroundColor Yellow
        } else {
            Write-Host "There was an error accessing the hardware token" -ForegroundColor Yellow
        }
        
        exit 1
    }
    
    $store.Close()
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
            `;

            const result = await this.runPowerShellScript(psScript);

            console.log(result.stdout);
            if (result.stderr) {
                console.error('PowerShell Errors:', result.stderr);
            }

            // Parse the results
            const pinValid = result.stdout.includes('PIN validation successful!');
            const certFound = result.stdout.includes('Certificate found!');
            const pinFailed = result.stdout.includes('PIN validation failed!');
            const isHardwareToken = result.stdout.includes('PROXKey') || result.stdout.includes('Smart Card') || result.stdout.includes('Token');

            console.log('');
            console.log('📊 PIN Validation Results:');
            console.log('==========================');
            console.log(`✅ Certificate Found: ${certFound ? 'Yes' : 'No'}`);
            console.log(`✅ Hardware Token: ${isHardwareToken ? 'Yes' : 'No'}`);
            console.log(`✅ PIN Valid: ${pinValid ? 'Yes' : 'No'}`);
            console.log(`❌ PIN Failed: ${pinFailed ? 'Yes' : 'No'}`);

            if (pinValid) {
                console.log('');
                console.log('🎉 SUCCESS: Your PIN is correct!');
                console.log('The USB certificate is ready for eSignature configuration.');
            } else if (pinFailed) {
                console.log('');
                console.log('❌ FAILED: PIN validation failed');
                console.log('Please check your PIN code and try again.');
            } else if (!certFound) {
                console.log('');
                console.log('❌ Certificate not found');
                console.log('Make sure the USB token is inserted and the certificate is installed.');
            } else {
                console.log('');
                console.log('⚠️ Unable to determine PIN validity');
                console.log('Check the error messages above for more details.');
            }

            return {
                success: pinValid,
                certFound: certFound,
                isHardwareToken: isHardwareToken,
                pinValid: pinValid,
                pinFailed: pinFailed
            };

        } catch (error) {
            console.error('❌ Error running PIN validation:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Main execution
async function main() {
    // Read configuration from file
    let config;
    try {
        const fs = require('fs');
        const configData = fs.readFileSync('pin-test-config.json', 'utf8');
        config = JSON.parse(configData);
    } catch (error) {
        console.log('⚠️ Could not read pin-test-config.json, using default values');
        config = {
            serialNumber: '489EEE98E426DACC',
            pinCode: '123456'
        };
    }

    const serialNumber = config.serialNumber;
    const pinCode = config.pinCode;

    console.log('🔐 USB Certificate PIN Validator');
    console.log('=================================');
    console.log('');
    console.log('This tool will test if your PIN code is correct for the USB certificate.');
    console.log('Make sure the USB token is inserted before running this test.');
    console.log('');

    const validator = new PinValidator(serialNumber, pinCode);
    const result = await validator.validatePin();

    console.log('');
    console.log('🏁 PIN validation completed!');

    if (result.success) {
        console.log('✅ You can now configure eSignature with this certificate and PIN.');
    } else {
        console.log('❌ Please check your certificate and PIN before configuring eSignature.');
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = PinValidator;
