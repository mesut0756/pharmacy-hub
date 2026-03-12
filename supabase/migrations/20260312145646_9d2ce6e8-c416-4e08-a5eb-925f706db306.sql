
-- Update check_expiring_medicines to use 30 days instead of 20
CREATE OR REPLACE FUNCTION public.check_expiring_medicines()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  med RECORD;
  days_until_expiry INTEGER;
BEGIN
  FOR med IN 
    SELECT m.id, m.name, m.pharmacy_id, m.expiry_date
    FROM medicines m
    WHERE m.expiry_date IS NOT NULL 
      AND m.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
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
$function$;

-- Update trigger function to use 30 days
CREATE OR REPLACE FUNCTION public.trigger_check_medicine_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  days_until_expiry INTEGER;
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND NEW.expiry_date >= CURRENT_DATE THEN
    days_until_expiry := (NEW.expiry_date - CURRENT_DATE);
    
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
  
  IF NEW.stock_quantity <= NEW.low_stock_threshold THEN
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
$function$;
