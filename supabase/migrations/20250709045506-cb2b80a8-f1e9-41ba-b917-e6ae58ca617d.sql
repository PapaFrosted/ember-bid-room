-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE auction_status AS ENUM ('draft', 'upcoming', 'live', 'ended', 'cancelled');
CREATE TYPE bid_status AS ENUM ('active', 'outbid', 'winning', 'won', 'lost');
CREATE TYPE notification_type AS ENUM ('auction_starting', 'outbid', 'auction_ending', 'auction_won', 'auction_lost');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,
    address JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    seller_rating DECIMAL(3,2) DEFAULT 0.00,
    buyer_rating DECIMAL(3,2) DEFAULT 0.00,
    total_sales INTEGER DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    slug TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES public.categories(id),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auctions table
CREATE TABLE public.auctions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    images JSONB DEFAULT '[]'::jsonb,
    starting_bid DECIMAL(12,2) NOT NULL CHECK (starting_bid > 0),
    current_bid DECIMAL(12,2) DEFAULT 0,
    reserve_price DECIMAL(12,2),
    buy_now_price DECIMAL(12,2),
    bid_increment DECIMAL(12,2) DEFAULT 1.00,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status auction_status DEFAULT 'draft',
    total_bids INTEGER DEFAULT 0,
    total_watchers INTEGER DEFAULT 0,
    winner_id UUID REFERENCES public.profiles(id),
    is_featured BOOLEAN DEFAULT FALSE,
    is_anonymous_seller BOOLEAN DEFAULT FALSE,
    shipping_cost DECIMAL(10,2),
    condition TEXT,
    dimensions TEXT,
    weight TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT valid_times CHECK (end_time > start_time),
    CONSTRAINT valid_reserve CHECK (reserve_price IS NULL OR reserve_price >= starting_bid),
    CONSTRAINT valid_buy_now CHECK (buy_now_price IS NULL OR buy_now_price > starting_bid)
);

-- Create bids table
CREATE TABLE public.bids (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    status bid_status DEFAULT 'active',
    is_auto_bid BOOLEAN DEFAULT FALSE,
    max_bid DECIMAL(12,2), -- For automatic bidding
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(auction_id, bidder_id, amount)
);

-- Create auction watchers table (for marking as interested)
CREATE TABLE public.auction_watchers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(auction_id, user_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    stripe_payment_intent_id TEXT,
    status TEXT DEFAULT 'pending',
    shipping_address JSONB,
    tracking_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for categories
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (is_active = true);

-- Create RLS policies for auctions
CREATE POLICY "Anyone can view live and upcoming auctions" ON public.auctions FOR SELECT USING (status IN ('live', 'upcoming', 'ended'));
CREATE POLICY "Sellers can view their own auctions" ON public.auctions FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = seller_id));
CREATE POLICY "Sellers can create auctions" ON public.auctions FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = seller_id));
CREATE POLICY "Sellers can update their own auctions" ON public.auctions FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = seller_id));

-- Create RLS policies for bids
CREATE POLICY "Users can view bids on auctions they're involved in" ON public.bids FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = bidder_id) OR
    auth.uid() IN (SELECT p.user_id FROM public.profiles p JOIN public.auctions a ON p.id = a.seller_id WHERE a.id = auction_id)
);
CREATE POLICY "Authenticated users can create bids" ON public.bids FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = bidder_id)
);

-- Create RLS policies for auction watchers
CREATE POLICY "Users can view their own watched auctions" ON public.auction_watchers FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = user_id)
);
CREATE POLICY "Users can watch auctions" ON public.auction_watchers FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = user_id)
);
CREATE POLICY "Users can unwatch auctions" ON public.auction_watchers FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = user_id)
);

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = user_id)
);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = user_id)
);

-- Create RLS policies for payments
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = buyer_id) OR
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = seller_id)
);

-- Create indexes for better performance
CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_auctions_start_time ON public.auctions(start_time);
CREATE INDEX idx_auctions_end_time ON public.auctions(end_time);
CREATE INDEX idx_auctions_category ON public.auctions(category_id);
CREATE INDEX idx_auctions_seller ON public.auctions(seller_id);
CREATE INDEX idx_bids_auction ON public.bids(auction_id);
CREATE INDEX idx_bids_bidder ON public.bids(bidder_id);
CREATE INDEX idx_bids_amount ON public.bids(auction_id, amount DESC);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON public.auctions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update auction current bid and bid count
CREATE OR REPLACE FUNCTION public.update_auction_on_bid()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.auctions 
    SET 
        current_bid = NEW.amount,
        total_bids = total_bids + 1,
        updated_at = now()
    WHERE id = NEW.auction_id;
    
    -- Update previous bid statuses
    UPDATE public.bids 
    SET status = 'outbid' 
    WHERE auction_id = NEW.auction_id 
    AND id != NEW.id 
    AND status = 'active';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new bids
CREATE TRIGGER on_new_bid
    AFTER INSERT ON public.bids
    FOR EACH ROW EXECUTE FUNCTION public.update_auction_on_bid();

-- Function to update watchers count
CREATE OR REPLACE FUNCTION public.update_watchers_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.auctions 
        SET total_watchers = total_watchers + 1
        WHERE id = NEW.auction_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.auctions 
        SET total_watchers = total_watchers - 1
        WHERE id = OLD.auction_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for watchers count
CREATE TRIGGER on_auction_watched
    AFTER INSERT ON public.auction_watchers
    FOR EACH ROW EXECUTE FUNCTION public.update_watchers_count();

CREATE TRIGGER on_auction_unwatched
    AFTER DELETE ON public.auction_watchers
    FOR EACH ROW EXECUTE FUNCTION public.update_watchers_count();

-- Insert sample categories
INSERT INTO public.categories (name, description, slug, image_url) VALUES
('Watches & Timepieces', 'Luxury watches, vintage timepieces, and collectible clocks', 'watches', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop'),
('Art & Collectibles', 'Paintings, sculptures, prints, and fine art pieces', 'art', 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=300&h=200&fit=crop'),
('Jewelry & Gemstones', 'Fine jewelry, precious stones, and vintage accessories', 'jewelry', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=200&fit=crop'),
('Antiques & Vintage', 'Historical artifacts, vintage items, and antique furniture', 'antiques', 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=300&h=200&fit=crop'),
('Books & Manuscripts', 'Rare books, first editions, and historical documents', 'books', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=200&fit=crop'),
('Electronics & Technology', 'Vintage electronics, collectible tech, and modern gadgets', 'electronics', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&h=200&fit=crop');