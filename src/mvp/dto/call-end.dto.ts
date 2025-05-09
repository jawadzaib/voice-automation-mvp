import { IsNotEmpty } from 'class-validator';

export class CallEndDto {
  @IsNotEmpty()
  call_id: string;

  @IsNotEmpty()
  status: string;

  notes: string;
}
