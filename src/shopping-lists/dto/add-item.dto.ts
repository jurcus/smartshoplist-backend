// src/shopping-lists/dto/add-item.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';

export class AddItemDto {
  @ApiProperty({ example: 'Bread', description: 'Name of the item to add', required: true })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Bakery', description: 'Category of the item', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'Local Bakery', description: 'Store for the item', required: false })
  @IsOptional()
  @IsString()
  store?: string;

  @ApiProperty({ example: 1, description: 'Quantity of the item', default: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  // Dodajemy opcjonalne pole 'bought', ponieważ DTO może być używane w _normalizeAndCreateItemEntities
  @ApiProperty({ example: false, description: 'Whether the item has been bought', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  bought?: boolean;
}