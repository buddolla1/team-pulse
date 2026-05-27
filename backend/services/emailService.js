const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    };

    // Only initialize if credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
    } else {
      console.warn('Email service not initialized: SMTP credentials not configured');
    }
  }

  async verifyConnection() {
    if (!this.transporter) {
      throw new Error('Email service not initialized. Please configure SMTP credentials.');
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection verification failed:', error);
      throw new Error('Failed to connect to email server');
    }
  }

  async sendInvoiceEmail(recipients, subject, invoicePdfBuffer, invoiceNumber, additionalInfo = {}) {
    if (!this.transporter) {
      throw new Error('Email service not initialized. Please configure SMTP credentials.');
    }

    // Ensure recipients is an array
    const recipientList = Array.isArray(recipients) ? recipients : [recipients];

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipientList.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      throw new Error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
    }

    // Build email body
    const emailBody = this.buildInvoiceEmailBody(invoiceNumber, additionalInfo);

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: recipientList.join(', '),
      subject: subject || `Invoice ${invoiceNumber}`,
      html: emailBody,
      attachments: [
        {
          filename: `Invoice_${invoiceNumber}.pdf`,
          content: invoicePdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        recipients: recipientList,
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  buildInvoiceEmailBody(invoiceNumber, additionalInfo) {
    const {
      projectName = 'N/A',
      teamName = 'N/A',
      invoiceMonth = 'N/A',
      invoiceYear = 'N/A',
      totalAmount = 'N/A',
      status = 'N/A',
    } = additionalInfo;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 5px 5px;
          }
          .invoice-details {
            background-color: white;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #4CAF50;
          }
          .invoice-details p {
            margin: 8px 0;
          }
          .footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .label {
            font-weight: bold;
            color: #555;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Invoice - ${invoiceNumber}</h2>
          </div>
          <div class="content">
            <p>Dear Team,</p>
            <p>Please find attached the invoice for your review.</p>

            <div class="invoice-details">
              <p><span class="label">Invoice Number:</span> ${invoiceNumber}</p>
              <p><span class="label">Project:</span> ${projectName}</p>
              <p><span class="label">Team:</span> ${teamName}</p>
              <p><span class="label">Period:</span> ${invoiceMonth}/${invoiceYear}</p>
              <p><span class="label">Total Amount:</span> $${totalAmount}</p>
              <p><span class="label">Status:</span> ${status}</p>
            </div>

            <p>The invoice is attached as a PDF file. Please review it and contact us if you have any questions.</p>

            <p>Best regards,<br>BSL Team Pulse</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
