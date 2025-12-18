-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create pharmacies table
CREATE TABLE public.pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create pharmacy_staff table (links staff to pharmacies)
CREATE TABLE public.pharmacy_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create medicines table
CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  expiry_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('expiring', 'low_stock')),
  message TEXT NOT NULL,
  days_remaining INTEGER,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's pharmacy_id
CREATE OR REPLACE FUNCTION public.get_user_pharmacy_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pharmacy_id FROM public.pharmacy_staff
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profile policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Pharmacy policies
CREATE POLICY "Staff can view own pharmacy" ON public.pharmacies
  FOR SELECT USING (
    id = public.get_user_pharmacy_id(auth.uid())
  );

CREATE POLICY "Admins can view all pharmacies" ON public.pharmacies
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Pharmacy staff policies
CREATE POLICY "Staff can view own assignment" ON public.pharmacy_staff
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all staff" ON public.pharmacy_staff
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Medicine policies
CREATE POLICY "Staff can view own pharmacy medicines" ON public.medicines
  FOR SELECT USING (
    pharmacy_id = public.get_user_pharmacy_id(auth.uid())
  );

CREATE POLICY "Staff can insert medicines" ON public.medicines
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'staff') AND
    pharmacy_id = public.get_user_pharmacy_id(auth.uid())
  );

CREATE POLICY "Staff can update own pharmacy medicines" ON public.medicines
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'staff') AND
    pharmacy_id = public.get_user_pharmacy_id(auth.uid())
  );

CREATE POLICY "Admins can view all medicines" ON public.medicines
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Sales policies
CREATE POLICY "Staff can view own pharmacy sales" ON public.sales
  FOR SELECT USING (
    pharmacy_id = public.get_user_pharmacy_id(auth.uid())
  );

CREATE POLICY "Staff can insert sales" ON public.sales
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'staff') AND
    pharmacy_id = public.get_user_pharmacy_id(auth.uid())
  );

CREATE POLICY "Admins can view all sales" ON public.sales
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Notification policies
CREATE POLICY "Staff can view own pharmacy notifications" ON public.notifications
  FOR SELECT USING (
    pharmacy_id = public.get_user_pharmacy_id(auth.uid())
  );

CREATE POLICY "Staff can update own pharmacy notifications" ON public.notifications
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'staff') AND
    pharmacy_id = public.get_user_pharmacy_id(auth.uid())
  );

CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pharmacies_updated_at
  BEFORE UPDATE ON public.pharmacies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medicines_updated_at
  BEFORE UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_medicines_pharmacy_id ON public.medicines(pharmacy_id);
CREATE INDEX idx_medicines_expiry_date ON public.medicines(expiry_date);
CREATE INDEX idx_sales_pharmacy_id ON public.sales(pharmacy_id);
CREATE INDEX idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX idx_notifications_pharmacy_id ON public.notifications(pharmacy_id);
CREATE INDEX idx_pharmacy_staff_user_id ON public.pharmacy_staff(user_id);
CREATE INDEX idx_pharmacy_staff_pharmacy_id ON public.pharmacy_staff(pharmacy_id);