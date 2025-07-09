import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck } from 'lucide-react';

interface ShippingAddress {
  fullName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

interface ShippingAddressFormProps {
  shippingAddress: ShippingAddress;
  onAddressChange: (field: string, value: string) => void;
}

export const ShippingAddressForm = ({ shippingAddress, onAddressChange }: ShippingAddressFormProps) => {
  return (
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
              onChange={(e) => onAddressChange('fullName', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={shippingAddress.phone}
              onChange={(e) => onAddressChange('phone', e.target.value)}
              required
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="address">Address *</Label>
          <Input
            id="address"
            value={shippingAddress.address}
            onChange={(e) => onAddressChange('address', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={shippingAddress.city}
              onChange={(e) => onAddressChange('city', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={shippingAddress.state}
              onChange={(e) => onAddressChange('state', e.target.value)}
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
              onChange={(e) => onAddressChange('postalCode', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={shippingAddress.country}
              onChange={(e) => onAddressChange('country', e.target.value)}
              disabled
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};