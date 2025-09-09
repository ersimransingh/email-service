import nodemailer from 'nodemailer';
import { PDFDocument } from 'pdf-lib';
import sql from 'mssql';
import { DatabaseManager } from '../database';
import { PdfSigningService } from '../signing/PdfSigningService';
import * as fs from 'fs';
import * as path from 'path';

interface SMTPConfig {
    SMTPServer: string;
    SMTPPort: number;
    SMTPAccountName: string;
    SMTPPassword: string;
    SMTPMailId: string;
    ApplicationName: string;
    SMTPSSLFlag?: string;
    ParamCode?: string;
    IsActive?: string;
}

interface EmailRecord {
    dd_srno?: number;
    dd_document?: Buffer;
    dd_filename?: string;
    dd_Finaldocument?: Buffer;
    dd_Encpassword?: string;
    dd_toEmailid: string;
    dd_ccEmailid?: string;
    dd_subject: string;
    dd_bodyText: string;
    dd_SendFlag?: string;
    dd_EmailParamCode?: string;
    dd_RetryCount?: number;
    dd_signedby?: string;
    dd_signedon?: string;
    dd_signedtm?: string;
    [key: string]: unknown;
}

interface EmailResult {
    success: boolean;
    messageId?: string;
    recipient: string;
    cc?: string;
    error?: string;
}

export class EmailService {
    private static instance: EmailService;
    private globalTransporter: nodemailer.Transporter | null = null;
    private dbManager: DatabaseManager;
    private pdfSigningService: PdfSigningService;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
        this.pdfSigningService = PdfSigningService.getInstance();
    }

    public static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }

    /**
 * Get SMTP details from database (legacy - uses first record)
 */
    async getSmtpDetails(): Promise<SMTPConfig> {
        try {
            const pool = await this.dbManager.getConnection();

            // Check if table exists first
            const tableCheck = await pool.request().query(`
        SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'tbl_EMailParameters'
      `);

            if (tableCheck.recordset[0].count === 0) {
                throw new Error('SMTP configuration table (tbl_EMailParameters) does not exist. Please create the table first.');
            }

            const result = await pool.request().query(
                "SELECT * FROM tbl_EMailParameters WHERE IsActive = 'Y' OR IsActive IS NULL"
            );

            if (result.recordset.length === 0) {
                throw new Error('No SMTP configuration found in tbl_EMailParameters. Please add SMTP settings to the table.');
            }

            // Always use the first record
            const smtpConfig = result.recordset[0];
            console.log(`📧 Using SMTP configuration: ${smtpConfig.SMTPMailId} via ${smtpConfig.SMTPServer}:${smtpConfig.SMTPPort}`);

            return smtpConfig;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error fetching SMTP details:', errorMessage);
            throw error;
        }
    }

    /**
     * Get SMTP details by ParamCode (Dynamic SMTP Selection)
     */
    async getSmtpDetailsByParamCode(paramCode: string): Promise<SMTPConfig> {
        try {
            const pool = await this.dbManager.getConnection();

            console.log(`🔍 Looking for SMTP configuration with ParamCode: ${paramCode}`);

            const result = await pool.request()
                .input('paramCode', sql.NVarChar, paramCode)
                .query(`
          SELECT * FROM tbl_EMailParameters 
          WHERE ParamCode = @paramCode 
          AND (IsActive = 'Y' OR IsActive IS NULL)
        `);

            if (result.recordset.length === 0) {
                // Fallback to default (first active record)
                const fallbackResult = await pool.request().query(`
          SELECT * FROM tbl_EMailParameters 
          WHERE IsActive = 'Y' OR IsActive IS NULL 
          ORDER BY ParamCode ASC
        `);

                if (fallbackResult.recordset.length === 0) {
                    throw new Error('No active SMTP configuration found in tbl_EMailParameters');
                }

                const fallbackConfig = fallbackResult.recordset[0];
                console.log(`📧 Using fallback SMTP configuration: ${fallbackConfig.SMTPMailId} via ${fallbackConfig.SMTPServer}:${fallbackConfig.SMTPPort}`);
                return fallbackConfig;
            }

            const smtpConfig = result.recordset[0];
            console.log(`✅ Found SMTP configuration for ${paramCode}: ${smtpConfig.SMTPMailId} via ${smtpConfig.SMTPServer}:${smtpConfig.SMTPPort}`);

            return smtpConfig;

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error fetching SMTP details for ParamCode ${paramCode}:`, errorMessage);
            throw error;
        }
    }

    /**
     * Create email transporter using SMTP details with connection pooling
     */
    createEmailTransporter(smtpConfig: SMTPConfig): nodemailer.Transporter {
        if (this.globalTransporter) {
            return this.globalTransporter;
        }

        this.globalTransporter = nodemailer.createTransport({
            host: smtpConfig.SMTPServer,
            port: smtpConfig.SMTPPort,
            secure: smtpConfig.SMTPPort === 465, // true for 465, false for other ports like 587
            auth: {
                user: smtpConfig.SMTPAccountName,
                pass: smtpConfig.SMTPPassword
            },
            pool: true, // Enable connection pooling
            maxConnections: 20, // Maximum number of connections
            maxMessages: 100, // Maximum messages per connection
            rateDelta: 1000, // Rate limiting: time window in ms
            rateLimit: 50, // Rate limiting: max emails per time window
            tls: {
                rejectUnauthorized: false
            }
        });

        return this.globalTransporter;
    }

    /**
     * Close global transporter
     */
    closeEmailTransporter(): void {
        if (this.globalTransporter) {
            this.globalTransporter.close();
            this.globalTransporter = null;
            console.log('📪 Email transporter closed');
        }
    }

    /**
     * Log successful email send to file
     */
    private logEmailSuccess(emailRecord: EmailRecord, result: { messageId: string; recipient: string; cc?: string }): void {
        try {
            const logPath = 'logs/email-success.log';
            const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

            const logEntry = `SUCCESS - ${timestamp}\n` +
                `Email ID: ${emailRecord.dd_srno}\n` +
                `Message ID: ${result.messageId}\n` +
                `Recipient: ${result.recipient}\n` +
                `CC: ${result.cc || 'None'}\n` +
                `Subject: ${emailRecord.dd_subject}\n` +
                `Attachment: ${emailRecord.dd_filename || 'None'}\n` +
                `Status: Email sent successfully\n` +
                `Response: Email delivered to mail server\n` +
                `Database Status: Updated to 'Y' (Sent)\n` +
                `${'='.repeat(80)}\n\n`;

            // Create logs directory if it doesn't exist
            const logDir = path.dirname(logPath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            fs.appendFileSync(logPath, logEntry);
            console.log(`📝 Email success logged to: ${logPath}`);
        } catch (logError) {
            console.warn('⚠️ Could not write to success log:', logError);
        }
    }

    /**
     * Store final document (encrypted PDF) in database
     */
    private async storeFinalDocument(emailId: number, finalDocumentBuffer: Buffer): Promise<void> {
        try {
            const pool = await this.dbManager.getConnection();

            await pool.request()
                .input('emailId', sql.Int, emailId)
                .input('finalDocument', sql.VarBinary, finalDocumentBuffer)
                .query('UPDATE Digital_Emaildetails SET dd_Finaldocument = @finalDocument WHERE dd_srno = @emailId');

            console.log(`📋 Final document stored for email ${emailId}`);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error storing final document for email ${emailId}:`, errorMessage);
            throw error;
        }
    }

    /**
     * Process PDF with signing and encryption
     */
    async processPdfWithSigningAndEncryption(pdfBuffer: Buffer, emailRecord: EmailRecord): Promise<Buffer> {
        try {
            console.log(`🔒 Starting PDF processing (sign + encrypt)...`);
            console.log(`🔍 DEBUG: Input PDF size: ${pdfBuffer.length}`);

            // Check if signing is available
            if (!this.pdfSigningService.isSigningAvailable()) {
                console.log('⚠️ PDF signing not available, returning original PDF');
                return pdfBuffer;
            }

            // Extract signing and encryption information from email record
            const processingConfig = {
                signedBy: emailRecord.dd_signedby || 'Unknown',
                signedOn: emailRecord.dd_signedon || new Date().toISOString().split('T')[0],
                signedTm: emailRecord.dd_signedtm || new Date().toTimeString().split(' ')[0],
                pdfPassword: emailRecord.dd_Encpassword || ''
            };

            console.log(`📝 Processing PDF with:`, processingConfig);
            console.log(`🔍 DEBUG: Password for encryption: "${processingConfig.pdfPassword}"`);
            console.log(`🔍 DEBUG: Password length: ${processingConfig.pdfPassword.length}`);

            // Process the PDF (sign + encrypt)
            const processedPdfBuffer = await this.pdfSigningService.processPdfWithSigningAndEncryption(pdfBuffer, processingConfig);

            console.log(`✅ PDF processed successfully (signed + encrypted)`);
            console.log(`🔍 DEBUG: Output PDF size: ${processedPdfBuffer.length}`);
            console.log(`🔍 DEBUG: Size changed: ${processedPdfBuffer.length !== pdfBuffer.length}`);
            return processedPdfBuffer;

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error processing PDF:', errorMessage);
            // Return original PDF if processing fails
            return pdfBuffer;
        }
    }


    /**
     * Send email with PDF attachment
     */
    async sendEmailWithAttachment(emailRecord: EmailRecord, smtpConfig?: SMTPConfig): Promise<EmailResult> {
        try {
            // Get SMTP config with dynamic selection support
            if (!smtpConfig) {
                // Use dynamic SMTP selection if emailRecord has dd_EmailParamCode
                if (emailRecord.dd_EmailParamCode && emailRecord.dd_EmailParamCode.trim() !== '') {
                    console.log(`🔧 Using dynamic SMTP config: ${emailRecord.dd_EmailParamCode}`);
                    smtpConfig = await this.getSmtpDetailsByParamCode(emailRecord.dd_EmailParamCode.trim());
                } else {
                    console.log('🔧 Using default SMTP config');
                    smtpConfig = await this.getSmtpDetails();
                }
            }

            const transporter = this.createEmailTransporter(smtpConfig);

            // Prepare email attachments
            const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];

            // Add PDF attachment if document exists
            if (emailRecord.dd_document && emailRecord.dd_filename) {
                let pdfContent: Buffer | null = null;

                // Check if PDF needs processing (signing or encryption)
                const needsSigning = emailRecord.dd_signedby || emailRecord.dd_signedon || emailRecord.dd_signedtm;
                const needsEncryption = emailRecord.dd_Encpassword && emailRecord.dd_Encpassword.trim() !== '';

                console.log(`🔍 DEBUG: PDF Processing Check:`);
                console.log(`🔍 DEBUG: - dd_Encpassword: "${emailRecord.dd_Encpassword}"`);
                console.log(`🔍 DEBUG: - needsEncryption: ${needsEncryption}`);
                console.log(`🔍 DEBUG: - needsSigning: ${needsSigning}`);
                console.log(`🔍 DEBUG: - Has dd_Finaldocument: ${!!emailRecord.dd_Finaldocument}`);

                // Always process if encryption is needed, even if dd_Finaldocument exists
                if (needsEncryption) {
                    console.log(`🔐 Password encryption required - processing PDF even if dd_Finaldocument exists`);
                    pdfContent = emailRecord.dd_document; // Use original document for encryption
                } else if (emailRecord.dd_Finaldocument && !needsEncryption) {
                    console.log(`📎 Using existing final document for "${emailRecord.dd_filename}" (no encryption needed)`);
                    pdfContent = emailRecord.dd_Finaldocument;
                } else {
                    // Start with original document
                    pdfContent = emailRecord.dd_document;
                }

                console.log(`🔍 DEBUG: - PDF size before processing: ${pdfContent.length}`);

                if (needsSigning || needsEncryption) {
                    console.log(`🔒 Processing PDF "${emailRecord.dd_filename}" (signing: ${needsSigning}, encryption: ${needsEncryption})`);
                    pdfContent = await this.processPdfWithSigningAndEncryption(pdfContent, emailRecord);
                    console.log(`🔍 DEBUG: - PDF size after processing: ${pdfContent.length}`);

                    // Store the final processed document (signed and/or encrypted)
                    if (emailRecord.dd_srno) {
                        try {
                            await this.storeFinalDocument(emailRecord.dd_srno, pdfContent);
                            console.log(`✅ Final document stored in database for email ${emailRecord.dd_srno}`);
                        } catch (storeError) {
                            console.warn(`⚠️ Warning: Could not store final document: ${storeError}`);
                        }
                    }
                } else {
                    console.log(`📎 Attaching PDF "${emailRecord.dd_filename}" without signing or encryption`);
                }

                attachments.push({
                    filename: emailRecord.dd_filename,
                    content: pdfContent,
                    contentType: 'application/pdf'
                });
            }

            // Prepare recipient list
            const toEmails = emailRecord.dd_toEmailid ? emailRecord.dd_toEmailid.trim() : '';
            const ccEmails = emailRecord.dd_ccEmailid ? emailRecord.dd_ccEmailid.trim() : '';

            if (!toEmails) {
                throw new Error('No recipient email address found');
            }

            // Compose email
            const mailOptions: nodemailer.SendMailOptions = {
                from: `"${smtpConfig.ApplicationName}" <${smtpConfig.SMTPMailId}>`,
                to: toEmails,
                subject: emailRecord.dd_subject || 'No Subject',
                html: emailRecord.dd_bodyText || 'No content',
                attachments: attachments
            };

            // Add CC if exists
            if (ccEmails) {
                mailOptions.cc = ccEmails;
            }

            console.log(`📧 Sending email to: ${toEmails}${ccEmails ? ` (CC: ${ccEmails})` : ''}`);
            console.log(`📎 Attachments: ${attachments.length > 0 ? emailRecord.dd_filename : 'None'}`);

            const info = await transporter.sendMail(mailOptions);

            console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);

            const result = {
                success: true,
                messageId: info.messageId,
                recipient: toEmails,
                cc: ccEmails
            };

            // Log successful email send
            this.logEmailSuccess(emailRecord, result);

            return result;

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error sending email:`, errorMessage);
            return {
                success: false,
                recipient: emailRecord.dd_toEmailid,
                cc: emailRecord.dd_ccEmailid,
                error: errorMessage
            };
        }
    }

    /**
     * Send test email
     */
    async sendTestEmail(toEmail: string = 'test@example.com'): Promise<EmailResult> {
        try {
            console.log('\n🔄 Fetching SMTP configuration...');
            const smtpConfig = await this.getSmtpDetails();

            console.log('🔄 Creating email transporter...');
            const transporter = this.createEmailTransporter(smtpConfig);

            // Verify transporter configuration
            console.log('🔄 Verifying SMTP connection...');
            await transporter.verify();
            console.log('✅ SMTP connection verified successfully!');

            // Compose test email
            const mailOptions = {
                from: `"${smtpConfig.ApplicationName}" <${smtpConfig.SMTPMailId}>`,
                to: toEmail,
                subject: `Test Email from ${smtpConfig.ApplicationName} - ${new Date().toLocaleString()}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">🧪 SMTP Test Email</h2>
            <p>This is a test email sent from <strong>${smtpConfig.ApplicationName}</strong> application.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📧 SMTP Configuration Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Server:</strong> ${smtpConfig.SMTPServer}:${smtpConfig.SMTPPort}</li>
                <li><strong>From:</strong> ${smtpConfig.SMTPMailId}</li>
                <li><strong>SSL/TLS:</strong> ${smtpConfig.SMTPSSLFlag === 'Y' ? 'Enabled' : 'Disabled'}</li>
                <li><strong>Application:</strong> ${smtpConfig.ApplicationName}</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Sent at: ${new Date().toLocaleString()}<br>
              From: Next.js Email Service
            </p>
          </div>
        `
            };

            console.log('🔄 Sending test email...');
            const info = await transporter.sendMail(mailOptions);

            console.log('✅ Test email sent successfully!');
            console.log(`📬 Message ID: ${info.messageId}`);

            return {
                success: true,
                messageId: info.messageId,
                recipient: toEmail
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error sending test email:', errorMessage);
            return {
                success: false,
                recipient: toEmail,
                error: errorMessage
            };
        }
    }

    /**
 * Get pending emails from database (implement based on your table structure)
 */
    async getPendingEmails(): Promise<EmailRecord[]> {
        try {
            const pool = await this.dbManager.getConnection();

            // Check if table exists first
            const tableCheck = await pool.request().query(`
        SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'Digital_Emaildetails'
      `);

            if (tableCheck.recordset[0].count === 0) {
                console.log('📭 Email queue table (Digital_Emaildetails) does not exist. No emails to process.');
                return [];
            }

            // Using the correct table name Digital_Emaildetails with correct column names
            const result = await pool.request().query(`
        SELECT TOP 10 * FROM Digital_Emaildetails 
        WHERE dd_SendFlag = 'N'
        ORDER BY dd_srno ASC
      `);

            console.log(`📨 Found ${result.recordset.length} pending emails`);
            return result.recordset;

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error fetching pending emails:', errorMessage);
            // Return empty array instead of throwing to allow service to continue
            return [];
        }
    }

    /**
     * Update email status in database
     */
    async updateEmailStatus(emailId: number, status: string, messageId?: string, error?: string): Promise<void> {
        try {
            console.log(`🔄 updateEmailStatus called with:`, { emailId, status, messageId, error });
            const pool = await this.dbManager.getConnection();

            // Build query based on status with proper defaults for non-nullable columns
            let query = `UPDATE Digital_Emaildetails SET dd_SendFlag = @status`;
            const request = pool.request()
                .input('emailId', sql.Int, emailId)
                .input('status', sql.NVarChar, status);

            if (status === 'Y') {
                // Success: Update dd_SentDate and clear dd_BounceReason
                query += ', dd_SentDate = @processedDate, dd_BounceReason = @bounceReason';
                request.input('processedDate', sql.DateTime, new Date());
                request.input('bounceReason', sql.NVarChar, ''); // Empty string for success
                console.log(`📧 Marking email ${emailId} as sent successfully`);
            } else if (status === 'N' && error && error.trim() !== '') {
                // Failure: Update dd_BounceReason and dd_LastRetryDate
                query += ', dd_BounceReason = @bounceReason, dd_LastRetryDate = @retryDate';
                request.input('bounceReason', sql.NVarChar, error);
                request.input('retryDate', sql.DateTime, new Date());
                console.log(`❌ Marking email ${emailId} as failed with reason: ${error}`);
            } else if (status === 'E') {
                // Permanent failure: Update dd_BounceReason only
                query += ', dd_BounceReason = @bounceReason';
                request.input('bounceReason', sql.NVarChar, error || 'Permanent failure after max retries');
                console.log(`🚫 Marking email ${emailId} as permanently failed`);
            }

            query += ' WHERE dd_srno = @emailId';

            console.log(`🔄 Executing update query: ${query}`);
            console.log(`🔄 Parameters:`, { emailId, status, processedDate: status === 'Y' ? new Date() : 'N/A', bounceReason: status === 'Y' ? '' : error });

            const result = await request.query(query);
            console.log(`🔄 Update query result:`, result);

            console.log(`📝 Updated email ${emailId} status to: ${status}`);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error updating email status:', errorMessage);
            console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        }
    }

    /**
     * Process email queue
     */
    async processEmailQueue(): Promise<{ processed: number; success: number; failed: number }> {
        const stats = { processed: 0, success: 0, failed: 0 };

        try {
            const pendingEmails = await this.getPendingEmails();

            if (pendingEmails.length === 0) {
                console.log('📭 No pending emails to process');
                return stats;
            }

            console.log(`🔄 Processing ${pendingEmails.length} pending emails...`);

            for (const emailRecord of pendingEmails) {
                stats.processed++;
                console.log(`\n🔍 Processing email record:`, {
                    dd_srno: emailRecord.dd_srno,
                    dd_toEmailid: emailRecord.dd_toEmailid,
                    dd_subject: emailRecord.dd_subject,
                    dd_SendFlag: emailRecord.dd_SendFlag
                });

                try {
                    console.log(`📧 Calling sendEmailWithAttachment for email ${emailRecord.dd_srno}...`);
                    const result = await this.sendEmailWithAttachment(emailRecord);
                    console.log(`📧 sendEmailWithAttachment result:`, result);

                    if (result.success) {
                        stats.success++;
                        console.log(`✅ Email ${emailRecord.dd_srno} sent successfully, updating status...`);
                        if (emailRecord.dd_srno) {
                            console.log(`🔄 Calling updateEmailStatus for email ${emailRecord.dd_srno} with status 'Y'...`);
                            await this.updateEmailStatus(emailRecord.dd_srno, 'Y', result.messageId);
                            console.log(`✅ updateEmailStatus completed for email ${emailRecord.dd_srno}`);
                        } else {
                            console.log(`⚠️ No dd_srno found for email record, skipping status update`);
                        }
                    } else {
                        stats.failed++;
                        console.log(`❌ Email ${emailRecord.dd_srno} failed, updating status...`);
                        if (emailRecord.dd_srno) {
                            console.log(`🔄 Calling updateEmailStatus for email ${emailRecord.dd_srno} with status 'N'...`);
                            await this.updateEmailStatus(emailRecord.dd_srno, 'N', undefined, result.error);
                            console.log(`✅ updateEmailStatus completed for email ${emailRecord.dd_srno}`);
                        } else {
                            console.log(`⚠️ No dd_srno found for email record, skipping status update`);
                        }
                    }

                } catch (error: unknown) {
                    stats.failed++;
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.log(`❌ Exception in email processing for ${emailRecord.dd_srno}:`, errorMessage);
                    if (emailRecord.dd_srno) {
                        console.log(`🔄 Calling updateEmailStatus for email ${emailRecord.dd_srno} with status 'N' due to exception...`);
                        await this.updateEmailStatus(emailRecord.dd_srno, 'N', undefined, errorMessage);
                        console.log(`✅ updateEmailStatus completed for email ${emailRecord.dd_srno}`);
                    } else {
                        console.log(`⚠️ No dd_srno found for email record, skipping status update`);
                    }
                }

                // Small delay between emails to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`📊 Email processing complete: ${stats.success} sent, ${stats.failed} failed`);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error processing email queue:', errorMessage);
        }

        return stats;
    }
}
