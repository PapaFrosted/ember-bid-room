-- Make all auctions live by updating their dates and status
UPDATE public.auctions 
SET 
  start_time = now() - interval '1 hour',
  end_time = now() + interval '24 hours',
  status = 'live'
WHERE status != 'cancelled';