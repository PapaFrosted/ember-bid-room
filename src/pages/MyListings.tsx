
import { useState, useEffect } from 'react';
import { Header } from "@/components/Header";
import { AuctionCard } from "@/components/AuctionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, StopCircle, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Auction {
  id: string;
  title: string;
  description: string;
  currentBid: number;
  startingBid: number;
  imageUrl: string;
  status: 'draft' | 'upcoming' | 'live' | 'ended' | 'cancelled';
  endTime: string;
  startTime: string; // Add startTime
  bidCount: number;
  watchers: number;
  isWatched?: boolean;
}

const MyListings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [endingAuction, setEndingAuction] = useState<string | null>(null);
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
        startTime: auction.start_time, // Include startTime
        bidCount: auction.total_bids || 0,
        watchers: auction.total_watchers || 0,
      }));

      setAuctions(transformedAuctions);

      // Calculate stats using dynamic status
      const now = new Date();
      const statsData = {
        total: transformedAuctions.length,
        live: transformedAuctions.filter(a => {
          if (a.status === 'draft' || a.status === 'cancelled') return false;
          const start = new Date(a.startTime);
          const end = new Date(a.endTime);
          return now >= start && now <= end;
        }).length,
        upcoming: transformedAuctions.filter(a => {
          if (a.status === 'draft' || a.status === 'cancelled') return false;
          const start = new Date(a.startTime);
          return now < start;
        }).length,
        ended: transformedAuctions.filter(a => {
          if (a.status === 'draft' || a.status === 'cancelled') return a.status === 'ended';
          const end = new Date(a.endTime);
          return now > end;
        }).length
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

    if (auction.status === 'upcoming' || now < startTime) {
      const diff = startTime.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) return `Starts in ${days}d ${hours}h`;
      return `Starts in ${hours}h`;
    }

    if (now >= startTime && now <= endTime) {
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

  const handleEndAuction = async (auctionId: string) => {
    setEndingAuction(auctionId);
    
    try {
      const { error } = await supabase
        .from('auctions')
        .update({ status: 'ended' })
        .eq('id', auctionId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to end auction",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Auction Ended",
        description: "Your auction has been ended successfully",
      });

      // Refresh the auctions list
      fetchMyAuctions();
    } catch (error) {
      console.error('Error ending auction:', error);
      toast({
        title: "Error",
        description: "Failed to end auction",
        variant: "destructive",
      });
    } finally {
      setEndingAuction(null);
    }
  };

  const isAuctionLive = (auction: Auction) => {
    const now = new Date();
    const start = new Date(auction.startTime);
    const end = new Date(auction.endTime);
    return auction.status !== 'ended' && auction.status !== 'cancelled' && now >= start && now <= end;
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
              <div key={auction.id} className="relative group">
                <AuctionCard {...auction} />
                
                {/* End Auction Button for Live Auctions */}
                {isAuctionLive(auction) && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          disabled={endingAuction === auction.id}
                        >
                          <StopCircle className="h-4 w-4 mr-1" />
                          {endingAuction === auction.id ? 'Ending...' : 'End'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            <span>End Auction Early?</span>
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to end "{auction.title}" early? This action cannot be undone. 
                            {auction.bidCount > 0 && (
                              <span className="block mt-2 font-medium text-orange-600">
                                This auction has {auction.bidCount} bid(s). The highest bidder will win the auction.
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleEndAuction(auction.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            End Auction
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
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
