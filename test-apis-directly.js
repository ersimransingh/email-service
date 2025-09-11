const { spawn } = require('child_process');

class DirectAPITester {
    constructor() {
        this.serialNumber = '489EEE98E426DACC';
        this.pinCode = '123456@'; // Your actual PIN
        this.baseUrl = 'http://localhost:3000';
    }

    async testAPI(endpoint, method = 'GET', data = null) {
        try {
            const fetch = require('node-fetch');

            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            console.log(`🔧 Testing ${method} ${endpoint}...`);
            if (data) {
                console.log('📋 Request data:', JSON.stringify(data, null, 2));
            }

            const response = await fetch(`${this.baseUrl}${endpoint}`, options);

            console.log(`📊 Response Status: ${response.status}`);

            const result = await response.json();
            console.log('📊 Response:', JSON.stringify(result, null, 2));

            return {
                success: response.ok && result.success,
                status: response.status,
                data: result
            };

        } catch (error) {
            console.error(`❌ Error testing ${endpoint}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async testAllAPIs() {
        console.log('🧪 Testing All eSignature APIs Directly');
        console.log('======================================');
        console.log('');

        const testData = {
            certificate: {
                serialNumber: this.serialNumber,
                pinCode: this.pinCode,
                type: 'usb'
            }
        };

        // Test 1: GET /api/configure-esignature (check current status)
        console.log('1️⃣ Testing GET /api/configure-esignature');
        console.log('==========================================');
        const getStatus = await this.testAPI('/api/configure-esignature', 'GET');
        console.log('Result:', getStatus.success ? '✅ SUCCESS' : '❌ FAILED');
        console.log('');

        // Test 2: POST /api/configure-esignature (configure eSignature)
        console.log('2️⃣ Testing POST /api/configure-esignature');
        console.log('===========================================');
        const configureResult = await this.testAPI('/api/configure-esignature', 'POST', testData);
        console.log('Result:', configureResult.success ? '✅ SUCCESS' : '❌ FAILED');
        console.log('');

        // Test 3: GET /api/configure-esignature (check status after configuration)
        console.log('3️⃣ Testing GET /api/configure-esignature (after config)');
        console.log('======================================================');
        const getStatusAfter = await this.testAPI('/api/configure-esignature', 'GET');
        console.log('Result:', getStatusAfter.success ? '✅ SUCCESS' : '❌ FAILED');
        console.log('');

        // Test 4: POST /api/test-esignature (test eSignature functionality)
        console.log('4️⃣ Testing POST /api/test-esignature');
        console.log('====================================');
        const testResult = await this.testAPI('/api/test-esignature', 'POST', testData);
        console.log('Result:', testResult.success ? '✅ SUCCESS' : '❌ FAILED');
        console.log('');

        // Summary
        console.log('📊 SUMMARY');
        console.log('==========');
        console.log(`GET Status (before): ${getStatus.success ? '✅' : '❌'}`);
        console.log(`POST Configure: ${configureResult.success ? '✅' : '❌'}`);
        console.log(`GET Status (after): ${getStatusAfter.success ? '✅' : '❌'}`);
        console.log(`POST Test: ${testResult.success ? '✅' : '❌'}`);

        const allSuccess = getStatus.success && configureResult.success && getStatusAfter.success && testResult.success;

        if (allSuccess) {
            console.log('');
            console.log('🎉 ALL TESTS PASSED! eSignature is working correctly!');
            console.log('You can now use the dashboard UI to configure eSignature.');
        } else {
            console.log('');
            console.log('❌ Some tests failed. Check the error messages above.');
        }

        return allSuccess;
    }

    async testWithServerCheck() {
        console.log('🔍 First, let me check if the Next.js server is running...');
        console.log('');

        try {
            const fetch = require('node-fetch');
            const response = await fetch(`${this.baseUrl}/api/configure-esignature`, {
                method: 'GET',
                timeout: 5000
            });

            if (response.ok) {
                console.log('✅ Next.js server is running and responding!');
                console.log('');
                return await this.testAllAPIs();
            } else {
                console.log('❌ Server responded but with error status:', response.status);
                return false;
            }

        } catch (error) {
            console.log('❌ Next.js server is not running or not accessible');
            console.log('');
            console.log('💡 To start the server:');
            console.log('   1. Open a new terminal');
            console.log('   2. Navigate to the project directory');
            console.log('   3. Run: npm run dev');
            console.log('   4. Wait for "Ready - started server on 0.0.0.0:3000"');
            console.log('   5. Then run this test again');
            console.log('');
            return false;
        }
    }
}

// Main execution
async function main() {
    const tester = new DirectAPITester();

    console.log('🔐 Direct API Tester');
    console.log('===================');
    console.log('');
    console.log('This tool tests all eSignature APIs directly without the UI.');
    console.log('Make sure the Next.js server is running (npm run dev).');
    console.log('');

    const success = await tester.testWithServerCheck();

    console.log('');
    console.log('🏁 Testing completed!');
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = DirectAPITester;
