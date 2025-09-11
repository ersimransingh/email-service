const { spawn } = require('child_process');
const path = require('path');

class ESignatureConfigTester {
    constructor() {
        this.serialNumber = '489EEE98E426DACC';
        this.pinCode = '123456'; // Update this with your actual PIN
    }

    async testESignatureConfiguration() {
        console.log('🧪 Testing eSignature Configuration in Next.js App');
        console.log('================================================');
        console.log('');

        try {
            // Test the eSignature API endpoint
            const testData = {
                certificate: {
                    serialNumber: this.serialNumber,
                    pinCode: this.pinCode,
                    type: 'usb'
                }
            };

            console.log('📋 Test Configuration:');
            console.log(`   Serial Number: ${this.serialNumber}`);
            console.log(`   PIN Code: ${'*'.repeat(this.pinCode.length)}`);
            console.log(`   Type: usb`);
            console.log('');

            // Make HTTP request to the eSignature test endpoint
            const fetch = require('node-fetch');
            const response = await fetch('http://localhost:3000/api/test-esignature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            console.log('📊 API Response:');
            console.log('================');
            console.log(JSON.stringify(result, null, 2));

            if (result.success) {
                console.log('');
                console.log('✅ eSignature configuration test completed successfully!');

                if (result.tests) {
                    console.log('');
                    console.log('📋 Test Results:');
                    console.log(`   C# App Available: ${result.tests.csharpApp?.available ? 'Yes' : 'No'}`);
                    console.log(`   Certificate Info: ${result.tests.certificate?.available ? 'Yes' : 'No'}`);
                    console.log(`   Signing Test: ${result.tests.signing?.success ? 'Yes' : 'No'}`);

                    if (result.tests.signing?.error) {
                        console.log(`   Signing Error: ${result.tests.signing.error}`);
                    }
                }
            } else {
                console.log('');
                console.log('❌ eSignature configuration test failed!');
                console.log(`   Error: ${result.error}`);
            }

        } catch (error) {
            console.error('❌ Error testing eSignature configuration:', error.message);
            console.log('');
            console.log('💡 Make sure:');
            console.log('   1. The Next.js app is running (npm run dev)');
            console.log('   2. The USB token is inserted');
            console.log('   3. The PIN code is correct');
            console.log('   4. The certificate is accessible');
        }
    }

    async testDirectSigning() {
        console.log('');
        console.log('🔒 Testing Direct PDF Signing');
        console.log('=============================');

        try {
            // Create a simple test PDF
            const testPdfContent = `%PDF-1.4
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
/Length 50
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF for eSignature) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
305
%%EOF`;

            const testPdfPath = path.join(__dirname, 'test.pdf');
            require('fs').writeFileSync(testPdfPath, testPdfContent);

            console.log('📄 Created test PDF:', testPdfPath);

            // Test the eSignature API with the test PDF
            const testData = {
                certificate: {
                    serialNumber: this.serialNumber,
                    pinCode: this.pinCode,
                    type: 'usb'
                },
                testPdfPath: testPdfPath
            };

            const fetch = require('node-fetch');
            const response = await fetch('http://localhost:3000/api/test-esignature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            console.log('📊 Direct Signing Test Results:');
            console.log('================================');
            console.log(JSON.stringify(result, null, 2));

            if (result.success && result.tests?.signing?.success) {
                console.log('');
                console.log('✅ Direct PDF signing test completed successfully!');
            } else {
                console.log('');
                console.log('❌ Direct PDF signing test failed!');
                if (result.tests?.signing?.error) {
                    console.log(`   Error: ${result.tests.signing.error}`);
                }
            }

            // Clean up test PDF
            try {
                require('fs').unlinkSync(testPdfPath);
                console.log('🧹 Cleaned up test PDF');
            } catch (cleanupError) {
                console.warn('⚠️ Could not clean up test PDF:', cleanupError.message);
            }

        } catch (error) {
            console.error('❌ Error testing direct signing:', error.message);
        }
    }
}

// Main execution
async function main() {
    const tester = new ESignatureConfigTester();

    console.log('🔐 eSignature Configuration Tester');
    console.log('==================================');
    console.log('');
    console.log('This tool will test the eSignature configuration in your Next.js app.');
    console.log('Make sure the Next.js app is running (npm run dev) before running this test.');
    console.log('');

    await tester.testESignatureConfiguration();
    await tester.testDirectSigning();

    console.log('');
    console.log('🏁 Testing completed!');
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ESignatureConfigTester;
