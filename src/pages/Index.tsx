import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { AuctionCard } from "@/components/AuctionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Filter, SortDesc, Users, TrendingUp, Clock, Star } from "lucide-react";

// Mock data for featured auctions
const featuredAuctions = [
  {
    id: "1",
    title: "Vintage Rolex Submariner 1965",
    description: "Rare vintage diving watch in excellent condition with original box and papers. A true collector's piece.",
    currentBid: 15750,
    startingBid: 8000,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop&crop=center",
    status: "live" as const,
    endTime: "Ends in 2h 34m",
    bidCount: 23,
    watchers: 156,
    isWatched: true
  },
  {
    id: "2", 
    title: "Abstract Oil Painting by Modern Artist",
    description: "Contemporary abstract piece featuring bold colors and dynamic composition. Signed and authenticated.",
    currentBid: 3200,
    startingBid: 1500,
    imageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop&crop=center",
    status: "live" as const,
    endTime: "Ends in 5h 12m", 
    bidCount: 8,
    watchers: 89,
  },
  {
    id: "3",
    title: "Antique Persian Rug - 19th Century",
    description: "Hand-woven masterpiece with intricate patterns and natural dyes. Museum quality piece.",
    currentBid: 0,
    startingBid: 2800,
    imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop&crop=center",
    status: "upcoming" as const,
    endTime: "Starts in 1d 4h",
    bidCount: 0,
    watchers: 234,
  },
  {
    id: "4",
    title: "Rare First Edition Book Collection", 
    description: "Complete set of first edition novels including classics from the early 20th century.",
    currentBid: 1850,
    startingBid: 800,
    imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop&crop=center",
    status: "live" as const,
    endTime: "Ends in 45m",
    bidCount: 12,
    watchers: 67,
  }
];

const Index = () => {
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
                  <div className="text-3xl font-bold text-primary">24</div>
                  <div className="text-sm text-muted-foreground">Live Auctions</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">156</div>
                  <div className="text-sm text-muted-foreground">Active Bidders</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">$2.4M</div>
                  <div className="text-sm text-muted-foreground">Total Bids</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">99.8%</div>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredAuctions.map((auction) => (
                <AuctionCard key={auction.id} {...auction} />
              ))}
            </div>

            <div className="text-center mt-12">
              <Button variant="auction" size="lg">
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
