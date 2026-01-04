-- Create table for debts that admin owes to others
CREATE TABLE public.admin_debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_name TEXT NOT NULL,
  phone_number TEXT,
  amount NUMERIC NOT NULL,
  expected_payment_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_debts ENABLE ROW LEVEL SECURITY;

-- Only admins can manage this table
CREATE POLICY "Admins can view all admin debts"
ON public.admin_debts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert admin debts"
ON public.admin_debts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update admin debts"
ON public.admin_debts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete admin debts"
ON public.admin_debts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_admin_debts_updated_at
BEFORE UPDATE ON public.admin_debts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();