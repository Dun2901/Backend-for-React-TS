import * as fs from 'fs';
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';

type UploadSeedImageOptions = {
  folder?: string;
  rootDir?: string;
  seedBaseUrl?: string;
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

const getCloudinaryFolder = (folder?: string) => {
  return (
    folder ||
    process.env.CLOUDINARY_FOLDER ||
    process.env.CLOUDINARY_BOOK_FOLDER ||
    'bookstore/books'
  );
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

const getSeedBaseUrl = (seedBaseUrl?: string) => {
  const value = seedBaseUrl || process.env.CLOUDINARY_SEED_BASE_URL || '';

  return value.trim().replace(/\/+$/, '');
};

const encodeCloudinaryPath = (value: string) => {
  return value
    .replace(/^\/+/, '')
    .split('/')
    .map((item) => encodeURIComponent(item))
    .join('/');
};

const buildSeedRemoteUrl = (fileName: string, seedBaseUrl?: string) => {
  const baseUrl = getSeedBaseUrl(seedBaseUrl);

  if (!baseUrl) return '';

  return `${baseUrl}/${encodeCloudinaryPath(fileName)}`;
};

const uploadLocalImage = async (
  fileName: string,
  options: UploadSeedImageOptions = {},
): Promise<string> => {
  configCloudinary();

  const folder = getCloudinaryFolder(options.folder);
  const imageRoot = getImageRoot(options.rootDir);
  const filePath = path.join(imageRoot, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      [
        `Không tìm thấy ảnh seed: ${filePath}`,
        '',
        'Cách fix:',
        '1. Thêm ảnh local vào public/images/book',
        'hoặc',
        '2. Thêm CLOUDINARY_SEED_BASE_URL vào .env để seed bằng URL Cloudinary public.',
        '',
        'Ví dụ:',
        'CLOUDINARY_SEED_BASE_URL=https://res.cloudinary.com/dzqvxuolo/image/upload/bookstore/books',
      ].join('\n'),
    );
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

  const remoteUrl = buildSeedRemoteUrl(fileName, options.seedBaseUrl);

  if (remoteUrl) {
    return remoteUrl;
  }

  const folder = getCloudinaryFolder(options.folder);
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
