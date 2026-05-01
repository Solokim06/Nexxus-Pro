# Database Schema

## Tables

### users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | User's full name |
| email | VARCHAR(255) | Unique email |
| password | VARCHAR(255) | Hashed password |
| phone | VARCHAR(20) | Phone number |
| role | VARCHAR(20) | user/admin/moderator |
| subscription_plan | VARCHAR(20) | free/basic/pro/enterprise |
| is_email_verified | BOOLEAN | Email verification status |
| created_at | TIMESTAMP | Account creation date |
| updated_at | TIMESTAMP | Last update |

### files
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | File name |
| size | BIGINT | File size in bytes |
| mime_type | VARCHAR(100) | File MIME type |
| user_id | UUID | References users(id) |
| folder_id | UUID | References folders(id) |
| is_starred | BOOLEAN | Starred status |
| is_deleted | BOOLEAN | Soft delete flag |
| download_count | INTEGER | Number of downloads |
| created_at | TIMESTAMP | Upload date |

### folders
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Folder name |
| user_id | UUID | References users(id) |
| parent_id | UUID | References folders(id) |
| color | VARCHAR(20) | Folder color |
| is_starred | BOOLEAN | Starred status |
| created_at | TIMESTAMP | Creation date |

### subscriptions
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References users(id) |
| plan_id | VARCHAR(20) | free/basic/pro/enterprise |
| status | VARCHAR(20) | active/cancelled/expired |
| start_date | TIMESTAMP | Subscription start |
| end_date | TIMESTAMP | Subscription end |
| auto_renew | BOOLEAN | Auto-renewal status |
| created_at | TIMESTAMP | Creation date |

### payments
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References users(id) |
| method | VARCHAR(20) | mpesa/paypal/bank |
| amount | DECIMAL(10,2) | Payment amount |
| currency | VARCHAR(3) | USD/KES |
| status | VARCHAR(20) | pending/completed/failed |
| transaction_id | VARCHAR(255) | Gateway transaction ID |
| completed_at | TIMESTAMP | Completion date |
| created_at | TIMESTAMP | Creation date |

### merge_jobs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References users(id) |
| status | VARCHAR(20) | pending/processing/completed/failed |
| output_format | VARCHAR(10) | pdf/zip/image/txt |
| output_url | TEXT | Result file URL |
| output_size | BIGINT | Result file size |
| progress | INTEGER | Progress percentage |
| error | TEXT | Error message if failed |
| created_at | TIMESTAMP | Creation date |
| completed_at | TIMESTAMP | Completion date |

### activity_logs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References users(id) |
| action | VARCHAR(100) | Action performed |
| resource_type | VARCHAR(50) | file/folder/user |
| details | JSONB | Additional data |
| ip | VARCHAR(45) | IP address |
| created_at | TIMESTAMP | Activity timestamp |

### notifications
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References users(id) |
| title | VARCHAR(255) | Notification title |
| message | TEXT | Notification content |
| type | VARCHAR(20) | info/success/warning/error |
| read | BOOLEAN | Read status |
| created_at | TIMESTAMP | Creation date |

### sessions
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References users(id) |
| token | VARCHAR(255) | Session token |
| expires_at | TIMESTAMP | Expiration date |
| ip | VARCHAR(45) | IP address |
| user_agent | TEXT | Browser info |
| created_at | TIMESTAMP | Creation date |

### api_keys
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References users(id) |
| key | VARCHAR(255) | API key |
| name | VARCHAR(100) | Key name |
| permissions | TEXT[] | Allowed permissions |
| rate_limit | INTEGER | Requests per day |
| expires_at | TIMESTAMP | Expiration date |
| created_at | TIMESTAMP | Creation date |

### invitations
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| invited_by | UUID | References users(id) |
| email | VARCHAR(255) | Invitee email |
| token | VARCHAR(255) | Invitation token |
| status | VARCHAR(20) | pending/accepted/expired |
| expires_at | TIMESTAMP | Expiration date |
| created_at | TIMESTAMP | Creation date |

### audit_logs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References users(id) |
| action | VARCHAR(100) | Action performed |
| category | VARCHAR(30) | auth/file/payment |
| changes | JSONB | Before/after values |
| ip | VARCHAR(45) | IP address |
| created_at | TIMESTAMP | Audit timestamp |

## Relationships
