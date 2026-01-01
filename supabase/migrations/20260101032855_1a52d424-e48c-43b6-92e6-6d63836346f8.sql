-- Add buying_price and profit to medicines table
ALTER TABLE public.medicines 
ADD COLUMN buying_price numeric DEFAULT 0,
ADD COLUMN profit numeric GENERATED ALWAYS AS (price - COALESCE(buying_price, 0)) STORED;

-- Create receipts table
CREATE TABLE public.receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  customer_name text NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'evc_plus', 'debt', 'bank_card')),
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create receipt_items table
CREATE TABLE public.receipt_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id uuid NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  buying_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL,
  profit numeric GENERATED ALWAYS AS (selling_price - buying_price) STORED,
  total numeric GENERATED ALWAYS AS (quantity * selling_price) STORED
);

-- Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for receipts
CREATE POLICY "Admins can view all receipts"
ON public.receipts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view own pharmacy receipts"
ON public.receipts FOR SELECT
USING (pharmacy_id = get_user_pharmacy_id(auth.uid()));

CREATE POLICY "Staff can insert receipts"
ON public.receipts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) AND pharmacy_id = get_user_pharmacy_id(auth.uid()));

-- RLS Policies for receipt_items
CREATE POLICY "Admins can view all receipt items"
ON public.receipt_items FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view own pharmacy receipt items"
ON public.receipt_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.receipts r 
  WHERE r.id = receipt_id 
  AND r.pharmacy_id = get_user_pharmacy_id(auth.uid())
));

CREATE POLICY "Staff can insert receipt items"
ON public.receipt_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.receipts r 
  WHERE r.id = receipt_id 
  AND r.pharmacy_id = get_user_pharmacy_id(auth.uid())
  AND has_role(auth.uid(), 'staff'::app_role)
));

-- Add delete policy for medicines (staff only for own pharmacy)
CREATE POLICY "Staff can delete own pharmacy medicines"
ON public.medicines FOR DELETE
USING (has_role(auth.uid(), 'staff'::app_role) AND pharmacy_id = get_user_pharmacy_id(auth.uid()));