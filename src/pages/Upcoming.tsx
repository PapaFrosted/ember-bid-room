import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AuctionCard } from '@/components/AuctionCard';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock } from 'lucide-react';

interface Auction {
  id: string;
  title: string;
  description: string;
  currentBid: number;
  startingBid: number;
  imageUrl: string;
  status: 'live' | 'upcoming' | 'ended';
  endTime: string;
  bidCount: number;
  watchers: number;
  category: {
    name: string;
    slug: string;
  };
}

const Upcoming = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingAuctions();
  }, []);

  const fetchUpcomingAuctions = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('auctions')
      .select(`
        *,
        category:categories!category_id (
          name,
          slug
        )
      `)
      .eq('status', 'upcoming')
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching upcoming auctions:', error);
      setLoading(false);
      return;
    }

    // Transform data to match component props
    const transformedAuctions = (data || []).map((auction: any) => ({
      id: auction.id,
      title: auction.title,
      description: auction.description,
      currentBid: auction.current_bid || 0,
      startingBid: auction.starting_bid,
      imageUrl: auction.images?.[0] || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
      status: auction.status,
      endTime: getTimeDisplay(auction),
      bidCount: auction.total_bids || 0,
      watchers: auction.total_watchers || 0,
      category: auction.category
    }));

    setAuctions(transformedAuctions);
    setLoading(false);
  };

  const getTimeDisplay = (auction: any) => {
    const now = new Date();
    const startTime = new Date(auction.start_time);
    
    const diff = startTime.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `Starts in ${days}d ${hours}h`;
    if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
    return `Starts in ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upcoming Auctions</h1>
          <p className="text-muted-foreground">
            Get ready for these exciting auctions starting soon
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">{auctions.length}</div>
              <div className="text-sm text-muted-foreground">Upcoming Auctions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">
                {auctions.filter(a => a.endTime.includes('today')).length || 'Next'}
              </div>
              <div className="text-sm text-muted-foreground">Starting Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">👁️</div>
              <div className="text-2xl font-bold text-primary">
                {auctions.reduce((sum, auction) => sum + auction.watchers, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Watchers</div>
            </CardContent>
          </Card>
        </div>

        {/* Auctions Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-48 bg-muted animate-pulse" />
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-6 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : auctions.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <p className="text-muted-foreground">
                {auctions.length} upcoming auction{auctions.length !== 1 ? 's' : ''} found
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {auctions.map((auction) => (
                <AuctionCard 
                  key={auction.id} 
                  {...auction}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">No upcoming auctions</h3>
            <p className="text-muted-foreground mb-4">
              Check back soon for new auction listings
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Upcoming;