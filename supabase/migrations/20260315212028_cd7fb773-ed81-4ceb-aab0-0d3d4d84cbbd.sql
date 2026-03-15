
-- Fix check_expiring_medicines to use 'expiring' instead of 'expiry'
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
          AND n.type = 'expiring'
          AND n.is_confirmed = false
      )
  LOOP
    days_until_expiry := (med.expiry_date - CURRENT_DATE);
    
    INSERT INTO notifications (pharmacy_id, medicine_id, type, message, days_remaining)
    VALUES (
      med.pharmacy_id,
      med.id,
      'expiring',
      med.name || ' is expiring in ' || days_until_expiry || ' days',
      days_until_expiry
    );
  END LOOP;
END;
$function$;

-- Fix trigger function to use 'expiring' instead of 'expiry'
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
        AND type = 'expiring'
        AND is_confirmed = false
    ) THEN
      INSERT INTO notifications (pharmacy_id, medicine_id, type, message, days_remaining)
      VALUES (
        NEW.pharmacy_id,
        NEW.id,
        'expiring',
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

-- Fix update_notification_countdown to use 'expiring'
CREATE OR REPLACE FUNCTION public.update_notification_countdown()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE notifications n
  SET days_remaining = (
    SELECT (m.expiry_date - CURRENT_DATE)::integer
    FROM medicines m
    WHERE m.id = n.medicine_id
  )
  WHERE n.type = 'expiring'
    AND n.is_confirmed = false
    AND n.medicine_id IS NOT NULL;
    
  UPDATE notifications n
  SET is_confirmed = true,
      confirmed_at = now()
  WHERE n.type = 'expiring'
    AND n.is_confirmed = false
    AND n.days_remaining <= 0;
END;
$function$;
