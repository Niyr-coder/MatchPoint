-- Migration 015: Recreate missing tables from 007/008 and add RLS policies

-- ============================================================
-- PART 1: Recreate tables from 007 (chat) — recorded applied but never created
-- ============================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'broadcast')),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS conv_participants_user_idx ON public.conversation_participants(user_id);

-- ============================================================
-- PART 2: Recreate tables from 008 (shop) — same issue
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'equipment' CHECK (category IN ('equipment', 'membership', 'class', 'other')),
  stock INTEGER DEFAULT -1,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  product_name TEXT NOT NULL
);

-- ============================================================
-- PART 3: Enable RLS on all tables
-- ============================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 4: Restore original policies from 007 (chat)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can view their conversations') THEN
    CREATE POLICY "Users can view their conversations" ON public.conversations
      FOR SELECT USING (
        id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can view messages in their conversations') THEN
    CREATE POLICY "Users can view messages in their conversations" ON public.messages
      FOR SELECT USING (
        conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can send messages to their conversations') THEN
    CREATE POLICY "Users can send messages to their conversations" ON public.messages
      FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================
-- PART 5: Restore original policies from 008 (shop)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Anyone can view active products') THEN
    CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can view their own orders') THEN
    CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can create orders') THEN
    CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can view their order items') THEN
    CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT USING (
      order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    );
  END IF;
END $$;

-- ============================================================
-- PART 6: New RLS policies
-- ============================================================

-- Conversations: club staff can create
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Club staff can create conversations') THEN
    CREATE POLICY "Club staff can create conversations" ON public.conversations
      FOR INSERT WITH CHECK (
        club_id IN (
          SELECT club_id FROM public.club_members
          WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'manager', 'employee')
        )
      );
  END IF;
END $$;

-- Conversation participants: SELECT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_participants' AND policyname = 'Users can view participants in their conversations') THEN
    CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
      FOR SELECT USING (
        conversation_id IN (
          SELECT cp2.conversation_id FROM public.conversation_participants cp2 WHERE cp2.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Conversation participants: staff can add
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_participants' AND policyname = 'Club staff can add participants') THEN
    CREATE POLICY "Club staff can add participants" ON public.conversation_participants
      FOR INSERT WITH CHECK (
        conversation_id IN (
          SELECT c.id FROM public.conversations c
          JOIN public.club_members cm ON cm.club_id = c.club_id
          WHERE cm.user_id = auth.uid() AND cm.is_active = true AND cm.role IN ('owner', 'manager', 'employee')
        )
      );
  END IF;
END $$;

-- Products: club staff can manage
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Club staff can manage products') THEN
    CREATE POLICY "Club staff can manage products" ON public.products
      FOR ALL
      USING (
        club_id IN (SELECT club_id FROM public.club_members WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'manager', 'employee'))
      )
      WITH CHECK (
        club_id IN (SELECT club_id FROM public.club_members WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'manager', 'employee'))
      );
  END IF;
END $$;

-- Order items: users can insert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can add items to their orders') THEN
    CREATE POLICY "Users can add items to their orders" ON public.order_items
      FOR INSERT WITH CHECK (
        order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================
-- PART 7: Fix handle_new_user trigger (NULL instead of '')
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Note: match_results write has no user-level policy intentionally.
-- Only service role writes match results to prevent self-reporting.
