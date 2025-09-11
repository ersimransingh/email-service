# eSignature Troubleshooting Guide

This guide helps you troubleshoot eSignature configuration issues in the email service.

## 🔧 **Available Testing Tools**

### 1. Certificate Connection Test
```bash
npm run test-cert
```
**What it tests:**
- ✅ Certificate exists in Windows Certificate Store
- ✅ Private key accessibility
- ✅ PROXKey hardware token detection

### 2. PIN Validation Test
```bash
npm run test-pin
```
**What it tests:**
- ✅ PIN code correctness
- ✅ Private key access with PIN
- ✅ Certificate signing capability

### 3. eSignature Configuration Test
```bash
npm run test-esignature
```
**What it tests:**
- ✅ Next.js API endpoints
- ✅ eSignature configuration
- ✅ PDF signing functionality

## 🚨 **Common Issues and Solutions**

### Issue 1: "Native signature not available"

**Symptoms:**
- eSignature configuration fails
- Error message: "Native signature not available"

**Solutions:**
1. **Check certificate availability:**
   ```bash
   npm run test-cert
   ```

2. **Verify PIN validation:**
   ```bash
   npm run test-pin
   ```

3. **Check if Next.js app is running:**
   ```bash
   npm run dev
   ```

4. **Verify certificate serial number:**
   - Make sure it matches exactly (case-sensitive)
   - Check for extra spaces or characters

### Issue 2: "Certificate not found"

**Symptoms:**
- Certificate not detected in Windows Certificate Store
- Available certificates list is empty

**Solutions:**
1. **Insert USB token properly:**
   - Make sure USB token is fully inserted
   - Check if device is recognized in Device Manager

2. **Install certificate drivers:**
   - Install PROXKey drivers if not already installed
   - Restart the computer after driver installation

3. **Check certificate store location:**
   - Certificates should be in Current User store
   - Not in Local Machine store

4. **Run as Administrator:**
   - Sometimes certificates require elevated privileges

### Issue 3: "PIN validation failed"

**Symptoms:**
- PIN test fails
- Error accessing private key

**Solutions:**
1. **Verify PIN code:**
   - Double-check the PIN code
   - Make sure it's the correct PIN for the certificate

2. **Check PIN format:**
   - Some tokens require specific PIN format
   - Try with/without leading zeros

3. **Hardware token interaction:**
   - Make sure the token is properly inserted
   - Try removing and reinserting the token

4. **Driver issues:**
   - Update PROXKey drivers
   - Check if token is recognized in Device Manager

### Issue 4: "Private key not accessible"

**Symptoms:**
- Private key access denied
- Crypto error messages

**Solutions:**
1. **PIN entry:**
   - The system should prompt for PIN
   - Enter the correct PIN when prompted

2. **Token status:**
   - Check if token is locked
   - Try unlocking with correct PIN

3. **Permission issues:**
   - Run the application as Administrator
   - Check certificate permissions

### Issue 5: "PDF signing failed"

**Symptoms:**
- PDF signing process fails
- Error during signing operation

**Solutions:**
1. **Check input PDF:**
   - Make sure PDF is valid and not corrupted
   - Try with a simple test PDF

2. **Certificate access:**
   - Verify certificate is accessible
   - Check if private key can be used

3. **PowerShell execution:**
   - Check if PowerShell can execute scripts
   - Verify execution policy settings

## 🔍 **Debugging Steps**

### Step 1: Verify Basic Setup
```bash
# 1. Check certificate connection
npm run test-cert

# 2. Test PIN validation
npm run test-pin

# 3. Start Next.js app
npm run dev

# 4. Test eSignature configuration
npm run test-esignature
```

### Step 2: Check Logs
Look for these log messages in the console:

**Good signs:**
- ✅ "Certificate found!"
- ✅ "Private key accessible"
- ✅ "PROXKey hardware token detected!"
- ✅ "PIN validation successful!"

**Warning signs:**
- ❌ "Certificate not found"
- ❌ "Private key not accessible"
- ❌ "PIN validation failed"
- ❌ "Error accessing private key"

### Step 3: Verify Configuration
Check your eSignature configuration:

```json
{
  "certificate": {
    "serialNumber": "489EEE98E426DACC",
    "pinCode": "YOUR_ACTUAL_PIN",
    "type": "usb"
  }
}
```

## 🛠️ **Advanced Troubleshooting**

### PowerShell Execution Policy
If PowerShell scripts fail to execute:

```powershell
# Check current policy
Get-ExecutionPolicy

# Set execution policy (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Certificate Store Access
If certificates are not found:

```powershell
# List all certificates in Current User store
Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { $_.HasPrivateKey }

# Check specific certificate
Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { $_.SerialNumber -eq "489EEE98E426DACC" }
```

### Hardware Token Status
Check if USB token is properly recognized:

```powershell
# List smart card readers
Get-WmiObject -Class Win32_PnPEntity | Where-Object { $_.Name -like "*smart card*" -or $_.Name -like "*token*" -or $_.Name -like "*proxkey*" }
```

## 📞 **Getting Help**

If you're still experiencing issues:

1. **Run all diagnostic tools:**
   ```bash
   npm run test-cert
   npm run test-pin
   npm run test-esignature
   ```

2. **Collect error logs:**
   - Copy the complete error messages
   - Note the exact steps that led to the error

3. **Check system requirements:**
   - Windows 10/11
   - PowerShell 5.1 or later
   - PROXKey drivers installed
   - USB token properly inserted

4. **Verify certificate details:**
   - Serial number is correct
   - PIN code is correct
   - Certificate is not expired (though expired certificates should still work for signing)

## ✅ **Success Indicators**

When everything is working correctly, you should see:

```
✅ Certificate Found: Yes
✅ Private Key Access: Yes
✅ PROXKey Token: Yes
✅ PIN Valid: Yes
✅ eSignature Configuration: Success
✅ PDF Signing: Success
```

This means your eSignature is ready to use in the email service!
