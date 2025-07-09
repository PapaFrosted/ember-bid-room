import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ShippingAddress {
  fullName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

interface UseMockPaymentProps {
  user: any;
  auctionId: string | undefined;
  shippingAddress: ShippingAddress;
}

export const useMockPayment = ({ user, auctionId, shippingAddress }: UseMockPaymentProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleMockPayment = async () => {
    if (!user || !auctionId) {
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

  return {
    loading,
    paymentSuccess,
    handleMockPayment
  };
};