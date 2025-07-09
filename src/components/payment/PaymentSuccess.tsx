import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ShippingAddress {
  fullName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

interface PaymentSuccessProps {
  shippingAddress: ShippingAddress;
}

export const PaymentSuccess = ({ shippingAddress }: PaymentSuccessProps) => {
  const navigate = useNavigate();

  return (
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
  );
};