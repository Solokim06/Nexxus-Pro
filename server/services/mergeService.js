const PDFDocument = require('pdfkit');
const PDFMerger = require('pdf-merger-js');
const JSZip = require('jszip');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class MergeService {
  constructor() {
    this.merger = new PDFMerger();
  }
  
  async mergePDFs(files, options = {}) {
    const merger = new PDFMerger();
    
    for (const file of files) {
      await merger.add(file.path);
    }
    
    const outputPath = path.join(__dirname, '../../uploads/merged', `${uuidv4()}.pdf`);
    await merger.save(outputPath);
    
    return {
      path: outputPath,
      size: fs.statSync(outputPath).size,
      mimeType: 'application/pdf',
    };
  }
  
  async mergeImages(files, options = {}) {
    const images = [];
    const outputFormat = options.format || 'pdf';
    
    for (const file of files) {
      const image = sharp(file.path);
      const metadata = await image.metadata();
      images.push({ image, metadata });
    }
    
    if (outputFormat === 'pdf') {
      const outputPath = path.join(__dirname, '../../uploads/merged', `${uuidv4()}.pdf`);
      const doc = new PDFDocument({ autoFirstPage: false });
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);
      
      for (const { image, metadata } of images) {
        const buffer = await image.toBuffer();
        doc.image(buffer, 0, 0, { fit: [metadata.width, metadata.height] });
        doc.addPage();
      }
      
      doc.end();
      await new Promise((resolve) => writeStream.on('finish', resolve));
      
      return {
        path: outputPath,
        size: fs.statSync(outputPath).size,
        mimeType: 'application/pdf',
      };
    } else {
      // Combine images into a single image (horizontal or vertical)
      const layout = options.layout || 'horizontal';
      const outputPath = path.join(__dirname, '../../uploads/merged', `${uuidv4()}.png`);
      
      let compositeImages = [];
      for (const { image } of images) {
        compositeImages.push(await image.toBuffer());
      }
      
      await sharp(compositeImages[0])
        .composite(
          compositeImages.slice(1).map(img => ({
            input: img,
            gravity: layout === 'horizontal' ? 'east' : 'south',
          }))
        )
        .toFile(outputPath);
      
      return {
        path: outputPath,
        size: fs.statSync(outputPath).size,
        mimeType: 'image/png',
      };
    }
  }
  
  async createZip(files, options = {}) {
    const zip = new JSZip();
    
    for (const file of files) {
      const fileData = fs.readFileSync(file.path);
      zip.file(file.originalname || path.basename(file.path), fileData);
    }
    
    const outputPath = path.join(__dirname, '../../uploads/merged', `${uuidv4()}.zip`);
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(outputPath, zipBuffer);
    
    return {
      path: outputPath,
      size: fs.statSync(outputPath).size,
      mimeType: 'application/zip',
    };
  }
  
  async mergeDocuments(files, options = {}) {
    // For now, convert to PDF first
    const pdfPaths = [];
    for (const file of files) {
      const pdfPath = await this.convertToPDF(file);
      pdfPaths.push(pdfPath);
    }
    
    const result = await this.mergePDFs(pdfPaths, options);
    
    // Clean up temp PDFs
    for (const pdfPath of pdfPaths) {
      fs.unlinkSync(pdfPath);
    }
    
    return result;
  }
  
  async convertToPDF(file) {
    const outputPath = path.join(__dirname, '../../uploads/temp', `${uuidv4()}.pdf`);
    
    if (file.mimetype === 'text/plain') {
      const text = fs.readFileSync(file.path, 'utf8');
      const doc = new PDFDocument();
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);
      doc.text(text);
      doc.end();
      await new Promise((resolve) => writeStream.on('finish', resolve));
    } else if (file.mimetype.startsWith('image/')) {
      await sharp(file.path).toFile(outputPath);
    } else {
      throw new Error(`Cannot convert ${file.mimetype} to PDF`);
    }
    
    return outputPath;
  }
  
  async getMergePreview(files, pages = 3) {
    const previews = [];
    
    for (let i = 0; i < Math.min(files.length, pages); i++) {
      const file = files[i];
      let preview = null;
      
      if (file.mimetype === 'application/pdf') {
        preview = await this.getPDFPreview(file.path);
      } else if (file.mimetype.startsWith('image/')) {
        preview = await this.getImagePreview(file.path);
      } else {
        preview = { type: 'generic', name: path.basename(file.path) };
      }
      
      previews.push(preview);
    }
    
    return previews;
  }
  
  async getPDFPreview(pdfPath) {
    // Use pdf-poppler or similar for PDF preview
    return { type: 'pdf', pages: 1 };
  }
  
  async getImagePreview(imagePath) {
    const metadata = await sharp(imagePath).metadata();
    const preview = await sharp(imagePath)
      .resize(200, 200, { fit: 'inside' })
      .toBuffer();
    
    return {
      type: 'image',
      width: metadata.width,
      height: metadata.height,
      preview: `data:${metadata.format};base64,${preview.toString('base64')}`,
    };
  }
  
  async validateMerge(files) {
    const errors = [];
    const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain'];
    
    for (const file of files) {
      if (!supportedTypes.includes(file.mimetype)) {
        errors.push(`Unsupported file type: ${file.mimetype}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  async cleanupTempFiles() {
    const tempDir = path.join(__dirname, '../../uploads/temp');
    const mergedDir = path.join(__dirname, '../../uploads/merged');
    
    const cleanDir = (dir) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          const age = Date.now() - stats.mtimeMs;
          if (age > 24 * 60 * 60 * 1000) { // Older than 24 hours
            fs.unlinkSync(filePath);
          }
        }
      }
    };
    
    cleanDir(tempDir);
    cleanDir(mergedDir);
  }
}

module.exports = new MergeService();