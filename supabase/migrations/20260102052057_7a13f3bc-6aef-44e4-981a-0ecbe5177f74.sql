-- Fix RLS policies for receipts table - make them PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all receipts" ON public.receipts;
DROP POLICY IF EXISTS "Staff can view own pharmacy receipts" ON public.receipts;
DROP POLICY IF EXISTS "Staff can insert receipts" ON public.receipts;

CREATE POLICY "Admins can view all receipts" 
ON public.receipts 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view own pharmacy receipts" 
ON public.receipts 
FOR SELECT 
TO authenticated
USING (pharmacy_id = get_user_pharmacy_id(auth.uid()));

CREATE POLICY "Staff can insert receipts" 
ON public.receipts 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) AND pharmacy_id = get_user_pharmacy_id(auth.uid()));

-- Fix RLS policies for receipt_items table - make them PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all receipt items" ON public.receipt_items;
DROP POLICY IF EXISTS "Staff can view own pharmacy receipt items" ON public.receipt_items;
DROP POLICY IF EXISTS "Staff can insert receipt items" ON public.receipt_items;

CREATE POLICY "Admins can view all receipt items" 
ON public.receipt_items 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view own pharmacy receipt items" 
ON public.receipt_items 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM receipts r
  WHERE r.id = receipt_items.receipt_id 
  AND r.pharmacy_id = get_user_pharmacy_id(auth.uid())
));

CREATE POLICY "Staff can insert receipt items" 
ON public.receipt_items 
FOR INSERT 
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM receipts r
  WHERE r.id = receipt_items.receipt_id 
  AND r.pharmacy_id = get_user_pharmacy_id(auth.uid()) 
  AND has_role(auth.uid(), 'staff'::app_role)
));

-- Fix RLS policies for medicines table - make them PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all medicines" ON public.medicines;
DROP POLICY IF EXISTS "Staff can view own pharmacy medicines" ON public.medicines;
DROP POLICY IF EXISTS "Staff can insert medicines" ON public.medicines;
DROP POLICY IF EXISTS "Staff can update own pharmacy medicines" ON public.medicines;
DROP POLICY IF EXISTS "Staff can delete own pharmacy medicines" ON public.medicines;

CREATE POLICY "Admins can view all medicines" 
ON public.medicines 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view own pharmacy medicines" 
ON public.medicines 
FOR SELECT 
TO authenticated
USING (pharmacy_id = get_user_pharmacy_id(auth.uid()));

CREATE POLICY "Staff can insert medicines" 
ON public.medicines 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) AND pharmacy_id = get_user_pharmacy_id(auth.uid()));

CREATE POLICY "Staff can update own pharmacy medicines" 
ON public.medicines 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) AND pharmacy_id = get_user_pharmacy_id(auth.uid()));

CREATE POLICY "Staff can delete own pharmacy medicines" 
ON public.medicines 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) AND pharmacy_id = get_user_pharmacy_id(auth.uid()));