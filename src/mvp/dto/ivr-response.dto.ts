import { IsNotEmpty } from 'class-validator';

export class IvrResponseDto {
  @IsNotEmpty()
  call_id: string;

  @IsNotEmpty()
  audio_data: string;
}
