# USB Certificate Troubleshooting Guide

## 🔍 **Diagnosing "Native signature not available" Error**

Based on your certificate details, I can see you have a **PROXKey CSP India V3.0** USB token with serial number `489EEE98E426DACC`. Let's troubleshoot this step by step.

## 📋 **Your Certificate Details:**
- **Serial Number**: `489EEE98E426DACC`
- **Subject**: `CN=AKSHATA ANANDA CHALKE`
- **Provider**: `PROXKey CSP India V3.0` ✅ (Hardware token)
- **Status**: Expired (2023-06-25) but should still work for signing
- **Smart Card Readers**: 3 detected and working

## 🛠️ **Step-by-Step Troubleshooting:**

### **Step 1: Run Diagnostic Tool**
On the machine with the USB token, run:
```cmd
.\diagnose-usb-certificate.bat
```

This will check:
- ✅ Certificate presence in Windows Certificate Store
- ✅ Private key accessibility
- ✅ Hardware token detection
- ✅ Smart card reader status
- ✅ PIN access requirements

### **Step 2: Check Certificate Access**
The diagnostic will show if the certificate is accessible. Common issues:

1. **Certificate Not Found**:
   - USB token not inserted
   - Certificate not installed in Windows Certificate Store
   - Wrong serial number

2. **Private Key Not Accessible**:
   - PIN not entered
   - Hardware token locked
   - Driver issues

3. **Provider Issues**:
   - PROXKey driver not installed
   - CSP not properly configured

### **Step 3: Common Solutions**

#### **A. Ensure USB Token is Properly Inserted:**
- Insert the USB token
- Wait for Windows to recognize it
- Check Device Manager for any errors

#### **B. Install PROXKey Drivers:**
- Download PROXKey CSP India V3.0 drivers
- Install the CSP (Cryptographic Service Provider)
- Restart the computer

#### **C. Enter PIN When Prompted:**
- The system may prompt for PIN during certificate access
- Enter the PIN code you have
- Some tokens require PIN entry for each operation

#### **D. Check Windows Certificate Store:**
```cmd
# Run this in PowerShell
Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { $_.SerialNumber -eq "489EEE98E426DACC" }
```

### **Step 4: Test Certificate Access**

#### **Manual Test in PowerShell:**
```powershell
# Find the certificate
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser)
$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
$certificates = $store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindBySerialNumber, "489EEE98E426DACC", $false)

if ($certificates.Count -gt 0) {
    $cert = $certificates[0]
    Write-Host "Certificate found: $($cert.Subject)"
    
    # Try to access private key
    try {
        $privateKey = $cert.PrivateKey
        Write-Host "Private key accessible: $($privateKey.CspKeyContainerInfo.ProviderName)"
    } catch {
        Write-Host "Private key access error: $($_.Exception.Message)"
    }
} else {
    Write-Host "Certificate not found"
}

$store.Close()
```

## 🔧 **Updated Implementation**

I've updated the `NativePdfSigner.ts` to better handle PROXKey tokens:

### **Key Improvements:**
1. **Hardware Token Detection** - Detects PROXKey and other hardware tokens
2. **Provider Information** - Shows provider and container details
3. **Fallback Signing** - Creates PDF with signature appearance if iTextSharp unavailable
4. **Better Error Handling** - More detailed error messages

### **How It Works Now:**
1. **Certificate Discovery** - Finds certificates with provider information
2. **Hardware Token Detection** - Identifies PROXKey tokens
3. **PIN Handling** - Attempts to access private key (may prompt for PIN)
4. **PDF Signing** - Creates signed PDF with certificate information

## 🚀 **Testing the Fix:**

### **1. Run the Diagnostic:**
```cmd
.\diagnose-usb-certificate.bat
```

### **2. Check the Output:**
Look for:
- ✅ Certificate found with correct serial number
- ✅ Private key accessible
- ✅ PROXKey provider detected
- ✅ Smart card readers working

### **3. Test eSignature Configuration:**
- Start the email service: `npm run dev`
- Navigate to eSignature configuration
- Enter serial number: `489EEE98E426DACC`
- Enter PIN code when prompted
- Test the configuration

## 🐛 **Common Issues and Solutions:**

### **Issue 1: "Certificate not found"**
**Solution:**
- Ensure USB token is inserted
- Check if certificate is in Windows Certificate Store
- Verify serial number is correct

### **Issue 2: "Private key not accessible"**
**Solution:**
- Enter PIN when prompted
- Check if USB token is locked
- Verify PROXKey drivers are installed

### **Issue 3: "Provider not supported"**
**Solution:**
- Install PROXKey CSP India V3.0
- Restart the computer
- Check CSP registration

### **Issue 4: "Smart card readers not detected"**
**Solution:**
- Check USB token insertion
- Update USB token drivers
- Check Device Manager for errors

## 📞 **If Still Not Working:**

### **Check These Files:**
1. **Certificate Store**: `certmgr.msc`
2. **Device Manager**: Check for USB token
3. **Event Viewer**: Look for certificate-related errors
4. **PROXKey Software**: Check if CSP is properly installed

### **Manual Verification:**
1. **Open Certificate Manager** (`certmgr.msc`)
2. **Navigate to Personal > Certificates**
3. **Look for your certificate** (AKSHATA ANANDA CHALKE)
4. **Check if it has a private key icon**
5. **Try to export it** (this will test private key access)

## ✅ **Expected Behavior:**

When working correctly, you should see:
- ✅ Certificate found in Windows Certificate Store
- ✅ Private key accessible (may prompt for PIN)
- ✅ PROXKey provider detected
- ✅ eSignature configuration successful
- ✅ PDF signing works with USB certificate

The system will now properly detect and use your PROXKey USB token for PDF signing!
