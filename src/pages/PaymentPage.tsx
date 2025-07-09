import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShippingAddressForm } from '@/components/payment/ShippingAddressForm';
import { OrderSummary } from '@/components/payment/OrderSummary';
import { PaymentSection } from '@/components/payment/PaymentSection';
import { useShippingAddress } from '@/hooks/useShippingAddress';
import { useMockPayment } from '@/hooks/useMockPayment';

interface PaymentPageProps {
  auctionTitle: string;
  winningBid: number;
  shippingCost: number;
  totalAmount: number;
}

const PaymentPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [auctionData, setAuctionData] = useState<PaymentPageProps | null>(null);
  const { shippingAddress, handleAddressChange } = useShippingAddress();
  const { loading, paymentSuccess, handleMockPayment } = useMockPayment({
    user,
    auctionId: id,
    shippingAddress
  });

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
              <ShippingAddressForm
                shippingAddress={shippingAddress}
                onAddressChange={handleAddressChange}
              />
            </div>

            {/* Order Summary & Payment */}
            <div className="space-y-6">
              {auctionData && (
                <OrderSummary
                  auctionTitle={auctionData.auctionTitle}
                  winningBid={auctionData.winningBid}
                  shippingCost={auctionData.shippingCost}
                  totalAmount={auctionData.totalAmount}
                />
              )}

              <PaymentSection
                totalAmount={auctionData?.totalAmount || 0}
                loading={loading}
                paymentSuccess={paymentSuccess}
                shippingAddress={shippingAddress}
                onPayment={handleMockPayment}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;