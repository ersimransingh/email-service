# eSignature Feature Implementation

This document explains the eSignature feature implementation that allows PDF signing using USB certificates through your C# application.

## Overview

The eSignature feature integrates your existing C# PDF signing application (`iTextSharpSign`) with the Node.js email service to automatically sign PDFs with USB certificates, regardless of expiration status.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Email Service │───▶│  PdfSigningService│───▶│  CSharpPdfSigner│
│   (Node.js)     │    │   (TypeScript)    │    │   (Wrapper)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ C# Application  │
                                               │ (iTextSharpSign)│
                                               └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ USB Certificate │
                                               │ (Windows Store) │
                                               └─────────────────┘
```

## Features

- ✅ **USB Certificate Support**: Works with USB tokens and smart cards
- ✅ **Expired Certificate Support**: Signs PDFs even with expired certificates
- ✅ **PFX File Support**: Alternative to USB certificates
- ✅ **Automatic Integration**: Seamlessly integrates with existing email workflow
- ✅ **Configuration UI**: Easy setup through web interface
- ✅ **Testing Tools**: Built-in testing and validation

## Setup Instructions

### 1. Prerequisites

- Windows Server with USB certificate installed
- Compiled C# application (`iTextSharpSign.exe`)
- Node.js email service running
- USB token/smart card inserted (if using USB certificates)

### 2. Find Your Certificate

Run the certificate checker to find available certificates:

```cmd
.\check-usb-certificates.bat
```

This will show you:
- Available USB certificates with serial numbers
- PFX files in common locations
- Smart card reader status

### 3. Configure eSignature

1. **Access the Configuration Page**:
   - Start the email service
   - Navigate to the eSignature configuration page
   - The system will guide you through setup

2. **Configure C# Application**:
   - Set the path to your compiled `iTextSharpSign.exe`
   - Example: `C:\MyApp\iTextSharpSign.exe`

3. **Configure Certificate**:
   - **For USB Certificates**:
     - Type: `usb`
     - Serial Number: `489EEE98E426DACC` (from certificate checker)
     - PIN Code: `1234` (your USB token PIN)
   
   - **For PFX Files**:
     - Type: `pfx`
     - File Path: `C:\certs\mycert.pfx`
     - Password: `mypassword`

4. **Test Configuration**:
   - Click "Test eSignature" to verify setup
   - Check the test results for any issues

### 4. Enable eSignature

- Check "Enable eSignature with USB Certificate"
- Click "Configure eSignature"
- The system will validate and save the configuration

## Configuration Examples

### USB Certificate Configuration

```json
{
  "eSignature": {
    "enabled": true,
    "csharpAppPath": "C:\\MyApp\\iTextSharpSign.exe",
    "certificate": {
      "pfxFile": "489EEE98E426DACC",
      "pfxPassword": "1234",
      "type": "usb"
    }
  }
}
```

### PFX File Configuration

```json
{
  "eSignature": {
    "enabled": true,
    "csharpAppPath": "C:\\MyApp\\iTextSharpSign.exe",
    "certificate": {
      "pfxFile": "C:\\certs\\mycert.pfx",
      "pfxPassword": "mypassword",
      "type": "pfx"
    }
  }
}
```

## API Endpoints

### Configure eSignature
```
POST /api/configure-esignature
Content-Type: application/json

{
  "csharpAppPath": "C:\\MyApp\\iTextSharpSign.exe",
  "certificate": {
    "pfxFile": "489EEE98E426DACC",
    "pfxPassword": "1234",
    "type": "usb"
  }
}
```

### Test eSignature
```
POST /api/test-esignature
Content-Type: application/json

{
  "csharpAppPath": "C:\\MyApp\\iTextSharpSign.exe",
  "certificate": {
    "pfxFile": "489EEE98E426DACC",
    "pfxPassword": "1234",
    "type": "usb"
  },
  "testPdfPath": "C:\\test\\sample.pdf"
}
```

### Get eSignature Status
```
GET /api/configure-esignature
```

## How It Works

### 1. Email Processing Flow

1. **Email Queue Processing**: Email service processes queued emails
2. **PDF Detection**: System detects PDF attachments
3. **eSignature Check**: Checks if eSignature is enabled and configured
4. **C# Application Call**: Calls your C# application with PDF and certificate details
5. **PDF Signing**: C# application signs the PDF with USB certificate
6. **Email Sending**: Sends email with signed PDF attachment

### 2. C# Application Integration

The system calls your C# application with these parameters:

```csharp
Global signer = new Global(
    sourcePdfPath,      // Input PDF path
    outputPdfPath,      // Signed PDF path
    pdfPassword,        // PDF password (if any)
    certificateSerial,  // USB certificate serial or PFX path
    certificatePin,     // USB PIN or PFX password
    "true"              // Sign visible
);
signer.Signing();
```

### 3. Certificate Handling

- **USB Certificates**: Uses Windows Certificate Store with serial number lookup
- **PFX Files**: Loads certificate from file with password
- **Expired Certificates**: Works with expired certificates (as requested)

## Troubleshooting

### Common Issues

1. **"C# application not found"**
   - Verify the path to `iTextSharpSign.exe`
   - Ensure the file exists and is executable
   - Check file permissions

2. **"Certificate not found"**
   - Run `check-usb-certificates.bat` to find available certificates
   - Verify the serial number is correct (no spaces)
   - Ensure USB token is inserted

3. **"Private key not accessible"**
   - Check if PIN code is correct
   - Verify USB token is properly initialized
   - Check Windows Certificate Store permissions

4. **"PDF signing failed"**
   - Check C# application logs
   - Verify input PDF is valid
   - Ensure output directory is writable

### Debug Steps

1. **Test Certificate Detection**:
   ```cmd
   .\check-usb-certificates.bat -Detailed
   ```

2. **Test C# Application**:
   ```cmd
   C:\MyApp\iTextSharpSign.exe --help
   ```

3. **Test Manual Signing**:
   - Use the test endpoint with a sample PDF
   - Check the test results for detailed error messages

4. **Check Logs**:
   - Monitor console output for detailed error messages
   - Check Windows Event Viewer for certificate-related errors

## Security Considerations

- **PIN Storage**: PIN codes are stored in memory only, not persisted
- **File Permissions**: Ensure C# application has proper permissions
- **Certificate Access**: USB tokens provide hardware-level security
- **Network Security**: API endpoints should be secured in production

## File Structure

```
src/
├── lib/
│   ├── signing/
│   │   ├── PdfSigningService.ts    # Main PDF signing service
│   │   └── CSharpPdfSigner.ts      # C# application wrapper
│   └── email/
│       └── EmailService.ts         # Email service with eSignature
├── app/
│   ├── api/
│   │   ├── configure-esignature/   # eSignature configuration API
│   │   └── test-esignature/        # eSignature testing API
│   └── components/
│       └── ESignatureConfig.tsx    # eSignature configuration UI
└── check-usb-certificates.ps1      # Certificate detection script
```

## Testing

### Manual Testing

1. **Configure eSignature** through the web interface
2. **Test with sample PDF** using the test endpoint
3. **Process test email** with PDF attachment
4. **Verify signed PDF** opens and shows signature

### Automated Testing

```javascript
// Test eSignature configuration
const response = await fetch('/api/test-esignature', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    csharpAppPath: 'C:\\MyApp\\iTextSharpSign.exe',
    certificate: {
      pfxFile: '489EEE98E426DACC',
      pfxPassword: '1234',
      type: 'usb'
    }
  })
});
```

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Run the certificate checker with `-Detailed` flag
3. Test the C# application manually
4. Check the console logs for detailed error messages
5. Verify all prerequisites are installed and configured

## Future Enhancements

- Support for multiple certificates
- Certificate rotation
- Advanced signature appearance options
- Batch signing capabilities
- Integration with other signing providers
