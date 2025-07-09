
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Auctions from "./pages/Auctions";
import Categories from "./pages/Categories";
import Upcoming from "./pages/Upcoming";
import AuctionDetails from "./pages/AuctionDetails";
import PaymentPage from "./pages/PaymentPage";
import SellItem from "./pages/SellItem";
import MyListings from "./pages/MyListings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auctions" element={<Auctions />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/upcoming" element={<Upcoming />} />
            <Route path="/auction/:id" element={<AuctionDetails />} />
            <Route path="/payment/:id" element={<PaymentPage />} />
            <Route path="/sell" element={<SellItem />} />
            <Route path="/my-listings" element={<MyListings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
