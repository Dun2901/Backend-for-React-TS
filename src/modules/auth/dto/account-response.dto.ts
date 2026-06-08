import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto';

export class AccountResponseDto {
  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;
}
