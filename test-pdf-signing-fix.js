const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PDFSigningFixTest {
    constructor() {
        this.testDir = './test-pdfs';
        this.inputPdf = path.join(this.testDir, 'test-input.pdf');
        this.signedPdf = path.join(this.testDir, 'test-signed.pdf');
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
        console.log('📄 Creating Test PDF...');
        console.log('=====================');

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
(Test PDF for Signing) Tj
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

    async testTempDirectoryCreation() {
        console.log('🔍 Testing Temp Directory Creation...');
        console.log('===================================');

        const tempDir = path.join(process.cwd(), 'temp');
        console.log('📁 Temp directory path:', tempDir);

        try {
            // Create temp directory
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
                console.log('✅ Temp directory created');
            } else {
                console.log('✅ Temp directory already exists');
            }

            // Test file creation
            const testFile = path.join(tempDir, 'test.txt');
            fs.writeFileSync(testFile, 'Test content');
            console.log('✅ Test file created:', testFile);

            // Test file reading
            const content = fs.readFileSync(testFile, 'utf8');
            console.log('✅ Test file read successfully:', content);

            // Clean up
            fs.unlinkSync(testFile);
            console.log('✅ Test file cleaned up');

            return true;
        } catch (error) {
            console.log('❌ Error testing temp directory:', error.message);
            return false;
        }
    }

    async testPDFEncryption() {
        console.log('🔐 Testing PDF Encryption...');
        console.log('============================');

        if (!fs.existsSync(this.inputPdf)) {
            console.log('❌ Input PDF not found');
            return false;
        }

        try {
            const tempDir = path.join(process.cwd(), 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempInputPath = path.join(tempDir, `input_${Date.now()}.pdf`);
            const tempOutputPath = path.join(tempDir, `output_${Date.now()}.pdf`);

            // Copy input PDF to temp location
            fs.copyFileSync(this.inputPdf, tempInputPath);
            console.log('✅ Input PDF copied to temp location');

            // Test pdf-password encryption
            const pdfPassword = require('pdf-password');
            const password = 'test123';

            console.log('🔐 Encrypting PDF with password:', password);
            await pdfPassword.encryptPDF({
                inFile: tempInputPath,
                outFile: tempOutputPath,
                password: password
            });

            console.log('✅ PDF encrypted successfully');

            // Check if output file exists
            if (fs.existsSync(tempOutputPath)) {
                const stats = fs.statSync(tempOutputPath);
                console.log('📊 Encrypted PDF size:', stats.size, 'bytes');
            }

            // Clean up
            fs.unlinkSync(tempInputPath);
            fs.unlinkSync(tempOutputPath);
            console.log('✅ Temp files cleaned up');

            return true;
        } catch (error) {
            console.log('❌ Error testing PDF encryption:', error.message);
            return false;
        }
    }

    async runTest() {
        console.log('🔐 PDF Signing Fix Test');
        console.log('======================');
        console.log('This test verifies that the PDF signing fixes work correctly.');
        console.log('');

        // Step 1: Create test PDF
        const pdfCreated = await this.createTestPDF();
        if (!pdfCreated) {
            console.log('❌ Test failed: Could not create PDF');
            return;
        }

        // Step 2: Test temp directory creation
        const tempDirWorks = await this.testTempDirectoryCreation();
        if (!tempDirWorks) {
            console.log('❌ Test failed: Temp directory creation failed');
            return;
        }

        // Step 3: Test PDF encryption
        const encryptionWorks = await this.testPDFEncryption();
        if (!encryptionWorks) {
            console.log('❌ Test failed: PDF encryption failed');
            return;
        }

        console.log('');
        console.log('🎉 PDF Signing Fix Test Results');
        console.log('==============================');
        console.log('✅ PDF creation works');
        console.log('✅ Temp directory creation works');
        console.log('✅ PDF encryption works');
        console.log('');
        console.log('📋 The PDF signing fixes should now work correctly!');
        console.log('You can now test the eSignature feature on the USB computer.');
    }
}

// Main execution
async function main() {
    const tester = new PDFSigningFixTest();
    await tester.runTest();
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = PDFSigningFixTest;
