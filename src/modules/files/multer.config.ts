import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { MulterModuleOptions, MulterOptionsFactory } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

const MAX_UPLOAD_SIZE = 1024 * 1024 * 50; // 50MB

type MulterFileLike = {
  mimetype?: string;
};

@Injectable()
export class MulterConfigService implements MulterOptionsFactory {
  private getFolderType(req: any) {
    return (req?.headers?.folder_type as string) ?? '';
  }

  private isImage(file: MulterFileLike) {
    return /^image\//.test(file?.mimetype ?? '');
  }

  private isVideo(file: MulterFileLike) {
    return /^video\//.test(file?.mimetype ?? '');
  }

  createMulterOptions(): MulterModuleOptions {
    return {
      storage: memoryStorage(),

      fileFilter: (req, file, cb) => {
        const folderType = this.getFolderType(req);

        const isImage = this.isImage(file);
        const isVideo = this.isVideo(file);

        const canUploadAvatar = folderType === 'avatar' && isImage;
        const canUploadBook = folderType === 'book' && isImage;
        const canUploadReview = folderType === 'review' && (isImage || isVideo);

        if (!canUploadAvatar && !canUploadBook && !canUploadReview) {
          cb(
            new HttpException(
              'File không hợp lệ. Avatar/book chỉ upload ảnh. Review upload ảnh hoặc video.',
              HttpStatus.UNPROCESSABLE_ENTITY,
            ),
            false,
          );
          return;
        }

        cb(null, true);
      },

      limits: {
        fileSize: MAX_UPLOAD_SIZE,
      },
    };
  }
}
