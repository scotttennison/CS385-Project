# CS385 CloudFormation Template

Deploys the full AWS infrastructure for the CS385 Records Management System in a single stack.

## Resources Provisioned

| Resource | Name | Purpose |
|----------|------|---------|
| S3 Bucket | `cs385-documents-cf-<accountId>` | Encrypted document storage |
| DynamoDB Table | `cs385-metadata-cf` | File metadata + expiration dates |
| DynamoDB Table | `cs385-audit-logs-cf` | Immutable audit log |
| Cognito User Pool | `CS385-UserPool-CF` | User authentication |
| Cognito App Client | `CS385-WebApp-CF` | Frontend auth client |
| Lambda Function | `CS385-API-CF` | REST API (Node.js 18) |
| Lambda Function | `CS385-DeletionScheduler-CF` | Daily expiration cleanup (Python 3.11) |
| API Gateway | `CS385-API-CF` | HTTP endpoint for the API Lambda |
| EventBridge Rule | `cs385-deletion-schedule-cf` | Triggers deletion Lambda at midnight UTC |
| SQS Queue | `cs385-deletion-dlq-cf` | Dead-letter queue for failed deletions |
| IAM Role | `cs385-lambda-role-cf` | Shared Lambda execution role |

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `AccountId` | `306015045828` | AWS account ID |
| `Environment` | `dev` | `dev`, `staging`, or `prod` |
| `S3BucketName` | `cs385-documents-cf-306015045828` | S3 bucket name (must be globally unique) |
| `MetadataTableName` | `cs385-metadata-cf` | DynamoDB metadata table name |
| `AuditTableName` | `cs385-audit-logs-cf` | DynamoDB audit logs table name |

## Deploy

### AWS Console

1. Go to **CloudFormation → Create stack → With new resources**
2. Upload `cs385-template.yaml`
3. Fill in parameters (or accept defaults)
4. Acknowledge IAM resource creation
5. Click **Create stack**

### AWS CLI

```bash
aws cloudformation deploy \
  --template-file cs385-template.yaml \
  --stack-name cs385-stack \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides Environment=dev
```

### Update an existing stack

```bash
aws cloudformation deploy \
  --template-file cs385-template.yaml \
  --stack-name cs385-stack \
  --capabilities CAPABILITY_NAMED_IAM
```

### Delete the stack

```bash
aws cloudformation delete-stack --stack-name cs385-stack
```

> **Note:** The S3 bucket must be emptied before the stack can be deleted.

## After Deployment

The Lambda functions deploy with placeholder code. After the stack is created:

1. **API Lambda (`CS385-API-CF`)** — upload your `lambda-deployment.zip` from `CS385-backend/`
2. **Deletion Scheduler Lambda (`CS385-DeletionScheduler-CF`)** — implement the full deletion logic in the function body

The stack outputs all resource names and ARNs needed to configure the frontend and backend. Check **CloudFormation → Stacks → cs385-stack → Outputs** for values like:

- `APIEndpoint` — API Gateway URL to set in the frontend
- `UserPoolId` / `ClientId` — Cognito credentials for auth configuration

## Notes

- All Lambda functions share a single IAM role with least-privilege S3 and DynamoDB access scoped to `cs385-*` resources
- DynamoDB tables use on-demand billing and have Point-in-Time Recovery enabled
- S3 bucket has versioning, AES-256 encryption, and all public access blocked
