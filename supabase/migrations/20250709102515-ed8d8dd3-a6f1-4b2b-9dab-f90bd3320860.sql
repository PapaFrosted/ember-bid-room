
-- Reset all bids for the specific auction
DELETE FROM public.bids 
WHERE auction_id = '7e83915a-8cf1-440a-bf44-396c598b6416';

-- Reset the auction's current bid and total bids count
UPDATE public.auctions 
SET 
    current_bid = 0,
    total_bids = 0,
    updated_at = now()
WHERE id = '7e83915a-8cf1-440a-bf44-396c598b6416';
