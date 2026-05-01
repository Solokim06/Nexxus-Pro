const PDFDocument = require('pdfkit');
const PDFMerger = require('pdf-merger-js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class PDFService {
  constructor() {
    this.merger = new PDFMerger();
  }

  async mergePDFs(pdfPaths, outputPath = null) {
    const merger = new PDFMerger();
    
    for (const pdfPath of pdfPaths) {
      await merger.add(pdfPath);
    }
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/pdf', `${uuidv4()}.pdf`);
    await merger.save(finalPath);
    
    return {
      path: finalPath,
      size: fs.statSync(finalPath).size,
    };
  }

  async splitPDF(pdfPath, pages, outputDir = null) {
    const outputDirPath = outputDir || path.join(__dirname, '../../uploads/pdf/split');
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
    }

    const results = [];
    const pdfDocument = require('pdf-lib').PDFDocument;
    const pdfBytes = fs.readFileSync(pdfPath);
    const sourceDoc = await pdfDocument.load(pdfBytes);

    for (const pageRange of pages) {
      const newDoc = await pdfDocument.create();
      const pageIndices = this.parsePageRange(pageRange, sourceDoc.getPageCount());
      
      const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
      copiedPages.forEach(page => newDoc.addPage(page));
      
      const outputPath = path.join(outputDirPath, `${uuidv4()}.pdf`);
      const newPdfBytes = await newDoc.save();
      fs.writeFileSync(outputPath, newPdfBytes);
      
      results.push({
        path: outputPath,
        pages: pageIndices.length,
        size: fs.statSync(outputPath).size,
      });
    }

    return results;
  }

  async extractPages(pdfPath, pageNumbers, outputPath = null) {
    const pdfDocument = require('pdf-lib').PDFDocument;
    const pdfBytes = fs.readFileSync(pdfPath);
    const sourceDoc = await pdfDocument.load(pdfBytes);
    
    const newDoc = await pdfDocument.create();
    const pages = await newDoc.copyPages(sourceDoc, pageNumbers);
    pages.forEach(page => newDoc.addPage(page));
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/pdf', `${uuidv4()}.pdf`);
    const newPdfBytes = await newDoc.save();
    fs.writeFileSync(finalPath, newPdfBytes);
    
    return {
      path: finalPath,
      pages: pageNumbers.length,
      size: fs.statSync(finalPath).size,
    };
  }

  async compressPDF(pdfPath, quality = 'medium') {
    const { PDFDocument } = require('pdf-lib');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Compression settings
    const options = {
      low: { compress: true, imageQuality: 0.5 },
      medium: { compress: true, imageQuality: 0.7 },
      high: { compress: true, imageQuality: 0.9 },
    };
    
    const settings = options[quality] || options.medium;
    
    // Save with compression
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: settings.compress,
      addDefaultPage: false,
    });
    
    const outputPath = path.join(__dirname, '../../uploads/pdf', `${uuidv4()}_compressed.pdf`);
    fs.writeFileSync(outputPath, compressedBytes);
    
    const originalSize = fs.statSync(pdfPath).size;
    const compressedSize = fs.statSync(outputPath).size;
    
    return {
      path: outputPath,
      originalSize,
      compressedSize,
      savedBytes: originalSize - compressedSize,
      savedPercentage: ((originalSize - compressedSize) / originalSize) * 100,
    };
  }

  async addWatermark(pdfPath, watermarkText, outputPath = null) {
    const { PDFDocument, rgb } = require('pdf-lib');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText(watermarkText, {
        x: width / 2 - 100,
        y: height / 2,
        size: 30,
        opacity: 0.3,
        color: rgb(0.5, 0.5, 0.5),
        rotate: Math.PI / 4,
      });
    }
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/pdf', `${uuidv4()}_watermarked.pdf`);
    const watermarkedBytes = await pdfDoc.save();
    fs.writeFileSync(finalPath, watermarkedBytes);
    
    return {
      path: finalPath,
      size: fs.statSync(finalPath).size,
    };
  }

  async addPageNumbers(pdfPath, outputPath = null) {
    const { PDFDocument, rgb } = require('pdf-lib');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const pageCount = pages.length;
    
    for (let i = 0; i < pageCount; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      page.drawText(`${i + 1} / ${pageCount}`, {
        x: width - 50,
        y: 30,
        size: 10,
        color: rgb(0, 0, 0),
      });
    }
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/pdf', `${uuidv4()}_numbered.pdf`);
    const numberedBytes = await pdfDoc.save();
    fs.writeFileSync(finalPath, numberedBytes);
    
    return {
      path: finalPath,
      size: fs.statSync(finalPath).size,
      pageCount,
    };
  }

  async protectPDF(pdfPath, password, outputPath = null) {
    const { PDFDocument } = require('pdf-lib');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    pdfDoc.encrypt({
      userPassword: password,
      ownerPassword: password + '_owner',
      permissions: {
        printing: 'highResolution',
        modifying: false,
        copying: true,
        annotating: false,
        fillingForms: false,
        contentAccessibility: true,
        documentAssembly: false,
      },
    });
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/pdf', `${uuidv4()}_protected.pdf`);
    const encryptedBytes = await pdfDoc.save();
    fs.writeFileSync(finalPath, encryptedBytes);
    
    return {
      path: finalPath,
      size: fs.statSync(finalPath).size,
      isProtected: true,
    };
  }

  async getPDFInfo(pdfPath) {
    const { PDFDocument } = require('pdf-lib');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const pageCount = pdfDoc.getPageCount();
    
    // Get metadata
    const metadata = {
      title: pdfDoc.getTitle(),
      author: pdfDoc.getAuthor(),
      subject: pdfDoc.getSubject(),
      keywords: pdfDoc.getKeywords(),
      creator: pdfDoc.getCreator(),
      producer: pdfDoc.getProducer(),
      creationDate: pdfDoc.getCreationDate(),
      modificationDate: pdfDoc.getModificationDate(),
    };
    
    // Get page sizes
    const pages = [];
    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      pages.push({ pageNumber: i + 1, width, height });
    }
    
    return {
      pageCount,
      pages,
      metadata,
      fileSize: fs.statSync(pdfPath).size,
    };
  }

  parsePageRange(range, totalPages) {
    const pages = [];
    
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number);
      for (let i = start; i <= (end || totalPages); i++) {
        if (i <= totalPages) pages.push(i - 1);
      }
    } else {
      const pageNum = parseInt(range);
      if (pageNum <= totalPages) pages.push(pageNum - 1);
    }
    
    return pages;
  }

  async rotatePages(pdfPath, rotation = 90, pages = 'all', outputPath = null) {
    const { PDFDocument, degrees } = require('pdf-lib');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    const targetPages = pages === 'all' 
      ? Array.from({ length: pageCount }, (_, i) => i)
      : pages.map(p => p - 1);
    
    for (const pageIndex of targetPages) {
      const page = pdfDoc.getPage(pageIndex);
      page.setRotation(degrees(rotation));
    }
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/pdf', `${uuidv4()}_rotated.pdf`);
    const rotatedBytes = await pdfDoc.save();
    fs.writeFileSync(finalPath, rotatedBytes);
    
    return {
      path: finalPath,
      size: fs.statSync(finalPath).size,
      rotatedPages: targetPages.length,
    };
  }

  async imagesToPDF(imagePaths, outputPath = null, options = {}) {
    const { PDFDocument } = require('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    
    for (const imagePath of imagePaths) {
      const imageBytes = fs.readFileSync(imagePath);
      let image;
      
      if (imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
        image = await pdfDoc.embedJpg(imageBytes);
      } else if (imagePath.endsWith('.png')) {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        continue;
      }
      
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/pdf', `${uuidv4()}.pdf`);
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(finalPath, pdfBytes);
    
    return {
      path: finalPath,
      pages: imagePaths.length,
      size: fs.statSync(finalPath).size,
    };
  }
}

module.exports = new PDFService();