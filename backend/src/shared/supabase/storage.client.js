/**
 * Supabase Storage Client
 * File and image storage management
 */

const { supabaseAdmin } = require('./supabase.client');

// Storage buckets
const BUCKETS = {
  PRODUCTS: 'products',
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
  REVIEWS: 'reviews',
  SHOPS: 'shops',
  CHAT: 'chat',
};

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// Max file sizes (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Initialize storage buckets
 */
async function initializeBuckets() {
  for (const bucket of Object.values(BUCKETS)) {
    const { error } = await supabaseAdmin.storage.createBucket(bucket, {
      public: bucket !== BUCKETS.DOCUMENTS,
      fileSizeLimit: bucket === BUCKETS.DOCUMENTS ? MAX_DOCUMENT_SIZE : MAX_IMAGE_SIZE,
      allowedMimeTypes: bucket === BUCKETS.DOCUMENTS ? ALLOWED_DOCUMENT_TYPES : ALLOWED_IMAGE_TYPES,
    });
    
    if (error && !error.message.includes('already exists')) {
      console.error(`Failed to create bucket ${bucket}:`, error.message);
    }
  }
  console.log('Supabase Storage: Buckets initialized');
}

/**
 * Upload file to storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path within bucket
 * @param {Buffer|Blob|File} file - File data
 * @param {object} options - Upload options
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadFile(bucket, path, file, options = {}) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: options.cacheControl || '3600',
      upsert: options.upsert || false,
      contentType: options.contentType,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const url = getPublicUrl(bucket, data.path);
  return { url, path: data.path };
}

/**
 * Upload product image
 * @param {string} productId - Product ID
 * @param {Buffer} imageData - Image buffer
 * @param {string} filename - Original filename
 * @param {number} index - Image index (for ordering)
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadProductImage(productId, imageData, filename, index = 0) {
  const ext = filename.split('.').pop() || 'jpg';
  const path = `${productId}/${index}_${Date.now()}.${ext}`;
  
  return uploadFile(BUCKETS.PRODUCTS, path, imageData, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: true,
  });
}

/**
 * Upload user avatar
 * @param {string} userId - User ID
 * @param {Buffer} imageData - Image buffer
 * @param {string} contentType - MIME type
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadAvatar(userId, imageData, contentType = 'image/jpeg') {
  const ext = contentType.split('/')[1] || 'jpg';
  const path = `${userId}/avatar.${ext}`;
  
  return uploadFile(BUCKETS.AVATARS, path, imageData, {
    contentType,
    upsert: true,
  });
}

/**
 * Upload shop logo/banner
 * @param {string} shopId - Shop ID
 * @param {string} type - 'logo' or 'banner'
 * @param {Buffer} imageData - Image buffer
 * @param {string} contentType - MIME type
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadShopImage(shopId, type, imageData, contentType = 'image/jpeg') {
  const ext = contentType.split('/')[1] || 'jpg';
  const path = `${shopId}/${type}.${ext}`;
  
  return uploadFile(BUCKETS.SHOPS, path, imageData, {
    contentType,
    upsert: true,
  });
}

/**
 * Upload review image
 * @param {string} reviewId - Review ID
 * @param {Buffer} imageData - Image buffer
 * @param {number} index - Image index
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadReviewImage(reviewId, imageData, index = 0) {
  const path = `${reviewId}/${index}_${Date.now()}.jpg`;
  
  return uploadFile(BUCKETS.REVIEWS, path, imageData, {
    contentType: 'image/jpeg',
  });
}

/**
 * Upload verification document
 * @param {string} userId - User ID
 * @param {string} docType - Document type (id_card, business_license, etc.)
 * @param {Buffer} fileData - File buffer
 * @param {string} contentType - MIME type
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadDocument(userId, docType, fileData, contentType) {
  const ext = contentType === 'application/pdf' ? 'pdf' : 'jpg';
  const path = `${userId}/${docType}_${Date.now()}.${ext}`;
  
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKETS.DOCUMENTS)
    .upload(path, fileData, {
      cacheControl: '3600',
      upsert: false,
      contentType,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // For documents bucket (private), create a long-lived signed URL
  // This URL will be stored in database and used by admin to view documents
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from(BUCKETS.DOCUMENTS)
    .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year expiry

  if (signedError) {
    // Fallback to public URL if signed URL fails
    const publicUrl = getPublicUrl(BUCKETS.DOCUMENTS, data.path);
    return { url: publicUrl, path: data.path };
  }

  return { url: signedData.signedUrl, path: data.path };
}


/**
 * Get public URL for file
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @returns {string}
 */
function getPublicUrl(bucket, path) {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get signed URL for private file
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @param {number} expiresIn - Expiration in seconds (default 1 hour)
 * @returns {Promise<string>}
 */
async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete file from storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 */
async function deleteFile(bucket, path) {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Delete multiple files
 * @param {string} bucket - Bucket name
 * @param {string[]} paths - Array of file paths
 */
async function deleteFiles(bucket, paths) {
  const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
  
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Delete all files in a folder
 * @param {string} bucket - Bucket name
 * @param {string} folder - Folder path
 */
async function deleteFolder(bucket, folder) {
  const { data: files, error: listError } = await supabaseAdmin.storage
    .from(bucket)
    .list(folder);

  if (listError) {
    throw new Error(`List failed: ${listError.message}`);
  }

  if (files && files.length > 0) {
    const paths = files.map(file => `${folder}/${file.name}`);
    await deleteFiles(bucket, paths);
  }
}

/**
 * List files in folder
 * @param {string} bucket - Bucket name
 * @param {string} folder - Folder path
 * @param {object} options - List options
 * @returns {Promise<object[]>}
 */
async function listFiles(bucket, folder, options = {}) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(folder, {
      limit: options.limit || 100,
      offset: options.offset || 0,
      sortBy: options.sortBy || { column: 'created_at', order: 'desc' },
    });

  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }

  return data.map(file => ({
    name: file.name,
    path: `${folder}/${file.name}`,
    url: getPublicUrl(bucket, `${folder}/${file.name}`),
    size: file.metadata?.size,
    createdAt: file.created_at,
  }));
}

/**
 * Get product images
 * @param {string} productId - Product ID
 * @returns {Promise<object[]>}
 */
async function getProductImages(productId) {
  return listFiles(BUCKETS.PRODUCTS, productId);
}

/**
 * Move file
 * @param {string} bucket - Bucket name
 * @param {string} fromPath - Source path
 * @param {string} toPath - Destination path
 */
async function moveFile(bucket, fromPath, toPath) {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .move(fromPath, toPath);

  if (error) {
    throw new Error(`Move failed: ${error.message}`);
  }
}

/**
 * Copy file
 * @param {string} bucket - Bucket name
 * @param {string} fromPath - Source path
 * @param {string} toPath - Destination path
 */
async function copyFile(bucket, fromPath, toPath) {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .copy(fromPath, toPath);

  if (error) {
    throw new Error(`Copy failed: ${error.message}`);
  }
}

module.exports = {
  // Initialization
  initializeBuckets,
  
  // Upload
  uploadFile,
  uploadProductImage,
  uploadAvatar,
  uploadShopImage,
  uploadReviewImage,
  uploadDocument,
  
  // URLs
  getPublicUrl,
  getSignedUrl,
  
  // Delete
  deleteFile,
  deleteFiles,
  deleteFolder,
  
  // List
  listFiles,
  getProductImages,
  
  // Move/Copy
  moveFile,
  copyFile,
  
  // Constants
  BUCKETS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_IMAGE_SIZE,
  MAX_DOCUMENT_SIZE,
};
