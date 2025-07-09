import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

console.log('Auction WebSocket function initializing...');

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey });
  throw new Error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.log('Supabase client created successfully');

// Store connected clients for broadcasting with user info
const connectedClients = new Map<string, Set<{ socket: WebSocket, userId: string }>>();

// Broadcasting helper with improved logging
function broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
  const clients = connectedClients.get(roomId);
  console.log(`Broadcasting to room ${roomId}:`, message);
  console.log(`Room has ${clients?.size || 0} connected clients`);
  
  if (clients) {
    const messageStr = JSON.stringify(message);
    let broadcastCount = 0;
    
    clients.forEach(({ socket, userId }) => {
      // Skip the sender if excludeUserId is provided
      if (excludeUserId && userId === excludeUserId) {
        console.log(`Skipping broadcast to sender ${userId}`);
        return;
      }
      
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(messageStr);
          broadcastCount++;
          console.log(`Message sent to user ${userId}`);
        } catch (error) {
          console.error(`Error sending message to user ${userId}:`, error);
        }
      } else {
        console.log(`Skipping closed connection for user ${userId}`);
      }
    });
    
    console.log(`Successfully broadcast to ${broadcastCount} clients`);
  } else {
    console.log(`No clients found in room ${roomId}`);
  }
}

// Connection management with user tracking
function addClientToRoom(auctionId: string, socket: WebSocket, userId: string) {
  if (!connectedClients.has(auctionId)) {
    connectedClients.set(auctionId, new Set());
  }
  connectedClients.get(auctionId)!.add({ socket, userId });
  console.log(`User ${userId} added to room ${auctionId}. Room now has ${connectedClients.get(auctionId)!.size} clients`);
}

function removeClientFromRoom(auctionId: string, socket: WebSocket, userId: string) {
  if (connectedClients.has(auctionId)) {
    const clients = connectedClients.get(auctionId)!;
    // Find and remove the specific client
    for (const client of clients) {
      if (client.socket === socket && client.userId === userId) {
        clients.delete(client);
        console.log(`User ${userId} removed from room ${auctionId}. Room now has ${clients.size} clients`);
        break;
      }
    }
    
    if (clients.size === 0) {
      connectedClients.delete(auctionId);
      console.log(`Room ${auctionId} deleted - no more clients`);
    }
  }
}

// Auction data fetcher
async function fetchAuctionStatus(auctionId: string) {
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
    
  return auction;
}

// Bid validation
async function validateBid(auctionId: string, bidAmount: number) {
  // Get the actual highest bid from bids table
  const { data: highestBid } = await supabase
    .from('bids')
    .select('amount')
    .eq('auction_id', auctionId)
    .order('amount', { ascending: false })
    .limit(1)
    .single();

  const { data: currentAuction } = await supabase
    .from('auctions')
    .select('starting_bid, bid_increment, status, total_bids')
    .eq('id', auctionId)
    .single();

  if (!currentAuction || !['live', 'upcoming'].includes(currentAuction.status)) {
    return { valid: false, error: "Auction is not available for bidding" };
  }

  // Determine minimum required bid
  const currentHighestBid = highestBid?.amount || 0;
  const minimumRequired = currentHighestBid > 0 ? currentHighestBid : currentAuction.starting_bid;
  
  if (bidAmount <= minimumRequired) {
    const errorMessage = currentHighestBid > 0
      ? `Bid must be greater than current highest bid of $${currentHighestBid.toLocaleString()}`
      : `First bid must be greater than starting bid of $${currentAuction.starting_bid.toLocaleString()}`;
    return { valid: false, error: errorMessage };
  }

  return { valid: true, auction: currentAuction };
}

// Bid placement
async function placeBid(auctionId: string, profileId: string, bidAmount: number) {
  const { data: newBid, error: bidError } = await supabase
    .from('bids')
    .insert({
      auction_id: auctionId,
      bidder_id: profileId,
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
    return { success: false, error: "Failed to place bid" };
  }

  // Update auction current_bid to the new highest bid
  const newCurrentBid = bidAmount;
  const { error: updateError } = await supabase
    .from('auctions')
    .update({ 
      current_bid: newCurrentBid,
      total_bids: (await supabase.from('auctions').select('total_bids').eq('id', auctionId).single()).data?.total_bids + 1 || 1
    })
    .eq('id', auctionId);

  if (updateError) {
    console.error('Error updating auction:', updateError);
  }

  return { success: true, bid: newBid, currentBid: newCurrentBid };
}

// User profile fetcher
async function getUserProfile(userId: string, selectFields = 'id') {
  const { data: profile } = await supabase
    .from('profiles')
    .select(selectFields)
    .eq('user_id', userId)
    .single();
  
  return profile;
}

// Improved chat message handler
async function createChatMessage(userId: string, messageText: string) {
  const userProfile = await getUserProfile(userId, 'full_name');
  
  return {
    id: crypto.randomUUID(),
    user: userProfile?.full_name || "Anonymous",
    text: messageText,
    timestamp: new Date().toISOString()
  };
}

// Message handlers with improved logging
async function handleJoinAuction(socket: WebSocket, auctionId: string, userId: string) {
  console.log(`User ${userId} joining auction ${auctionId}`);
  
  addClientToRoom(auctionId, socket, userId);
  
  const auction = await fetchAuctionStatus(auctionId);
  
  if (auction) {
    console.log(`Sending auction status for ${auctionId} to user ${userId}`);
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
}

async function handlePlaceBid(socket: WebSocket, auctionId: string, userId: string, bidAmount: number) {
  console.log(`User ${userId} placing bid of ${bidAmount} in auction ${auctionId}`);
  
  const profile = await getUserProfile(userId);
  if (!profile) {
    socket.send(JSON.stringify({
      type: "error",
      message: "User profile not found"
    }));
    return;
  }

  const validation = await validateBid(auctionId, bidAmount);
  if (!validation.valid) {
    socket.send(JSON.stringify({
      type: "error",
      message: validation.error
    }));
    return;
  }

  const result = await placeBid(auctionId, profile.id, bidAmount);
  if (!result.success) {
    socket.send(JSON.stringify({
      type: "error",
      message: result.error
    }));
    return;
  }

  console.log(`Broadcasting new bid to room ${auctionId}`);
  broadcastToRoom(auctionId, {
    type: "new_bid",
    bid: result.bid,
    currentBid: result.currentBid
  });
}

// Fixed chat message handler - broadcast to ALL clients including sender
async function handleSendMessage(socket: WebSocket, auctionId: string, userId: string, messageText: string) {
  console.log(`User ${userId} sending chat message in auction ${auctionId}: "${messageText}"`);
  
  const chatMessageObj = await createChatMessage(userId, messageText);
  
  console.log(`Broadcasting chat message to ALL clients in room ${auctionId}:`, chatMessageObj);
  console.log(`Current clients in room ${auctionId}:`, connectedClients.get(auctionId)?.size || 0);
  
  // Broadcast to ALL clients (including sender) - don't exclude anyone
  broadcastToRoom(auctionId, {
    type: "chat_message",
    message: chatMessageObj
  });
}

// WebSocket message router
async function handleWebSocketMessage(
  socket: WebSocket, 
  message: any, 
  auctionId: string | null, 
  userId: string | null
) {
  switch (message.type) {
    case "join_auction":
      return { 
        auctionId: message.auctionId, 
        userId: message.userId,
        handler: () => handleJoinAuction(socket, message.auctionId, message.userId)
      };

    case "place_bid":
      if (!auctionId || !userId) {
        socket.send(JSON.stringify({
          type: "error",
          message: "Must join auction first"
        }));
        return null;
      }
      return { 
        auctionId, 
        userId,
        handler: () => handlePlaceBid(socket, auctionId, userId, message.bidAmount)
      };

    case "send_message":
      if (!auctionId || !userId) {
        socket.send(JSON.stringify({
          type: "error",
          message: "Must join auction first"
        }));
        return null;
      }
      return { 
        auctionId, 
        userId,
        handler: () => handleSendMessage(socket, auctionId, userId, message.message)
      };

    default:
      socket.send(JSON.stringify({
        type: "error",
        message: "Unknown message type"
      }));
      return null;
  }
}

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

    socket.onopen = () => {
      console.log("WebSocket connection opened successfully");
    };

    socket.onmessage = async (event) => {
      try {
        console.log('Received WebSocket message:', event.data);
        const message = JSON.parse(event.data);
        
        const result = await handleWebSocketMessage(socket, message, auctionId, userId);
        
        if (result) {
          auctionId = result.auctionId;
          userId = result.userId;
          await result.handler();
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
      
      if (auctionId && userId) {
        removeClientFromRoom(auctionId, socket, userId);
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
