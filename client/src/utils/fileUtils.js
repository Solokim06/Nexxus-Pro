// Read file as text
export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

// Read file as data URL
export const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

// Read file as array buffer
export const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

// Check if file is image
export const isImageFile = (file) => {
  return file.type.startsWith('image/');
};

// Check if file is video
export const isVideoFile = (file) => {
  return file.type.startsWith('video/');
};

// Check if file is audio
export const isAudioFile = (file) => {
  return file.type.startsWith('audio/');
};

// Check if file is PDF
export const isPDFFile = (file) => {
  return file.type === 'application/pdf';
};

// Check if file is document
export const isDocumentFile = (file) => {
  const docTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  return docTypes.includes(file.type);
};

// Get file icon based on type
export const getFileIcon = (fileType) => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('document') || fileType.includes('word')) return '📝';
  if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return '📦';
  return '📁';
};

// Get file color based on type
export const getFileColor = (fileType) => {
  if (fileType.startsWith('image/')) return 'text-blue-500';
  if (fileType.startsWith('video/')) return 'text-red-500';
  if (fileType.startsWith('audio/')) return 'text-green-500';
  if (fileType === 'application/pdf') return 'text-red-600';
  if (fileType.includes('document')) return 'text-blue-600';
  if (fileType.includes('sheet')) return 'text-green-600';
  if (fileType.includes('presentation')) return 'text-orange-600';
  return 'text-gray-500';
};

// Split file into chunks
export const splitFileIntoChunks = (file, chunkSize = 1024 * 1024) => {
  const chunks = [];
  let start = 0;
  
  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    chunks.push({
      index: chunks.length,
      start,
      end,
      data: chunk,
      size: end - start,
    });
    start = end;
  }
  
  return chunks;
};

// Merge chunks back into file
export const mergeChunks = async (chunks, fileName, mimeType) => {
  const blob = new Blob(chunks.map(c => c.data), { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
};

// Generate thumbnail for image
export const generateImageThumbnail = (file, maxWidth = 200, maxHeight = 200) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Get file preview URL
export const getFilePreviewUrl = (file) => {
  if (isImageFile(file)) {
    return URL.createObjectURL(file);
  }
  return null;
};

// Revoke preview URL
export const revokePreviewUrl = (url) => {
  if (url) {
    URL.revokeObjectURL(url);
  }
};

// Download file from blob
export const downloadFile = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Format file name for display
export const formatFileName = (fileName, maxLength = 50) => {
  if (fileName.length <= maxLength) return fileName;
  
  const extension = fileName.split('.').pop();
  const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.'));
  const availableLength = maxLength - extension.length - 3; // -3 for "..."
  
  if (availableLength <= 0) return `...${extension}`;
  
  const truncatedName = nameWithoutExt.slice(0, availableLength);
  return `${truncatedName}...${extension}`;
};

// Check if file name is valid
export const isValidFileName = (fileName) => {
  const invalidChars = /[<>:"/\\|?*]/g;
  return !invalidChars.test(fileName) && fileName.length > 0 && fileName.length < 255;
};

// Get unique file name
export const getUniqueFileName = (fileName, existingNames) => {
  if (!existingNames.includes(fileName)) return fileName;
  
  const extension = fileName.split('.').pop();
  const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.'));
  let counter = 1;
  let newName;
  
  do {
    newName = `${nameWithoutExt} (${counter})${extension ? `.${extension}` : ''}`;
    counter++;
  } while (existingNames.includes(newName));
  
  return newName;
};

// Sort files by various criteria
export const sortFiles = (files, criteria = 'name', order = 'asc') => {
  const sorted = [...files];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (criteria) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'date':
        comparison = new Date(a.lastModified) - new Date(b.lastModified);
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      default:
        comparison = 0;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
};

// Filter files by type
export const filterFilesByType = (files, types) => {
  if (!types || types.length === 0) return files;
  return files.filter(file => types.includes(file.type));
};

// Filter files by size
export const filterFilesBySize = (files, minSize = 0, maxSize = Infinity) => {
  return files.filter(file => file.size >= minSize && file.size <= maxSize);
};

// Search files by name
export const searchFilesByName = (files, query) => {
  if (!query) return files;
  const searchTerm = query.toLowerCase();
  return files.filter(file => file.name.toLowerCase().includes(searchTerm));
};