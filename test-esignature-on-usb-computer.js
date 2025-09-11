const { spawn } = require('child_process');

class ESignatureUSBTest {
    constructor() {
        this.baseUrl = 'http://localhost:3000'; // Default port, will be updated if needed
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

    async checkServerRunning() {
        console.log('🔍 Checking if Next.js server is running...');

        try {
            const fetch = require('node-fetch');

            // Try port 3000 first
            try {
                const response = await fetch(`${this.baseUrl}/api/configure-esignature`);
                if (response.ok) {
                    console.log('✅ Server is running on port 3000');
                    return true;
                }
            } catch (error) {
                console.log('❌ Server not running on port 3000');
            }

            // Try port 3001
            this.baseUrl = 'http://localhost:3001';
            try {
                const response = await fetch(`${this.baseUrl}/api/configure-esignature`);
                if (response.ok) {
                    console.log('✅ Server is running on port 3001');
                    return true;
                }
            } catch (error) {
                console.log('❌ Server not running on port 3001');
            }

            console.log('❌ Next.js server is not running. Please start it with: npm run dev');
            return false;
        } catch (error) {
            console.log('❌ Error checking server:', error.message);
            return false;
        }
    }

    async getAvailableCertificates() {
        console.log('🔍 Getting Available Certificates...');
        console.log('===================================');

        const script = `
            try {
                Get-ChildItem -Path "Cert:\\CurrentUser\\My" | Where-Object { $_.HasPrivateKey } | ForEach-Object {
                    $cert = $_
                    $provider = "Unknown"
                    $container = "Unknown"
                    
                    try {
                        $privateKey = $cert.PrivateKey
                        if ($privateKey -and $privateKey.CspKeyContainerInfo) {
                            $cspInfo = $privateKey.CspKeyContainerInfo
                            $provider = $cspInfo.ProviderName
                            $container = $cspInfo.KeyContainerName
                        } else {
                            $provider = "Hardware Token"
                            $container = "Hardware Token"
                        }
                    } catch {
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

        const result = await this.runPowerShellScript(script);

        if (result.exitCode === 0 && result.stdout) {
            const lines = result.stdout.trim().split('\n').filter(line => line.trim());
            const certificates = [];

            for (const line of lines) {
                try {
                    const certData = JSON.parse(line);
                    certificates.push(certData);
                } catch (parseError) {
                    console.log('⚠️ Error parsing certificate:', parseError.message);
                }
            }

            console.log('📋 Found', certificates.length, 'certificates:');
            certificates.forEach((cert, index) => {
                console.log(`  ${index + 1}. Serial: ${cert.SerialNumber}`);
                console.log(`     Subject: ${cert.Subject}`);
                console.log(`     Provider: ${cert.Provider}`);
                console.log(`     Valid: ${cert.ValidFrom} to ${cert.ValidTo}`);
                console.log('');
            });

            return certificates;
        } else {
            console.log('❌ Failed to get certificates');
            console.log('STDERR:', result.stderr);
            return [];
        }
    }

    async testESignatureConfiguration(certificate) {
        console.log('🧪 Testing eSignature Configuration...');
        console.log('=====================================');
        console.log('Using certificate:', certificate.SerialNumber);
        console.log('Subject:', certificate.Subject);
        console.log('');

        try {
            const fetch = require('node-fetch');

            // Test configuration
            console.log('1️⃣ Testing configuration API...');
            const configResponse = await fetch(`${this.baseUrl}/api/configure-esignature`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    certificate: {
                        serialNumber: certificate.SerialNumber,
                        pinCode: '123456@', // You can change this to your actual PIN
                        type: 'usb'
                    }
                })
            });

            console.log('📊 Configuration Response Status:', configResponse.status);
            const configResult = await configResponse.json();
            console.log('📊 Configuration Response:', JSON.stringify(configResult, null, 2));

            if (configResult.success) {
                console.log('✅ Configuration successful!');
            } else {
                console.log('❌ Configuration failed:', configResult.error);
                return false;
            }

            // Test eSignature info
            console.log('');
            console.log('2️⃣ Testing eSignature info API...');
            const infoResponse = await fetch(`${this.baseUrl}/api/configure-esignature`);
            console.log('📊 Info Response Status:', infoResponse.status);
            const infoResult = await infoResponse.json();
            console.log('📊 Info Response:', JSON.stringify(infoResult, null, 2));

            // Test eSignature test
            console.log('');
            console.log('3️⃣ Testing eSignature test API...');
            const testResponse = await fetch(`${this.baseUrl}/api/test-esignature`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    certificate: {
                        serialNumber: certificate.SerialNumber,
                        pinCode: '123456@', // You can change this to your actual PIN
                        type: 'usb'
                    }
                })
            });

            console.log('📊 Test Response Status:', testResponse.status);
            const testResult = await testResponse.json();
            console.log('📊 Test Response:', JSON.stringify(testResult, null, 2));

            if (testResult.success) {
                console.log('✅ eSignature test successful!');
                return true;
            } else {
                console.log('❌ eSignature test failed:', testResult.error);
                return false;
            }

        } catch (error) {
            console.log('❌ Error testing eSignature:', error.message);
            return false;
        }
    }

    async runTest() {
        console.log('🔐 eSignature USB Computer Test');
        console.log('===============================');
        console.log('This test verifies eSignature functionality on the computer with USB key.');
        console.log('');

        // Step 1: Check if server is running
        const serverRunning = await this.checkServerRunning();
        if (!serverRunning) {
            console.log('');
            console.log('❌ Test failed: Next.js server is not running');
            console.log('Please start the server with: npm run dev');
            return;
        }

        // Step 2: Get available certificates
        const certificates = await this.getAvailableCertificates();
        if (certificates.length === 0) {
            console.log('');
            console.log('❌ Test failed: No certificates found');
            console.log('Make sure the USB key is inserted and the certificate is installed');
            return;
        }

        // Step 3: Test eSignature with the first certificate
        const certificate = certificates[0];
        const success = await this.testESignatureConfiguration(certificate);

        console.log('');
        console.log('🎉 eSignature USB Computer Test Results');
        console.log('======================================');
        if (success) {
            console.log('✅ All tests passed!');
            console.log('✅ eSignature is working correctly');
            console.log('✅ You can now use the eSignature feature in the UI');
        } else {
            console.log('❌ Some tests failed');
            console.log('❌ Check the error messages above');
        }

        console.log('');
        console.log('📋 Next Steps:');
        console.log('1. Open the Next.js UI in your browser');
        console.log('2. Go to the eSignature configuration page');
        console.log('3. Enter the certificate details:');
        console.log(`   - Serial Number: ${certificate.SerialNumber}`);
        console.log('   - PIN Code: [Your actual PIN]');
        console.log('   - Type: USB');
        console.log('4. Click "Test eSignature" to verify');
        console.log('5. Click "Save Configuration" to save');
    }
}

// Main execution
async function main() {
    const tester = new ESignatureUSBTest();
    await tester.runTest();
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ESignatureUSBTest;
