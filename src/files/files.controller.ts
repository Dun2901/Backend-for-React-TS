import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Headers,
  UploadedFiles,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { UpdateFileDto } from './dto/update-file.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ResponseMessage } from '@/decorator/customize';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ResponseMessage('Upload single file')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Headers('folder_type') folderType: string, // => req.headers
  ) {
    if (folderType === 'avatar') {
      return { fileUploaded: file.filename };
    }

    if (folderType === 'book') {
      return { fileUploaded: file.filename };
    }

    throw new BadRequestException(
      'Upload failed, cần update Request Header với upload-type',
    );
  }

  @Post('upload-multiple')
  @ResponseMessage('upload multiple file')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Headers('folder_type') folderType: string,
  ) {
    if (folderType === 'book') {
      return { fileUploaded: files.map((file) => file.filename) };
    }

    throw new BadRequestException(
      'Upload failed, cần update Request Header với upload-type',
    );
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.filesService.remove(+id);
  }
}
