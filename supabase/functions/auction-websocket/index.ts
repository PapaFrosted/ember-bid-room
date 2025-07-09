import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

console.log('Auction WebSocket function initializing...');

try {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey });
    throw new Error('Missing required environment variables');
  }
  
  console.log('Environment variables loaded successfully');
} catch (error) {
  console.error('Failed to load environment variables:', error);
  throw error;
}

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
console.log('Supabase client created successfully');

// Store connected clients for broadcasting
const connectedClients = new Map<string, Set<WebSocket>>();

serve(async (req) => {
  try {
    console.log('Incoming request:', req.method, req.url);
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log('Handling CORS preflight request');
      return new Response(null, { headers: corsHeaders });
    }

    const { headers } = req;
    const upgradeHeader = headers.get("upgrade") || "";
    console.log('Upgrade header:', upgradeHeader);

    if (upgradeHeader.toLowerCase() !== "websocket") {
      console.log('Not a WebSocket request, returning error');
      return new Response("Expected WebSocket connection", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('Upgrading to WebSocket connection...');
    const { socket, response } = Deno.upgradeWebSocket(req);
    console.log('WebSocket upgrade successful');
  
  let auctionId: string | null = null;
  let userId: string | null = null;

  // Helper function to broadcast to all clients in an auction room
  const broadcastToRoom = (roomId: string, message: any) => {
    const clients = connectedClients.get(roomId);
    if (clients) {
      const messageStr = JSON.stringify(message);
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(messageStr);
          } catch (error) {
            console.error("Error sending message to client:", error);
          }
        }
      });
    }
  };

  socket.onopen = () => {
    console.log("WebSocket connection opened successfully");
  };

  socket.onmessage = async (event) => {
    try {
      console.log('Received WebSocket message:', event.data);
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case "join_auction":
          auctionId = message.auctionId;
          userId = message.userId;
          console.log(`User ${userId} joining auction ${auctionId}`);
          
          // Add client to room
          if (!connectedClients.has(auctionId)) {
            connectedClients.set(auctionId, new Set());
          }
          connectedClients.get(auctionId)!.add(socket);
          
          // Send current auction status
          const { data: auction } = await supabase
            .from('auctions')
            .select(`
              *,
              bids (
                id,
                amount,
                created_at,
                bidder:profiles!bidder_id (
                  full_name,
                  is_verified
                )
              )
            `)
            .eq('id', auctionId)
            .single();
            
          if (auction) {
            console.log(`Sending auction status for ${auctionId}`);
            socket.send(JSON.stringify({
              type: "auction_status",
              auction: auction,
              bids: auction.bids?.sort((a: any, b: any) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              ).slice(0, 10) // Latest 10 bids
            }));
          } else {
            console.log(`Auction ${auctionId} not found`);
          }
          break;

        case "place_bid":
          if (!auctionId || !userId) {
            console.log('Bid attempt without joining auction first');
            socket.send(JSON.stringify({
              type: "error",
              message: "Must join auction first"
            }));
            return;
          }

          const { bidAmount } = message;
          console.log(`User ${userId} placing bid of ${bidAmount} in auction ${auctionId}`);
          
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (!profile) {
            socket.send(JSON.stringify({
              type: "error",
              message: "User profile not found"
            }));
            return;
          }

          // Validate bid amount
          const { data: currentAuction } = await supabase
            .from('auctions')
            .select('current_bid, starting_bid, bid_increment, status, total_bids')
            .eq('id', auctionId)
            .single();

          if (!currentAuction || !['live', 'upcoming'].includes(currentAuction.status)) {
            socket.send(JSON.stringify({
              type: "error",
              message: "Auction is not available for bidding"
            }));
            return;
          }

          const minimumBid = currentAuction.current_bid === 0 || currentAuction.current_bid > 1000000
            ? currentAuction.starting_bid
            : currentAuction.current_bid + currentAuction.bid_increment;
          
          if (bidAmount < minimumBid) {
            socket.send(JSON.stringify({
              type: "error",
              message: `Minimum bid is $${minimumBid}`
            }));
            return;
          }

          // Place the bid
          const { data: newBid, error: bidError } = await supabase
            .from('bids')
            .insert({
              auction_id: auctionId,
              bidder_id: profile.id,
              amount: bidAmount
            })
            .select(`
              *,
              bidder:profiles!bidder_id (
                full_name,
                is_verified
              )
            `)
            .single();

          if (bidError) {
            console.error('Error placing bid:', bidError);
            socket.send(JSON.stringify({
              type: "error",
              message: "Failed to place bid"
            }));
            return;
          }

          // Update auction current_bid (only if it's a valid increase)
          const newCurrentBid = currentAuction.current_bid === 0 || currentAuction.current_bid > 1000000 
            ? bidAmount 
            : Math.max(bidAmount, currentAuction.current_bid);
            
          const { error: updateError } = await supabase
            .from('auctions')
            .update({ 
              current_bid: newCurrentBid,
              total_bids: (currentAuction.total_bids || 0) + 1
            })
            .eq('id', auctionId);

          if (updateError) {
            console.error('Error updating auction:', updateError);
          }

          console.log(`Broadcasting new bid to room ${auctionId}`);
          // Broadcast new bid to all clients in this auction room
          broadcastToRoom(auctionId, {
            type: "new_bid",
            bid: newBid,
            currentBid: newCurrentBid
          });

          break;

        case "send_message":
          if (!auctionId || !userId) {
            console.log('Chat message attempt without joining auction first');
            socket.send(JSON.stringify({
              type: "error",
              message: "Must join auction first"
            }));
            return;
          }

          const { message: chatMessage } = message;
          console.log(`User ${userId} sending chat message in auction ${auctionId}`);
          
          // Get user profile for chat
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', userId)
            .single();

          // Broadcast chat message to all clients in the room
          broadcastToRoom(auctionId, {
            type: "chat_message",
            message: {
              id: crypto.randomUUID(),
              user: userProfile?.full_name || "Anonymous",
              text: chatMessage,
              timestamp: new Date().toISOString()
            }
          });

          break;
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
      socket.send(JSON.stringify({
        type: "error",
        message: "Invalid message format"
      }));
    }
  };

  socket.onclose = () => {
    console.log(`User ${userId} disconnected from auction ${auctionId}`);
    
    // Remove client from room
    if (auctionId && connectedClients.has(auctionId)) {
      connectedClients.get(auctionId)!.delete(socket);
      if (connectedClients.get(auctionId)!.size === 0) {
        connectedClients.delete(auctionId);
      }
    }
  };

    socket.onerror = (error) => {
      console.error("WebSocket server error:", error);
    };

    return response;
  } catch (error) {
    console.error('Error in WebSocket handler:', error);
    return new Response(`WebSocket error: ${error.message}`, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});