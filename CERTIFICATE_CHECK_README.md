# PDF Signing Certificate Checker

This directory contains scripts to check if PDF signing certificates are available on your Windows machine for the email service.

## Files

- `check-pdf-signing-certificates.ps1` - Main PowerShell script with comprehensive certificate checking
- `check-certificates.bat` - Simple batch file wrapper for easy execution
- `CERTIFICATE_CHECK_README.md` - This documentation file

## Quick Start

### Option 1: Run the batch file (Recommended)
```cmd
check-certificates.bat
```

### Option 2: Run PowerShell script directly
```powershell
.\check-pdf-signing-certificates.ps1
```

### Option 3: Run with specific certificate files
```powershell
.\check-pdf-signing-certificates.ps1 -CertificatePath "C:\path\to\cert.p12" -KeyPath "C:\path\to\key.pem" -Password "yourpassword"
```

## What the Script Checks

### 1. Windows Certificate Store
- Personal certificates with private keys
- Root CA certificates
- Intermediate CA certificates

### 2. Common Certificate Locations
- `%USERPROFILE%\Documents\Certificates`
- `%USERPROFILE%\Desktop\Certificates`
- `%USERPROFILE%\Downloads`
- `C:\Certificates`
- `C:\Program Files\Common Files\Certificates`
- `%APPDATA%\Certificates`

### 3. Certificate File Validation
- File existence and accessibility
- Valid certificate file extensions (.p12, .pfx, .pem, .crt, .cer, .der, .key)
- File size and modification date

### 4. OpenSSL Integration (if available)
- Certificate file validation
- Certificate information extraction

### 5. Node.js Environment
- Node.js installation
- Required npm packages (pdf-lib, node-forge, pdf-password)
- Email service directory structure

## Command Line Options

| Parameter | Description | Example |
|-----------|-------------|---------|
| `-CertificatePath` | Path to certificate file | `-CertificatePath "C:\certs\mycert.p12"` |
| `-KeyPath` | Path to private key file | `-KeyPath "C:\certs\mykey.pem"` |
| `-Password` | Certificate password | `-Password "mypassword"` |
| `-Detailed` | Show detailed information | `-Detailed` |
| `-ExportResults` | Export results to JSON file | `-ExportResults` |

## Example Usage

### Basic check
```cmd
check-certificates.bat
```

### Check specific certificate
```powershell
.\check-pdf-signing-certificates.ps1 -CertificatePath "C:\MyCertificates\signing.p12" -Password "mypassword" -Detailed
```

### Export results
```powershell
.\check-pdf-signing-certificates.ps1 -ExportResults
```

## Output

The script provides color-coded output:
- ✅ **Green**: Success messages
- ⚠️ **Yellow**: Warning messages  
- ❌ **Red**: Error messages
- ℹ️ **Cyan**: Information messages

## Certificate Requirements for Email Service

Based on your email service code, you need:

1. **Certificate Format**: .p12 or .pfx (PKCS#12) files are preferred
2. **Private Key**: Must be included with the certificate
3. **File Location**: Store in `config/certificates/` directory
4. **Password**: May be required for encrypted certificates

## Troubleshooting

### PowerShell Execution Policy Error
If you get an execution policy error, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### No Certificates Found
1. Check if you have any .p12, .pfx, or .pem files on your system
2. Verify the certificate has a private key
3. Ensure the certificate is not expired
4. Check file permissions

### Node.js Not Found
1. Install Node.js from https://nodejs.org/
2. Ensure Node.js is in your system PATH
3. Run `node --version` to verify installation

## Integration with Email Service

After running this script and obtaining certificates:

1. Place certificate files in `config/certificates/` directory
2. Update your email service configuration
3. Implement the `loadRealCertificate` method in `PdfSigningService.ts`
4. Test certificate loading in your application

## Security Notes

- Never commit certificate files to version control
- Store certificates in secure locations
- Use strong passwords for certificate files
- Consider using Windows Certificate Store for better security
- Regularly rotate certificates before expiration

## Support

If you encounter issues:
1. Check the detailed output with `-Detailed` flag
2. Export results with `-ExportResults` for analysis
3. Verify all prerequisites are installed
4. Check file permissions and paths
