import * as fs from 'fs';
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';

type UploadSeedImageOptions = {
  folder?: string;
  rootDir?: string;
};

type BookSeedImages = {
  thumbnail: string;
  slider?: string[];
};

const uploadedImageCache = new Map<string, Promise<string>>();
let isCloudinaryConfigured = false;

const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value);

const getRequiredEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Thiếu biến môi trường ${key}`);
  }

  return value;
};

const configCloudinary = () => {
  if (isCloudinaryConfigured) return;

  cloudinary.config({
    cloud_name: getRequiredEnv('CLOUDINARY_CLOUD_NAME'),
    api_key: getRequiredEnv('CLOUDINARY_API_KEY'),
    api_secret: getRequiredEnv('CLOUDINARY_API_SECRET'),
    secure: true,
  });

  isCloudinaryConfigured = true;
};

const getImageRoot = (rootDir?: string) => {
  const imageRoot = rootDir || process.env.CLOUDINARY_SEED_IMAGE_ROOT || 'public/images/book';

  if (path.isAbsolute(imageRoot)) {
    return imageRoot;
  }

  return path.join(process.cwd(), imageRoot);
};

const getPublicIdFromFileName = (fileName: string) => {
  const fileNameWithoutExt = path.parse(fileName).name;

  return fileNameWithoutExt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
};

const uploadLocalImage = async (
  fileName: string,
  options: UploadSeedImageOptions = {},
): Promise<string> => {
  configCloudinary();

  const folder = options.folder || process.env.CLOUDINARY_FOLDER || 'bookstore/books';

  const imageRoot = getImageRoot(options.rootDir);
  const filePath = path.join(imageRoot, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy ảnh seed: ${filePath}`);
  }

  const publicId = getPublicIdFromFileName(fileName);

  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    resource_type: 'image',
  });

  return result.secure_url;
};

export const uploadSeedImageToCloudinary = async (
  fileName: string,
  options: UploadSeedImageOptions = {},
): Promise<string> => {
  if (!fileName) return '';

  if (isRemoteUrl(fileName)) {
    return fileName;
  }

  const folder = options.folder || process.env.CLOUDINARY_FOLDER || 'bookstore/books';

  const imageRoot = getImageRoot(options.rootDir);
  const cacheKey = `${imageRoot}/${folder}/${fileName}`;

  if (uploadedImageCache.has(cacheKey)) {
    return uploadedImageCache.get(cacheKey)!;
  }

  const uploadPromise = uploadLocalImage(fileName, options);
  uploadedImageCache.set(cacheKey, uploadPromise);

  return uploadPromise;
};

export const uploadBookImagesToCloudinary = async <T extends BookSeedImages>(
  book: T,
  options: UploadSeedImageOptions = {},
): Promise<T> => {
  const thumbnail = await uploadSeedImageToCloudinary(book.thumbnail, options);

  const slider = await Promise.all(
    (book.slider || []).map((image) => uploadSeedImageToCloudinary(image, options)),
  );

  return {
    ...book,
    thumbnail,
    slider,
  };
};
