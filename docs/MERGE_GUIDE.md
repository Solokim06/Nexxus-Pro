
## **docs/MERGE_GUIDE.md**
```markdown
# File Merging Guide

## Supported Formats

### Input
- **PDF**: Any PDF document
- **Images**: JPG, PNG, GIF, WebP, SVG
- **Documents**: DOC, DOCX, TXT
- **Archives**: ZIP, RAR

### Output
- **PDF**: Best for documents and images
- **ZIP**: Archive of merged files
- **Image**: Combined image
- **TXT**: Combined text files

## Merging PDFs

### Basic Merge
1. Go to Merge page
2. Add PDF files (minimum 2)
3. Select PDF output
4. Click Merge Files

### Options

| Option | Values | Description |
|--------|--------|-------------|
| Page Size | A4, Letter, Legal, A3 | Page dimensions |
| Orientation | Portrait, Landscape | Page orientation |
| Margins | None, Narrow, Normal, Wide | Page margins |
| Compression | None, Low, Medium, High | File size |
| Metadata | Include/Exclude | Document info |
| Page Numbers | On/Off | Add page numbers |
| Bookmarks | On/Off | From filenames |

### Advanced Configuration
```json
{
  "pageSize": "A4",
  "orientation": "landscape",
  "compression": "high",
  "metadata": true,
  "pageNumbers": true,
  "bookmarks": true
}