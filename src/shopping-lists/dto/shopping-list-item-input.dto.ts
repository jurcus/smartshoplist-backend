// src/shopping-lists/dto/shopping-list-item-input.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class ShoppingListItemInputDto {
  @ApiProperty({
    example: 'Milk',
    description: 'Name of the shopping item',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Dairy',
    description: 'Category of the item',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    example: 'Local Store',
    description: 'Store for the item',
    required: false,
  })
  @IsOptional()
  @IsString()
  store?: string;

  @ApiProperty({
    example: 1,
    description: 'Quantity of the item',
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiProperty({
    example: false,
    description: 'Whether the item has been bought',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  bought?: boolean;
}
