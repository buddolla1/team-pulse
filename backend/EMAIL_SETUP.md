# Invoice Email Functionality

This document describes how to configure and use the invoice email feature.

## Configuration

### 1. Gmail/Google Workspace Setup

For Gmail accounts, you need to create an App Password:

1. Enable 2-Factor Authentication on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Copy the 16-character password

### 2. Environment Variables

Add the following to your `.env` file (see `.env.example` for reference):

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
```

**Important Notes:**
- Use your App Password, not your regular Gmail password
- `SMTP_SECURE=false` for port 587 (TLS/STARTTLS)
- `SMTP_SECURE=true` for port 465 (SSL)

### 3. Restart Backend Server

After updating `.env`, restart your backend server:

```bash
cd backend
npm start
```

## API Endpoint

### Send Invoice Email

**Endpoint:** `POST /api/invoices/:id/send-email`

**Authentication:** Required (JWT token)

**Permission:** `invoices.view`

**Request Body:**

```json
{
  "recipients": ["email1@example.com", "email2@example.com"],
  "subject": "Invoice INV-123-202501-1234",
  "customMessage": "Optional custom message"
}
```

**Parameters:**
- `recipients` (required): Array of email addresses
- `subject` (optional): Custom email subject. Default: "Invoice {invoice_number} - {project_name}"
- `customMessage` (optional): Additional message to include in email body

**Success Response:**

```json
{
  "success": true,
  "message": "Invoice email sent successfully to 2 recipient(s)",
  "data": {
    "messageId": "<unique-message-id>",
    "recipients": ["email1@example.com", "email2@example.com"],
    "invoiceNumber": "INV-123-202501-1234"
  }
}
```

**Error Responses:**

400 Bad Request:
```json
{
  "success": false,
  "message": "At least one recipient email address is required"
}
```

404 Not Found:
```json
{
  "success": false,
  "message": "Invoice not found"
}
```

500 Internal Server Error:
```json
{
  "success": false,
  "message": "Error sending invoice email",
  "error": "Detailed error message"
}
```

## Frontend Integration

### Using the API Service

```javascript
import { sendInvoiceEmail } from '../services/api';

const handleSendEmail = async (invoiceId) => {
  try {
    const emailData = {
      recipients: ['client@example.com', 'manager@example.com'],
      subject: 'Invoice for January 2025',
      customMessage: 'Please review the attached invoice.'
    };

    const response = await sendInvoiceEmail(invoiceId, emailData);
    console.log('Email sent:', response.data);
    // Show success message to user
  } catch (error) {
    console.error('Error sending email:', error);
    // Show error message to user
  }
};
```

### Example UI Component

```jsx
import React, { useState } from 'react';
import { sendInvoiceEmail } from '../services/api';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';

const SendInvoiceEmailDialog = ({ visible, invoice, onHide }) => {
  const [recipients, setRecipients] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      const emailList = recipients.split(',').map(email => email.trim());
      await sendInvoiceEmail(invoice.id, {
        recipients: emailList,
        subject: `Invoice ${invoice.invoice_number}`
      });
      // Show success toast
      onHide();
    } catch (error) {
      // Show error toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog header="Send Invoice Email" visible={visible} onHide={onHide}>
      <div className="p-fluid">
        <div className="p-field">
          <label>Recipients (comma-separated)</label>
          <InputText
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="email1@example.com, email2@example.com"
          />
        </div>
        <Button
          label="Send Email"
          icon="pi pi-send"
          onClick={handleSend}
          loading={loading}
        />
      </div>
    </Dialog>
  );
};

export default SendInvoiceEmailDialog;
```

## Email Template

The email includes:
- Professional HTML layout with company branding
- Invoice details (number, project, team, period, status, amount)
- Invoice PDF attachment
- Automated footer

## Audit Logging

All email activities are logged in the `audit_logs` table with:
- Action: `EMAIL_SENT`
- Table: `invoices`
- Record ID: Invoice ID
- Changes: JSON with recipients, subject, and message ID
- User ID and IP address

## Troubleshooting

### Email Not Sending

1. **Check SMTP credentials:**
   - Verify app password is correct
   - Ensure 2FA is enabled on Gmail account

2. **Check server logs:**
   ```bash
   # Backend console will show errors
   Error sending invoice email: ...
   ```

3. **Test connection:**
   - The email service includes connection verification
   - Errors will be logged on server startup

### Invalid Email Addresses

The service validates email format before sending. Invalid emails will result in:
```json
{
  "success": false,
  "message": "Invalid email addresses: invalid-email"
}
```

### Rate Limits

Gmail has sending limits:
- Free Gmail: ~500 emails/day
- Google Workspace: ~2000 emails/day

Consider using SendGrid or similar services for high-volume sending.

## Security Considerations

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use App Passwords** - Don't use your main Gmail password
3. **Validate recipients** - The service validates email format
4. **Permission checks** - Only users with `invoices.view` permission can send emails
5. **Audit logging** - All email activities are tracked

## Future Enhancements

Potential improvements:
- Email templates with customization options
- Bulk email sending for multiple invoices
- Email scheduling
- Email delivery status tracking
- Support for CC/BCC recipients
- Attachment of multiple files
