
-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff can view own pharmacy customers" ON public.customers
  FOR SELECT TO authenticated
  USING (pharmacy_id = get_user_pharmacy_id(auth.uid()));

CREATE POLICY "Admins can view all customers" ON public.customers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can insert customers" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) AND pharmacy_id = get_user_pharmacy_id(auth.uid()));

CREATE POLICY "Staff can update own pharmacy customers" ON public.customers
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) AND pharmacy_id = get_user_pharmacy_id(auth.uid()));

CREATE POLICY "Staff can delete own pharmacy customers" ON public.customers
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) AND pharmacy_id = get_user_pharmacy_id(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
