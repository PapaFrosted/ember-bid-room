
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Clock, Users, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface AuctionCardProps {
  id: string;
  title: string;
  description: string;
  currentBid: number;
  startingBid: number;
  imageUrl: string;
  status: 'draft' | 'upcoming' | 'live' | 'ended' | 'cancelled';
  endTime: string;
  startTime?: string; // Add startTime prop
  bidCount: number;
  watchers: number;
  isWatched?: boolean;
}

export const AuctionCard = ({ 
  id,
  title, 
  description, 
  currentBid, 
  startingBid, 
  imageUrl, 
  status, 
  endTime,
  startTime,
  bidCount, 
  watchers,
  isWatched = false 
}: AuctionCardProps) => {
  const navigate = useNavigate();
  const watchedKey = `auction_watched_${id}`;
  const [watched, setWatched] = useState(() => {
    const saved = localStorage.getItem(watchedKey);
    return saved ? JSON.parse(saved) : isWatched;
  });

  // Dynamic status calculation based on current time
  const getDynamicStatus = () => {
    if (status === 'draft' || status === 'cancelled') {
      return status;
    }

    const now = new Date();
    const start = startTime ? new Date(startTime) : null;
    const end = new Date(endTime);

    if (start && now < start) {
      return 'upcoming';
    } else if (now > end) {
      return 'ended';
    } else if (start && now >= start && now <= end) {
      return 'live';
    }

    return status;
  };

  const dynamicStatus = getDynamicStatus();

  useEffect(() => {
    localStorage.setItem(watchedKey, JSON.stringify(watched));
  }, [watched, watchedKey]);

  const getStatusColor = () => {
    switch (dynamicStatus) {
      case 'live': return 'bg-auction-live';
      case 'upcoming': return 'bg-auction-upcoming';
      case 'ended': return 'bg-auction-ended';
      case 'draft': return 'bg-muted';
      case 'cancelled': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getStatusText = () => {
    switch (dynamicStatus) {
      case 'live': return 'LIVE';
      case 'upcoming': return 'UPCOMING';
      case 'ended': return 'ENDED';
      case 'draft': return 'DRAFT';
      case 'cancelled': return 'CANCELLED';
      default: return '';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-elegant transition-all duration-300 group">
      <div className="relative">
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <Badge 
          className={`absolute top-3 left-3 ${getStatusColor()} text-white ${dynamicStatus === 'live' ? 'animate-pulse-slow' : ''}`}
        >
          {getStatusText()}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-3 right-3 bg-background/80 backdrop-blur ${watched ? 'text-red-500' : 'text-muted-foreground'}`}
          onClick={() => setWatched(!watched)}
        >
          <Heart className={`h-4 w-4 ${watched ? 'fill-current' : ''}`} />
        </Button>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{title}</h3>
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{description}</p>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Current Bid</span>
            <span className="font-bold text-lg text-primary">
              ${currentBid.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Starting: ${startingBid.toLocaleString()}</span>
            <div className="flex items-center space-x-4 text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{bidCount}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>{watchers}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-3 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{endTime}</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        {dynamicStatus === 'live' && (
          <Button className="w-full" variant="bid" onClick={() => navigate(`/auction/${id}`)}>
            Place Bid
          </Button>
        )}
        {dynamicStatus === 'upcoming' && (
          <Button className="w-full" variant="outline" onClick={() => navigate(`/auction/${id}`)}>
            Watch Auction
          </Button>
        )}
        {dynamicStatus === 'ended' && (
          <Button className="w-full" variant="secondary" onClick={() => navigate(`/auction/${id}`)} disabled>
            Auction Ended
          </Button>
        )}
        {dynamicStatus === 'draft' && (
          <Button className="w-full" variant="outline" onClick={() => navigate(`/auction/${id}`)}>
            View Draft
          </Button>
        )}
        {dynamicStatus === 'cancelled' && (
          <Button className="w-full" variant="destructive" onClick={() => navigate(`/auction/${id}`)} disabled>
            Cancelled
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
