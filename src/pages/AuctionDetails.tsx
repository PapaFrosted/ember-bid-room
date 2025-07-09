import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Header } from '@/components/Header';
import { BiddingRoom } from '@/components/BiddingRoom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  Share2, 
  Clock, 
  Package, 
  Truck, 
  Shield,
  User,
  Tag,
  TrendingUp
} from 'lucide-react';

interface AuctionDetails {
  id: string;
  title: string;
  description: string;
  current_bid: number;
  starting_bid: number;
  status: string;
  start_time: string;
  end_time: string;
  condition: string;
  dimensions: string;
  weight: string;
  shipping_cost: number;
  total_bids: number;
  total_watchers: number;
  is_anonymous_seller: boolean;
  images: any; // Using any for JSON type from database
  category: {
    name: string;
    slug: string;
  };
  seller: {
    full_name: string;
    seller_rating: number;
    total_sales: number;
    is_verified: boolean;
  };
}

const AuctionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [auction, setAuction] = useState<AuctionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAuctionDetails();
      checkIfWatching();
    }
  }, [id, user]);

  const fetchAuctionDetails = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('auctions')
      .select(`
        *,
        category:categories!category_id (
          name,
          slug
        ),
        seller:profiles!seller_id (
          full_name,
          seller_rating,
          total_sales,
          is_verified
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching auction:', error);
      toast({
        title: "Error",
        description: "Failed to load auction details",
        variant: "destructive",
      });
      navigate('/auctions');
      return;
    }

    setAuction(data);
    setLoading(false);
  };

  const checkIfWatching = async () => {
    if (!user || !id) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return;

    const { data } = await supabase
      .from('auction_watchers')
      .select('id')
      .eq('auction_id', id)
      .eq('user_id', profile.id)
      .single();

    setIsWatching(!!data);
  };

  const toggleWatch = async () => {
    if (!user || !id) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return;

    if (isWatching) {
      const { error } = await supabase
        .from('auction_watchers')
        .delete()
        .eq('auction_id', id)
        .eq('user_id', profile.id);

      if (!error) {
        setIsWatching(false);
        toast({
          title: "Removed from watchlist",
          description: "You will no longer receive notifications for this auction",
        });
      }
    } else {
      const { error } = await supabase
        .from('auction_watchers')
        .insert({
          auction_id: id,
          user_id: profile.id
        });

      if (!error) {
        setIsWatching(true);
        toast({
          title: "Added to watchlist",
          description: "You'll receive notifications about this auction",
        });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-auction-live text-white animate-pulse">LIVE</Badge>;
      case 'upcoming':
        return <Badge className="bg-auction-upcoming text-white">UPCOMING</Badge>;
      case 'ended':
        return <Badge className="bg-auction-ended text-white">ENDED</Badge>;
      default:
        return <Badge variant="secondary">{status.toUpperCase()}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-muted rounded" />
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-32 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Auction not found</h1>
          <Button onClick={() => navigate('/auctions')}>
            Browse Auctions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <span>Auctions</span>
          <span>/</span>
          <span>{auction.category.name}</span>
          <span>/</span>
          <span className="text-foreground">{auction.title}</span>
        </div>

        {/* Auction Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{auction.title}</h1>
            <div className="flex items-center space-x-4">
              {getStatusBadge(auction.status)}
              <Badge variant="outline">
                <Tag className="h-3 w-3 mr-1" />
                {auction.category.name}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={toggleWatch}
            >
              <Heart className={`h-4 w-4 ${isWatching ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Live Bidding Room */}
        {auction.status === 'live' && user && (
          <div className="mb-8">
            <BiddingRoom auctionId={auction.id} />
          </div>
        )}

        {/* Auction Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={auction.images?.[0] || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop'}
                    alt={auction.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {auction.description}
                </p>
              </CardContent>
            </Card>

            {/* Item Details */}
            <Card>
              <CardHeader>
                <CardTitle>Item Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {auction.condition && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Condition</span>
                    <span className="font-medium">{auction.condition}</span>
                  </div>
                )}
                {auction.dimensions && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span className="font-medium">{auction.dimensions}</span>
                  </div>
                )}
                {auction.weight && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight</span>
                    <span className="font-medium">{auction.weight}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping Cost</span>
                  <span className="font-medium">
                    {auction.shipping_cost ? `$${auction.shipping_cost}` : 'Free'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Bid Info */}
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">
                    ${auction.current_bid.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Current highest bid
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Starting bid</span>
                    <span>${auction.starting_bid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total bids</span>
                    <span>{auction.total_bids}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Watchers</span>
                    <span>{auction.total_watchers}</span>
                  </div>
                </div>

                {auction.status === 'upcoming' && (
                  <div className="text-center pt-4">
                    <Button 
                      onClick={toggleWatch}
                      variant={isWatching ? "outline" : "auction"}
                      className="w-full"
                    >
                      {isWatching ? "Remove from Watchlist" : "Watch Auction"}
                    </Button>
                  </div>
                )}

                {auction.status === 'live' && !user && (
                  <div className="text-center pt-4">
                    <Button 
                      onClick={() => navigate('/auth')}
                      variant="auction"
                      className="w-full"
                    >
                      Sign In to Bid
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card>
              <CardHeader>
                <CardTitle>Seller Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {auction.is_anonymous_seller ? "Anonymous Seller" : auction.seller.full_name}
                      {auction.seller.is_verified && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    {!auction.is_anonymous_seller && (
                      <div className="text-sm text-muted-foreground">
                        {auction.seller.seller_rating}/5.0 rating • {auction.seller.total_sales} sales
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trust & Safety */}
            <Card>
              <CardHeader>
                <CardTitle>Trust & Safety</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Secure payment processing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Truck className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">Tracked shipping included</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-purple-500" />
                  <span className="text-sm">Item protection guarantee</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuctionDetails;