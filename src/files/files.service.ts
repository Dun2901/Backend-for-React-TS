import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { UpdateFileDto } from './dto/update-file.dto';

@Injectable()
export class FilesService {
  deleteUploadedFile(fileName: string, folderType: string) {
    const filePath = join(
      process.cwd(),
      'public',
      'images',
      folderType,
      fileName,
    );

    if (!existsSync(filePath)) {
      throw new BadRequestException('File không tồn tại');
    }

    unlinkSync(filePath);

    return {
      deleted: true,
      fileName,
    };
  }

  findAll() {
    return `This action returns all files`;
  }

  findOne(id: number) {
    return `This action returns a #${id} file`;
  }

  update(id: number, updateFileDto: UpdateFileDto) {
    return `This action updates a #${id} file`;
  }

  remove(id: number) {
    return `This action removes a #${id} file`;
  }
}
