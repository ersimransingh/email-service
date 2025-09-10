# Installation Guide - No Python Required!

## ✅ **Python is NOT Required!**

The eSignature implementation uses **pure Node.js/TypeScript** with PowerShell integration. No Python, C#, or other external dependencies are needed.

## 🚀 **Quick Installation:**

### **1. Prerequisites:**
- ✅ **Node.js** (v18 or higher)
- ✅ **Windows** (for PowerShell integration)
- ✅ **USB Certificate** (inserted in computer)
- ❌ **Python** - NOT required
- ❌ **C#** - NOT required
- ❌ **External applications** - NOT required

### **2. Install Dependencies:**
```bash
# Using npm
npm install

# OR using yarn
yarn install
```

### **3. Start the Service:**
```bash
# Development
npm run dev

# OR using yarn
yarn dev
```

## 📋 **Dependencies Used:**

### **Core Dependencies:**
- `next` - React framework
- `react` - UI library
- `typescript` - TypeScript support
- `nodemailer` - Email sending
- `mssql` - Database connectivity
- `node-cron` - Scheduled tasks
- `crypto-js` - Encryption utilities

### **PDF Processing:**
- `pdf-lib` - PDF manipulation
- `pdf-password` - PDF encryption
- `node-forge` - Cryptographic functions

### **No Native Dependencies:**
- ❌ No `node-webcrypto-p11` (removed)
- ❌ No `node-signpdf` (removed)
- ❌ No `@signpdf/signpdf` (removed)
- ❌ No Python required
- ❌ No C++ build tools required

## 🔧 **How PDF Signing Works:**

### **Native Implementation:**
1. **PowerShell Scripts** - Query Windows Certificate Store
2. **iTextSharp Integration** - Use iTextSharp through PowerShell
3. **USB Certificate Access** - Direct access to hardware tokens
4. **PDF Manipulation** - Pure PowerShell + iTextSharp

### **No External Applications:**
- ✅ Uses built-in Windows PowerShell
- ✅ Uses iTextSharp through PowerShell
- ✅ No compiled C# applications needed
- ✅ No Python scripts required

## 🛠️ **Troubleshooting:**

### **If you get Python errors:**
1. **Check package.json** - Ensure no native dependencies
2. **Clear node_modules** - `rm -rf node_modules && npm install`
3. **Check for old packages** - Look for packages requiring Python

### **If PowerShell is not available:**
1. **Enable PowerShell** - Ensure PowerShell is installed
2. **Check execution policy** - May need to allow script execution
3. **Run as administrator** - If permission issues

### **If certificate not found:**
1. **Insert USB token** - Ensure hardware token is connected
2. **Run certificate checker** - `.\check-usb-certificates.bat`
3. **Check Windows Certificate Store** - Verify certificate is installed

## 📁 **File Structure:**

```
email-service/
├── src/
│   ├── lib/
│   │   ├── signing/
│   │   │   ├── NativePdfSigner.ts    # Native PDF signing
│   │   │   └── PdfSigningService.ts  # Main service
│   │   └── email/
│   │       └── EmailService.ts       # Email processing
│   └── app/
│       ├── api/
│       │   ├── configure-esignature/ # Configuration API
│       │   └── test-esignature/      # Testing API
│       └── components/
│           └── ESignatureConfig.tsx  # Configuration UI
├── check-usb-certificates.ps1        # Certificate discovery
├── check-usb-certificates.bat        # Certificate checker
└── package.json                      # Dependencies
```

## ✅ **Verification:**

### **1. Check Dependencies:**
```bash
npm list --depth=0
```

### **2. Test Build:**
```bash
npm run build
```

### **3. Test Certificate Discovery:**
```bash
.\check-usb-certificates.bat
```

### **4. Test eSignature:**
- Start the service: `npm run dev`
- Navigate to eSignature configuration
- Enter certificate serial number and PIN
- Test the configuration

## 🎉 **Ready to Use:**

The system is now completely self-contained with:
- ✅ **No Python required**
- ✅ **No C# applications needed**
- ✅ **No external dependencies**
- ✅ **Pure Node.js implementation**
- ✅ **Windows PowerShell integration**
- ✅ **USB certificate support**

Just install Node.js, run `npm install`, and you're ready to go!
