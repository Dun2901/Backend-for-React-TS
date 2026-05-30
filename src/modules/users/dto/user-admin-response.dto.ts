import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from './user-response.dto';

class CreatedByDto {
  @Expose()
  _id: string;

  @Expose()
  email: string;
}

export class UserAdminResponseDto extends UserResponseDto {
  @Expose()
  @Type(() => CreatedByDto)
  createdBy: CreatedByDto;

  @Expose()
  @Type(() => CreatedByDto)
  updatedBy: CreatedByDto;
}
