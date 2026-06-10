import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Chips } from 'primereact/chips';
import { sendInvoiceEmail } from '../../services/api';
import './SendInvoiceEmailDialog.css';

const SendInvoiceEmailDialog = ({ visible, invoice, onClose, onEmailSent }) => {
  const [recipients, setRecipients] = useState([]);
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (invoice) {
      // Set default subject when invoice is loaded
      const defaultSubject = `Invoice ${invoice.invoice_number} - ${invoice.project_name || 'Project'}`;
      setSubject(defaultSubject);
    }
  }, [invoice]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!recipients || recipients.length === 0) {
      newErrors.recipients = 'At least one recipient email is required';
    } else {
      const invalidEmails = recipients.filter(email => !validateEmail(email));
      if (invalidEmails.length > 0) {
        newErrors.recipients = `Invalid email addresses: ${invalidEmails.join(', ')}`;
      }
    }

    if (!subject || subject.trim() === '') {
      newErrors.subject = 'Subject is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSend = async () => {
    if (!validateForm()) {
      return;
    }

    setSending(true);
    try {
      const emailData = {
        recipients: recipients,
        subject: subject.trim(),
      };

      if (customMessage && customMessage.trim() !== '') {
        emailData.customMessage = customMessage.trim();
      }

      const response = await sendInvoiceEmail(invoice.id, emailData);

      toast.success(`Invoice email sent successfully to ${recipients.length} recipient(s)`);

      // Reset form
      setRecipients([]);
      setSubject('');
      setCustomMessage('');
      setErrors({});

      if (onEmailSent) {
        onEmailSent(response.data);
      }

      onClose();
    } catch (error) {
      console.error('Error sending invoice email:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send invoice email';
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setRecipients([]);
      setSubject('');
      setCustomMessage('');
      setErrors({});
      onClose();
    }
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const footer = (
    <div className="dialog-footer">
      <Button
        label="Cancel"
        icon="pi pi-times"
        onClick={handleClose}
        className="p-button-text"
        disabled={sending}
      />
      <Button
        label="Send Email"
        icon="pi pi-send"
        onClick={handleSend}
        loading={sending}
        disabled
      />
    </div>
  );

  if (!invoice) {
    return null;
  }

  return (
    <Dialog
      header={
        <div className="email-dialog-header">
          <i className="pi pi-envelope" style={{ marginRight: '0.5rem' }}></i>
          Send Invoice Email
        </div>
      }
      visible={visible}
      onHide={handleClose}
      style={{ width: '600px' }}
      footer={footer}
      modal
      closable={!sending}
    >
      <div className="send-email-form">
        {/* Invoice Summary */}
        <div className="invoice-summary">
          <h4>Invoice Details</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">Invoice Number:</span>
              <span className="value">{invoice.invoice_number}</span>
            </div>
            <div className="summary-item">
              <span className="label">Project:</span>
              <span className="value">{invoice.project_name || 'N/A'}</span>
            </div>
            <div className="summary-item">
              <span className="label">Team:</span>
              <span className="value">{invoice.team_name || 'All Teams'}</span>
            </div>
            <div className="summary-item">
              <span className="label">Period:</span>
              <span className="value">
                {getMonthName(invoice.invoice_month)} {invoice.invoice_year}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Total Amount:</span>
              <span className="value">{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Status:</span>
              <span className="value">{invoice.status}</span>
            </div>
          </div>
        </div>

        {/* Email Form */}
        <div className="email-form-fields">
          <div className="p-field">
            <label htmlFor="recipients" className="required-field">
              Recipients
            </label>
            <Chips
              id="recipients"
              value={recipients}
              onChange={(e) => {
                setRecipients(e.value);
                if (errors.recipients) {
                  setErrors({ ...errors, recipients: null });
                }
              }}
              placeholder="Enter email addresses and press Enter"
              separator=","
              className={errors.recipients ? 'p-invalid' : ''}
              disabled={sending}
            />
            <small className="help-text">
              Enter email addresses and press Enter or use comma to separate
            </small>
            {errors.recipients && (
              <small className="p-error">{errors.recipients}</small>
            )}
          </div>

          <div className="p-field">
            <label htmlFor="subject" className="required-field">
              Subject
            </label>
            <InputText
              id="subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (errors.subject) {
                  setErrors({ ...errors, subject: null });
                }
              }}
              placeholder="Enter email subject"
              className={errors.subject ? 'p-invalid' : ''}
              disabled={sending}
            />
            {errors.subject && (
              <small className="p-error">{errors.subject}</small>
            )}
          </div>

          <div className="p-field">
            <label htmlFor="customMessage">
              Custom Message (Optional)
            </label>
            <InputTextarea
              id="customMessage"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              placeholder="Add a custom message to include in the email body..."
              disabled={sending}
            />
            <small className="help-text">
              This message will be included in the email along with the invoice details
            </small>
          </div>
        </div>

        {/* Info Box */}
        <div className="info-box">
          <i className="pi pi-info-circle"></i>
          <div className="info-content">
            <strong>Note:</strong> The invoice will be automatically attached as a PDF file.
            An email with invoice details and the PDF attachment will be sent to all recipients.
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default SendInvoiceEmailDialog;
