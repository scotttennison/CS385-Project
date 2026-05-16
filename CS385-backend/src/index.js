require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS clients
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Get env vars
const S3_BUCKET = process.env.S3_BUCKET;
const METADATA_TABLE = process.env.METADATA_TABLE;
const AUDIT_TABLE = process.env.AUDIT_TABLE;
const USER_POOL_ID = process.env.USER_POOL_ID;

// Initialize Express
const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User-ID,X-Amz-Date,X-Api-Key');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// MIDDLEWARE: Validate Cognito JWT Token
const authMiddleware = (req, res, next) => {
  try {
    // For LOCAL TESTING: use hardcoded user ID
    if (process.env.NODE_ENV !== 'production') {
      req.userId = req.headers['x-user-id'] || 'user_12345'; // Get from header or use default
      return next();
    }

    // For PRODUCTION: validate real Cognito token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.payload.sub;
    req.userId = userId;
    req.token = token;

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// Apply auth middleware to all routes
app.use(authMiddleware);


// ENDPOINT 1: POST /upload
app.post('/upload', async (req, res) => {
  try {
    console.log(`[POST /upload] User: ${req.userId}`);
    console.log(`Request body:`, JSON.stringify(req.body));

    // Extract request data
    let { fileName, docType, fileContent } = req.body;

    // If body is a string, parse it
    if (typeof req.body === 'string') {
      const parsed = JSON.parse(req.body);
      fileName = parsed.fileName;
      docType = parsed.docType;
      fileContent = parsed.fileContent;
    }

    if (!fileName || !docType || !fileContent) {
      return res.status(400).json({ error: 'Missing fileName, docType, or fileContent' });
    }

    // Validate docType
    const validTypes = ['Invoice', 'Contract', 'Employee', 'Compliance'];
    if (!validTypes.includes(docType)) {
      return res.status(400).json({ error: `Invalid docType. Must be one of: ${validTypes.join(', ')}` });
    }

    // Calculate expiration date
    const retentionDays = {
      'Invoice': 7 * 365,
      'Contract': 5 * 365,
      'Employee': 3 * 365,
      'Compliance': 10 * 365
    };
    const uploadTimestamp = Math.floor(Date.now() / 1000);
    const expirationTimestamp = uploadTimestamp + (retentionDays[docType] * 86400);

    // Generate unique file ID
    const fileId = uuidv4();
    const s3Key = `${req.userId}/${fileId}`;

    // Upload to S3
    const s3Params = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: Buffer.from(fileContent, 'base64'), // Assuming file comes as base64
      ContentType: 'application/pdf'
    };

    console.log(`Uploading to S3: ${s3Key}`);
    await s3.putObject(s3Params).promise();
    console.log(`Successfully uploaded to S3`);

    // Store metadata in DynamoDB
    const metadataParams = {
      TableName: METADATA_TABLE,
      Item: {
        userId: req.userId,
        fileId: fileId,
        fileName: fileName,
        docType: docType,
        uploadDate: uploadTimestamp,
        expirationDate: expirationTimestamp,
        s3Key: s3Key,
        fileSize: Buffer.byteLength(fileContent),
        createdAt: uploadTimestamp
      }
    };

    console.log(`Storing metadata in DynamoDB`);
    await dynamodb.put(metadataParams).promise();
    console.log(`Successfully stored metadata`);

    // Log to audit table
    const auditParams = {
      TableName: AUDIT_TABLE,
      Item: {
        userId: req.userId,
        'timestamp#actionId': `${uploadTimestamp}#upload_${fileId}`,
        action: 'UPLOAD',
        fileId: fileId,
        fileName: fileName,
        docType: docType,
        s3Key: s3Key,
        reason: 'User uploaded file',
        timestamp: uploadTimestamp
      }
    };

    console.log(`Logging to audit table`);
    await dynamodb.put(auditParams).promise();
    console.log(`Successfully logged to audit table`);

    // Return success
    res.status(200).json({
      message: 'File uploaded successfully',
      fileId: fileId,
      docType: docType,
      expirationDate: expirationTimestamp
    });

  } catch (error) {
    console.error('Error in POST /upload:', error);
    res.status(500).json({ error: error.message });
  }
});


// ENDPOINT 2: GET /files
app.get('/files', async (req, res) => {
  try {
    console.log(`[GET /files] User: ${req.userId}`);

    // Query DynamoDB for user's files
    const params = {
      TableName: METADATA_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': req.userId
      }
    };

    console.log(`Querying DynamoDB for user's files`);
    const result = await dynamodb.query(params).promise();
    console.log(`Found ${result.Items.length} files`);

    res.status(200).json({
      files: result.Items,
      count: result.Items.length
    });

  } catch (error) {
    console.error('Error in GET /files:', error);
    res.status(500).json({ error: error.message });
  }
});


// ENDPOINT 3: GET /files/{fileId}
app.get('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log(`[GET /files/${fileId}] User: ${req.userId}`);

    // Get file metadata from DynamoDB
    const params = {
      TableName: METADATA_TABLE,
      Key: {
        userId: req.userId,
        fileId: fileId
      }
    };

    console.log(`Getting metadata for fileId: ${fileId}`);
    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Verify the file belongs to the user
    if (result.Item.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to access this file' });
    }

    res.status(200).json(result.Item);

  } catch (error) {
    console.error(`Error in GET /files/:fileId:`, error);
    res.status(500).json({ error: error.message });
  }
});


// HEALTH CHECK
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});


// Lambda Handler (for AWS Lambda)
const serverless = require('serverless-http');
module.exports.handler = serverless(app);


// Local Testing (for development)
const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}
