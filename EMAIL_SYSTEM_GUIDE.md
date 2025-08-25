# Email Service System Guide

## 🗄️ Database Tables Structure

### Table: `Digital_Emaildetails` (Email Queue)

**Primary Key:** `dd_srno` - Unique email record ID

**Status Control Field:**
- `dd_SendFlag` - Email Status:
  - `'N'` = **Pending** (emails to be sent - fetched by service)
  - `'Y'` = **Sent Successfully** 
  - `'E'` = **Error/Permanently Failed** (after max retries)

**Email Content Fields:**
- `dd_toEmailid` - Recipient email address (required)
- `dd_ccEmailid` - CC email addresses (optional)
- `dd_subject` - Email subject line
- `dd_bodyText` - Email HTML content

**Attachment Fields:**
- `dd_document` - PDF attachment (binary data)
- `dd_filename` - Attachment filename
- `dd_Encpassword` - PDF encryption password (optional)
- `dd_Finaldocument` - Final processed document (encrypted, if applicable)

**Tracking Fields:**
- `dd_SentDate` - Timestamp when email was sent successfully
- `dd_BounceReason` - Failure reason/error message
- `dd_RetryCount` - Number of retry attempts
- `dd_LastRetryDate` - Last retry attempt timestamp
- `dd_EmailParamCode` - SMTP configuration selector (optional)

### Table: `tbl_EMailParameters` (SMTP Configuration)

**Primary Key:** `ParamCode` - Configuration identifier

**SMTP Settings:**
- `SMTPServer` - SMTP server hostname (e.g., smtp.gmail.com)
- `SMTPPort` - SMTP port (587 for TLS, 465 for SSL, 25 for no encryption)
- `SMTPAccountName` - SMTP username/email
- `SMTPPassword` - SMTP password or app password
- `SMTPMailId` - From email address
- `ApplicationName` - Application name shown in emails
- `SMTPSSLFlag` - SSL/TLS flag ('Y'/'N')
- `IsActive` - Active status ('Y'/'N')

## 🔄 Email Processing Workflow

### 1. **Email Fetching (Which Emails to Send)**
```sql
SELECT TOP 10 * FROM Digital_Emaildetails 
WHERE dd_SendFlag = 'N'
ORDER BY dd_srno ASC
```

The service fetches pending emails with `dd_SendFlag = 'N'` (Pending status only).

### 2. **SMTP Configuration Selection**

**Dynamic SMTP Selection:**
- If `dd_EmailParamCode` is specified → Use specific SMTP config from `tbl_EMailParameters` WHERE `ParamCode = dd_EmailParamCode`
- If `dd_EmailParamCode` is empty/null → Use default SMTP config (first active record)

**SMTP Query:**
```sql
-- For specific ParamCode
SELECT * FROM tbl_EMailParameters 
WHERE ParamCode = @paramCode AND IsActive = 'Y'

-- For default config
SELECT * FROM tbl_EMailParameters 
WHERE IsActive = 'Y' OR IsActive IS NULL
```

### 3. **Email Sending Process**

**Success Path:**
1. Send email via SMTP
2. Update status: `dd_SendFlag = 'Y'`
3. Set timestamp: `dd_SentDate = current_time`

**Failure Path:**
1. Increment retry count: `dd_RetryCount = dd_RetryCount + 1`
2. Log error: `dd_BounceReason = error_message`
3. Update retry date: `dd_LastRetryDate = current_time`
4. Status remains: `dd_SendFlag = 'N'` (for retry)

**Permanent Failure (after max retries):**
1. Final status: `dd_SendFlag = 'E'`
2. Final error: `dd_BounceReason = 'PERMANENT FAILURE: [reason]'`

### 4. **Update Queries**

**Success Update:**
```sql
UPDATE Digital_Emaildetails 
SET dd_SendFlag = 'Y', 
    dd_SentDate = @sentDate
WHERE dd_srno = @emailId
```

**Failure Update:**
```sql
UPDATE Digital_Emaildetails 
SET dd_SendFlag = 'N', 
    dd_BounceReason = @error,
    dd_RetryCount = ISNULL(dd_RetryCount, 0) + 1,
    dd_LastRetryDate = @lastRetryDate
WHERE dd_srno = @emailId
```

**Permanent Failure Update:**
```sql
UPDATE Digital_Emaildetails 
SET dd_SendFlag = 'E', 
    dd_BounceReason = @finalError
WHERE dd_srno = @emailId
```

## 📧 How to Add Emails to Queue

### Insert New Email Record:
```sql
INSERT INTO Digital_Emaildetails (
    dd_toEmailid, 
    dd_ccEmailid, 
    dd_subject, 
    dd_bodyText, 
    dd_document, 
    dd_filename, 
    dd_Encpassword, 
    dd_EmailParamCode,
    dd_SendFlag
) VALUES (
    'recipient@example.com',           -- Required: Recipient email
    'cc@example.com',                  -- Optional: CC emails (comma-separated)
    'Your Email Subject',              -- Email subject
    '<h1>Hello!</h1><p>Email content</p>', -- HTML email body
    @pdfBinaryData,                    -- Optional: PDF attachment binary
    'document.pdf',                    -- Optional: Attachment filename
    'pdf_password',                    -- Optional: PDF encryption password
    'CUSTOM_SMTP',                     -- Optional: Specific SMTP config ParamCode
    'N'                                -- Status: 'N' = Pending (will be sent)
);
```

## ⚙️ Service Configuration

### Email Service Settings:
- **Schedule:** 08:00 - 17:00 (configurable)
- **Interval:** Every 1 minute (configurable)
- **Batch Size:** 10 emails per cycle
- **Retry Logic:** Max 5 attempts per email
- **Rate Limiting:** 100ms delay between emails

### Service Control:
- **Start Service:** Dashboard → Start button
- **Stop Service:** Dashboard → Stop button
- **Manual Processing:** Dashboard → "Force Process" button
- **Test Email:** Dashboard → "Send Test Email" button

## 🔍 Monitoring & Status

### Dashboard Shows:
- **Database Status:** Connected/Disconnected
- **Service Status:** Running/Stopped
- **Email Statistics:** Total processed, sent, failed
- **Last Run Time:** When service last processed emails
- **Next Run Time:** When service will run next

### Log Messages:
- `📨 Found X pending emails` - Emails fetched for processing
- `🔧 Using dynamic SMTP config: [ParamCode]` - SMTP selection
- `✅ Email [dd_srno] sent successfully` - Successful send
- `❌ Email [dd_srno] failed` - Send failure
- `🔄 Email [dd_srno] will be retried later` - Retry scheduled
- `🚫 Email [dd_srno] permanently failed` - Max retries exceeded

## 🚀 Quick Start Guide

1. **Add SMTP Configuration:** Insert record in `tbl_EMailParameters`
2. **Add Email to Queue:** Insert record in `Digital_Emaildetails` with `dd_SendFlag = 'N'`
3. **Start Service:** Use dashboard or API to start email worker
4. **Monitor:** Check dashboard for processing status and statistics

The service will automatically:
- Fetch pending emails (`dd_SendFlag = 'N'`)
- Select appropriate SMTP configuration
- Send emails with attachments and encryption
- Update status and retry failed emails
- Provide real-time monitoring through dashboard
