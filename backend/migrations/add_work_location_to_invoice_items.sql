-- Add work_location column to invoice_items so PDFs preserve employee location at invoice creation time

ALTER TABLE invoice_items
ADD COLUMN work_location VARCHAR(20) DEFAULT NULL COMMENT 'Employee work location snapshot for the invoice item';

