import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export type CloudinaryFolderType = 'avatar' | 'book' | 'review';
export type CloudinaryMediaType = 'IMAGE' | 'VIDEO';

export interface ICloudinaryUploadedFile {
  url: string;
  publicId: string;
  type: CloudinaryMediaType;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface ICloudinaryDeleteResult {
  deleted: boolean;
  publicId: string;
  result: string;
}

interface ICloudinaryDestroyResponse {
  result?: string;
}

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService<IConfigService>) {}

  private getCloudinaryClient() {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException('Thiếu cấu hình Cloudinary trong file .env');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    return cloudinary;
  }

  private getFolder(folderType: CloudinaryFolderType) {
    const rootFolder = this.configService.get<string>('CLOUDINARY_ROOT_FOLDER') || 'bookstore';

    if (folderType === 'avatar') {
      return `${rootFolder}/avatar`;
    }

    if (folderType === 'book') {
      return `${rootFolder}/books`;
    }

    return `${rootFolder}/reviews`;
  }

  private bufferToStream(buffer: Buffer) {
    const readable = new Readable();

    readable.push(buffer);
    readable.push(null);

    return readable;
  }

  private mapMediaType(resourceType?: string): CloudinaryMediaType {
    return resourceType === 'video' ? 'VIDEO' : 'IMAGE';
  }

  private isDestroyResponse(value: unknown): value is ICloudinaryDestroyResponse {
    return typeof value === 'object' && value !== null && 'result' in value;
  }

  async uploadFile(
    file: Express.Multer.File,
    folderType: CloudinaryFolderType,
  ): Promise<ICloudinaryUploadedFile> {
    if (!file) {
      throw new BadRequestException('File không được để trống');
    }

    const cloudinaryClient = this.getCloudinaryClient();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinaryClient.uploader.upload_stream(
        {
          folder: this.getFolder(folderType),
          resource_type: 'auto',
          use_filename: false,
          unique_filename: true,
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(new BadRequestException(error?.message || 'Upload Cloudinary thất bại'));
            return;
          }

          const uploadResult = result as UploadApiResponse & {
            duration?: number;
          };

          resolve({
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            type: this.mapMediaType(uploadResult.resource_type),
            format: uploadResult.format,
            bytes: uploadResult.bytes,
            width: uploadResult.width,
            height: uploadResult.height,
            duration: uploadResult.duration,
          });
        },
      );

      this.bufferToStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(
    publicId: string,
    type: CloudinaryMediaType = 'IMAGE',
  ): Promise<ICloudinaryDeleteResult> {
    if (!publicId) {
      throw new BadRequestException('publicId không được để trống');
    }

    const cloudinaryClient = this.getCloudinaryClient();

    const response: unknown = await cloudinaryClient.uploader.destroy(publicId, {
      resource_type: type === 'VIDEO' ? 'video' : 'image',
    });

    const result =
      this.isDestroyResponse(response) && typeof response.result === 'string'
        ? response.result
        : 'unknown';

    return {
      deleted: result === 'ok',
      publicId,
      result,
    };
  }
}
