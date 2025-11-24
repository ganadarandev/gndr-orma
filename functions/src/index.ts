import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Busboy from 'busboy';
import ExcelJS from 'exceljs';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

// Express app setup
const app = express();

// CORS configuration for Gen2 Cloud Functions - explicitly allow Firebase Hosting domains
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'https://gndr-orma.web.app',
      'https://gndr-orma.firebaseapp.com'
    ];

    if (!origin || allowedOrigins.includes(origin) || /^https:\/\/gndr-orma--.*\.web\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

// Create middleware instances (will be applied per-route, not globally)
const jsonParser = express.json();
const urlencodedParser = express.urlencoded({ extended: true });

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ==================== Auth Middleware ====================
const verifyToken = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Not authenticated' });
    }

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);

    // Get user from Firestore
    const userDoc = await db.collection('users').doc(decoded.sub).get();
    if (!userDoc.exists) {
      return res.status(401).json({ detail: 'User not found' });
    }

    req.user = { username: userDoc.id, ...userDoc.data() };
    next();
  } catch (error) {
    return res.status(401).json({ detail: 'Invalid token' });
  }
};

// ==================== Auth Endpoints ====================

// Login endpoint - accepts URL-encoded form data
app.post('/token', urlencodedParser, async (req, res) => {
  try {
    console.log('=== Login attempt ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);

    const username = req.body.username;
    const password = req.body.password;

    console.log('Extracted username:', username);
    console.log('Password provided:', !!password, 'Length:', password?.length);

    if (!username || !password) {
      console.log('Missing credentials - username:', !!username, 'password:', !!password);
      return res.status(422).json({ detail: 'Username and password required' });
    }

    console.log('Querying Firestore for user:', username);
    // Get user from Firestore
    const userDoc = await db.collection('users').doc(username).get();
    console.log('User exists in Firestore:', userDoc.exists);

    if (!userDoc.exists) {
      console.log('User not found in database');
      return res.status(401).json({ detail: 'Incorrect username or password' });
    }

    const userData = userDoc.data();
    console.log('User data retrieved, has hashed_password:', !!userData?.hashed_password);

    // Verify password
    console.log('Comparing password with hash...');
    const isValidPassword = await bcrypt.compare(password, userData?.hashed_password || '');
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ detail: 'Incorrect username or password' });
    }

    // Create JWT token
    console.log('Creating JWT token...');
    const token = jwt.sign(
      { sub: username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('JWT token created successfully');

    console.log('Login successful for user:', username);
    return res.json({
      access_token: token,
      token_type: 'bearer'
    });
  } catch (error: any) {
    console.error('=== Login error ===');
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    return res.status(500).json({ detail: error?.message || 'Internal server error' });
  }
});

// Get current user
app.get('/users/me', verifyToken, async (req: any, res) => {
  try {
    return res.json({
      username: req.user.username,
      is_active: req.user.is_active ?? true
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ==================== Client Management Endpoints ====================

// Upload clients from Excel
app.post('/clients/upload', verifyToken, jsonParser, async (req: any, res) => {
  try {
    let fileBuffer: Buffer | null = null;

    // Check if request has base64 encoded file
    if (req.body && req.body.file) {
      // Handle base64 encoded file
      const base64Data = req.body.file.replace(/^data:.*;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else if (req.headers['content-type']?.includes('multipart/form-data')) {
      // Handle multipart form data
      const busboy = Busboy({ headers: req.headers });

      await new Promise<void>((resolve, reject) => {
        busboy.on('file', (fieldname: string, file: any, info: any) => {
          const chunks: Buffer[] = [];

          file.on('data', (data: Buffer) => {
            chunks.push(data);
          });

          file.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
          });
        });

        busboy.on('finish', resolve);
        busboy.on('error', reject);

        req.pipe(busboy);
      });
    } else {
      return res.status(400).json({ detail: 'No file provided. Send as base64 or multipart/form-data' });
    }

    if (!fileBuffer) {
      return res.status(400).json({ detail: 'No file uploaded' });
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);

      const worksheet = workbook.worksheets[0];
      const clients: any[] = [];

      // Skip header row, start from row 2
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const values = row.values as any[];

        if (values.length > 1 && values[1]) { // Check if code exists
          // Map all 26 columns from the Excel file
          clients.push({
            // Column 0: Code
            code: String(values[1] || '').trim(),
            // Column 1: 업체명
            company_name: String(values[2] || '').trim(),
            // Column 2: 아이디
            client_id: String(values[3] || '').trim(),
            // Column 3: 담당MD
            md_in_charge: String(values[4] || '').trim(),
            // Column 4: 대표이사
            representative: String(values[5] || '').trim(),
            // Column 5: 사업자등록번호
            business_number: String(values[6] || '').trim(),
            // Column 6: 업태
            business_type: String(values[7] || '').trim(),
            // Column 7: 업종
            business_category: String(values[8] || '').trim(),
            // Column 8: 추가코드1
            additional_code1: String(values[9] || '').trim(),
            // Column 9: 추가코드2
            additional_code2: String(values[10] || '').trim(),
            // Column 10: 담당자
            contact_person: String(values[11] || '').trim(),
            // Column 11: 우편번호
            postal_code: String(values[12] || '').trim(),
            // Column 12: 주소
            address: String(values[13] || '').trim(),
            // Column 13: 상세주소
            detailed_address: String(values[14] || '').trim(),
            // Column 14: 연락처
            phone: String(values[15] || '').trim(),
            // Column 15: 휴대폰번호
            mobile_phone: String(values[16] || '').trim(),
            // Column 16: 이메일
            email: String(values[17] || '').trim(),
            // Column 17: 비고
            notes: String(values[18] || '').trim(),
            // Column 18: 그룹
            group_name: String(values[19] || '').trim(),
            // Column 19: 계좌번호
            account_number: String(values[20] || '').trim(),
            // Column 20: 은행
            bank_name: String(values[21] || '').trim(),
            // Column 21: 예금주
            account_holder: String(values[22] || '').trim(),
            // Column 22: 잔
            balance: String(values[23] || '0').trim(),
            // Column 23: 사입서비스 사용
            purchase_service: String(values[24] || '0').trim(),
            // Column 24: 입고대기 자동계산
            auto_calculation: String(values[25] || '0').trim(),
            // Column 25: 사용안함
            is_disabled: String(values[26] || '0').trim() === '1',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      // Batch write to Firestore
      const batch = db.batch();
      let addedCount = 0;
      let updatedCount = 0;

      for (const client of clients) {
        if (!client.code) continue;

        const clientRef = db.collection('clients').doc(client.code);
        const existingDoc = await clientRef.get();

        if (existingDoc.exists) {
          batch.update(clientRef, {
            ...client,
            created_at: existingDoc.data()?.created_at,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          updatedCount++;
        } else {
          batch.set(clientRef, client);
          addedCount++;
        }
      }

      await batch.commit();

      return res.json({
        message: 'Clients uploaded successfully',
        added: addedCount,
        updated: updatedCount,
        total: addedCount + updatedCount
      });
    } catch (error: any) {
      console.error('Error processing Excel file:', error);
      return res.status(400).json({
        detail: 'Failed to process Excel file',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Client upload error:', error);
    return res.status(500).json({ detail: 'Failed to upload clients' });
  }
});

// List clients with optional search
app.get('/clients', verifyToken, async (req: any, res) => {
  try {
    const search = req.query.search as string | undefined;

    let query = db.collection('clients').orderBy('company_name');

    if (search && search.trim()) {
      // Firestore doesn't support full-text search, so we'll filter in memory
      const snapshot = await query.get();
      const clients = snapshot.docs
        .map(doc => ({ code: doc.id, ...doc.data() }))
        .filter((client: any) =>
          client.company_name?.includes(search) ||
          client.code?.includes(search) ||
          client.representative?.includes(search)
        );

      return res.json({ clients, total: clients.length });
    }

    const snapshot = await query.get();
    const clients = snapshot.docs.map(doc => ({ code: doc.id, ...doc.data() }));

    return res.json({ clients, total: clients.length });
  } catch (error) {
    console.error('List clients error:', error);
    return res.status(500).json({ detail: 'Failed to list clients' });
  }
});

// List clients endpoint (alias for compatibility)
app.get('/clients/list', verifyToken, async (req: any, res) => {
  try {
    const includeDisabled = req.query.include_disabled === 'true';
    const search = req.query.search as string | undefined;

    let query = db.collection('clients').orderBy('company_name');

    if (search && search.trim()) {
      const snapshot = await query.get();
      const clients = snapshot.docs
        .map(doc => ({ code: doc.id, ...doc.data() }))
        .filter((client: any) => {
          const matchesSearch = client.company_name?.includes(search) ||
            client.code?.includes(search) ||
            client.representative?.includes(search);

          if (!includeDisabled) {
            return matchesSearch && client.is_active !== false;
          }
          return matchesSearch;
        });

      return res.json({ clients, total: clients.length });
    }

    const snapshot = await query.get();
    let clients = snapshot.docs.map(doc => ({ code: doc.id, ...doc.data() }));

    if (!includeDisabled) {
      clients = clients.filter((client: any) => client.is_active !== false);
    }

    return res.json({ clients, total: clients.length });
  } catch (error) {
    console.error('List clients error:', error);
    return res.status(500).json({ detail: 'Failed to list clients' });
  }
});

// Get single client
app.get('/clients/:code', verifyToken, async (req: any, res) => {
  try {
    const { code } = req.params;

    const clientDoc = await db.collection('clients').doc(code).get();

    if (!clientDoc.exists) {
      return res.status(404).json({ detail: 'Client not found' });
    }

    return res.json({ code: clientDoc.id, ...clientDoc.data() });
  } catch (error) {
    console.error('Get client error:', error);
    return res.status(500).json({ detail: 'Failed to get client' });
  }
});

// Update client
app.put('/clients/:code', jsonParser, verifyToken, async (req: any, res) => {
  try {
    const { code } = req.params;
    const clientData = req.body;

    const clientRef = db.collection('clients').doc(code);
    const clientDoc = await clientRef.get();

    if (!clientDoc.exists) {
      return res.status(404).json({ detail: 'Client not found' });
    }

    await clientRef.update({
      ...clientData,
      code, // Ensure code doesn't change
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedDoc = await clientRef.get();
    return res.json({ code: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Update client error:', error);
    return res.status(500).json({ detail: 'Failed to update client' });
  }
});

// Delete client
app.delete('/clients/:code', verifyToken, async (req: any, res) => {
  try {
    const { code } = req.params;

    const clientRef = db.collection('clients').doc(code);
    const clientDoc = await clientRef.get();

    if (!clientDoc.exists) {
      return res.status(404).json({ detail: 'Client not found' });
    }

    await clientRef.delete();

    return res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    return res.status(500).json({ detail: 'Failed to delete client' });
  }
});

// ==================== Excel Upload Endpoints ====================

// Upload Excel file - Using JSON with base64 encoding for Gen2 compatibility
app.post('/excel/upload', verifyToken, jsonParser, async (req: any, res) => {
  console.log('=== Excel Upload Started (Base64) ===');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body keys:', Object.keys(req.body || {}));

  try {
    // Check if it's a multipart upload (legacy support)
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      console.log('Multipart upload detected, using Busboy...');
      const busboy = Busboy({ headers: req.headers });
      let fileBuffer: Buffer | null = null;
      let filename = '';
      let hasError = false;

      busboy.on('file', (fieldname: string, file: any, info: any) => {
        console.log('File detected:', { fieldname, filename: info.filename, mimeType: info.mimeType });
        filename = info.filename;
        const chunks: Buffer[] = [];

        file.on('data', (data: Buffer) => {
          chunks.push(data);
        });

        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
          console.log('File stream ended. Buffer size:', fileBuffer.length);
        });

        file.on('error', (err: any) => {
          console.error('File stream error:', err);
          hasError = true;
        });
      });

      busboy.on('finish', async () => {
        console.log('Busboy finished. hasError:', hasError, 'fileBuffer:', !!fileBuffer);

        if (hasError) {
          return res.status(500).json({ detail: 'Error during file upload' });
        }

        if (!fileBuffer) {
          console.log('No file buffer received');
          return res.status(400).json({ detail: 'No file uploaded' });
        }

        console.log('Processing uploaded file:', filename, 'Size:', fileBuffer.length);
        await processExcelFile(fileBuffer, filename, res);
      });

      busboy.on('error', (err: any) => {
        console.error('Busboy error:', err);
        if (!res.headersSent) {
          return res.status(500).json({ detail: 'Upload stream error', error: err.message });
        }
      });

      // Directly pipe request to busboy
      req.pipe(busboy);
    } else {
      // Handle JSON with base64 encoded file
      console.log('JSON upload detected, using base64...');

      if (!req.body || !req.body.file) {
        return res.status(400).json({ detail: 'No file data provided' });
      }

      const { file, filename = 'upload.xlsx' } = req.body;

      // Decode base64 to buffer
      const fileBuffer = Buffer.from(file, 'base64');
      console.log('Decoded file size:', fileBuffer.length);

      await processExcelFile(fileBuffer, filename, res);
    }
  } catch (error: any) {
    console.error('=== Excel Upload Error ===');
    console.error('Error:', error);
    return res.status(500).json({
      detail: 'Upload failed',
      error: error?.message
    });
  }
});

// Helper function to process Excel file
async function processExcelFile(fileBuffer: Buffer, filename: string, res: any) {
  try {
    // Process Excel file directly from memory
    const workbook = new ExcelJS.Workbook();
    console.log('Loading Excel workbook...');
    await workbook.xlsx.load(fileBuffer as any);
    console.log('Excel workbook loaded successfully');

    const sheets: any[] = [];

    // Process only first 3 sheets
    let sheetCount = 0;
    workbook.eachSheet((worksheet, sheetId) => {
      // Only process first 3 sheets
      if (sheetCount >= 3) return;
      sheetCount++;

      const data: any[][] = [];

      worksheet.eachRow((row) => {
        const values = row.values as any[];
        // ExcelJS has empty index 0, so we need to handle this properly
        // We'll process all values including those that might be undefined
        const processedValues = [];

        // Start from index 1 (ExcelJS convention) and go to the maximum column
        for (let i = 1; i < values.length; i++) {
          const val = values[i];

          // Handle undefined/null - preserve them as empty cells
          if (val === undefined || val === null) {
            processedValues.push(val);
            continue;
          }

          // Handle Rich Text
          if (val && typeof val === 'object' && val.richText) {
            processedValues.push(val.richText.map((rt: any) => rt.text).join(''));
            continue;
          }

          // Handle formula results
          if (val && typeof val === 'object' && 'result' in val) {
            processedValues.push(val.result);
            continue;
          }

          // Handle hyperlinks
          if (val && typeof val === 'object' && 'text' in val) {
            processedValues.push(val.text);
            continue;
          }

          // Handle Date objects
          if (val instanceof Date) {
            processedValues.push(val.toISOString());
            continue;
          }

          // Handle any other objects - convert to string or extract value
          if (val && typeof val === 'object') {
            // Try to extract a meaningful value from the object
            if (val.toString && typeof val.toString === 'function' && val.toString() !== '[object Object]') {
              processedValues.push(val.toString());
            } else if (val.value !== undefined) {
              processedValues.push(val.value);
            } else {
              // If we can't extract a meaningful value, just push empty string
              processedValues.push('');
            }
            continue;
          }

          // Return primitive values as-is
          processedValues.push(val);
        }

        data.push(processedValues);
      });

      sheets.push({
        name: worksheet.name,
        data: data
      });
    });

    console.log('Processed', sheets.length, 'sheets');

    return res.json({
      success: true,
      sheets: sheets,
      filename: filename
    });
  } catch (error: any) {
    console.error('=== Excel Processing Error ===');
    console.error('Error:', error);
    return res.status(500).json({
      detail: 'Failed to process excel file',
      error: error?.message
    });
  }
}

// Helper function to extract building name from address
const extractBuilding = (address: string): string => {
  if (!address) return '';
  const match = address.match(/^([가-힣a-zA-Z0-9\s]+?)(?:\s+[0-9B]+층|$)/);
  if (match) {
    return match[1].trim();
  }
  return address.split(/\s+/)[0] || '';
};

// Helper function to extract floor number
const extractFloor = (address: string): number => {
  if (!address) return 0;
  const match = address.match(/(B)?(\d+)층?/);
  if (match) {
    const floorNum = parseInt(match[2], 10);
    return match[1] ? -floorNum : floorNum; // Basement floors are negative
  }
  return 0;
};

// Upload order receipt - Using JSON with base64 encoding for Gen2 compatibility
app.post('/excel/upload-order-receipt', verifyToken, jsonParser, async (req: any, res) => {
  console.log('=== Order Receipt Upload Started ===');
  console.log('Content-Type:', req.headers['content-type']);

  try {
    // Check if it's a multipart upload (legacy support)
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      const busboy = Busboy({ headers: req.headers });
      let fileBuffer: Buffer | null = null;
      let filename = '';

      busboy.on('file', (fieldname: string, file: any, info: any) => {
        filename = info.filename;
        const chunks: Buffer[] = [];

        file.on('data', (data: Buffer) => {
          chunks.push(data);
        });

        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      busboy.on('finish', async () => {
        if (!fileBuffer) {
          return res.status(400).json({ detail: 'No file uploaded' });
        }

        console.log('Processing order receipt file (multipart):', filename, 'Size:', fileBuffer.length);
        await processOrderReceipt(fileBuffer, filename, res);
      });

      req.pipe(busboy);
    } else {
      // Handle JSON with base64 encoded file
      console.log('JSON upload detected, using base64...');

      if (!req.body || !req.body.file) {
        return res.status(400).json({ detail: 'No file data provided' });
      }

      const { file, filename = 'upload.xlsx' } = req.body;

      // Decode base64 to buffer
      const fileBuffer = Buffer.from(file, 'base64');
      console.log('Decoded file size:', fileBuffer.length);

      await processOrderReceipt(fileBuffer, filename, res);
    }
  } catch (error: any) {
    console.error('Order receipt upload error:', error);
    return res.status(500).json({ detail: error.message || 'Failed to upload order receipt' });
  }
});

// Helper function to process order receipt
async function processOrderReceipt(fileBuffer: Buffer, filename: string, res: any) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const worksheet = workbook.worksheets[0];
    const data: any[][] = [];

    worksheet.eachRow((row) => {
      const values = row.values as any[];
      const processedValues = values.slice(1).map(val => {
        // Handle undefined/null
        if (val === undefined || val === null) return val;

        // Handle Rich Text
        if (val && typeof val === 'object' && val.richText) {
          return val.richText.map((rt: any) => rt.text).join('');
        }

        // Handle formula results
        if (val && typeof val === 'object' && 'result' in val) {
          return val.result;
        }

        // Handle hyperlinks
        if (val && typeof val === 'object' && 'text' in val) {
          return val.text;
        }

        // Handle Date objects
        if (val instanceof Date) {
          return val.toISOString();
        }

        // Handle any other objects - convert to string or extract value
        if (val && typeof val === 'object') {
          // Try to extract a meaningful value from the object
          if (val.toString && typeof val.toString === 'function' && val.toString() !== '[object Object]') {
            return val.toString();
          } else if (val.value !== undefined) {
            return val.value;
          } else {
            // If we can't extract a meaningful value, just push empty string
            return '';
          }
        }

        // Return primitive values as-is
        return val;
      });
      data.push(processedValues);
    });

    // Return data as is, without sorting
    // The frontend expects the row order to match the uploaded file for direct merging
    const sortedData = data;

    return res.json({
      success: true,
      data: sortedData
    });
  } catch (error) {
    console.error('Process order receipt error:', error);
    throw error;
  }
}

// Upload receipt slip - Using JSON with base64 encoding for Gen2 compatibility
app.post('/excel/upload-receipt-slip', verifyToken, jsonParser, async (req: any, res) => {
  console.log('=== Receipt Slip Upload Started ===');
  console.log('Content-Type:', req.headers['content-type']);

  try {
    // Check if it's a multipart upload (legacy support)
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      const busboy = Busboy({ headers: req.headers });
      let fileBuffer: Buffer | null = null;
      let filename = '';

      busboy.on('file', (fieldname: string, file: any, info: any) => {
        filename = info.filename;
        const chunks: Buffer[] = [];

        file.on('data', (data: Buffer) => {
          chunks.push(data);
        });

        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      busboy.on('finish', async () => {
        if (!fileBuffer) {
          return res.status(400).json({ detail: 'No file uploaded' });
        }

        console.log('Processing receipt slip file (multipart):', filename, 'Size:', fileBuffer.length);
        await processReceiptSlip(fileBuffer, filename, res);
      });

      req.pipe(busboy);
    } else {
      // Handle JSON with base64 encoded file
      console.log('JSON upload detected, using base64...');

      if (!req.body || !req.body.file) {
        return res.status(400).json({ detail: 'No file data provided' });
      }

      const { file, filename = 'upload.xlsx' } = req.body;

      // Decode base64 to buffer
      const fileBuffer = Buffer.from(file, 'base64');
      console.log('Decoded file size:', fileBuffer.length);

      await processReceiptSlip(fileBuffer, filename, res);
    }
  } catch (error: any) {
    console.error('Receipt slip upload error:', error);
    return res.status(500).json({ detail: error.message || 'Failed to upload receipt slip' });
  }
});

// Helper function to process receipt slip
async function processReceiptSlip(fileBuffer: Buffer, filename: string, res: any) {
  try {
    // First, try to detect if it's an HTML file
    const fileContent = fileBuffer.toString('utf8');
    const isHtml = fileContent.includes('<html') || fileContent.includes('<table');

    let data: any[][] = [];

    if (isHtml) {
      console.log('Detected HTML format receipt slip, parsing HTML...');

      // Parse HTML tables - more robust approach
      // First, extract all table rows
      const tableMatch = fileContent.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
      if (!tableMatch) {
        console.log('No table found in HTML content');
        return res.status(400).json({ detail: 'No table found in HTML file' });
      }

      const tableContent = tableMatch[1];
      // Split by TR tags
      const rows = tableContent.split(/<tr[^>]*>/i);

      for (const rowContent of rows) {
        if (!rowContent.trim()) continue;

        // Extract all TD cells from the row - use simpler regex without /s flag
        const tdMatches = rowContent.match(/<td[^>]*>([^<]*(?:<[^\/td][^>]*>[^<]*)*?)<\/td>/gi);

        if (tdMatches && tdMatches.length > 0) {
          const rowData: any[] = [];
          for (const cell of tdMatches) {
            // Clean the cell content
            const text = cell
              .replace(/<td[^>]*>/gi, '') // Remove opening td tag
              .replace(/<\/td>/gi, '')    // Remove closing td tag
              .replace(/<[^>]*>/g, '')    // Remove any other HTML tags
              .replace(/&nbsp;/g, ' ')    // Replace HTML entities
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#\d+;/g, '')     // Remove numeric HTML entities
              .trim();

            rowData.push(text || '');
          }

          // Only add rows with data
          if (rowData.length > 0 && rowData.some(cell => cell !== '')) {
            data.push(rowData);
          }
        }
      }

      console.log('HTML receipt slip parsed:', data.length, 'rows');
    } else {
      // Try to parse as Excel file
      console.log('Attempting to parse as Excel file...');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);

      const worksheet = workbook.worksheets[0];

      worksheet.eachRow((row) => {
        const values = row.values as any[];
        const processedValues = values.slice(1).map(val => {
          // Handle undefined/null
          if (val === undefined || val === null) return val;

          // Handle Rich Text
          if (val && typeof val === 'object' && val.richText) {
            return val.richText.map((rt: any) => rt.text).join('');
          }

          // Handle formula results
          if (val && typeof val === 'object' && 'result' in val) {
            return val.result;
          }

          // Handle hyperlinks
          if (val && typeof val === 'object' && 'text' in val) {
            return val.text;
          }

          // Handle Date objects
          if (val instanceof Date) {
            return val.toISOString();
          }

          // Handle any other objects - convert to string or extract value
          if (val && typeof val === 'object') {
            // Try to extract a meaningful value from the object
            if (val.toString && typeof val.toString === 'function' && val.toString() !== '[object Object]') {
              return val.toString();
            } else if (val.value !== undefined) {
              return val.value;
            } else {
              // If we can't extract a meaningful value, just push empty string
              return '';
            }
          }

          // Return primitive values as-is
          return val;
        });
        data.push(processedValues);
      });

      console.log('Excel receipt slip parsed:', data.length, 'rows');
    }

    // Sort data: separate headers and data rows
    const headerRows = data.slice(0, 3);
    const dataRows = data.slice(3);

    // Sort data rows by: building name → floor → company name
    dataRows.sort((a, b) => {
      const buildingA = extractBuilding(a[1] || '');
      const buildingB = extractBuilding(b[1] || '');
      if (buildingA !== buildingB) return buildingA.localeCompare(buildingB, 'ko');

      const floorA = extractFloor(a[1] || '');
      const floorB = extractFloor(b[1] || '');
      if (floorA !== floorB) return floorA - floorB;

      const companyA = String(a[0] || '');
      const companyB = String(b[0] || '');
      return companyA.localeCompare(companyB, 'ko');
    });

    const sortedData = [...headerRows, ...dataRows];

    return res.json({
      success: true,
      data: sortedData
    });
  } catch (error) {
    console.error('Process receipt slip error:', error);
    throw error;
  }
}

// Check if daily order exists
app.get('/excel/check-daily-order', verifyToken, async (req: any, res) => {
  try {
    const { date, order_type, sheet_name } = req.query;

    if (!date || !order_type || !sheet_name) {
      return res.status(400).json({ detail: 'Missing required parameters' });
    }

    const snapshot = await db.collection('dailyOrders')
      .where('date', '==', date)
      .where('order_type', '==', order_type)
      .where('sheet_name', '==', sheet_name)
      .limit(1)
      .get();

    return res.json({ exists: !snapshot.empty });
  } catch (error) {
    console.error('Check daily order error:', error);
    return res.status(500).json({ detail: 'Failed to check daily order' });
  }
});

// Load daily order
app.get('/excel/load-daily-order', verifyToken, async (req: any, res) => {
  try {
    const { date, order_type, sheet_name } = req.query;

    if (!date || !order_type || !sheet_name) {
      return res.status(400).json({ detail: 'Missing required parameters' });
    }

    const snapshot = await db.collection('dailyOrders')
      .where('date', '==', date)
      .where('order_type', '==', order_type)
      .where('sheet_name', '==', sheet_name)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ detail: 'Daily order not found' });
    }

    const doc = snapshot.docs[0];
    return res.json(doc.data());
  } catch (error) {
    console.error('Load daily order error:', error);
    return res.status(500).json({ detail: 'Failed to load daily order' });
  }
});

// Update daily order data
app.post('/excel/update-data', jsonParser, verifyToken, async (req: any, res) => {
  try {
    const { date, order_type, sheet_name, data, colors } = req.body;

    if (!date || !order_type || !sheet_name || !data) {
      return res.status(400).json({ detail: 'Missing required parameters' });
    }

    // Find existing document
    const snapshot = await db.collection('dailyOrders')
      .where('date', '==', date)
      .where('order_type', '==', order_type)
      .where('sheet_name', '==', sheet_name)
      .limit(1)
      .get();

    const orderData = {
      date,
      order_type,
      sheet_name,
      data,
      colors: colors || [],
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    if (snapshot.empty) {
      // Create new document
      await db.collection('dailyOrders').add({
        ...orderData,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Update existing document
      await snapshot.docs[0].ref.update(orderData);
    }

    return res.json({ message: 'Data updated successfully' });
  } catch (error) {
    console.error('Update data error:', error);
    return res.status(500).json({ detail: 'Failed to update data' });
  }
});

// ==================== Payment Management Endpoints ====================

// Save payment record - Updated to match Python backend structure
app.post('/payments/save', jsonParser, verifyToken, async (req: any, res) => {
  try {
    const { payment_date, data, created_by } = req.body;

    console.log('Payment save request:', { payment_date, data_length: data?.length, created_by });

    if (!payment_date || !data) {
      return res.status(400).json({ detail: 'Missing required parameters: payment_date and data' });
    }

    let saved_count = 0;
    let skipped_count = 0;

    // Calculate sums for row 3
    let sumRow = Array(26).fill("");

    // Process data rows to calculate sums (from index 4 onwards)
    for (let i = 4; i < data.length; i++) {
      const row = data[i];

      // Skip if no company name
      if (!row[0]) continue;

      // I3: 신규주문 합 (index 8)
      sumRow[8] = (parseInt(sumRow[8] || "0") + parseInt(row[8] || "0")).toString();

      // J3: 미송 합 (index 9)
      sumRow[9] = (parseInt(sumRow[9] || "0") + parseInt(row[9] || "0")).toString();

      // K3: 교환 합 (index 10)
      sumRow[10] = (parseInt(sumRow[10] || "0") + parseInt(row[10] || "0")).toString();

      // L3: 장끼 합 (index 11)
      sumRow[11] = (parseInt(sumRow[11] || "0") + parseInt(row[11] || "0")).toString();

      // M3: 장끼미송 합 (index 12)
      sumRow[12] = (parseInt(sumRow[12] || "0") + parseInt(row[12] || "0")).toString();

      // N3: 장끼교환 합 (index 13)
      sumRow[13] = (parseInt(sumRow[13] || "0") + parseInt(row[13] || "0")).toString();

      // O3: 입고 합 (index 14)
      sumRow[14] = (parseInt(sumRow[14] || "0") + parseInt(row[14] || "0")).toString();

      // P3: 차이 합 (index 15)
      sumRow[15] = (parseInt(sumRow[15] || "0") + parseInt(row[15] || "0")).toString();

      // S3: 실입고수 합 (index 21)
      sumRow[21] = (parseInt(sumRow[21] || "0") + parseInt(row[21] || "0")).toString();

      // T3: 오늘입금할금액 합 (index 22)
      sumRow[22] = (parseInt(sumRow[22] || "0") + parseInt(row[22] || "0")).toString();

      // U3: 미송/매입금액 합 (index 23)
      sumRow[23] = (parseInt(sumRow[23] || "0") + parseInt(row[23] || "0")).toString();
    }

    // Note: We no longer save headers to the database - headers are generated dynamically when retrieving data
    // This ensures headers are always correct and not corrupted by bad data

    // Process data rows (from index 4 onwards) - Use batch write for better performance
    const batch = db.batch();
    const recordsToSave: any[] = [];

    // First, collect all records to save
    for (let i = 4; i < data.length; i++) {
      const row = data[i];

      // Skip if no company name
      if (!row[0]) continue;

      // Create payment record matching Python backend structure
      const paymentRecord = {
        payment_date,
        company_name: String(row[0] || ''),
        product_code: row[4] ? String(row[4]) : null,
        product_name: row[5] ? String(row[5]) : null,
        product_option: row[6] ? String(row[6]) : null,
        unit_price: row[7] ? parseFloat(row[7]) : 0,
        receipt_qty: row[14] ? parseInt(row[14]) : 0,
        payment_amount: row[19] ? parseFloat(row[19]) : 0,
        original_data: row,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        created_by: created_by || 'unknown'
      };

      recordsToSave.push(paymentRecord);
    }

    // Check for duplicates in bulk (much faster)
    if (recordsToSave.length > 0) {
      console.log(`Processing ${recordsToSave.length} payment records...`);

      // Get existing records for this payment date
      const existingRecordsQuery = await db.collection('payment_records')
        .where('payment_date', '==', payment_date)
        .get();

      const existingRecords = new Set();
      existingRecordsQuery.forEach(doc => {
        const data = doc.data();
        // Create a unique key for duplicate checking
        const key = `${data.company_name}|${data.product_code}|${data.receipt_qty}`;
        existingRecords.add(key);
      });

      // Add non-duplicate records to batch
      for (const record of recordsToSave) {
        const key = `${record.company_name}|${record.product_code}|${record.receipt_qty}`;

        if (!existingRecords.has(key)) {
          const docRef = db.collection('payment_records').doc();
          batch.set(docRef, record);
          saved_count++;
        } else {
          skipped_count++;
        }
      }

      // Commit all records at once (much faster than individual saves)
      if (saved_count > 0) {
        await batch.commit();
        console.log(`Batch saved ${saved_count} records successfully`);
      }
    }

    const message = `${saved_count}개 항목이 ${payment_date} 입금 내역으로 저장되었습니다` +
      (skipped_count > 0 ? ` (${skipped_count}개 중복 항목 제외)` : '');

    console.log('Payment save completed:', { saved_count, skipped_count });

    // Also save the payment data as an Excel file for file management
    try {
      // Generate the Excel file from payment data
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('입금관리');

      // Add all the data rows to the Excel sheet
      data.forEach((row: any[]) => {
        worksheet.addRow(row);
      });

      // Style the header rows
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(2).font = { bold: true };
      worksheet.getRow(3).font = { bold: true };

      // Generate the Excel buffer
      const excelBuffer = await workbook.xlsx.writeBuffer();

      // Format date for file storage (MMDD)
      const dateObj = new Date(payment_date);
      const mmdd = `${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;

      // Upload to Firebase Storage
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'gndr-orma.firebasestorage.app';
      const bucket = storage.bucket(bucketName);
      const fileName = `payment-files/${mmdd}/payment_${payment_date}_${Date.now()}.xlsx`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(Buffer.from(excelBuffer), {
        metadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      // Get signed URL for the file
      const [url] = await fileUpload.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
      });

      // Save file record to Firestore for file management tab
      const fileRecord = {
        date: mmdd,
        payment_date,
        filename: `입금관리_${payment_date}.xlsx`,
        storage_path: fileName,
        url,
        type: 'payment',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        created_by: created_by || 'unknown',
        row_count: saved_count,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      // Use the same date format as saved files
      await db.collection('savedFiles').doc(mmdd).set({
        date: mmdd,
        payment: fileRecord,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log('Payment file saved to storage:', fileName);
    } catch (fileError) {
      // Log error but don't fail the whole operation
      console.error('Error saving payment file to storage:', fileError);
    }

    return res.json({
      success: true,
      message,
      saved_count,
      skipped_count,
      payment_date
    });
  } catch (error) {
    console.error('Save payment error details:', error);
    console.error('Error stack:', (error as Error).stack);
    return res.status(500).json({ detail: 'Failed to save payment', error: (error as Error).message });
  }
});

// Query payments by date - Using path parameter to match Python backend
app.get('/payments/date/:payment_date', verifyToken, async (req: any, res) => {
  try {
    const { payment_date } = req.params;

    if (!payment_date) {
      return res.status(400).json({ detail: 'Date parameter required' });
    }

    // Query payment records for the specified date
    // Try without ordering first to avoid composite index requirement
    let snapshot;
    try {
      snapshot = await db.collection('payment_records')
        .where('payment_date', '==', payment_date)
        .get();
    } catch (error) {
      console.error('Error querying payment_records:', error);
      // Return empty response if collection doesn't exist or query fails
      return res.json({
        success: true,
        payment_date,
        total_count: 0,
        total_amount: 0,
        company_totals: {},
        header_rows: [],
        payments: []
      });
    }

    const payments: any[] = [];
    const company_totals: { [key: string]: number } = {};
    let total_amount = 0;

    // Process results - SKIP header records, only process actual payment records
    snapshot.forEach(doc => {
      const data = doc.data();

      // Skip header records entirely - we'll generate proper headers below
      if (data.original_data && data.original_data._is_header) {
        return; // Skip this record
      }

      // Regular payment record
      payments.push({
        id: doc.id,
        company_name: data.company_name,
        product_code: data.product_code,
        product_name: data.product_name,
        product_option: data.product_option,
        unit_price: data.unit_price || 0,
        receipt_qty: data.receipt_qty || 0,
        payment_amount: data.payment_amount || 0,
        original_data: data.original_data,
        created_at: data.created_at
      });

      // Calculate company totals
      if (!company_totals[data.company_name]) {
        company_totals[data.company_name] = 0;
      }
      company_totals[data.company_name] += data.payment_amount || 0;
      total_amount += data.payment_amount || 0;
    });

    // Calculate sums for row 3 from payment data
    let sumRow = Array(26).fill("");

    payments.forEach(payment => {
      if (!payment.original_data || payment.original_data.length === 0) return;
      const row = payment.original_data;

      // I3: 신규주문 합 (index 8)
      sumRow[8] = (parseInt(sumRow[8] || "0") + parseInt(row[8] || "0")).toString();
      // J3: 미송 합 (index 9)
      sumRow[9] = (parseInt(sumRow[9] || "0") + parseInt(row[9] || "0")).toString();
      // K3: 교환 합 (index 10)
      sumRow[10] = (parseInt(sumRow[10] || "0") + parseInt(row[10] || "0")).toString();
      // L3: 장끼 합 (index 11)
      sumRow[11] = (parseInt(sumRow[11] || "0") + parseInt(row[11] || "0")).toString();
      // M3: 장끼미송 합 (index 12)
      sumRow[12] = (parseInt(sumRow[12] || "0") + parseInt(row[12] || "0")).toString();
      // N3: 장끼교환 합 (index 13)
      sumRow[13] = (parseInt(sumRow[13] || "0") + parseInt(row[13] || "0")).toString();
      // O3: 입고 합 (index 14)
      sumRow[14] = (parseInt(sumRow[14] || "0") + parseInt(row[14] || "0")).toString();
      // P3: 차이 합 (index 15)
      sumRow[15] = (parseInt(sumRow[15] || "0") + parseInt(row[15] || "0")).toString();
      // S3: 입고액 합 (index 18)
      sumRow[18] = (parseInt(sumRow[18] || "0") + parseInt(row[18] || "0")).toString();
      // T3: 입금액 합 (index 19)
      sumRow[19] = (parseInt(sumRow[19] || "0") + parseInt(row[19] || "0")).toString();
      // U3: 차액 합 (index 20)
      sumRow[20] = (parseInt(sumRow[20] || "0") + parseInt(row[20] || "0")).toString();
    });

    // ALWAYS use the correct static header rows - never from database
    const header_rows = [
      ["", "", "", "", "", "", "", "", "발주", "", "", "장끼", "", "", "입고/차이", "", "삼촌 코멘트", "", "", "", "", "", "", "", "", ""],
      ["거래처명", "공급처주소", "공급처연락처", "공급처휴대전화", "상품코드", "공급처상품명", "공급처옵션", "원가", "신규주문", "미송", "교환", "장끼", "미송", "교환", "입고", "차이", "삼촌코멘트", "비고", "입고액", "입금액", "차액", "실입고수", "오늘입금할금액", "미송/매입금액", "입금일", "공급처예금주"],
      sumRow,  // Row 3 with calculated sums
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]  // Row 4 empty
    ];

    // Function to parse address and extract building, floor, room
    const parseAddress = (address: string) => {
      if (!address) return { building: '', floor: 0, room: 0 };

      const addr = address.toString().trim();

      // Extract building name (first word or until floor indicator)
      const buildingMatch = addr.match(/^([가-힣a-zA-Z\s]+?)(?=\s*(?:지하|B\s*\d|\d+층|$))/);
      const building = buildingMatch ? buildingMatch[1].trim() : addr;

      // Extract floor
      let floor = 0;
      // Basement patterns: "지하 3층", "지하3층", "B 3층", "B3"
      const basementMatch = addr.match(/(?:지하|B)\s*(\d+)/);
      if (basementMatch) {
        floor = -parseInt(basementMatch[1]); // Basement as negative
      } else {
        // Ground floor patterns: "3층", "F 3층", "3F"
        const floorMatch = addr.match(/(?:F\s*)?(\d+)(?:층|F)/);
        if (floorMatch) {
          floor = parseInt(floorMatch[1]);
        }
      }

      // Extract room: "101호", "호실 101"
      let room = 0;
      const roomMatch = addr.match(/(?:호실\s*)?(\d+)호/);
      if (roomMatch) {
        room = parseInt(roomMatch[1]);
      }

      return { building, floor, room };
    };

    // Sort payments according to SORTING_RULES.md
    payments.sort((a, b) => {
      // Get address from original_data (column B, index 1)
      const addrA = parseAddress(a.original_data && a.original_data[1] ? a.original_data[1] : '');
      const addrB = parseAddress(b.original_data && b.original_data[1] ? b.original_data[1] : '');

      // 1st: Building name (가나다순)
      if (!addrA.building && addrB.building) return 1;
      if (addrA.building && !addrB.building) return -1;

      const buildingCompare = addrA.building.localeCompare(addrB.building, 'ko-KR');
      if (buildingCompare !== 0) return buildingCompare;

      // 2nd: Floor (basement reverse, ground normal)
      if (addrA.floor !== addrB.floor) {
        return addrA.floor - addrB.floor; // -3, -2, -1, 0, 1, 2, 3
      }

      // 3rd: Room (ascending)
      if (addrA.room !== addrB.room) {
        return addrA.room - addrB.room;
      }

      // 4th: Company name (가나다순)
      const companyA = (a.company_name || '').trim();
      const companyB = (b.company_name || '').trim();

      if (!companyA && companyB) return 1;
      if (companyA && !companyB) return -1;

      return companyA.localeCompare(companyB, 'ko-KR');
    });

    return res.json({
      success: true,
      payment_date,
      total_count: payments.length,
      total_amount,
      company_totals,
      header_rows,
      payments
    });
  } catch (error) {
    console.error('Query payments error:', error);
    return res.status(500).json({ detail: 'Failed to query payments' });
  }
});

// Legacy endpoint - kept for backwards compatibility
app.get('/payments/by-date', verifyToken, async (req: any, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ detail: 'Date parameter required' });
    }

    // Redirect to new endpoint format
    req.params.payment_date = date;
    return app._router.handle(req, res, () => { });
  } catch (error) {
    console.error('Query payments error:', error);
    return res.status(500).json({ detail: 'Failed to query payments' });
  }
});

// Query payments by date range
app.get('/payments/by-range', verifyToken, async (req: any, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ detail: 'Start and end dates required' });
    }

    const snapshot = await db.collection('payments')
      .where('date', '>=', start_date)
      .where('date', '<=', end_date)
      .orderBy('date')
      .orderBy('company_name')
      .get();

    const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return res.json({ payments });
  } catch (error) {
    console.error('Query payments by range error:', error);
    return res.status(500).json({ detail: 'Failed to query payments' });
  }
});

// Delete payment
app.delete('/payments/:id', verifyToken, async (req: any, res) => {
  try {
    const { id } = req.params;

    await db.collection('payments').doc(id).delete();

    return res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    return res.status(500).json({ detail: 'Failed to delete payment' });
  }
});

// ==================== Work Drafts Endpoints ====================

// Save work draft
app.post('/work-drafts/save', jsonParser, verifyToken, async (req: any, res) => {
  try {
    const { draft_name, data, colors, sheet_name } = req.body;

    if (!draft_name || !data) {
      return res.status(400).json({ detail: 'Missing required parameters' });
    }

    const draftData = {
      draft_name,
      data,
      colors: colors || [],
      sheet_name: sheet_name || '',
      username: req.user.username,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      expires_at: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      )
    };

    await db.collection('workDrafts').add(draftData);

    return res.json({ message: 'Draft saved successfully' });
  } catch (error) {
    console.error('Save draft error:', error);
    return res.status(500).json({ detail: 'Failed to save draft' });
  }
});

// Load work drafts
app.get('/work-drafts/load', verifyToken, async (req: any, res) => {
  try {
    const snapshot = await db.collection('workDrafts')
      .where('username', '==', req.user.username)
      .where('expires_at', '>', admin.firestore.Timestamp.now())
      .orderBy('expires_at', 'desc')
      .orderBy('created_at', 'desc')
      .get();

    const drafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return res.json({ drafts });
  } catch (error) {
    console.error('Load drafts error:', error);
    return res.status(500).json({ detail: 'Failed to load drafts' });
  }
});

// Delete work draft
app.delete('/work-drafts/:id', verifyToken, async (req: any, res) => {
  try {
    const { id } = req.params;

    const draftRef = db.collection('workDrafts').doc(id);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      return res.status(404).json({ detail: 'Draft not found' });
    }

    const draftData = draftDoc.data();
    if (draftData?.username !== req.user.username) {
      return res.status(403).json({ detail: 'Not authorized' });
    }

    await draftRef.delete();

    return res.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('Delete draft error:', error);
    return res.status(500).json({ detail: 'Failed to delete draft' });
  }
});

// Cleanup expired drafts (scheduled function)
// TODO: Enable this after setting up Cloud Scheduler
// export const cleanupExpiredDrafts = functions.pubsub
//   .schedule('every 24 hours')
//   .onRun(async (context) => {
//     const now = admin.firestore.Timestamp.now();
//     const snapshot = await db.collection('workDrafts')
//       .where('expires_at', '<=', now)
//       .get();

//     const batch = db.batch();
//     snapshot.docs.forEach(doc => {
//       batch.delete(doc.ref);
//     });

//     await batch.commit();
//     console.log(`Cleaned up ${snapshot.size} expired drafts`);
//     return null;
//   });

// ==================== Excel Export Endpoint ====================

// Export data to Excel file
app.post('/excel/export', jsonParser, verifyToken, async (req: any, res) => {
  try {
    const { data, file_name, sheet_name } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ detail: 'Invalid data provided' });
    }

    console.log('Excel export request:', { file_name, sheet_name, rows: data.length });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheet_name || 'Sheet1');

    // Add data rows
    data.forEach((row: any[]) => {
      worksheet.addRow(row);
    });

    // Style header rows (first 4 rows)
    for (let i = 1; i <= 4 && i <= data.length; i++) {
      const row = worksheet.getRow(i);
      row.font = { bold: true };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, (cell: any) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const bufferArray = buffer as ArrayBuffer;
    const bufferLength = bufferArray.byteLength;

    console.log('Excel file generated, buffer size:', bufferLength);

    // Return the Excel file as binary
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${file_name || 'export'}.xlsx"`);
    return res.send(Buffer.from(buffer));

  } catch (error: any) {
    console.error('Excel export error:', error);
    return res.status(500).json({
      detail: 'Failed to export Excel',
      error: error.message
    });
  }
});

// ==================== Saved Files Endpoints ====================

// Save three files - Updated to accept JSON format
app.post('/files/save-three-files', jsonParser, verifyToken, async (req: any, res) => {
  try {
    console.log('=== Save Three Files Started ===');
    console.log('Request body keys:', Object.keys(req.body || {}));

    const { date, matched_data, normal_data, error_data, created_by } = req.body;

    if (!date) {
      return res.status(400).json({ detail: 'Date is required' });
    }

    const savedFiles: any = {
      date,
      created_by: created_by || 'unknown',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Upload files to Cloud Storage
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'gndr-orma.firebasestorage.app';
    const bucket = storage.bucket(bucketName);

    // Helper function to create and upload Excel file from data
    const createAndUploadExcel = async (fileData: any, fileType: string) => {
      if (!fileData || !fileData.data) return null;

      try {
        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(fileType);

        // Add data rows
        fileData.data.forEach((row: any[]) => {
          worksheet.addRow(row);
        });

        // Style header rows
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(2).font = { bold: true };
        worksheet.getRow(3).font = { bold: true };

        // Generate Excel buffer
        const excelBuffer = await workbook.xlsx.writeBuffer();

        // Upload to Firebase Storage
        const fileName = `saved-files/${date}/${fileType}_${Date.now()}.xlsx`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(Buffer.from(excelBuffer), {
          metadata: {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        });

        // Get signed URL
        const [url] = await fileUpload.getSignedUrl({
          action: 'read',
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
        });

        console.log(`${fileType} file uploaded:`, fileName);

        return {
          filename: `${fileType}_${date}.xlsx`,
          storage_path: fileName,
          url,
          row_count: fileData.data.length
        };
      } catch (error: any) {
        console.error(`Error creating ${fileType} file:`, error);
        throw error;
      }
    };

    // Create and upload matched, normal, and error files
    if (matched_data) {
      savedFiles.matched = await createAndUploadExcel(matched_data, 'matched');
    }

    if (normal_data) {
      savedFiles.normal = await createAndUploadExcel(normal_data, 'normal');
    }

    if (error_data) {
      savedFiles.error = await createAndUploadExcel(error_data, 'error');
    }

    // Save to Firestore
    const savedFileRef = db.collection('savedFiles').doc(date);
    await savedFileRef.set(savedFiles, { merge: true });

    console.log('Files saved successfully to Firestore:', date);

    return res.json({
      success: true,
      message: 'Files saved successfully',
      data: savedFiles
    });

  } catch (error: any) {
    console.error('Save files error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      detail: 'Failed to save files',
      error: error.message || 'Unknown error',
      stack: error.stack
    });
  }
});

// List saved files
app.get('/files/list', verifyToken, async (req: any, res) => {
  try {
    const snapshot = await db.collection('savedFiles')
      .orderBy('date', 'desc')
      .get();

    const files = snapshot.docs.map(doc => ({ date: doc.id, ...doc.data() }));

    return res.json({ files });
  } catch (error) {
    console.error('List files error:', error);
    return res.status(500).json({ detail: 'Failed to list files' });
  }
});

// Get saved file by date
app.get('/files/:date', verifyToken, async (req: any, res) => {
  try {
    const { date } = req.params;

    const fileDoc = await db.collection('savedFiles').doc(date).get();

    if (!fileDoc.exists) {
      return res.status(404).json({ detail: 'File not found' });
    }

    return res.json({ date: fileDoc.id, ...fileDoc.data() });
  } catch (error) {
    console.error('Get file error:', error);
    return res.status(500).json({ detail: 'Failed to get file' });
  }
});

// Download saved file
app.get('/files/download/:fileId', verifyToken, async (req: any, res) => {
  try {
    const { fileId } = req.params;

    // fileId can be either a date (like "2025-01-19") or a meal type (like "breakfast")
    // For now, we'll treat it as a date since that's how files are stored
    const date = fileId;

    const fileDoc = await db.collection('savedFiles').doc(date).get();

    if (!fileDoc.exists) {
      return res.status(404).json({ detail: 'File not found' });
    }

    const fileData = fileDoc.data();

    // Check which meal type files are available
    let fileUrl: string | null = null;
    let fileName: string | null = null;

    // Priority: breakfast > lunch > dinner (or whatever is available)
    if (fileData?.breakfast?.url) {
      fileUrl = fileData.breakfast.url;
      fileName = fileData.breakfast.filename;
    } else if (fileData?.lunch?.url) {
      fileUrl = fileData.lunch.url;
      fileName = fileData.lunch.filename;
    } else if (fileData?.dinner?.url) {
      fileUrl = fileData.dinner.url;
      fileName = fileData.dinner.filename;
    }

    if (!fileUrl || !fileName) {
      return res.status(404).json({ detail: 'No downloadable file found' });
    }

    // Redirect to the signed URL for download
    return res.redirect(fileUrl);

  } catch (error) {
    console.error('Download file error:', error);
    return res.status(500).json({ detail: 'Failed to download file' });
  }
});

// ==================== Order Records Endpoints ====================

// Save order record
app.post('/orders/save', jsonParser, verifyToken, async (req: any, res) => {
  try {
    const { date, company_name, record_type, quantity, notes } = req.body;

    if (!date || !company_name || !record_type) {
      return res.status(400).json({ detail: 'Missing required parameters' });
    }

    const orderData = {
      date,
      company_name,
      record_type, // "exchange" or "未송"
      quantity: quantity || 0,
      notes: notes || '',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('orders').add(orderData);

    return res.json({ message: 'Order record saved successfully' });
  } catch (error) {
    console.error('Save order error:', error);
    return res.status(500).json({ detail: 'Failed to save order' });
  }
});

// List orders
app.get('/orders/list', verifyToken, async (req: any, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = db.collection('orders').orderBy('date', 'desc');

    if (start_date && end_date) {
      query = query.where('date', '>=', start_date).where('date', '<=', end_date);
    }

    const snapshot = await query.get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return res.json({ orders });
  } catch (error) {
    console.error('List orders error:', error);
    return res.status(500).json({ detail: 'Failed to list orders' });
  }
});

// Get orders by date
app.get('/orders/date/:date', verifyToken, async (req: any, res) => {
  try {
    const { date } = req.params;

    const snapshot = await db.collection('orders')
      .where('date', '==', date)
      .orderBy('company_name')
      .get();

    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return res.json({ orders });
  } catch (error) {
    console.error('Get orders by date error:', error);
    return res.status(500).json({ detail: 'Failed to get orders' });
  }
});

// ==================== Daily Orders Save Endpoint ====================

app.post('/daily-orders/save', jsonParser, verifyToken, async (req: any, res) => {
  try {
    const { date, order_type, sheet_name, data, colors } = req.body;

    if (!date || !order_type || !sheet_name || !data) {
      return res.status(400).json({ detail: 'Missing required parameters' });
    }

    // Find existing document
    const snapshot = await db.collection('dailyOrders')
      .where('date', '==', date)
      .where('order_type', '==', order_type)
      .where('sheet_name', '==', sheet_name)
      .limit(1)
      .get();

    const orderData = {
      date,
      order_type,
      sheet_name,
      data,
      colors: colors || [],
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    if (snapshot.empty) {
      await db.collection('dailyOrders').add({
        ...orderData,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await snapshot.docs[0].ref.update(orderData);
    }

    return res.json({ message: 'Daily order saved successfully' });
  } catch (error) {
    console.error('Save daily order error:', error);
    return res.status(500).json({ detail: 'Failed to save daily order' });
  }
});

// Export the Express app as a Cloud Function (Gen2)
export const api = onRequest({
  timeoutSeconds: 540,
  memory: '512MiB',
  maxInstances: 10
}, app);
