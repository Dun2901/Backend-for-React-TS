import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ResponseMessage } from '@/common/decorators/customize';
import { UpdateFileDto } from './dto/update-file.dto';
import { FilesService } from './files.service';
import type { CloudinaryMediaType } from './cloudinary.service';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('upload')
  @ResponseMessage('Upload single file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Headers('folder_type') folderType: string,
  ) {
    const uploadedFile = await this.filesService.uploadSingleFile(file, folderType);

    return {
      fileUploaded: uploadedFile.url,
      fileInfo: uploadedFile,
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('upload-multiple')
  @ResponseMessage('Upload multiple files')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Headers('folder_type') folderType: string,
  ) {
    const uploadedFiles = await this.filesService.uploadMultipleFiles(files, folderType);

    return {
      fileUploaded: uploadedFiles.map((file) => file.url),
      fileInfo: uploadedFiles,
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('upload-review')
  @ResponseMessage('Upload review media')
  @UseInterceptors(FilesInterceptor('files', 6))
  async uploadReviewFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    const uploadedFiles = await this.filesService.uploadMultipleFiles(files, 'review');

    return {
      fileUploaded: uploadedFiles.map((file) => ({
        url: file.url,
        publicId: file.publicId,
        type: file.type,
      })),
      fileInfo: uploadedFiles,
    };
  }

  @Delete('cloudinary')
  @ResponseMessage('Delete Cloudinary file')
  deleteCloudinaryFile(
    @Body('publicId') publicId: string,
    @Body('type') type: CloudinaryMediaType,
  ) {
    if (!publicId) {
      throw new BadRequestException('publicId không được để trống');
    }

    return this.filesService.deleteCloudinaryFile(publicId, type || 'IMAGE');
  }

  @Delete(':fileName')
  @ResponseMessage('Delete local uploaded file')
  deleteUploadedFile(
    @Param('fileName') fileName: string,
    @Headers('folder_type') folderType: string,
  ) {
    return this.filesService.deleteUploadedFile(fileName, folderType);
  }

  @Get()
  findAll() {
    return this.filesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.filesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto) {
    return this.filesService.update(+id, updateFileDto);
  }
}
