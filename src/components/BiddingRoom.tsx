import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Gavel, 
  MessageCircle, 
  Users, 
  TrendingUp, 
  Clock,
  Send,
  AlertCircle 
} from 'lucide-react';

interface Bid {
  id: string;
  amount: number;
  created_at: string;
  bidder: {
    full_name: string;
    is_verified: boolean;
  };
}

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}


interface Auction {
  id: string;
  title: string;
  current_bid: number;
  bid_increment: number;
  end_time: string;
  total_bids: number;
  total_watchers: number;
  status: string;
}

interface BiddingRoomProps {
  auctionId: string;
}

export const BiddingRoom = ({ auctionId }: BiddingRoomProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('disconnected');
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 3;

  // Fetch initial auction data directly from Supabase
  const fetchAuctionData = async () => {
    try {
      const { data: auctionData, error } = await supabase
        .from('auctions')
        .select(`
          *,
          bids (
            id,
            amount,
            created_at,
            bidder:profiles!bidder_id (
              full_name,
              is_verified
            )
          )
        `)
        .eq('id', auctionId)
        .single();

      if (error) {
        console.error('Error fetching auction:', error);
        toast({
          title: "Error",
          description: "Failed to load auction data",
          variant: "destructive",
        });
        return;
      }

      setAuction(auctionData);
      setBids(auctionData.bids?.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctionData();
  }, [auctionId, toast]);

  // Enhanced WebSocket connection with reconnection logic
  const connectWebSocket = async () => {
    if (!user || !auctionId) return;

    setConnectionStatus('connecting');
    
    try {
      console.log('Attempting WebSocket connection...');
      const websocket = new WebSocket(`wss://irnlrgnitkabszykuhxh.functions.supabase.co/auction-websocket`);
      
      websocket.onopen = () => {
        console.log('WebSocket connected successfully to auction room');
        setIsConnected(true);
        setConnectionStatus('connected');
        setWs(websocket);
        setActiveUsers(1);
        setReconnectAttempts(0);
        
        // Join the auction room
        const joinMessage = {
          type: 'join_auction',
          auctionId,
          userId: user.id
        };
        console.log('Sending join message:', joinMessage);
        websocket.send(JSON.stringify(joinMessage));
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'auction_status':
              setAuction(message.auction);
              setBids(message.bids || []);
              break;
              
            case 'new_bid':
              setBids(prev => [message.bid, ...prev]);
              setAuction(prev => prev ? {
                ...prev,
                current_bid: message.currentBid,
                total_bids: (prev.total_bids || 0) + 1
              } : null);
              
              // Show bid notification if it's not from current user
              if (message.bid.bidder_id !== user?.id) {
                toast({
                  title: "New Bid!",
                  description: `$${message.bid.amount.toLocaleString()} by ${message.bid.bidder.full_name}`,
                });
              }
              break;
              
            case 'error':
              toast({
                title: "Error",
                description: message.message,
                variant: "destructive",
              });
              break;
              
            case 'chat_message':
              setChatMessages(prev => [...prev, message.message]);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setWs(null);
        
        // Attempt reconnection if not manually closed
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, 3000 * (reconnectAttempts + 1)); // Exponential backoff
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
        setConnectionStatus('failed');
        
        if (reconnectAttempts === 0) {
          toast({
            title: "Connection Issue",
            description: "Unable to connect to live auction room. Using offline mode.",
            variant: "destructive",
          });
        }
      };

      return websocket;
    } catch (error) {
      console.error('WebSocket initialization failed:', error);
      setIsConnected(false);
      setConnectionStatus('failed');
      
      toast({
        title: "WebSocket Error",
        description: `Failed to initialize WebSocket connection: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    let websocket: WebSocket | undefined;
    
    const initConnection = async () => {
      websocket = await connectWebSocket();
    };
    
    initConnection();

    return () => {
      if (websocket) {
        websocket.close(1000, 'Component unmounting');
      }
    };
  }, [user, auctionId]);

  // Periodic polling as fallback for offline mode
  useEffect(() => {
    if (!isConnected && auction) {
      const pollInterval = setInterval(() => {
        fetchAuctionData();
      }, 5000); // Poll every 5 seconds when offline

      return () => clearInterval(pollInterval);
    }
  }, [isConnected, auction]);

  const handlePlaceBid = async () => {
    if (!bidAmount || !auction) return;

    const amount = parseFloat(bidAmount);
    const minimumBid = auction.current_bid + auction.bid_increment;

    if (amount < minimumBid) {
      toast({
        title: "Invalid Bid",
        description: `Minimum bid is $${minimumBid.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Try WebSocket first
      if (ws && isConnected) {
        ws.send(JSON.stringify({
          type: 'place_bid',
          bidAmount: amount
        }));
      } else {
        // Fallback to direct Supabase call
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user?.id)
          .single();

        if (!profile) {
          toast({
            title: "Error",
            description: "User profile not found",
            variant: "destructive",
          });
          return;
        }

        const { data: newBid, error } = await supabase
          .from('bids')
          .insert({
            auction_id: auctionId,
            bidder_id: profile.id,
            amount: amount
          })
          .select(`
            *,
            bidder:profiles!bidder_id (
              full_name,
              is_verified
            )
          `)
          .single();

        if (error) {
          toast({
            title: "Error",
            description: "Failed to place bid",
            variant: "destructive",
          });
          return;
        }

        // Update local state
        setBids(prev => [newBid, ...prev]);
        setAuction(prev => prev ? {
          ...prev,
          current_bid: amount,
          total_bids: (prev.total_bids || 0) + 1
        } : null);

        // Refresh auction data to ensure consistency
        setTimeout(() => {
          fetchAuctionData();
        }, 500);

        toast({
          title: "Bid Placed!",
          description: `Your bid of $${amount.toLocaleString()} has been placed`,
        });
      }

      setBidAmount('');
    } catch (error) {
      console.error('Error placing bid:', error);
      toast({
        title: "Error",
        description: "Failed to place bid",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = () => {
    if (!ws || !chatMessage.trim()) return;

    ws.send(JSON.stringify({
      type: 'send_message',
      message: chatMessage.trim()
    }));

    setChatMessage('');
  };


  const formatTimeRemaining = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const diff = end - now;

    if (diff <= 0) return "Auction Ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Auction Not Found</h3>
          <p className="text-muted-foreground">This auction could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-screen max-h-[80vh]">
      {/* Bidding Section */}
      <div className="lg:col-span-2 space-y-6">
        {/* Auction Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Gavel className="h-5 w-5" />
                <span>{auction.title}</span>
              </CardTitle>
              <div className="flex items-center space-x-4">
                <Badge variant="destructive" className="animate-pulse">
                  LIVE
                </Badge>
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{activeUsers} active</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  ${auction.current_bid.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Current Bid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {auction.total_bids}
                </div>
                <div className="text-sm text-muted-foreground">Total Bids</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {auction.total_watchers}
                </div>
                <div className="text-sm text-muted-foreground">Watching</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {formatTimeRemaining(auction.end_time)}
                </div>
                <div className="text-sm text-muted-foreground">Time Left</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bidding Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Place Your Bid</CardTitle>
          </CardHeader>
          <CardContent>
            {connectionStatus !== 'connected' && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {connectionStatus === 'connecting' && "Connecting to live auction room..."}
                  {connectionStatus === 'disconnected' && reconnectAttempts > 0 && `Reconnecting... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`}
                  {connectionStatus === 'failed' && "Using offline mode - bids will still work but you won't see real-time updates."}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex space-x-4">
              <div className="flex-1">
                <Input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Min: $${(auction.current_bid + auction.bid_increment).toLocaleString()}`}
                  min={auction.current_bid + auction.bid_increment}
                  step={auction.bid_increment}
                />
              </div>
              <Button 
                onClick={handlePlaceBid}
                disabled={!bidAmount}
                variant="bid"
                className="min-w-32"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Place Bid
              </Button>
            </div>
            
            <div className="flex space-x-2 mt-4">
              {[auction.bid_increment, auction.bid_increment * 2, auction.bid_increment * 5].map((increment) => (
                <Button
                  key={increment}
                  variant="outline"
                  size="sm"
                  onClick={() => setBidAmount((auction.current_bid + increment).toString())}
                >
                  +${increment}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bid History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bids</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {bids.map((bid, index) => (
                  <div key={bid.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        #{bids.length - index}
                      </Badge>
                      <span className="font-medium">
                        {bid.bidder.full_name}
                        {bid.bidder.is_verified && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            ✓
                          </Badge>
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${bid.amount.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(bid.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Chat Section */}
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>Live Chat</span>
              {connectionStatus === 'connected' && (
                <Badge variant="outline" className="text-xs">
                  Live
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 h-64">
              <div className="space-y-2">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div key={message.id} className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{message.user}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.text}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            <Separator className="my-4" />
            
            <div className="flex space-x-2">
              <Input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={connectionStatus !== 'connected'}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={connectionStatus !== 'connected' || !chatMessage.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {connectionStatus !== 'connected' && (
              <div className="text-xs text-muted-foreground mt-2 text-center">
                Chat unavailable in offline mode
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};