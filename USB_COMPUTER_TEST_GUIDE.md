# USB Computer eSignature Test Guide

## Overview
This guide helps you test the eSignature functionality on the computer where your USB key is inserted.

## Prerequisites
- USB key with certificate inserted
- Node.js and npm installed
- Next.js server running

## Quick Test Steps

### 1. Start the Next.js Server
```bash
npm run dev
```
Note the port (usually 3000 or 3001)

### 2. Run the USB Test
```bash
npm run test-usb
```

This will:
- Check if the server is running
- List all available certificates
- Test eSignature configuration
- Test eSignature functionality

### 3. Manual UI Test
1. Open browser to `http://localhost:3000` (or 3001)
2. Go to eSignature configuration
3. Enter certificate details:
   - **Serial Number**: Use the serial from the test output
   - **PIN Code**: Your actual USB key PIN
   - **Type**: USB
4. Click "Test eSignature"
5. Click "Save Configuration"

## Expected Results

### ✅ Success Indicators
- Server starts without errors
- Certificates are found and listed
- eSignature configuration succeeds
- eSignature test passes
- UI shows "Native signing available"

### ❌ Common Issues
- **No certificates found**: USB key not inserted or certificate not installed
- **Configuration fails**: Check certificate serial number and PIN
- **Server not running**: Run `npm run dev` first
- **Port conflicts**: Use the port shown in the dev server output

## Certificate Information

The test will show certificates like:
```
Serial: 489EEE98E426DACC
Subject: CN=Your Name
Provider: PROXKey CSP India V3.0
Valid: 2024-01-01 to 2025-01-01
```

Use the **Serial Number** in the UI configuration.

## Troubleshooting

### If eSignature shows "Not Available"
1. Check USB key is inserted
2. Verify certificate is in Windows Certificate Store
3. Try running `npm run test-pin` first
4. Check the server console for error messages

### If Configuration Fails
1. Double-check the serial number (case-sensitive)
2. Verify the PIN code is correct
3. Make sure the certificate has a private key
4. Check if the certificate is expired

### If Test Fails
1. Check all API endpoints are working
2. Verify PowerShell execution is allowed
3. Check Windows Certificate Store access
4. Look for specific error messages in the output

## Files Created
- `test-esignature-on-usb-computer.js` - Main test script
- `test-pdfs/` - Directory for test PDFs (if created)

## Next Steps
Once the test passes:
1. The eSignature feature is ready to use
2. You can configure it in the UI
3. PDFs will be automatically signed when sending emails
4. The signing will work with your USB certificate

## Support
If you encounter issues:
1. Check the test output for specific error messages
2. Verify the USB key and certificate are properly installed
3. Make sure all dependencies are installed (`npm install`)
4. Check that the Next.js server is running correctly
