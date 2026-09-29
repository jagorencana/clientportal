import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 1. Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 2. Server-side proxy for Google Apps Script to bypass browser CORS / redirection issues
  app.post('/api/gas', async (req, res) => {
    try {
      const targetUrl = 
        req.body?.targetUrl || 
        process.env.VITE_GOOGLE_SCRIPT_URL || 
        'https://script.google.com/macros/s/AKfycbwnCkUHXODtKuStZvUnbdohnZyLLD9p53o6VNmMrnpWbaNaSd1PHfP3dInyOjybTdmF/exec';
      
      const payload = req.body?.payload || req.body;

      const controller = new AbortController();
      // Google Apps Script dapat cold-start dan membaca beberapa sheet sekaligus.
      // Jangan turunkan batas ini di bawah timeout operasional backend.
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const gasResponse = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
          redirect: 'follow',
        });

        clearTimeout(timeoutId);

        if (!gasResponse.ok) {
          return res.status(200).json({
            status: 'offline',
            message: `GAS HTTP ${gasResponse.status}: server fallback active`,
            fallback: true,
          });
        }

        const text = await gasResponse.text();
        try {
          const json = JSON.parse(text);
          return res.json(json);
        } catch {
          return res.json({
            status: 'success',
            rawText: text,
            message: 'Respons dari Google Apps Script diterima.',
          });
        }
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        return res.status(200).json({
          status: 'offline',
          message: 'Google Apps Script unreachable, offline fallback active.',
          fallback: true,
        });
      }
    } catch (err: any) {
      return res.status(200).json({
        status: 'offline',
        message: err?.message || 'Proxy error',
        fallback: true,
      });
    }
  });

  // 3. Duitku Sandbox Payment Gateway Endpoint
  app.post('/api/duitku/create-invoice', async (req, res) => {
    try {
      const merchantCode = process.env.DUITKU_MERCHANT_CODE || 'DS35474';
      const merchantKey = process.env.DUITKU_MERCHANT_KEY;
      if (!merchantKey) {
        return res.status(503).json({
          success: false,
          error: 'Duitku merchant key belum dikonfigurasi di environment server.',
        });
      }
      const paymentAmount = Number(req.body?.paymentAmount) || 500000;
      const merchantOrderId = req.body?.merchantOrderId || `JR-UPG-${Date.now()}`;
      const productDetails = req.body?.productDetails || 'VIP Blueprint OS (Rp 500.000)';
      const email = req.body?.email || 'client@jagorencana.com';
      const phoneNumber = req.body?.phoneNumber || '08123456789';
      const customerVaName = req.body?.customerVaName || 'Klien VIP Blueprint';
      const callbackUrl = req.body?.callbackUrl || 'https://sandbox.duitku.com/callback';
      const returnUrl = req.body?.returnUrl || 'https://sandbox.duitku.com/return';

      // Signature calculation: md5(merchantCode + merchantOrderId + paymentAmount + merchantKey)
      const signatureRaw = `${merchantCode}${merchantOrderId}${paymentAmount}${merchantKey}`;
      const signature = crypto.createHash('md5').update(signatureRaw).digest('hex');

      const response = await fetch('https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantCode,
          paymentAmount,
          paymentMethod: req.body?.paymentMethod || 'VC',
          merchantOrderId,
          productDetails,
          email,
          phoneNumber,
          additionalParam: '',
          merchantUserInfo: '',
          customerVaName,
          callbackUrl,
          returnUrl,
          signature,
          expiryPeriod: 1440,
        }),
      });

      const data = await response.json();
      return res.json({
        success: true,
        ...data,
        orderId: merchantOrderId,
        grossAmount: paymentAmount,
      });
    } catch (err: any) {
      console.error('Duitku API Error in server.ts:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to connect to Duitku Sandbox',
      });
    }
  });

  // 4. Vite middleware for development vs static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Jago Rencana Wealth OS running on http://localhost:${PORT}`);
  });
}

startServer();
