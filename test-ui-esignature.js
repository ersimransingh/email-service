const { spawn } = require('child_process');
const path = require('path');

class UIESignatureTester {
    constructor() {
        this.serialNumber = '489EEE98E426DACC';
        this.pinCode = '123456@'; // Update this with your actual PIN
    }

    async testConfigurationAPI() {
        console.log('🧪 Testing eSignature Configuration API');
        console.log('=====================================');
        console.log('');

        try {
            const testData = {
                certificate: {
                    serialNumber: this.serialNumber,
                    pinCode: this.pinCode,
                    type: 'usb'
                }
            };

            console.log('📋 Test Data:');
            console.log(JSON.stringify(testData, null, 2));
            console.log('');

            const fetch = require('node-fetch');

            // Test configuration API
            console.log('🔧 Testing configuration API...');
            const configResponse = await fetch('http://localhost:3000/api/configure-esignature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            });

            console.log('📊 Configuration Response Status:', configResponse.status);
            const configResult = await configResponse.json();
            console.log('📊 Configuration Response:');
            console.log(JSON.stringify(configResult, null, 2));

            if (configResult.success) {
                console.log('✅ Configuration API test passed!');
            } else {
                console.log('❌ Configuration API test failed!');
                return false;
            }

            console.log('');

            // Test eSignature info API
            console.log('🧪 Testing eSignature info API...');
            const infoResponse = await fetch('http://localhost:3000/api/configure-esignature', {
                method: 'GET'
            });

            console.log('📊 Info Response Status:', infoResponse.status);
            const infoResult = await infoResponse.json();
            console.log('📊 Info Response:');
            console.log(JSON.stringify(infoResult, null, 2));

            if (infoResult.success) {
                console.log('✅ Info API test passed!');
            } else {
                console.log('❌ Info API test failed!');
                return false;
            }

            console.log('');

            // Test eSignature test API
            console.log('🧪 Testing eSignature test API...');
            const testResponse = await fetch('http://localhost:3000/api/test-esignature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            });

            console.log('📊 Test Response Status:', testResponse.status);
            const testResult = await testResponse.json();
            console.log('📊 Test Response:');
            console.log(JSON.stringify(testResult, null, 2));

            if (testResult.success) {
                console.log('✅ Test API passed!');
            } else {
                console.log('❌ Test API failed!');
                return false;
            }

            return true;

        } catch (error) {
            console.error('❌ Error testing APIs:', error.message);
            return false;
        }
    }

    async testWithDifferentDataStructures() {
        console.log('');
        console.log('🔍 Testing Different Data Structures');
        console.log('===================================');
        console.log('');

        const fetch = require('node-fetch');

        // Test 1: Correct structure (what UI should send)
        console.log('🧪 Test 1: Correct structure (certificate object)');
        try {
            const correctData = {
                certificate: {
                    serialNumber: this.serialNumber,
                    pinCode: this.pinCode,
                    type: 'usb'
                }
            };

            const response = await fetch('http://localhost:3000/api/configure-esignature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(correctData)
            });

            const result = await response.json();
            console.log('✅ Correct structure result:', result.success ? 'SUCCESS' : 'FAILED');
            if (!result.success) {
                console.log('   Error:', result.error);
            }
        } catch (error) {
            console.log('❌ Correct structure error:', error.message);
        }

        // Test 2: Wrong structure (what UI was sending before)
        console.log('');
        console.log('🧪 Test 2: Wrong structure (entire config object)');
        try {
            const wrongData = {
                enabled: true,
                certificate: {
                    serialNumber: this.serialNumber,
                    pinCode: this.pinCode,
                    type: 'usb'
                }
            };

            const response = await fetch('http://localhost:3000/api/configure-esignature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wrongData)
            });

            const result = await response.json();
            console.log('❌ Wrong structure result:', result.success ? 'SUCCESS' : 'FAILED');
            if (!result.success) {
                console.log('   Error:', result.error);
            }
        } catch (error) {
            console.log('❌ Wrong structure error:', error.message);
        }
    }
}

// Main execution
async function main() {
    const tester = new UIESignatureTester();

    console.log('🔐 UI eSignature API Tester');
    console.log('===========================');
    console.log('');
    console.log('This tool tests the eSignature APIs that the UI uses.');
    console.log('Make sure the Next.js app is running (npm run dev) before running this test.');
    console.log('');

    const success = await tester.testConfigurationAPI();
    await tester.testWithDifferentDataStructures();

    console.log('');
    console.log('🏁 Testing completed!');

    if (success) {
        console.log('✅ All API tests passed! The UI should work correctly now.');
    } else {
        console.log('❌ Some API tests failed. Check the error messages above.');
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = UIESignatureTester;
