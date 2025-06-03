// src/shopping-lists/dto/update-item.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class UpdateItemDto {
  @ApiPropertyOptional({ example: 'Whole Wheat Bread', description: 'New name of the item' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Healthy Bakery', description: 'New category of the item' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Supermarket', description: 'New store for the item' })
  @IsOptional()
  @IsString()
  store?: string;

  @ApiPropertyOptional({ example: 2, description: 'New quantity of the item' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: true, description: 'New bought status of the item' })
  @IsOptional()
  @IsBoolean()
  bought?: boolean;
}