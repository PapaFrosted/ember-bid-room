import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { AuctionCard } from '@/components/AuctionCard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

interface Auction {
  id: string;
  title: string;
  description: string;
  currentBid: number;
  startingBid: number;
  imageUrl: string;
  status: 'live' | 'upcoming' | 'ended';
  endTime: string;
  bidCount: number;
  watchers: number;
  category: {
    name: string;
    slug: string;
  };
}

interface CategoryWithAuctions extends Category {
  auctions: Auction[];
}

const Categories = () => {
  const [categoriesWithAuctions, setCategoriesWithAuctions] = useState<CategoryWithAuctions[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategoriesWithAuctions();
  }, []);

  const fetchCategoriesWithAuctions = async () => {
    setLoading(true);
    
    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      setLoading(false);
      return;
    }

    // Fetch auctions for each category (limit 3 per category)
    const categoriesWithAuctions = await Promise.all(
      (categories || []).map(async (category) => {
        const { data: auctions, error: auctionsError } = await supabase
          .from('auctions')
          .select(`
            *,
            category:categories!category_id (
              name,
              slug
            )
          `)
          .eq('category_id', category.id)
          .in('status', ['live', 'upcoming'])
          .order('created_at', { ascending: false })
          .limit(3);

        if (auctionsError) {
          console.error('Error fetching auctions for category:', category.name, auctionsError);
          return { ...category, auctions: [] };
        }

        // Transform auction data
        const transformedAuctions = (auctions || []).map((auction: any) => ({
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
          category: auction.category
        }));

        return { ...category, auctions: transformedAuctions };
      })
    );

    setCategoriesWithAuctions(categoriesWithAuctions);
    setLoading(false);
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

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/auctions?category=${categoryId}`);
  };

  // Category icons mapping
  const getCategoryIcon = (slug: string) => {
    const icons: { [key: string]: string } = {
      'watches': '⌚',
      'art': '🎨',
      'jewelry': '💎',
      'books': '📚',
      'antiques': '🏺',
      'electronics': '💻',
      'collectibles': '🎭',
      'furniture': '🪑',
      'clothing': '👔',
      'vehicles': '🚗'
    };
    return icons[slug] || '📦';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Categories</h1>
          <p className="text-muted-foreground">
            Explore items by category and find exactly what you're looking for
          </p>
        </div>

        {loading ? (
          <div className="space-y-12">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="h-8 bg-muted rounded animate-pulse w-48" />
                    <div className="h-10 bg-muted rounded animate-pulse w-24" />
                  </div>
                  <div className="h-4 bg-muted rounded animate-pulse w-64" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-64 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : categoriesWithAuctions.length > 0 ? (
          <div className="space-y-12">
            {categoriesWithAuctions.map((category) => (
              <Card key={category.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-3">
                        <span className="text-3xl">{getCategoryIcon(category.slug)}</span>
                        {category.name}
                      </CardTitle>
                      {category.description && (
                        <p className="text-muted-foreground mt-2">{category.description}</p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => handleCategoryClick(category.id)}
                      className="flex items-center gap-2"
                    >
                      See More
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {category.auctions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {category.auctions.map((auction) => (
                        <AuctionCard key={auction.id} {...auction} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="text-4xl mb-2">📦</div>
                      <p>No active auctions in this category</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📂</div>
            <h3 className="text-xl font-semibold mb-2">No categories available</h3>
            <p className="text-muted-foreground">
              Categories will appear here once they are added to the system
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Categories;