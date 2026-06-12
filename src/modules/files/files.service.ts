import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { basename, join } from 'path';
import { UpdateFileDto } from './dto/update-file.dto';
import {
  CloudinaryFolderType,
  CloudinaryMediaType,
  CloudinaryService,
  ICloudinaryUploadedFile,
} from './cloudinary.service';

@Injectable()
export class FilesService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  private validateFolderType(folderType: string): CloudinaryFolderType {
    if (!folderType) {
      throw new BadRequestException('folder_type không được để trống');
    }

    if (!['avatar', 'book', 'review'].includes(folderType)) {
      throw new BadRequestException('folder_type không hợp lệ');
    }

    return folderType as CloudinaryFolderType;
  }

  private validateReviewLimit(files: Express.Multer.File[]) {
    const imageCount = files.filter((file) => file.mimetype.startsWith('image/')).length;

    const videoCount = files.filter((file) => file.mimetype.startsWith('video/')).length;

    if (imageCount > 5) {
      throw new BadRequestException('Tối đa 5 hình ảnh cho 1 đánh giá');
    }

    if (videoCount > 1) {
      throw new BadRequestException('Tối đa 1 video cho 1 đánh giá');
    }

    if (files.length > 6) {
      throw new BadRequestException('Tối đa 6 file cho 1 đánh giá');
    }
  }

  async uploadSingleFile(
    file: Express.Multer.File,
    folderType: string,
  ): Promise<ICloudinaryUploadedFile> {
    const validFolderType = this.validateFolderType(folderType);

    if (!file) {
      throw new BadRequestException('File không được để trống');
    }

    if (validFolderType === 'review') {
      this.validateReviewLimit([file]);
    }

    return this.cloudinaryService.uploadFile(file, validFolderType);
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folderType: string,
  ): Promise<ICloudinaryUploadedFile[]> {
    const validFolderType = this.validateFolderType(folderType);

    if (!files || files.length === 0) {
      throw new BadRequestException('Files không được để trống');
    }

    if (validFolderType === 'avatar') {
      throw new BadRequestException('Avatar chỉ được upload 1 file');
    }

    if (validFolderType === 'review') {
      this.validateReviewLimit(files);
    }

    const uploadedFiles: ICloudinaryUploadedFile[] = [];

    try {
      for (const file of files) {
        const uploadedFile = await this.cloudinaryService.uploadFile(file, validFolderType);

        uploadedFiles.push(uploadedFile);
      }

      return uploadedFiles;
    } catch (error) {
      await Promise.allSettled(
        uploadedFiles.map((file) => this.cloudinaryService.deleteFile(file.publicId, file.type)),
      );

      throw error;
    }
  }

  async deleteCloudinaryFile(publicId: string, type: CloudinaryMediaType) {
    return this.cloudinaryService.deleteFile(publicId, type);
  }

  deleteUploadedFile(fileName: string, folderType: string) {
    if (!fileName) {
      throw new BadRequestException('fileName không được để trống');
    }

    if (!folderType) {
      throw new BadRequestException('folder_type không được để trống');
    }

    if (!['book', 'avatar'].includes(folderType)) {
      throw new BadRequestException('folder_type không hợp lệ');
    }

    const safeFileName = basename(fileName);

    const filePath = join(process.cwd(), 'public', 'images', folderType, safeFileName);

    if (!existsSync(filePath)) {
      throw new BadRequestException(
        'File local không tồn tại. Nếu là file Cloudinary hãy dùng API /files/cloudinary',
      );
    }

    unlinkSync(filePath);

    return {
      deleted: true,
      fileName,
    };
  }

  findAll() {
    return {
      message: 'Files module is running',
    };
  }

  findOne(id: number) {
    return {
      message: `This action returns a #${id} file`,
    };
  }

  update(id: number, updateFileDto: UpdateFileDto) {
    return {
      message: `This action updates a #${id} file`,
      data: updateFileDto,
    };
  }

  remove(id: number) {
    return {
      message: `This action removes a #${id} file`,
    };
  }
}
