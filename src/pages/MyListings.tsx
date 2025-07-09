
import { useState, useEffect } from 'react';
import { Header } from "@/components/Header";
import { AuctionCard } from "@/components/AuctionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from "react-router-dom";
import { Package, Plus } from "lucide-react";

interface Auction {
  id: string;
  title: string;
  description: string;
  currentBid: number;
  startingBid: number;
  imageUrl: string;
  status: 'draft' | 'upcoming' | 'live' | 'ended' | 'cancelled';
  endTime: string;
  bidCount: number;
  watchers: number;
  isWatched?: boolean;
}

const MyListings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    live: 0,
    upcoming: 0,
    ended: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchMyAuctions();
  }, [user, navigate]);

  const fetchMyAuctions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get user's profile first
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        console.error('No profile found for user');
        setLoading(false);
        return;
      }

      // Fetch user's auctions
      const { data: auctionsData, error } = await supabase
        .from('auctions')
        .select(`
          *,
          category:categories!category_id (
            name,
            slug
          )
        `)
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching auctions:', error);
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

      setAuctions(transformedAuctions);

      // Calculate stats
      const statsData = {
        total: transformedAuctions.length,
        live: transformedAuctions.filter(a => a.status === 'live').length,
        upcoming: transformedAuctions.filter(a => a.status === 'upcoming').length,
        ended: transformedAuctions.filter(a => a.status === 'ended').length
      };
      setStats(statsData);

    } catch (error) {
      console.error('Error fetching my auctions:', error);
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'live': return 'default';
      case 'upcoming': return 'secondary';
      case 'ended': return 'outline';
      case 'draft': return 'secondary';
      default: return 'outline';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Listings</h1>
            <p className="text-muted-foreground">Manage your auction items</p>
          </div>
          <Button 
            variant="auction" 
            onClick={() => navigate('/sell')}
            className="mt-4 md:mt-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            List New Item
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-auction-live">{stats.live}</div>
              <div className="text-sm text-muted-foreground">Live Auctions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
              <div className="text-sm text-muted-foreground">Upcoming</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{stats.ended}</div>
              <div className="text-sm text-muted-foreground">Ended</div>
            </CardContent>
          </Card>
        </div>

        {/* Auctions Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
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
        ) : auctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {auctions.map((auction) => (
              <div key={auction.id} className="relative">
                <Badge 
                  variant={getStatusBadgeVariant(auction.status)}
                  className="absolute top-2 left-2 z-10 capitalize"
                >
                  {auction.status}
                </Badge>
                <AuctionCard {...auction} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No items listed yet</h3>
            <p className="text-muted-foreground mb-6">
              Start by listing your first item for auction
            </p>
            <Button 
              variant="auction" 
              onClick={() => navigate('/sell')}
            >
              <Plus className="h-4 w-4 mr-2" />
              List Your First Item
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyListings;
