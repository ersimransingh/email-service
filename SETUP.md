# Email Service - Setup Instructions

## Overview
This is a Next.js application for an email sending service with Microsoft SQL Server database integration. The application provides a complete web interface for configuring database connections, email service settings, and user authentication.

## What's Been Implemented

### 1. Welcome Page
- Clean, modern UI with dark mode support
- "Start Setup" button to begin configuration
- Professional branding and layout
- Smart navigation based on configuration status

### 2. Database Configuration Form
- Form fields for Microsoft SQL Server connection:
  - Server (IP Address)
  - Port (default: 1433)
  - Username
  - Password
  - Database Name
- Real-time form validation
- Test connection functionality
- Save configuration with encryption
- Automatic progression to next step

### 3. Email Service Configuration Form
- Scheduling settings:
  - Start Time (time field)
  - End Time (time field)
  - Interval (number with minutes/hours unit)
- Database timeout settings:
  - DB Request Timeout (default: 30000ms)
  - DB Connection Timeout (default: 30000ms)
- Authentication credentials:
  - Username
  - Password
- Form validation and encrypted storage

### 4. Login System
- Secure authentication using configured credentials
- Session management with encrypted tokens
- Protected access to email service dashboard
- Login/logout functionality
- Configuration update access

### 5. Dashboard Interface
- **Database Status Widget**: Real-time connection monitoring with response times
- **Schedule Widget**: Display of start/end times and service activity status
- **Service Control Widget**: Start/stop service functionality with persistent status
- **Quick Actions Panel**: One-click database testing, refresh, settings, and logout
- **Auto-refresh**: Automatic dashboard updates every 30 seconds
- **Real-time monitoring**: Live status indicators and connection testing
- **Service Management**: Full control over email service with status persistence

### 6. API Routes
- `/api/test-connection` - Tests database connectivity
- `/api/save-config` - Saves encrypted database configuration
- `/api/check-db-config` - Checks if database config exists
- `/api/save-email-config` - Saves encrypted email service configuration
- `/api/check-email-config` - Checks if email config exists
- `/api/authenticate` - Handles user authentication
- `/api/dashboard` - Provides comprehensive dashboard data
- `/api/test-db-status` - Real-time database connection testing
- `/api/service-control` - Start/stop email service with persistent status
- `/api/service-status` - Quick service status retrieval
- **`/api/email-test`** - Send test emails to verify SMTP configuration
- **`/api/email-force-process`** - Manually trigger email queue processing

### 7. Security Features
- All configuration data encrypted using AES encryption
- Sensitive data stored in `/config/` directory (gitignored)
- Connection testing with proper error handling
- Secure password field handling
- Session-based authentication with token expiration
- Encrypted credential storage and verification

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── save-config/
│   │   │   └── route.ts          # Save database configuration
│   │   └── test-connection/
│   │       └── route.ts          # Test database connection
│   ├── components/
│   │   └── DatabaseSetupForm.tsx # Configuration form component
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Welcome page
├── lib/
│   └── database.ts               # Database utility class
└── ...
```

## Dependencies Added
- `mssql` - Microsoft SQL Server driver
- `@types/mssql` - TypeScript types for mssql
- `crypto-js` - Encryption library
- `@types/crypto-js` - TypeScript types for crypto-js
- **`nodemailer`** - Email sending library with SMTP support
- **`@types/nodemailer`** - TypeScript types for nodemailer
- **`pdf-lib`** - PDF manipulation and validation
- **`node-cron`** - Background task scheduling
- **`@types/node-cron`** - TypeScript types for node-cron

## Configuration Storage
- Database configurations are stored in `/config/database.config`
- Email service configurations are stored in `/config/email.config`
- **Service status is stored in `/config/service.status`**
- The config directory is gitignored for security
- All configurations are encrypted using AES encryption (except service status)
- Service status persists across application restarts
- Encryption key can be customized via `CONFIG_ENCRYPTION_KEY` environment variable
- Authentication credentials are part of the email configuration

## Usage

### Development
```bash
npm run dev
```

### Building
```bash
npm run build
```

### Starting Production
```bash
npm start
```

## Application Flow
1. **First Visit**: Shows welcome page with setup button
2. **Database Setup**: Configure Microsoft SQL connection and test
3. **Email Configuration**: Set scheduling, timeouts, and auth credentials
4. **Login**: Access the service using configured credentials
5. **Dashboard**: Manage email service operations

## Current Features Complete
✅ Database configuration and testing  
✅ Email service scheduling setup  
✅ User authentication system  
✅ Secure configuration storage  
✅ Multi-step setup wizard  
✅ Session management  
✅ **Dashboard with live monitoring widgets**  
✅ **Real-time database connectivity status**  
✅ **Schedule and service status display**  
✅ **Auto-refresh dashboard functionality**  
✅ **🚀 Service start/stop control with persistent status**  
✅ **🚀 File-based service state management**  
✅ **🚀 Runtime tracking and detailed service information**  
✅ **📧 Complete Email Sending System**  
✅ **📧 SMTP Configuration Management**  
✅ **📧 Background Email Processing with Cron Jobs**  
✅ **📧 Email Queue Processing**  
✅ **📧 PDF Attachment Support**  
✅ **📧 Email Statistics and Monitoring**  
✅ **📧 Test Email Functionality**  
✅ **📧 Connection Pooling and Rate Limiting**  

## 🎉 Email Service System Complete!

### **Email Sending Features Implemented:**
- **SMTP Configuration**: Dynamic SMTP server selection by ParamCode
- **Email Queue Processing**: Automatic background processing with configurable intervals
- **PDF Attachments**: Support for PDF attachments with optional password encryption
- **Connection Pooling**: Efficient SMTP connection reuse for better performance
- **Rate Limiting**: Built-in email sending rate limits (50 emails per second)
- **Email Statistics**: Real-time tracking of sent, failed, and processed emails
- **Test Email Function**: Quick SMTP configuration testing
- **Background Service**: Cron-based email processing that runs according to schedule
- **Error Handling**: Comprehensive error logging and status tracking

### **Database Integration:**
- Reads SMTP configurations from `tbl_EMailParameters` table
- Processes emails from `tbl_EmailQueue` table
- Updates email status in database after processing
- Supports dynamic SMTP selection based on ParamCode

### **Next Steps** (Optional Enhancements):
1. Add email template management system
2. Implement advanced email analytics and reporting
3. Add webhook notifications for email events
4. Create email campaign management
5. Add email bounce and unsubscribe handling

## Security Notes
- Never commit the `/config/` directory
- Use environment variables for encryption keys in production
- Ensure SQL Server is properly secured and accessible
- Use SSL/TLS connections for production databases
