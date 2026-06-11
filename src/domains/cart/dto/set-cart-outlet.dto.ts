import { IsInt, Min } from 'class-validator';

export class SetCartOutletDTO {
  @IsInt()
  @Min(1)
  outletId: number;
}
