import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  auctionId: string;
  amount: number;
  currency?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { auctionId, amount, currency = "INR" }: PaymentRequest = await req.json();
    
    // Validate required environment variables
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    
    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Razorpay API keys not configured");
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get auction details
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select(`
        *,
        seller:profiles!seller_id (
          full_name,
          user_id
        )
      `)
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      throw new Error("Auction not found");
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Create Razorpay order
    const orderData = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: currency,
      receipt: `auction_${auctionId}_${Date.now()}`,
      notes: {
        auction_id: auctionId,
        buyer_id: user.id,
        auction_title: auction.title
      }
    };

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.text();
      console.error("Razorpay API error:", errorData);
      throw new Error("Failed to create Razorpay order");
    }

    const razorpayOrder = await razorpayResponse.json();

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        auction_id: auctionId,
        buyer_id: await getUserProfileId(supabase, user.id),
        seller_id: auction.seller_id,
        amount: amount,
        total_amount: amount + (auction.shipping_cost || 0),
        shipping_cost: auction.shipping_cost || 0,
        status: 'pending',
        stripe_payment_intent_id: razorpayOrder.id // Store Razorpay order ID
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment record creation error:", paymentError);
      throw new Error("Failed to create payment record");
    }

    return new Response(JSON.stringify({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: razorpayKeyId,
      paymentId: payment.id,
      auction: {
        title: auction.title,
        description: auction.description
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in create-razorpay-order:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Helper function to get profile ID from user ID
async function getUserProfileId(supabase: any, userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  
  return profile?.id;
}

serve(handler);