import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Shield } from 'lucide-react';
import { PaymentSuccess } from './PaymentSuccess';

interface ShippingAddress {
  fullName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

interface PaymentSectionProps {
  totalAmount: number;
  loading: boolean;
  paymentSuccess: boolean;
  shippingAddress: ShippingAddress;
  onPayment: () => void;
}

export const PaymentSection = ({ 
  totalAmount, 
  loading, 
  paymentSuccess, 
  shippingAddress, 
  onPayment 
}: PaymentSectionProps) => {
  const isFormValid = shippingAddress.fullName && shippingAddress.phone && shippingAddress.address && shippingAddress.city;

  return (
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
        {!paymentSuccess ? (
          <>
            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-green-500" />
              <span>SSL encrypted and secure</span>
            </div>

            <Button
              onClick={onPayment}
              disabled={loading || !isFormValid}
              className="w-full"
              variant="auction"
              size="lg"
            >
              {loading ? "Processing..." : `Pay ₹${totalAmount.toLocaleString()}`}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By clicking Pay, you agree to our Terms of Service and Privacy Policy
            </p>
          </>
        ) : (
          <PaymentSuccess shippingAddress={shippingAddress} />
        )}
      </CardContent>
    </Card>
  );
};