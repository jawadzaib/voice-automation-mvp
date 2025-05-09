import { IsNotEmpty } from 'class-validator';

export class CallRequestDto {
  office_id: string;

  @IsNotEmpty()
  patient_ref: string;

  @IsNotEmpty()
  insurance_phone_number: string;

  insurance_name: string;
}
