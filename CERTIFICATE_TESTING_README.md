# USB Certificate Testing Tools

This directory contains Node.js tools to test USB certificate connectivity and PIN validation.

## 🔧 Available Tools

### 1. Certificate Connection Tester
Tests if the USB certificate is accessible in the Windows Certificate Store.

```bash
npm run test-cert
# or
node test-certificate-connection.js
```

**What it does:**
- ✅ Checks if certificate exists in Windows Certificate Store
- ✅ Verifies private key accessibility
- ✅ Detects PROXKey hardware tokens
- ✅ Lists all available certificates

### 2. PIN Validation Tester
Tests if your PIN code is correct for the USB certificate.

```bash
npm run test-pin
# or
node test-pin-validation.js
```

**What it does:**
- ✅ Finds the certificate by serial number
- ✅ Tests PIN validation by attempting to use the private key
- ✅ Verifies the certificate can be used for signing
- ✅ Provides clear success/failure feedback

## 📝 Configuration

### For PIN Testing
Edit `pin-test-config.json`:

```json
{
  "serialNumber": "489EEE98E426DACC",
  "pinCode": "YOUR_ACTUAL_PIN",
  "description": "Update the pinCode with your actual PIN before testing"
}
```

## 🚀 Usage Instructions

### On the Machine with USB Token:

1. **Insert the USB token** into the computer
2. **Update the configuration:**
   ```bash
   # Edit pin-test-config.json with your actual PIN
   notepad pin-test-config.json
   ```

3. **Test certificate connection:**
   ```bash
   npm run test-cert
   ```
   Expected output:
   ```
   ✅ Certificate Found: Yes
   ✅ Private Key Access: Yes
   ✅ PROXKey Token: Yes
   ```

4. **Test PIN validation:**
   ```bash
   npm run test-pin
   ```
   Expected output:
   ```
   ✅ Certificate Found: Yes
   ✅ Hardware Token: Yes
   ✅ PIN Valid: Yes
   ```

## 🔍 Troubleshooting

### Certificate Not Found
- Make sure USB token is inserted
- Check if certificate is installed in Current User store
- Verify the serial number is correct

### PIN Validation Failed
- Double-check your PIN code
- Make sure the USB token is properly inserted
- Try running as Administrator

### Private Key Not Accessible
- This is common with hardware tokens
- The PIN validation test will handle this properly
- Make sure the token drivers are installed

## 📋 Expected Results

When everything is working correctly, you should see:

```
🎉 SUCCESS: Your PIN is correct!
The USB certificate is ready for eSignature configuration.
```

## 🔗 Next Steps

After successful PIN validation:
1. Configure eSignature in the email service
2. Use the same serial number and PIN
3. Test PDF signing functionality

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify the USB token is properly inserted
3. Ensure you have the correct PIN code
4. Try running the tools as Administrator
