
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { AuctionCard } from "@/components/AuctionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Filter, SortDesc, Users, TrendingUp, Clock, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  isWatched?: boolean;
}

interface Stats {
  liveAuctions: number;
  activeBidders: number;
  totalBids: string;
  successRate: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [featuredAuctions, setFeaturedAuctions] = useState<Auction[]>([]);
  const [stats, setStats] = useState<Stats>({
    liveAuctions: 0,
    activeBidders: 0,
    totalBids: '$0',
    successRate: '99.8%'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Fetch live auctions count
      const { data: liveAuctionsData, error: liveError } = await supabase
        .from('auctions')
        .select('id')
        .eq('status', 'live');

      // Fetch active bidders count (unique bidders in live auctions)
      const { data: biddersData, error: biddersError } = await supabase
        .from('bids')
        .select('bidder_id, auction_id')
        .in('auction_id', liveAuctionsData?.map(a => a.id) || []);

      // Get unique bidders
      const uniqueBidders = new Set(biddersData?.map(b => b.bidder_id) || []);

      // Fetch all bids to calculate total value
      const { data: allBidsData, error: bidsError } = await supabase
        .from('bids')
        .select('amount');

      const totalBidsValue = allBidsData?.reduce((sum, bid) => sum + Number(bid.amount), 0) || 0;

      // Fetch featured auctions
      const { data: auctionsData, error: auctionsError } = await supabase
        .from('auctions')
        .select(`
          *,
          category:categories!category_id (
            name,
            slug
          )
        `)
        .in('status', ['live', 'upcoming'])
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(4);

      if (liveError || biddersError || bidsError || auctionsError) {
        console.error('Error fetching data:', { liveError, biddersError, bidsError, auctionsError });
        return;
      }

      // Transform auction data
      const transformedAuctions = (auctionsData || []).map((auction: any) => ({
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
      }));

      setFeaturedAuctions(transformedAuctions);
      setStats({
        liveAuctions: liveAuctionsData?.length || 0,
        activeBidders: uniqueBidders.size,
        totalBids: formatCurrency(totalBidsValue),
        successRate: '99.8%' // This would require more complex calculation
      });

    } catch (error) {
      console.error('Error fetching real-time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeDisplay = (auction: any) => {
    const now = new Date();
    const startTime = new Date(auction.start_time);
    const endTime = new Date(auction.end_time);

    if (auction.status === 'upcoming') {
      const diff = startTime.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) return `Starts in ${days}d ${hours}h`;
      return `Starts in ${hours}h`;
    }

    if (auction.status === 'live') {
      const diff = endTime.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) return `Ends in ${hours}h ${minutes}m`;
      return `Ends in ${minutes}m`;
    }

    return 'Auction ended';
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        <HeroSection />
        
        {/* Quick Stats */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">
                    {loading ? '...' : stats.liveAuctions}
                  </div>
                  <div className="text-sm text-muted-foreground">Live Auctions</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">
                    {loading ? '...' : stats.activeBidders}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Bidders</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">
                    {loading ? '...' : stats.totalBids}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Bids</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">{stats.successRate}</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Featured Auctions */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">Featured Auctions</h2>
                <p className="text-muted-foreground">Don't miss these exceptional items</p>
              </div>
              <div className="flex items-center space-x-4 mt-4 md:mt-0">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                <Button variant="outline" size="sm">
                  <SortDesc className="h-4 w-4 mr-2" />
                  Sort
                </Button>
              </div>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="h-48 bg-muted animate-pulse" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4 mb-4" />
                      <div className="h-6 bg-muted rounded animate-pulse w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : featuredAuctions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredAuctions.map((auction) => (
                  <AuctionCard key={auction.id} {...auction} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏺</div>
                <h3 className="text-xl font-semibold mb-2">No featured auctions available</h3>
                <p className="text-muted-foreground">
                  Featured auctions will appear here once they are added to the system
                </p>
              </div>
            )}

            <div className="text-center mt-12">
              <Button variant="auction" size="lg" onClick={() => navigate('/auctions')}>
                View All Auctions
              </Button>
            </div>
          </div>
        </section>

        {/* Categories Preview */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Popular Categories</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {[
                { name: "Watches", icon: "⌚", count: 45 },
                { name: "Art", icon: "🎨", count: 89 },
                { name: "Jewelry", icon: "💎", count: 67 },
                { name: "Books", icon: "📚", count: 34 },
                { name: "Antiques", icon: "🏺", count: 23 },
                { name: "Electronics", icon: "💻", count: 56 }
              ].map((category) => (
                <Card key={category.name} className="hover:shadow-elegant transition-shadow cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                      {category.icon}
                    </div>
                    <h3 className="font-semibold mb-1">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.count} items</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">How EmberBid Works</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Experience the excitement of live auctions from anywhere. Our platform makes it easy to bid, 
              sell, and discover unique items.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Register & Browse</h3>
                <p className="text-muted-foreground">
                  Create your account and explore thousands of unique items across various categories.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Place Your Bids</h3>
                <p className="text-muted-foreground">
                  Join live bidding rooms and compete with other collectors in real-time auctions.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Win & Collect</h3>
                <p className="text-muted-foreground">
                  Secure payment processing and reliable shipping ensure you receive your treasures safely.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">EmberBid</span>
              </div>
              <p className="text-muted-foreground">
                The premier destination for collectors and enthusiasts to discover, bid, and sell unique treasures.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Auctions</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Live Auctions</li>
                <li>Upcoming Events</li>
                <li>Past Results</li>
                <li>Categories</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Selling</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>List Your Item</li>
                <li>Seller Guide</li>
                <li>Commission Rates</li>
                <li>Authentication</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Terms of Service</li>
                <li>Privacy Policy</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 EmberBid. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
