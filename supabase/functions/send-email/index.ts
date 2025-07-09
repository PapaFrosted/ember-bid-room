import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailNotificationRequest {
  to: string;
  subject: string;
  auctionTitle: string;
  auctionId: string;
  type: 'auction_starting' | 'outbid' | 'auction_ending' | 'auction_won' | 'auction_lost';
  currentBid?: number;
  nextBidAmount?: number;
}

const getEmailTemplate = (data: EmailNotificationRequest) => {
  const baseUrl = "https://your-app-url.com"; // Replace with your actual domain

  switch (data.type) {
    case 'auction_starting':
      return {
        subject: `🔥 Auction Starting: ${data.auctionTitle}`,
        html: `
          <h1>The auction you're watching is about to start!</h1>
          <h2>${data.auctionTitle}</h2>
          <p>The auction is starting soon. Don't miss your chance to bid!</p>
          <a href="${baseUrl}/auction/${data.auctionId}" 
             style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Join Auction
          </a>
        `,
      };

    case 'outbid':
      return {
        subject: `⚠️ You've been outbid on ${data.auctionTitle}`,
        html: `
          <h1>You've been outbid!</h1>
          <h2>${data.auctionTitle}</h2>
          <p>Current highest bid: <strong>$${data.currentBid?.toLocaleString()}</strong></p>
          <p>Place a bid of at least <strong>$${data.nextBidAmount?.toLocaleString()}</strong> to get back in the lead!</p>
          <a href="${baseUrl}/auction/${data.auctionId}" 
             style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Bid Now
          </a>
        `,
      };

    case 'auction_ending':
      return {
        subject: `⏰ Last chance: ${data.auctionTitle} ending soon`,
        html: `
          <h1>Auction ending in 30 minutes!</h1>
          <h2>${data.auctionTitle}</h2>
          <p>This is your last chance to bid on this item.</p>
          <p>Current highest bid: <strong>$${data.currentBid?.toLocaleString()}</strong></p>
          <a href="${baseUrl}/auction/${data.auctionId}" 
             style="background: linear-gradient(135deg, #f59e0b, #f97316); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Bid Now
          </a>
        `,
      };

    case 'auction_won':
      return {
        subject: `🎉 Congratulations! You won ${data.auctionTitle}`,
        html: `
          <h1>Congratulations! You won the auction!</h1>
          <h2>${data.auctionTitle}</h2>
          <p>Winning bid: <strong>$${data.currentBid?.toLocaleString()}</strong></p>
          <p>Please proceed to payment to complete your purchase.</p>
          <a href="${baseUrl}/auction/${data.auctionId}/payment" 
             style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Complete Payment
          </a>
        `,
      };

    case 'auction_lost':
      return {
        subject: `😔 Auction ended: ${data.auctionTitle}`,
        html: `
          <h1>The auction has ended</h1>
          <h2>${data.auctionTitle}</h2>
          <p>Unfortunately, you didn't win this auction.</p>
          <p>Final winning bid: <strong>$${data.currentBid?.toLocaleString()}</strong></p>
          <p>Don't worry! There are always more great items to bid on.</p>
          <a href="${baseUrl}/auctions" 
             style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Browse More Auctions
          </a>
        `,
      };

    default:
      return {
        subject: data.subject,
        html: `<p>EmberBid notification</p>`,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: EmailNotificationRequest = await req.json();
    const template = getEmailTemplate(data);

    const emailResponse = await resend.emails.send({
      from: "EmberBid <notifications@resend.dev>", // Change to your verified domain
      to: [data.to],
      subject: template.subject,
      html: template.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);