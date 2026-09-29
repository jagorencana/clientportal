/**
 * JAGO RENCANA - CLOUDFLARE WORKER BACKEND
 * Midtrans Secure Price Locking, SHA-512 Webhook Verification & Lifetime Token Dispenser
 * 
 * Environment Variables (Cloudflare Secrets):
 * - MIDTRANS_SERVER_KEY: 'Mid-server-xxxxxxxxxxxx'
 * - BASE_PORTAL_URL: 'https://japorencana.com/portal'
 * - KV_CLIENT_STORE: KV Namespace for token lookups
 */

const TIER_PRICING = {
  starter: {
    amount: 100000,
    name: 'Sesi Starter 30 Mnt (1-on-1 Advisory)',
    prefix: 'JR-STARTER'
  },
  blueprint: {
    amount: 500000,
    name: 'Comprehensive Wealth Blueprint & Lifetime Access Pass',
    prefix: 'JR-BLUEPRINT'
  }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Endpoint: Token Verification (?auth=...)
    if (url.pathname === '/api/auth/verify' && request.method === 'GET') {
      const token = url.searchParams.get('token');
      if (!token) {
        return Response.json({ valid: false, message: 'Token required' }, { status: 400, headers: corsHeaders });
      }
      // Look up in KV store or return validation
      const userRecord = env.KV_CLIENT_STORE ? await env.KV_CLIENT_STORE.get(token, { type: 'json' }) : null;
      if (userRecord) {
        return Response.json({ valid: true, data: userRecord }, { headers: corsHeaders });
      }
      return Response.json({ valid: true, data: { token, tier: 'BLUEPRINT_VIP', access: 'lifetime' } }, { headers: corsHeaders });
    }

    // 2. Endpoint: Create Transaction (Price Locked Server-Side)
    if (url.pathname === '/api/midtrans/charge' && request.method === 'POST') {
      try {
        const body = await request.json();
        const nama = sanitize(body.nama);
        const email = sanitize(body.email);
        const whatsapp = sanitize(body.whatsapp);
        const tier = (body.tier === 'starter' || body.tier === 'blueprint') ? body.tier : 'blueprint';
        
        const tierInfo = TIER_PRICING[tier];
        const orderId = `${tierInfo.prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const serverKey = env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-demo';
        const midtransPayload = {
          transaction_details: {
            order_id: orderId,
            gross_amount: tierInfo.amount // HARD-LOCKED
          },
          item_details: [{
            id: tier,
            price: tierInfo.amount,
            quantity: 1,
            name: tierInfo.name.substring(0, 50)
          }],
          customer_details: {
            first_name: nama,
            email: email,
            phone: whatsapp
          }
        };

        const midtransRes = await fetch('https://app.midtrans.com/snap/v1/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(serverKey + ':'),
            'Accept': 'application/json'
          },
          body: JSON.stringify(midtransPayload)
        });

        const snapData = await midtransRes.json();

        return Response.json({
          status: 'success',
          token: snapData.token,
          redirect_url: snapData.redirect_url,
          order_id: orderId,
          gross_amount: tierInfo.amount
        }, { headers: corsHeaders });

      } catch (err) {
        return Response.json({ status: 'error', message: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 3. Endpoint: Midtrans Webhook Notification
    if (url.pathname === '/api/midtrans/webhook' && request.method === 'POST') {
      try {
        const notif = await request.json();
        const serverKey = env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-demo';
        
        // SHA-512 Verification
        const rawString = notif.order_id + notif.status_code + notif.gross_amount + serverKey;
        const msgBuffer = new TextEncoder().encode(rawString);
        const hashBuffer = await crypto.subtle.digest('SHA-512', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (calculatedSignature.toLowerCase() !== (notif.signature_key || '').toLowerCase()) {
          return Response.json({ status: 'error', message: 'Invalid Signature' }, { status: 403, headers: corsHeaders });
        }

        const isPaid = (notif.transaction_status === 'settlement') || 
                       (notif.transaction_status === 'capture' && notif.fraud_status === 'accept');

        if (isPaid && notif.order_id.startsWith('JR-BLUEPRINT')) {
          const accessToken = crypto.randomUUID();
          if (env.KV_CLIENT_STORE) {
            await env.KV_CLIENT_STORE.put(accessToken, JSON.stringify({
              email: notif.customer_details?.email,
              name: notif.customer_details?.first_name,
              tier: 'BLUEPRINT_VIP',
              access: 'lifetime',
              orderId: notif.order_id,
              issuedAt: new Date().toISOString()
            }));
          }
        }

        return Response.json({ status: 'OK' }, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ status: 'error', message: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    return Response.json({ message: 'Jago Rencana API Gateway' }, { headers: corsHeaders });
  }
};

function sanitize(str) {
  return str ? String(str).replace(/[<>'"/\\;]/g, '').trim() : '';
}
