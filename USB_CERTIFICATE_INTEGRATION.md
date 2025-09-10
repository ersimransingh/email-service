# USB Certificate Integration Guide

This guide explains how to integrate your C# PDF signing application with USB certificates and your Node.js email service.

## Understanding Your C# Application

Your C# application (`iTextSharpSign`) supports three types of certificate sources:

### 1. USB/Smart Card Certificates
- **How it works**: Uses Windows Certificate Store with serial number lookup
- **strPfxFile**: Certificate serial number (without spaces)
- **strPfxPwd**: PIN code for the USB token/smart card
- **Example**: `strPfxFile = "1234567890ABCDEF"`, `strPfxPwd = "1234"`

### 2. PFX Files
- **How it works**: Loads certificate from file with password
- **strPfxFile**: Full path to .pfx file
- **strPfxPwd**: PFX file password
- **Example**: `strPfxFile = "C:\certs\mycert.pfx"`, `strPfxPwd = "mypassword"`

### 3. Special Operations
- **ADDPAGE**: Adds a blank page to PDF
- **MERGEPDF**: Merges multiple PDFs
- **Empty strPfxFile**: Just encrypts PDF with password

## Quick Start

### 1. Check Your Certificates
```cmd
check-usb-certificates.bat
```

### 2. Check Specific Certificate
```cmd
check-usb-certificates.bat -SerialNumber "1234567890ABCDEF"
```

### 3. Check PFX File
```cmd
check-usb-certificates.bat -PfxPath "C:\certs\mycert.pfx" -PfxPassword "mypassword"
```

## Integration with Node.js Email Service

### Option 1: Direct C# Application Call
Create a wrapper service that calls your C# application:

```javascript
// lib/signing/CSharpPdfSigner.js
const { spawn } = require('child_process');
const path = require('path');

class CSharpPdfSigner {
    constructor(config) {
        this.csharpAppPath = config.csharpAppPath; // Path to your compiled C# exe
        this.certificateConfig = config.certificate;
    }

    async signPdf(inputPath, outputPath, options = {}) {
        return new Promise((resolve, reject) => {
            const args = [
                inputPath,           // Source file
                outputPath,          // Output file
                options.pdfPassword || '', // PDF password
                this.certificateConfig.pfxFile, // Certificate file/serial
                this.certificateConfig.pfxPassword || '', // Certificate password
                'true'               // Sign visible
            ];

            const process = spawn(this.csharpAppPath, args);
            
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, output: stdout });
                } else {
                    reject(new Error(`C# application failed: ${stderr}`));
                }
            });
        });
    }
}

module.exports = CSharpPdfSigner;
```

### Option 2: Update Your Existing PdfSigningService

```javascript
// lib/signing/PdfSigningService.ts
import { spawn } from 'child_process';
import path from 'path';

export class PdfSigningService {
    private csharpAppPath: string;
    private certificateConfig: any;

    constructor(config: any) {
        this.csharpAppPath = config.csharpAppPath;
        this.certificateConfig = config.certificate;
    }

    async loadRealCertificate(): Promise<boolean> {
        // Check if C# application exists
        if (!this.csharpAppPath || !require('fs').existsSync(this.csharpAppPath)) {
            throw new Error('C# PDF signing application not found');
        }

        // Check if certificate configuration is valid
        if (!this.certificateConfig.pfxFile) {
            throw new Error('Certificate configuration missing');
        }

        return true;
    }

    async signPdf(inputPath: string, outputPath: string, options: any = {}): Promise<void> {
        return new Promise((resolve, reject) => {
            const args = [
                inputPath,
                outputPath,
                options.pdfPassword || '',
                this.certificateConfig.pfxFile,
                this.certificateConfig.pfxPassword || '',
                'true'
            ];

            const process = spawn(this.csharpAppPath, args);
            
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`PDF signing failed: ${stderr}`));
                }
            });
        });
    }
}
```

## Configuration

### Email Service Configuration
Add to your email service configuration:

```json
{
  "pdfSigning": {
    "enabled": true,
    "method": "csharp",
    "csharpAppPath": "C:\\path\\to\\your\\iTextSharpSign.exe",
    "certificate": {
      "pfxFile": "1234567890ABCDEF",  // Serial number for USB cert
      "pfxPassword": "1234",          // PIN for USB cert
      "type": "usb"                   // or "pfx" for file-based
    }
  }
}
```

### For PFX Files
```json
{
  "pdfSigning": {
    "enabled": true,
    "method": "csharp",
    "csharpAppPath": "C:\\path\\to\\your\\iTextSharpSign.exe",
    "certificate": {
      "pfxFile": "C:\\certs\\mycert.pfx",
      "pfxPassword": "mypassword",
      "type": "pfx"
    }
  }
}
```

## Certificate Setup

### USB/Smart Card Certificates
1. Insert your USB token or smart card
2. Run `check-usb-certificates.bat` to find the serial number
3. Configure the serial number in your email service
4. Set the PIN code if required

### PFX Files
1. Obtain a .pfx file from your certificate authority
2. Place it in a secure location
3. Configure the path and password in your email service

## Testing

### Test Certificate Detection
```cmd
check-usb-certificates.bat -Detailed
```

### Test Specific Certificate
```cmd
check-usb-certificates.bat -SerialNumber "YOUR_SERIAL_NUMBER"
```

### Test PFX File
```cmd
check-usb-certificates.bat -PfxPath "C:\path\to\cert.pfx" -PfxPassword "password"
```

## Troubleshooting

### Common Issues

1. **"Certificate not found"**
   - Check if USB token is inserted
   - Verify serial number is correct
   - Run certificate checker to find available certificates

2. **"Private key not accessible"**
   - Check if PIN code is correct
   - Verify USB token is properly initialized
   - Check Windows Certificate Store permissions

3. **"C# application not found"**
   - Compile your C# application
   - Set correct path in configuration
   - Ensure .NET Framework is installed

4. **"PDF signing failed"**
   - Check input PDF file exists and is readable
   - Verify output directory is writable
   - Check C# application logs for detailed errors

### Debug Steps

1. Run certificate checker with `-Detailed` flag
2. Test C# application manually with sample files
3. Check Windows Event Viewer for certificate-related errors
4. Verify file permissions and paths

## Security Considerations

- Never store PIN codes in plain text
- Use environment variables for sensitive data
- Secure the C# application executable
- Regularly rotate certificates
- Monitor certificate expiration dates

## Example Usage

```javascript
// In your email service
const pdfSigner = new CSharpPdfSigner({
    csharpAppPath: 'C:\\MyApp\\iTextSharpSign.exe',
    certificate: {
        pfxFile: '1234567890ABCDEF',
        pfxPassword: process.env.CERT_PIN
    }
});

// Sign a PDF
await pdfSigner.signPdf('input.pdf', 'signed.pdf', {
    pdfPassword: 'optional_pdf_password'
});
```

This integration allows you to use your existing C# PDF signing application with USB certificates while maintaining the Node.js email service architecture.
