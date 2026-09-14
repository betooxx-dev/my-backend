import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { categoryName } from './category-name';

export class CategoryDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? categoryName(value) : value,
  )
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  position: number;
}
