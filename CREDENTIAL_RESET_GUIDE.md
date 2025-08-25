# 🔧 Emergency Credential Reset Guide

## 🚨 When to Use This Script

Use the credential reset script when you:
- **Forgot your username/password** for the email service dashboard
- **Cannot access the login page** due to authentication issues
- **Need to reset credentials** for testing or recovery purposes

## 📋 What the Script Does

The `reset-credentials.js` script will:
1. ✅ **Reset username to**: `admin`
2. ✅ **Reset password to**: `admin`
3. ✅ **Preserve all other settings** (schedule, intervals, timeouts, etc.)
4. ✅ **Encrypt and save** the updated configuration
5. ✅ **Show confirmation** of the changes made

## 🚀 How to Use

### Method 1: Direct Node.js execution
```bash
node reset-credentials.js
```

### Method 2: Make executable and run
```bash
chmod +x reset-credentials.js
./reset-credentials.js
```

## 📺 Example Output

```
============================================================
🔧 EMAIL SERVICE - EMERGENCY CREDENTIAL RESET
============================================================
⚠️  WARNING: This will reset your login credentials!
📝 New credentials will be:
   Username: admin
   Password: admin
============================================================

🤔 Are you sure you want to reset credentials to admin/admin?
Type 'yes' to confirm: yes

🔧 Step 1: Checking config directory...
✅ Config directory exists

🔧 Step 2: Loading existing configuration...
✅ Found existing email configuration

🔧 Step 3: Creating reset configuration...
✅ Reset configuration prepared

🔧 Step 4: Saving reset configuration...
✅ Configuration saved to: /path/to/config/email.config

--------------------------------------------------
📋 CONFIGURATION SUMMARY
--------------------------------------------------
🕐 Schedule: 08:00 - 17:00
⏱️  Interval: 1 minutes
⏰ DB Timeout: 30000ms
👤 Username: admin
🔑 Password: admin
--------------------------------------------------
✅ CREDENTIALS SUCCESSFULLY RESET!
--------------------------------------------------

📝 Next Steps:
1. Restart your email service if it's running
2. Access the dashboard at http://localhost:3000
3. Login with username: admin, password: admin
4. Change your password from the Settings page

🎉 Credential reset completed successfully!
```

## 🔄 After Running the Script

1. **Restart the email service** (if running):
   ```bash
   # Stop the service via dashboard or API
   curl -X POST http://localhost:3000/api/service-control \
        -H "Content-Type: application/json" \
        -d '{"action":"stop"}'
   
   # Start the service again
   curl -X POST http://localhost:3000/api/service-control \
        -H "Content-Type: application/json" \
        -d '{"action":"start"}'
   ```

2. **Access the dashboard**:
   - Go to: `http://localhost:3000`
   - Username: `admin`
   - Password: `admin`

3. **Change your password** (Recommended):
   - Go to Dashboard → Settings
   - Update username and password to your preferred credentials
   - Save the configuration

## 🛡️ Security Notes

- ⚠️ **Change default credentials immediately** after reset
- 🔒 The script uses the same encryption as the main application
- 📁 All other settings are preserved (schedule, database timeouts, etc.)
- 🔄 The service will need to be restarted to apply new credentials

## 🐛 Troubleshooting

### Script Won't Run
```bash
# Make sure you have Node.js installed
node --version

# Ensure the script is executable
chmod +x reset-credentials.js

# Run with explicit node command
node reset-credentials.js
```

### "Module not found" Error
```bash
# Install required dependencies
npm install crypto-js

# Or run from the project directory where node_modules exists
cd /path/to/email-service
node reset-credentials.js
```

### Config Directory Issues
The script will automatically create the `config/` directory if it doesn't exist.

### Still Can't Login
1. Check if the email service is running: `http://localhost:3000/api/dashboard`
2. Clear browser cache/cookies
3. Try incognito/private browsing mode
4. Check console for any JavaScript errors

## 📝 Script Location

The script is located at: `reset-credentials.js` in the project root directory.

---

**⚠️ Important**: This script modifies your authentication configuration. Use only when necessary and always change the default credentials after reset!
