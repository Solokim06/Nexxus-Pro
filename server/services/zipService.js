const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ZipService {
  async createZip(files, outputPath = null, options = {}) {
    const zip = new JSZip();
    
    for (const file of files) {
      const fileData = fs.readFileSync(file.path);
      const fileName = options.preservePaths 
        ? file.name 
        : path.basename(file.path);
      zip.file(fileName, fileData);
    }
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/zip', `${uuidv4()}.zip`);
    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: options.compression !== 'none' ? 'DEFLATE' : 'STORE',
      compressionOptions: { level: options.compressionLevel || 6 },
    });
    
    fs.writeFileSync(finalPath, zipBuffer);
    
    return {
      path: finalPath,
      size: fs.statSync(finalPath).size,
      fileCount: files.length,
    };
  }

  async extractZip(zipPath, outputDir = null) {
    const outputDirPath = outputDir || path.join(__dirname, '../../uploads/extracted', uuidv4());
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
    }
    
    const zipBuffer = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(zipBuffer);
    
    const extractedFiles = [];
    
    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        const filePath = path.join(outputDirPath, filename);
        const dir = path.dirname(filePath);
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        const content = await file.async('nodebuffer');
        fs.writeFileSync(filePath, content);
        
        extractedFiles.push({
          name: filename,
          path: filePath,
          size: content.length,
        });
      }
    }
    
    return {
      outputDir: outputDirPath,
      files: extractedFiles,
      fileCount: extractedFiles.length,
    };
  }

  async addToZip(zipPath, filesToAdd, outputPath = null) {
    const zipBuffer = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(zipBuffer);
    
    for (const file of filesToAdd) {
      const fileData = fs.readFileSync(file.path);
      zip.file(file.name || path.basename(file.path), fileData);
    }
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/zip', `${uuidv4()}.zip`);
    const newZipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(finalPath, newZipBuffer);
    
    return {
      path: finalPath,
      size: fs.statSync(finalPath).size,
      addedFiles: filesToAdd.length,
    };
  }

  async removeFromZip(zipPath, filesToRemove, outputPath = null) {
    const zipBuffer = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(zipBuffer);
    
    for (const fileName of filesToRemove) {
      zip.remove(fileName);
    }
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/zip', `${uuidv4()}.zip`);
    const newZipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(finalPath, newZipBuffer);
    
    return {
      path: finalPath,
      size: fs.statSync(finalPath).size,
      removedFiles: filesToRemove.length,
    };
  }

  async encryptZip(zipPath, password, outputPath = null) {
    const JSZipEncrypted = require('jszip-encrypted');
    const zipBuffer = fs.readFileSync(zipPath);
    
    const encrypted = await JSZipEncrypted.encrypt(zipBuffer, password);
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/zip', `${uuidv4()}_encrypted.zip`);
    fs.writeFileSync(finalPath, encrypted);
    
    return {
      path: finalPath,
      size: fs.statSync(finalPath).size,
      isEncrypted: true,
    };
  }

  async decryptZip(encryptedZipPath, password, outputPath = null) {
    const JSZipEncrypted = require('jszip-encrypted');
    const encryptedBuffer = fs.readFileSync(encryptedZipPath);
    
    const decrypted = await JSZipEncrypted.decrypt(encryptedBuffer, password);
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/zip', `${uuidv4()}_decrypted.zip`);
    fs.writeFileSync(finalPath, decrypted);
    
    return {
      path: finalPath,
      size: fs.statSync(finalPath).size,
    };
  }

  async getZipInfo(zipPath) {
    const zipBuffer = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(zipBuffer);
    
    const files = [];
    let totalSize = 0;
    
    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        const content = await file.async('nodebuffer');
        files.push({
          name: filename,
          size: content.length,
          compressedSize: file._data?.uncompressedSize || 0,
          compressionMethod: file._data?.compressionMethod,
        });
        totalSize += content.length;
      }
    }
    
    return {
      fileCount: files.length,
      totalSize,
      files,
      compression: zip.comment || 'No comment',
    };
  }

  async createZipFromDirectory(directoryPath, outputPath = null, options = {}) {
    const zip = new JSZip();
    
    const addFilesToZip = (dir, zipFolder) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          addFilesToZip(filePath, zipFolder.folder(file));
        } else {
          const fileData = fs.readFileSync(filePath);
          zipFolder.file(file, fileData);
        }
      }
    };
    
    addFilesToZip(directoryPath, zip);
    
    const finalPath = outputPath || path.join(__dirname, '../../uploads/zip', `${uuidv4()}.zip`);
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(finalPath, zipBuffer);
    
    return {
      path: finalPath,
      size: fs.statSync(finalPath).size,
    };
  }
}

module.exports = new ZipService();