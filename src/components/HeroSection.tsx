import { Button } from "@/components/ui/button";
import { Search, TrendingUp, Shield, Zap } from "lucide-react";
import auctionHero from "@/assets/auction-hero.jpg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[70vh] flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={auctionHero} 
          alt="Auction House" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/30" />
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Discover Rare
            </span>
            <br />
            <span className="text-foreground">Treasures</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Join the most exciting auction platform where collectors, dealers, and enthusiasts 
            come together to bid on extraordinary items. Experience the thrill of real-time bidding.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button size="lg" variant="auction" className="text-lg px-8 py-6">
              <Zap className="mr-2 h-5 w-5" />
              Start Bidding Now
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              <Search className="mr-2 h-5 w-5" />
              Browse Auctions
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-auction-live rounded-full animate-pulse" />
              <span className="text-muted-foreground">24 Live Auctions</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">$2.4M+ Total Bids</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Secure Payments</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};