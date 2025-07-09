import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      setLoading(false);
      return;
    }

    setCategories(data || []);
    setLoading(false);
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Card 
                key={category.id} 
                className="hover:shadow-elegant transition-all duration-300 cursor-pointer group"
                onClick={() => handleCategoryClick(category.id)}
              >
                <CardContent className="p-6 text-center">
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                    {getCategoryIcon(category.slug)}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {category.description}
                    </p>
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