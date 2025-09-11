const { spawn } = require('child_process');

class CertificateDetectionTester {
    constructor() {
        this.serialNumber = '489EEE98E426DACC';
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

    async testCertificateDetection() {
        console.log('🔍 Testing Certificate Detection');
        console.log('===============================');
        console.log('');

        try {
            // Test the same PowerShell script that NativePdfSigner uses
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

            console.log('🚀 Running PowerShell certificate detection script...');
            const result = await this.runPowerShellScript(psScript);

            console.log('📊 PowerShell Result:');
            console.log('Exit Code:', result.exitCode);
            console.log('STDOUT:', result.stdout);
            if (result.stderr) {
                console.log('STDERR:', result.stderr);
            }

            if (result.exitCode === 0 && result.stdout) {
                const lines = result.stdout.trim().split('\n').filter(line => line.trim());
                console.log('');
                console.log('📋 Found Certificates:');
                console.log('=====================');

                let foundTarget = false;
                for (const line of lines) {
                    try {
                        const certData = JSON.parse(line);
                        console.log(`Serial: ${certData.SerialNumber}`);
                        console.log(`Subject: ${certData.Subject}`);
                        console.log(`Provider: ${certData.Provider}`);
                        console.log(`HasPrivateKey: ${certData.HasPrivateKey}`);
                        console.log('---');

                        if (certData.SerialNumber === this.serialNumber) {
                            foundTarget = true;
                            console.log('✅ TARGET CERTIFICATE FOUND!');
                        }
                    } catch (parseError) {
                        console.log('⚠️ Error parsing certificate:', parseError.message);
                    }
                }

                if (foundTarget) {
                    console.log('');
                    console.log('✅ SUCCESS: Target certificate found and accessible!');
                    console.log('The eSignature configuration should work now.');
                } else {
                    console.log('');
                    console.log('❌ TARGET CERTIFICATE NOT FOUND');
                    console.log('Make sure the USB token is inserted and the serial number is correct.');
                }

            } else {
                console.log('');
                console.log('❌ PowerShell script failed');
                console.log('This might be why eSignature configuration is failing.');
            }

        } catch (error) {
            console.error('❌ Error testing certificate detection:', error.message);
        }
    }
}

// Main execution
async function main() {
    const tester = new CertificateDetectionTester();

    console.log('🔐 Certificate Detection Tester');
    console.log('===============================');
    console.log('');
    console.log('This tool tests the certificate detection that eSignature uses.');
    console.log('Make sure the USB token is inserted before running this test.');
    console.log('');

    await tester.testCertificateDetection();

    console.log('');
    console.log('🏁 Testing completed!');
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = CertificateDetectionTester;
