const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ThumbnailService {
  constructor() {
    this.thumbnailSizes = {
      small: { width: 100, height: 100 },
      medium: { width: 200, height: 200 },
      large: { width: 400, height: 400 },
    };
  }

  async createImageThumbnail(imagePath, size = 'medium', outputPath = null) {
    const dimensions = this.thumbnailSizes[size];
    const outputDir = outputPath || path.join(__dirname, '../../storage/thumbnails');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `${uuidv4()}_${size}.jpg`;
    const finalPath = path.join(outputDir, filename);
    
    await sharp(imagePath)
      .resize(dimensions.width, dimensions.height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toFile(finalPath);
    
    return {
      path: finalPath,
      url: `${process.env.STORAGE_URL}/thumbnails/${filename}`,
      width: dimensions.width,
      height: dimensions.height,
      size: fs.statSync(finalPath).size,
    };
  }

  async createVideoThumbnail(videoPath, size = 'medium', outputPath = null) {
    const { exec } = require('child_process');
    const dimensions = this.thumbnailSizes[size];
    const outputDir = outputPath || path.join(__dirname, '../../storage/thumbnails');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `${uuidv4()}_video_${size}.jpg`;
    const finalPath = path.join(outputDir, filename);
    
    // Use ffmpeg to extract frame at 1 second
    return new Promise((resolve, reject) => {
      exec(
        `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=${dimensions.width}:${dimensions.height}" "${finalPath}" -y`,
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              path: finalPath,
              url: `${process.env.STORAGE_URL}/thumbnails/${filename}`,
              width: dimensions.width,
              height: dimensions.height,
              size: fs.statSync(finalPath).size,
            });
          }
        }
      );
    });
  }

  async createPDFThumbnail(pdfPath, size = 'medium', pageNumber = 1, outputPath = null) {
    const { exec } = require('child_process');
    const dimensions = this.thumbnailSizes[size];
    const outputDir = outputPath || path.join(__dirname, '../../storage/thumbnails');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `${uuidv4()}_pdf_${size}.jpg`;
    const finalPath = path.join(outputDir, filename);
    
    // Use pdftoppm or ghostscript to convert PDF to image
    return new Promise((resolve, reject) => {
      exec(
        `pdftoppm -jpeg -f ${pageNumber} -l ${pageNumber} -scale-to ${dimensions.width} "${pdfPath}" "${finalPath.replace('.jpg', '')}"`,
        (error) => {
          if (error) {
            // Fallback: create a generic PDF icon
            this.createGenericThumbnail('pdf', dimensions, finalPath)
              .then(resolve)
              .catch(reject);
          } else {
            // Rename the generated file
            const generatedFile = finalPath.replace('.jpg', '-1.jpg');
            if (fs.existsSync(generatedFile)) {
              fs.renameSync(generatedFile, finalPath);
            }
            resolve({
              path: finalPath,
              url: `${process.env.STORAGE_URL}/thumbnails/${filename}`,
              width: dimensions.width,
              height: dimensions.height,
              size: fs.statSync(finalPath).size,
            });
          }
        }
      );
    });
  }

  async createDocumentThumbnail(fileType, size = 'medium', outputPath = null) {
    const dimensions = this.thumbnailSizes[size];
    const outputDir = outputPath || path.join(__dirname, '../../storage/thumbnails');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `${uuidv4()}_doc_${size}.png`;
    const finalPath = path.join(outputDir, filename);
    
    return this.createGenericThumbnail(fileType, dimensions, finalPath);
  }

  async createGenericThumbnail(type, dimensions, outputPath) {
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    
    // Border
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, dimensions.width - 10, dimensions.height - 10);
    
    // Icon or text
    ctx.fillStyle = '#666666';
    ctx.font = `bold ${Math.floor(dimensions.width / 4)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let displayText = type.toUpperCase();
    if (type === 'pdf') displayText = 'PDF';
    else if (type === 'image') displayText = 'IMG';
    else if (type === 'video') displayText = 'VID';
    else if (type === 'audio') displayText = 'AUD';
    else displayText = 'DOC';
    
    ctx.fillText(displayText, dimensions.width / 2, dimensions.height / 2);
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    return {
      path: outputPath,
      url: `${process.env.STORAGE_URL}/thumbnails/${path.basename(outputPath)}`,
      width: dimensions.width,
      height: dimensions.height,
      size: buffer.length,
    };
  }

  async createMultipleThumbnails(imagePath, sizes = ['small', 'medium', 'large'], outputPath = null) {
    const results = {};
    
    for (const size of sizes) {
      results[size] = await this.createImageThumbnail(imagePath, size, outputPath);
    }
    
    return results;
  }

  async deleteThumbnail(thumbnailUrl) {
    const filename = path.basename(thumbnailUrl);
    const thumbnailPath = path.join(__dirname, '../../storage/thumbnails', filename);
    
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
      return true;
    }
    return false;
  }

  async getThumbnailUrl(file, size = 'medium') {
    if (file.thumbnail) {
      return file.thumbnail;
    }
    
    if (file.mimeType.startsWith('image/')) {
      const thumbnail = await this.createImageThumbnail(file.path, size);
      return thumbnail.url;
    } else if (file.mimeType.startsWith('video/')) {
      const thumbnail = await this.createVideoThumbnail(file.path, size);
      return thumbnail.url;
    } else if (file.mimeType === 'application/pdf') {
      const thumbnail = await this.createPDFThumbnail(file.path, size);
      return thumbnail.url;
    } else {
      const thumbnail = await this.createDocumentThumbnail(file.mimeType.split('/')[0], size);
      return thumbnail.url;
    }
  }
}

module.exports = new ThumbnailService();