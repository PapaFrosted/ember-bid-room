import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Truck, Shield, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface PaymentPageProps {
  auctionTitle: string;
  winningBid: number;
  shippingCost: number;
  totalAmount: number;
}

const PaymentPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [auctionData, setAuctionData] = useState<PaymentPageProps | null>(null);
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    phone: ''
  });

  // Mock payment handler - simulates successful payment
  const handleMockPayment = async () => {
    if (!user || !id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to complete payment",
        variant: "destructive",
      });
      return;
    }

    // Validate required shipping fields
    if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.city) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required shipping details",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Simulate payment processing delay
    setTimeout(() => {
      setLoading(false);
      setPaymentSuccess(true);
      
      toast({
        title: "Payment Successful! 🎉",
        description: "Your mock payment has been processed successfully.",
      });
    }, 2000);
  };

  const handleAddressChange = (field: string, value: string) => {
    setShippingAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Mock data for demo - in real app, fetch from auction details
  if (!auctionData) {
    const mockData = {
      auctionTitle: "Vintage Rolex Submariner 1965",
      winningBid: 15750,
      shippingCost: 50,
      totalAmount: 15800
    };
    setAuctionData(mockData);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4 mb-6">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Complete Your Purchase</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Shipping Details */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Truck className="h-5 w-5" />
                    <span>Shipping Address</span>
                  </CardTitle>
                  <CardDescription>
                    Enter your shipping details for delivery
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={shippingAddress.fullName}
                        onChange={(e) => handleAddressChange('fullName', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={shippingAddress.phone}
                        onChange={(e) => handleAddressChange('phone', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      value={shippingAddress.address}
                      onChange={(e) => handleAddressChange('address', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={shippingAddress.state}
                        onChange={(e) => handleAddressChange('state', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postalCode">Postal Code *</Label>
                      <Input
                        id="postalCode"
                        value={shippingAddress.postalCode}
                        onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={shippingAddress.country}
                        onChange={(e) => handleAddressChange('country', e.target.value)}
                        disabled
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary & Payment */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">{auctionData?.auctionTitle}</h3>
                    <div className="flex justify-between">
                      <span>Winning bid</span>
                      <span>₹{auctionData?.winningBid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>₹{auctionData?.shippingCost.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>₹{auctionData?.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Payment</span>
                  </CardTitle>
                  <CardDescription>
                    Mock payment for testing purposes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>SSL encrypted and secure</span>
                  </div>

                  {!paymentSuccess ? (
                    <>
                      <Button
                        onClick={handleMockPayment}
                        disabled={loading || !shippingAddress.fullName || !shippingAddress.phone}
                        className="w-full"
                        variant="auction"
                        size="lg"
                      >
                        {loading ? "Processing..." : `Pay ₹${auctionData?.totalAmount.toLocaleString()}`}
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        By clicking Pay, you agree to our Terms of Service and Privacy Policy
                      </p>
                    </>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center space-x-2 text-green-600">
                        <CheckCircle className="h-6 w-6" />
                        <span className="text-lg font-semibold">Payment Successful!</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Your order has been confirmed. You will receive a confirmation email shortly.
                      </p>
                      <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Shipping Details:</h4>
                        <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                          <p><strong>Name:</strong> {shippingAddress.fullName}</p>
                          <p><strong>Phone:</strong> {shippingAddress.phone}</p>
                          <p><strong>Address:</strong> {shippingAddress.address}</p>
                          <p><strong>City:</strong> {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
                          <p><strong>Country:</strong> {shippingAddress.country}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => navigate('/auctions')}
                        variant="outline"
                        className="w-full"
                      >
                        Back to Auctions
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;