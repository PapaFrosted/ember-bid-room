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
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    if (!user || !auctionId) return;

    // Connect to WebSocket
    const websocket = new WebSocket(`wss://irnlrgnitkabszykuhxh.supabase.co/functions/v1/auction-websocket`);
    
    websocket.onopen = () => {
      setIsConnected(true);
      setWs(websocket);
      
      // Join the auction room
      websocket.send(JSON.stringify({
        type: 'join_auction',
        auctionId,
        userId: user.id
      }));
    };

    websocket.onmessage = (event) => {
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
            total_bids: prev.total_bids + 1
          } : null);
          
          // Show bid notification
          toast({
            title: "New Bid!",
            description: `$${message.bid.amount.toLocaleString()} by ${message.bid.bidder.full_name}`,
          });
          break;
          
        case 'chat_message':
          setChatMessages(prev => [...prev, message.message]);
          break;
          
        case 'error':
          toast({
            title: "Error",
            description: message.message,
            variant: "destructive",
          });
          break;
      }
    };

    websocket.onclose = () => {
      setIsConnected(false);
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      websocket.close();
    };
  }, [user, auctionId, toast]);

  const handlePlaceBid = () => {
    if (!ws || !bidAmount || !auction) return;

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

    ws.send(JSON.stringify({
      type: 'place_bid',
      bidAmount: amount
    }));

    setBidAmount('');
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

  if (!auction) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
            {!isConnected && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Connecting to auction room...
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
                disabled={!isConnected || !bidAmount}
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
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 h-64">
              <div className="space-y-2">
                {chatMessages.map((message) => (
                  <div key={message.id} className="p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{message.user}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{message.text}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <Separator className="my-4" />
            
            <div className="flex space-x-2">
              <Input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!isConnected || !chatMessage.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};