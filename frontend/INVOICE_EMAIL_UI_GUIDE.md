# Invoice Email UI Guide

This guide explains how to use the invoice email functionality in the BSL Team Pulse application.

## Features

The invoice email feature allows you to:
- Send invoice PDFs via email to multiple recipients
- Customize email subject and message
- Send emails directly from the invoices list or from the invoice detail view
- Validate email addresses before sending
- Track email sending status

## How to Send Invoice Emails

### Method 1: From the Invoices List

1. Navigate to the **Invoices** page
2. Find the invoice you want to send
3. Click the **envelope icon** (green button) in the actions column
4. The "Send Invoice Email" dialog will open

### Method 2: From Invoice Details

1. Navigate to the **Invoices** page
2. Click the **eye icon** to view invoice details
3. In the invoice details modal, click the **Send Email** button at the bottom
4. The "Send Invoice Email" dialog will open

## Using the Send Email Dialog

The Send Email Dialog includes:

### Invoice Summary
- Displays key invoice information:
  - Invoice Number
  - Project Name
  - Team Name
  - Period (Month/Year)
  - Total Amount
  - Status

### Email Form Fields

#### 1. Recipients (Required)
- Enter one or more email addresses
- Press **Enter** or use **comma** to add multiple recipients
- Email addresses are validated automatically
- Invalid emails will show an error message
- Click the **X** on any email chip to remove it

**Example:**
```
john@example.com, jane@example.com, manager@company.com
```

#### 2. Subject (Required)
- Default subject is auto-generated: `Invoice {invoice_number} - {project_name}`
- You can customize the subject as needed
- Subject cannot be empty

#### 3. Custom Message (Optional)
- Add any additional message you want to include in the email body
- This will be displayed along with the invoice details in the email
- Can be left empty

### Sending the Email

1. Fill in the required fields (Recipients and Subject)
2. Optionally add a custom message
3. Click the **Send Email** button
4. A loading indicator will show while sending
5. You'll see a success message when the email is sent
6. The dialog will close automatically on success

### Error Handling

The dialog validates:
- **Empty recipients**: At least one recipient is required
- **Invalid email format**: Email addresses must be valid (format: user@domain.com)
- **Empty subject**: Subject field cannot be empty

Error messages will appear below the respective fields in red text.

## Email Content

The email sent to recipients includes:

1. **Professional HTML Template**:
   - Header with invoice number
   - Invoice details section with:
     - Invoice Number
     - Project Name
     - Team Name
     - Period
     - Total Amount
     - Status
   - Your custom message (if provided)
   - Professional signature

2. **PDF Attachment**:
   - The invoice is automatically attached as a PDF file
   - Filename format: `Invoice_{invoice_number}.pdf`
   - Contains complete invoice details with all line items

## Permissions

To send invoice emails, you need:
- **invoices.view** permission

The Send Email button will only appear if you have the required permission.

## Backend Configuration

Before using the email feature, ensure the backend is properly configured:

### 1. Email Service Setup

Create or update your `.env` file in the backend directory with:

```env
# Email Configuration (Gmail/Google Workspace)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### 2. Gmail App Password Setup

For Gmail accounts:
1. Enable 2-Factor Authentication on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Copy the 16-character password
5. Use this password in `SMTP_PASSWORD`

**Important**: Never use your regular Gmail password. Always use an App Password.

### 3. Restart Backend

After updating `.env`, restart your backend server:

```bash
cd backend
npm start
```

## Troubleshooting

### Email Not Sending

1. **Check backend logs** for error messages
2. **Verify SMTP credentials** in `.env` file
3. **Ensure 2FA is enabled** on Gmail account
4. **Check App Password** is correct (16 characters, no spaces)

### Invalid Email Error

- Ensure email addresses are in correct format: `user@domain.com`
- Remove any spaces or special characters
- Each email should be separated by comma or Enter key

### Permission Denied

- Contact your administrator to grant you `invoices.view` permission
- Log out and log back in after permissions are updated

### Email Sent but Not Received

1. **Check spam/junk folder** of recipient emails
2. **Verify recipient email addresses** are correct
3. **Check Gmail sending limits**:
   - Free Gmail: ~500 emails/day
   - Google Workspace: ~2000 emails/day

## Tips

1. **Test with your own email first** before sending to clients
2. **Use descriptive subjects** to help recipients identify the invoice
3. **Add context in custom message** if the invoice requires explanation
4. **Double-check recipient emails** before sending
5. **Keep custom messages professional** and concise

## Features Coming Soon

Potential future enhancements:
- Email templates with customization
- Bulk email sending for multiple invoices
- Email scheduling
- CC/BCC support
- Email delivery status tracking
- Email history log

## Support

For issues or questions:
- Check the backend `EMAIL_SETUP.md` for detailed technical documentation
- Contact your system administrator
- Review backend logs for error details
