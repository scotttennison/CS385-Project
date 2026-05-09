# CS385 Project: Records Management System (Jansport)

A **full-stack cloud application** for managing document lifecycles with automatic deletion based on retention policies. Built on AWS with React frontend and Node.js/Express backend.

**Status:**  MVP Complete & Deployed  
**Frontend:** <https://cs385-frontend.vercel.app/login> 
**API:** <https://mnyt0kl257.execute-api.us-west-2.amazonaws.com/dev>  

---

##  What This Project Does

Users can:

1. **Sign up & login** with email/password (Cognito)
2. **Upload business documents** (Invoices, Contracts, Employee Records, Compliance Reports)
3. **See their documents** with expiration dates
4. **Automatic deletion** — documents are deleted after retention period expires (no manual action needed)
5. **Audit logging** — every action is recorded for compliance

### Example Retention Periods

- **Invoices:** 7 years
- **Contracts:** 5 years
- **Employee Records:** 3 years
- **Compliance Reports:** 10 years

---

##  Architecture

```
┌─────────────────────────────────────────────────────────┐
│           React Frontend (Vercel)                       │
│  ├── Login Page (Cognito Auth)                          │
│  ├── Upload Form (Select type + upload file)            │
│  └── File List (Shows docs + expiration dates)          │
└──────────────────┬──────────────────────────────────────┘
                   │ (JWT Token + HTTP)
                   ↓
┌──────────────────────────────────────────────────────────┐
│    API Gateway + Lambda (AWS)                            │
│  ├── POST /upload     → Upload Handler Lambda            │
│  ├── GET /files       → List user's files                │
│  └── GET /files/{id}  → Get file details                 │
└──────────────────┬───────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ↓          ↓          ↓
    ┌───────┐ ┌──────────┐ ┌────────────┐
    │  S3   │ │DynamoDB  │ │ Cognito    │
    │Files  │ │Metadata  │ │Auth        │
    │Store  │ │+ Audit   │ │            │
    └───────┘ └──────────┘ └────────────┘
        ↑
        │ (Daily check)
    ┌───────────────────────────────┐
    │ Deletion Scheduler Lambda     │
    │ (Deletes expired documents)   │
    └───────────────────────────────┘
```

---

## Project Structure

```
CS385-Project/
├── CS385-backend/                 # Node.js/Express API
│   ├── src/
│   │   └── index.js               # Express server (3 endpoints)
│   ├── package.json
│   └── lambda-deployment.zip      # Deployed to AWS Lambda
│
├── cs385-frontend/                # React application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx      # Cognito login form
│   │   │   ├── UploadPage.jsx     # Upload + file list
│   │   │   └── HomePage.jsx
│   │   ├── App.jsx                # Router setup
│   │   └── index.js
│   ├── package.json
│   └── .vercel/                   # Vercel deployment config
│
├── Cloudformation/                # Infrastructure as Code
│   ├── cs385-template.yaml        # Full AWS stack definition
│   └── README.md                  # Deployment instructions
│
├── vercel.json                    # Vercel build & routing config
└── README.md                      # This file
```

---


---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 | UI components |
| | Bootstrap 5 | Styling |
| | React Router | Page navigation |
| | Fetch API | HTTP requests |
| **Backend** | Node.js 24 | Runtime |
| | Express | REST API framework |
| | Serverless-http | Lambda integration |
| **Cloud** | AWS Lambda | Serverless compute |
| | API Gateway | HTTP routing |
| | S3 | File storage |
| | DynamoDB | NoSQL database |
| | Cognito | Authentication |
| **DevOps** | Vercel | Frontend hosting |
| | Git/GitHub | Version control |

---

## How to Run Locally

### Backend (API Testing)

```bash
cd CS385-backend
npm install
npm start
```

API runs on `http://localhost:3001`

Test with curl:

```bash
curl -X GET http://localhost:3001/health \
  -H "X-User-ID: user_12345"
```

### Frontend (Web App)

```bash
cd cs385-frontend
npm install
npm start
```

App opens on `http://localhost:3000`

Login with any email + password (MVP uses fake auth locally)

---

## Authentication Flow

```
User enters email + password
    ↓
Cognito validates credentials
    ↓
Cognito returns JWT token
    ↓
Frontend stores token in localStorage
    ↓
Every API request includes: Authorization: Bearer <token>
    ↓
API validates token
    ↓
Request proceeds
```
---

## Database Schema

### DynamoDB: cs385-metadata

```json
{
  "userId": "user_12345",
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "invoice_2024.pdf",
  "docType": "Invoice",
  "uploadDate": 1714067400,
  "expirationDate": 1746181200,
  "s3Key": "user_12345/550e8400-e29b-41d4-a716-446655440000",
  "fileSize": 45678,
  "createdAt": 1714067400
}
```

### DynamoDB: cs385-audit-logs

```json
{
  "userId": "user_12345",
  "timestamp#actionId": "1714067400#upload_550e8400",
  "action": "UPLOAD",
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "invoice_2024.pdf",
  "docType": "Invoice",
  "s3Key": "user_12345/550e8400-e29b-41d4-a716-446655440000",
  "reason": "User uploaded file",
  "timestamp": 1714067400
}
```

---

## How the System Works

### **1. User Uploads a File**

```
Frontend
  ├─ Convert PDF to base64
  ├─ Create JSON: {fileName, docType, fileContent}
  └─ POST /upload with JWT token
        ↓
Lambda (CS385-API)
  ├─ Validate token
  ├─ Extract user ID
  ├─ Calculate expiration date based on docType
  └─ Upload to S3 + save metadata to DynamoDB
        ↓
S3 + DynamoDB
  └─ File stored, metadata recorded
        ↓
Frontend
  └─ Show success message + reload file list
```

### **2. User Views Their Files**

```
Frontend
  ├─ GET /files with JWT token
        ↓
Lambda (CS385-API)
  ├─ Query DynamoDB: "Find all files where userId = current user"
  └─ Return list of files
        ↓
Frontend
  ├─ Display files in table
  ├─ Show expiration date for each
  └─ Calculate "days remaining"
```

### **3. Automatic Deletion (Daily)**

```
CloudWatch Events
  └─ Trigger at midnight UTC every day
        ↓
Lambda (CS385-DeletionScheduler)
  ├─ Query DynamoDB: "Find all files where expirationDate <= today"
  ├─ For each expired file:
  │   ├─ Delete from S3
  │   ├─ Delete metadata from DynamoDB
  │   └─ Log deletion to audit table
  └─ Done
```

---

## Testing the Cloud App

### **Test Upload**

1. Go to frontend (localhost:3000)
2. Login with any email + password
3. Select "Invoice"
4. Choose a PDF file
5. Click "Upload Document"
6. Should see success message

### **Test File List**

1. After upload, should see file in right panel
2. Shows name, type, expiration date
3. Shows "days remaining"

### **Test via API (curl)**

```bash
# Upload
curl -X POST http://localhost:3001/upload \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user_12345" \
  -d '{"fileName":"test.pdf","docType":"Invoice","fileContent":"base64content"}'

# List files
curl -X GET http://localhost:3001/files \
  -H "X-User-ID: user_12345"

# Get one file
curl -X GET http://localhost:3001/files/file-id-here \
  -H "X-User-ID: user_12345"
```

---

## Deployment

### **Frontend (Vercel)**

```bash
cd cs385-frontend
npm install -g vercel
vercel
```

Automatically deploys on git push to `main` branch.

### **Backend (AWS Lambda)**

```bash
cd CS385-backend
npm install
zip -r lambda-deployment.zip .
```

Upload zip to AWS Lambda console.

### **API Gateway**

- POST /upload → CS385-API Lambda
- GET /files → CS385-API Lambda
- GET /files/{id} → CS385-API Lambda
- CORS enabled for localhost:3000 and Vercel domain

### **Infrastructure (CloudFormation)**

Deploy the entire AWS stack in one command:

```bash
aws cloudformation deploy \
  --template-file Cloudformation/cs385-template.yaml \
  --stack-name cs385-stack \
  --capabilities CAPABILITY_NAMED_IAM
```

See Cloudformation/README.md for full deployment instructions and parameter options.

---



## Links

- **GitHub:** <https://github.com/scotttennison/CS385-Project>
- **Frontend:** <https://cs385-frontend.vercel.app>
- **API Base URL:** <https://mnyt0kl257.execute-api.us-west-2.amazonaws.com/dev>
- **Cognito User Pool:** us-west-2_xxxxx (in AWS Console)

---

## Notes

- All file deletions are **permanent** (no recovery) after expiration
- Audit log is **immutable** (never deleted) for compliance
- System assumes all files are PDFs (extensible to other types)
- Frontend stores JWT token in `localStorage` (not production-secure, OK for MVP)
- API validates requests but uses mock Cognito for MVP (real validation on production)

---

## Summary

**Built a complete, working cloud application from scratch:**

- ✅ Frontend deployed and public
- ✅ Backend API deployed and tested
- ✅ Database & storage configured
- ✅ Authentication working
- ✅ End-to-end flow tested
- ✅ Code version controlled on GitHub

**Ready for team to integrate their pieces and deploy to production.**
