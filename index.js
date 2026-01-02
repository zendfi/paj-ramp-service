import express from 'express';
import cors from 'cors';
import {
  initializeSDK,
  initiate,
  verify,
  getAllRate,
  getRateByAmount,
  createOnrampOrder,
  createOfframpOrder,
  getBanks,
  resolveBankAccount,
  getTransaction,
  Environment,
} from 'paj_ramp';

const app = express();
const PORT = process.env.PORT || process.env.PAJ_SERVICE_PORT;
const PAJ_API_KEY = process.env.PAJ_BUSINESS_API_KEY;
const PAJ_ENVIRONMENT = process.env.PAJ_ENVIRONMENT || 'production';

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const environment = PAJ_ENVIRONMENT === 'production' ? Environment.Production : Environment.Staging;
initializeSDK(environment);

console.log(`PAJ Ramp Service initialized`);
console.log(`Environment: ${PAJ_ENVIRONMENT}`);
console.log(`API Key: ${PAJ_API_KEY ? '***' + PAJ_API_KEY.slice(-4) : 'NOT SET'}`);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: PAJ_ENVIRONMENT });
});

app.get('/rates', async (req, res) => {
  try {
    const rates = await getAllRate();
    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    console.error('Error getting rates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get rates'
    });
  }
});

app.post('/rates/calculate', async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    const calculation = await getRateByAmount(amount);
    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Error calculating rate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate rate'
    });
  }
});

app.post('/session/initiate', async (req, res) => {
  try {
    const { contact } = req.body;
    
    if (!contact) {
      return res.status(400).json({
        success: false,
        error: 'Contact (email or phone) is required'
      });
    }
    
    const result = await initiate(contact, PAJ_API_KEY);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error initiating session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate session'
    });
  }
});

app.post('/session/verify', async (req, res) => {
  try {
    const { contact, otp, deviceInfo } = req.body;
    
    if (!contact || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Contact and OTP are required'
      });
    }
    
    const device = deviceInfo || {
      uuid: `device-${Date.now()}`,
      device: 'Server',
      os: 'Linux',
      browser: 'Node.js',
      ip: req.ip || '0.0.0.0',
    };
    
    const result = await verify(contact, otp, device, PAJ_API_KEY);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify session'
    });
  }
});

app.get('/banks', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'Session token required'
      });
    }
    
    const banks = await getBanks(sessionToken);
    res.json({
      success: true,
      data: banks
    });
  } catch (error) {
    console.error('Error getting banks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get banks'
    });
  }
});

app.post('/banks/resolve', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    const { bankId, accountNumber } = req.body;
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'Session token required'
      });
    }
    
    if (!bankId || !accountNumber) {
      return res.status(400).json({
        success: false,
        error: 'Bank ID and account number are required'
      });
    }
    
    const accountDetails = await resolveBankAccount(sessionToken, bankId, accountNumber);
    res.json({
      success: true,
      data: accountDetails
    });
  } catch (error) {
    console.error('Error resolving bank account:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resolve bank account'
    });
  }
});

app.post('/orders/onramp', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'Session token required'
      });
    }
    
    const { fiatAmount, currency, recipient, mint, chain, webhookURL } = req.body;
    
    if (!fiatAmount || !recipient || !mint || !chain) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: fiatAmount, recipient, mint, chain'
      });
    }
    
    const orderData = {
      fiatAmount,
      currency: currency || 'USD',
      recipient,
      mint,
      chain,
      ...(webhookURL && { webhookURL })
    };
    
    const order = await createOnrampOrder(orderData, sessionToken);
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error creating onramp order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create onramp order'
    });
  }
});

app.post('/orders/offramp', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'Session token required'
      });
    }
    
    const { amount, currency, bank, accountNumber, mint, webhookURL } = req.body;
    
    if (!amount || !bank || !accountNumber || !mint) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: amount, bank, accountNumber, mint'
      });
    }
    
    const orderData = {
      amount,
      currency: currency || 'USD',
      bank,
      accountNumber,
      mint,
      ...(webhookURL && { webhookURL })
    };
    
    const order = await createOfframpOrder(orderData, sessionToken);
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error creating offramp order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create offramp order'
    });
  }
});

app.get('/transactions/:orderId', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    const { orderId } = req.params;
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'Session token required'
      });
    }
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }
    
    const transaction = await getTransaction(sessionToken, orderId);
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get transaction'
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`PAJ Ramp Service listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
