-- Create function to generate expiry notifications
CREATE OR REPLACE FUNCTION public.check_expiring_medicines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  med RECORD;
  days_until_expiry INTEGER;
BEGIN
  -- Loop through medicines expiring within 20 days
  FOR med IN 
    SELECT m.id, m.name, m.pharmacy_id, m.expiry_date
    FROM medicines m
    WHERE m.expiry_date IS NOT NULL 
      AND m.expiry_date <= CURRENT_DATE + INTERVAL '20 days'
      AND m.expiry_date >= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.medicine_id = m.id 
          AND n.type = 'expiry'
          AND n.is_confirmed = false
      )
  LOOP
    days_until_expiry := (med.expiry_date - CURRENT_DATE);
    
    INSERT INTO notifications (pharmacy_id, medicine_id, type, message, days_remaining)
    VALUES (
      med.pharmacy_id,
      med.id,
      'expiry',
      med.name || ' is expiring in ' || days_until_expiry || ' days',
      days_until_expiry
    );
  END LOOP;
END;
$$;

-- Create function to generate low stock notifications
CREATE OR REPLACE FUNCTION public.check_low_stock_medicines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  med RECORD;
BEGIN
  -- Loop through medicines with low stock
  FOR med IN 
    SELECT m.id, m.name, m.pharmacy_id, m.stock_quantity, m.low_stock_threshold
    FROM medicines m
    WHERE m.stock_quantity <= m.low_stock_threshold
      AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.medicine_id = m.id 
          AND n.type = 'low_stock'
          AND n.is_confirmed = false
      )
  LOOP
    INSERT INTO notifications (pharmacy_id, medicine_id, type, message, days_remaining)
    VALUES (
      med.pharmacy_id,
      med.id,
      'low_stock',
      med.name || ' is low on stock (' || med.stock_quantity || ' remaining)',
      NULL
    );
  END LOOP;
END;
$$;

-- Create trigger function that runs after medicine insert/update
CREATE OR REPLACE FUNCTION public.trigger_check_medicine_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_until_expiry INTEGER;
BEGIN
  -- Check for expiry notification
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= CURRENT_DATE + INTERVAL '20 days' AND NEW.expiry_date >= CURRENT_DATE THEN
    days_until_expiry := (NEW.expiry_date - CURRENT_DATE);
    
    -- Only insert if no pending notification exists
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE medicine_id = NEW.id 
        AND type = 'expiry'
        AND is_confirmed = false
    ) THEN
      INSERT INTO notifications (pharmacy_id, medicine_id, type, message, days_remaining)
      VALUES (
        NEW.pharmacy_id,
        NEW.id,
        'expiry',
        NEW.name || ' is expiring in ' || days_until_expiry || ' days',
        days_until_expiry
      );
    END IF;
  END IF;
  
  -- Check for low stock notification
  IF NEW.stock_quantity <= NEW.low_stock_threshold THEN
    -- Only insert if no pending notification exists
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE medicine_id = NEW.id 
        AND type = 'low_stock'
        AND is_confirmed = false
    ) THEN
      INSERT INTO notifications (pharmacy_id, medicine_id, type, message, days_remaining)
      VALUES (
        NEW.pharmacy_id,
        NEW.id,
        'low_stock',
        NEW.name || ' is low on stock (' || NEW.stock_quantity || ' remaining)',
        NULL
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on medicines table
DROP TRIGGER IF EXISTS check_medicine_notifications ON medicines;
CREATE TRIGGER check_medicine_notifications
  AFTER INSERT OR UPDATE ON medicines
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_medicine_notifications();

-- Create function to update days_remaining daily
CREATE OR REPLACE FUNCTION public.update_notification_countdown()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update days remaining for expiry notifications
  UPDATE notifications n
  SET days_remaining = (
    SELECT (m.expiry_date - CURRENT_DATE)::integer
    FROM medicines m
    WHERE m.id = n.medicine_id
  )
  WHERE n.type = 'expiry'
    AND n.is_confirmed = false
    AND n.medicine_id IS NOT NULL;
    
  -- Auto-confirm notifications where expiry date has passed
  UPDATE notifications n
  SET is_confirmed = true,
      confirmed_at = now()
  WHERE n.type = 'expiry'
    AND n.is_confirmed = false
    AND n.days_remaining <= 0;
END;
$$;

-- Create storage bucket for medicine images
INSERT INTO storage.buckets (id, name, public)
VALUES ('medicine-images', 'medicine-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for medicine images
CREATE POLICY "Anyone can view medicine images"
ON storage.objects FOR SELECT
USING (bucket_id = 'medicine-images');

CREATE POLICY "Staff can upload medicine images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'medicine-images' 
  AND has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Staff can update medicine images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'medicine-images' 
  AND has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Staff can delete medicine images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'medicine-images' 
  AND has_role(auth.uid(), 'staff'::app_role)
);