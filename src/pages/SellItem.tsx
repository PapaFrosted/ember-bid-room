import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Header } from '@/components/Header';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, Calendar, DollarSign, AlertCircle, ImagePlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: string;
  name: string;
  slug: string;
}

const SellItem = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    startingBid: '',
    reservePrice: '',
    buyNowPrice: '',
    startTime: '',
    endTime: '',
    condition: '',
    dimensions: '',
    weight: '',
    shippingCost: '',
    isAnonymous: false
  });
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const uploadImages = async (userId: string) => {
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${i}.${fileExt}`;
      
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      
      const { data, error } = await supabase.storage
        .from('auction-images')
        .upload(fileName, file);
      
      if (error) {
        console.error('Error uploading image:', error);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('auction-images')
        .getPublicUrl(fileName);
      
      uploadedUrls.push(publicUrl);
      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Upload images first
      const uploadedImageUrls = await uploadImages(user.id);

      // Create auction
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .insert({
          seller_id: profile.id,
          category_id: formData.categoryId,
          title: formData.title,
          description: formData.description,
          starting_bid: parseFloat(formData.startingBid),
          reserve_price: formData.reservePrice ? parseFloat(formData.reservePrice) : null,
          buy_now_price: formData.buyNowPrice ? parseFloat(formData.buyNowPrice) : null,
          start_time: formData.startTime,
          end_time: formData.endTime,
          condition: formData.condition,
          dimensions: formData.dimensions,
          weight: formData.weight,
          shipping_cost: formData.shippingCost ? parseFloat(formData.shippingCost) : null,
          is_anonymous_seller: formData.isAnonymous,
          images: uploadedImageUrls,
          status: 'upcoming'
        })
        .select()
        .single();

      if (auctionError) throw auctionError;

      toast({
        title: "Auction Listed!",
        description: "Your item has been successfully listed for auction.",
      });

      navigate('/dashboard');

    } catch (error: any) {
      console.error('Error creating auction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to list item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast({
        title: "Too many images",
        description: "You can upload a maximum of 5 images",
        variant: "destructive",
      });
      return;
    }
    
    setImages(prev => [...prev, ...files]);
    
    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUrls(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Set minimum dates for auction timing
  const now = new Date();
  const minStartTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const minEndTime = formData.startTime ? new Date(new Date(formData.startTime).getTime() + 60 * 60 * 1000) : minStartTime;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">List Your Item</h1>
              <p className="text-muted-foreground">
                Create an auction listing for your valuable item
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Provide the essential details about your item
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Auction Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="e.g., Vintage Rolex Submariner 1965"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Detailed description of your item including condition, history, and any relevant details..."
                      className="min-h-32"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.categoryId} onValueChange={(value) => handleInputChange('categoryId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="condition">Condition</Label>
                      <Select value={formData.condition} onValueChange={(value) => handleInputChange('condition', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="like-new">Like New</SelectItem>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="very-good">Very Good</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dimensions">Dimensions</Label>
                      <Input
                        id="dimensions"
                        value={formData.dimensions}
                        onChange={(e) => handleInputChange('dimensions', e.target.value)}
                        placeholder="e.g., 10 x 8 x 2 inches"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight</Label>
                      <Input
                        id="weight"
                        value={formData.weight}
                        onChange={(e) => handleInputChange('weight', e.target.value)}
                        placeholder="e.g., 2.5 lbs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Images */}
              <Card>
                <CardHeader>
                  <CardTitle>Images</CardTitle>
                  <CardDescription>
                    Upload high-quality images of your item (up to 5 images)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-muted rounded-lg p-6">
                    <div className="text-center">
                      <ImagePlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <div className="space-y-2">
                        <Label htmlFor="images" className="text-sm font-medium cursor-pointer">
                          Click to upload images
                        </Label>
                        <Input
                          id="images"
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, JPEG up to 10MB each. Maximum 5 images.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {imageUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Bidding</CardTitle>
                  <CardDescription>
                    Set your auction parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startingBid">Starting Bid ($) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="startingBid"
                          type="number"
                          min="1"
                          step="0.01"
                          value={formData.startingBid}
                          onChange={(e) => handleInputChange('startingBid', e.target.value)}
                          className="pl-10"
                          placeholder="100.00"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reservePrice">Reserve Price ($)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reservePrice"
                          type="number"
                          min="1"
                          step="0.01"
                          value={formData.reservePrice}
                          onChange={(e) => handleInputChange('reservePrice', e.target.value)}
                          className="pl-10"
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="buyNowPrice">Buy Now Price ($)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="buyNowPrice"
                          type="number"
                          min="1"
                          step="0.01"
                          value={formData.buyNowPrice}
                          onChange={(e) => handleInputChange('buyNowPrice', e.target.value)}
                          className="pl-10"
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shippingCost">Shipping Cost ($)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="shippingCost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.shippingCost}
                          onChange={(e) => handleInputChange('shippingCost', e.target.value)}
                          className="pl-10"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timing */}
              <Card>
                <CardHeader>
                  <CardTitle>Auction Timing</CardTitle>
                  <CardDescription>
                    Schedule when your auction will start and end
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="startTime"
                          type="datetime-local"
                          value={formData.startTime}
                          onChange={(e) => handleInputChange('startTime', e.target.value)}
                          min={minStartTime.toISOString().slice(0, 16)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="endTime"
                          type="datetime-local"
                          value={formData.endTime}
                          onChange={(e) => handleInputChange('endTime', e.target.value)}
                          min={minEndTime.toISOString().slice(0, 16)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Auctions must start at least 1 hour from now and run for a minimum of 1 hour.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Privacy */}
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Choose how your identity appears to bidders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="anonymous"
                      checked={formData.isAnonymous}
                      onCheckedChange={(checked) => handleInputChange('isAnonymous', checked as boolean)}
                    />
                    <Label htmlFor="anonymous" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      List as anonymous seller
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    When enabled, your name will be hidden from public view. Bidders will see "Anonymous Seller" instead.
                  </p>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="auction"
                  disabled={loading}
                  className="min-w-32"
                >
                  {loading ? "Creating..." : "List Item"}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default SellItem;