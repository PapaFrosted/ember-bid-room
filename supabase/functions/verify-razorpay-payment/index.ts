import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  paymentId: string; // Our internal payment ID
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      paymentId 
    }: VerifyPaymentRequest = await req.json();

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeySecret) {
      throw new Error("Razorpay secret key not configured");
    }

    // Verify signature using Web Crypto API
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(razorpayKeySecret);
    const messageData = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Invalid payment signature");
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update payment status
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        stripe_payment_intent_id: razorpay_payment_id, // Store Razorpay payment ID
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select(`
        *,
        auction:auctions!auction_id (
          id,
          title,
          seller_id,
          winner_id
        )
      `)
      .single();

    if (paymentError || !payment) {
      throw new Error("Failed to update payment status");
    }

    // Mark auction as completed if not already done
    if (!payment.auction.winner_id) {
      await supabase
        .from('auctions')
        .update({
          winner_id: payment.buyer_id,
          status: 'ended',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.auction_id);
    }

    // Send success notification email (if configured)
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: payment.buyer.email,
          subject: `Payment Successful - ${payment.auction.title}`,
          auctionTitle: payment.auction.title,
          auctionId: payment.auction_id,
          type: 'auction_won',
          currentBid: payment.amount
        })
      });
    } catch (emailError) {
      console.log("Email notification failed:", emailError);
      // Don't fail the payment verification for email issues
    }

    return new Response(JSON.stringify({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        auction_title: payment.auction.title
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in verify-razorpay-payment:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Payment verification failed",
        success: false
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);