# Nexxus-Pro API Documentation

## Base URL

## Endpoints

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login user |
| POST | /auth/refresh | Refresh token |
| POST | /auth/logout | Logout user |
| POST | /auth/forgot-password | Request password reset |
| POST | /auth/reset-password | Reset password |
| POST | /auth/verify-email | Verify email |
| POST | /auth/resend-verification | Resend verification |
| GET | /auth/me | Get current user |
| PUT | /auth/profile | Update profile |
| POST | /auth/avatar | Upload avatar |
| PUT | /auth/change-password | Change password |
| GET | /auth/sessions | Get active sessions |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /files | Get user files |
| GET | /files/:id | Get file by ID |
| POST | /files/upload | Upload file |
| POST | /files/upload-multiple | Upload multiple files |
| POST | /files/upload-chunk | Upload chunk |
| GET | /files/download/:id | Download file |
| PUT | /files/:id | Update file |
| DELETE | /files/:id | Delete file |
| PUT | /files/:id/star | Star/unstar file |
| GET | /files/search | Search files |
| GET | /files/recent | Get recent files |
| GET | /files/starred | Get starred files |

### Folders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /folders | Get folders |
| GET | /folders/:id | Get folder by ID |
| POST | /folders | Create folder |
| PUT | /folders/:id | Update folder |
| DELETE | /folders/:id | Delete folder |
| GET | /folders/tree | Get folder tree |
| GET | /folders/:id/contents | Get folder contents |
| PUT | /folders/:id/move | Move folder |

### Merge

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /merge/files | Merge files |
| POST | /merge/folders | Merge folders |
| GET | /merge/status/:jobId | Get merge status |
| GET | /merge/download/:jobId | Download merged file |
| GET | /merge/history | Get merge history |
| POST | /merge/cancel/:jobId | Cancel merge |
| GET | /merge/queue | Get merge queue |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /payments/methods | Get payment methods |
| POST | /payments/process | Process payment |
| POST | /payments/verify | Verify payment |
| GET | /payments/history | Get payment history |
| GET | /payments/invoices | Get invoices |
| POST | /payments/:id/refund | Request refund |

### M-Pesa

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /mpesa/stkpush | Initiate STK Push |
| GET | /mpesa/status/:id | Check payment status |

### PayPal

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /paypal/create-order | Create order |
| POST | /paypal/capture | Capture order |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /subscriptions/plans | Get all plans |
| GET | /subscriptions/me | Get my subscription |
| POST | /subscriptions/create | Create subscription |
| POST | /subscriptions/cancel | Cancel subscription |
| PUT | /subscriptions/change-plan | Change plan |

## Error Responses

```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Detailed error"]
}