
-- Add debt_paid_at column to receipts to track when customer debts are settled
ALTER TABLE public.receipts ADD COLUMN debt_paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Allow staff to update receipts in their pharmacy (specifically for marking debts as paid)
CREATE POLICY "Staff can update own pharmacy receipts"
ON public.receipts
FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role) AND pharmacy_id = get_user_pharmacy_id(auth.uid()));
