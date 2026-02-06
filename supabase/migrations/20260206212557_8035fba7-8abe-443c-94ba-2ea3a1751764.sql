
-- Add debt_paid_by to track which staff member marked the debt as paid
ALTER TABLE public.receipts ADD COLUMN debt_paid_by UUID DEFAULT NULL;
