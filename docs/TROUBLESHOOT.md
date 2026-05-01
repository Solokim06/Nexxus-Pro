
## **docs/TROUBLESHOOTING.md**
```markdown
# Troubleshooting Guide

## Common Issues and Solutions

### Upload Issues

**File upload fails with "413 Payload Too Large"**
- Increase nginx client_max_body_size
```nginx
client_max_body_size 500M;