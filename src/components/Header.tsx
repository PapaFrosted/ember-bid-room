
import { Button } from "@/components/ui/button";
import { Search, Gavel, User, Heart, LogOut, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Gavel className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            EmberBid
          </span>
        </Link>

        <div className="hidden md:flex items-center space-x-6">
          <Link to="/auctions" className="text-foreground hover:text-primary transition-colors">
            Live Auctions
          </Link>
          <Link to="/upcoming" className="text-foreground hover:text-primary transition-colors">
            Upcoming
          </Link>
          <Link to="/categories" className="text-foreground hover:text-primary transition-colors">
            Categories
          </Link>
          {user && (
            <Link to="/my-listings" className="text-foreground hover:text-primary transition-colors">
              My Listings
            </Link>
          )}
          <Link to="/sell" className="text-foreground hover:text-primary transition-colors">
            Sell Item
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon">
            <Search className="h-4 w-4" />
          </Button>
          {user && (
            <>
              <Button variant="ghost" size="icon">
                <Heart className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/my-listings">
                  <Package className="h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-listings">My Listings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/auth">
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Link>
            </Button>
          )}
          
          {user ? (
            <Button variant="auction" asChild>
              <Link to="/sell">List Item</Link>
            </Button>
          ) : (
            <Button variant="auction" asChild>
              <Link to="/auth">Start Bidding</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
