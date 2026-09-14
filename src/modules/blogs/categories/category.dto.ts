import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'Engineering' })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? categoryName(value) : value,
  )
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  @Max(10000)
  position: number;
}
