import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Store connected clients for broadcasting
const connectedClients = new Map<string, Set<WebSocket>>();

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
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
    console.log("WebSocket connection opened");
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case "join_auction":
          auctionId = message.auctionId;
          userId = message.userId;
          console.log(`User ${userId} joined auction ${auctionId}`);
          
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
            socket.send(JSON.stringify({
              type: "auction_status",
              auction: auction,
              bids: auction.bids?.sort((a: any, b: any) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              ).slice(0, 10) // Latest 10 bids
            }));
          }
          break;

        case "place_bid":
          if (!auctionId || !userId) {
            socket.send(JSON.stringify({
              type: "error",
              message: "Must join auction first"
            }));
            return;
          }

          const { bidAmount } = message;
          
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
            .select('current_bid, bid_increment, status')
            .eq('id', auctionId)
            .single();

          if (!currentAuction || currentAuction.status !== 'live') {
            socket.send(JSON.stringify({
              type: "error",
              message: "Auction is not live"
            }));
            return;
          }

          const minimumBid = currentAuction.current_bid + currentAuction.bid_increment;
          
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
            socket.send(JSON.stringify({
              type: "error",
              message: "Failed to place bid"
            }));
            return;
          }

          // Update auction current_bid
          await supabase
            .from('auctions')
            .update({ 
              current_bid: bidAmount,
              total_bids: currentAuction.total_bids ? currentAuction.total_bids + 1 : 1
            })
            .eq('id', auctionId);

          // Broadcast new bid to all clients in this auction room
          broadcastToRoom(auctionId, {
            type: "new_bid",
            bid: newBid,
            currentBid: bidAmount
          });

          break;

        case "send_message":
          if (!auctionId || !userId) {
            socket.send(JSON.stringify({
              type: "error",
              message: "Must join auction first"
            }));
            return;
          }

          const { message: chatMessage } = message;
          
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
    console.error("WebSocket error:", error);
  };

  return response;
});