// src/shopping-lists/dto/update-shopping-list.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // Dodaj ApiPropertyOptional
import { IsString, IsNotEmpty, IsArray, IsOptional, IsBoolean } from 'class-validator'; // Dodaj IsBoolean
import { ShoppingListItemInputDto } from './shopping-list-item-input.dto';

export class UpdateShoppingListDto {
  @ApiProperty({ example: 'My Updated Groceries', description: 'New name of the shopping list' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ // Użyj ApiPropertyOptional dla opcjonalnych pól
    description: 'Items to update in the shopping list. Replaces all existing items. Can be an array of strings or item objects.',
    type: 'array',
    items: {
      oneOf: [
        { type: 'string', example: 'Bananas' },
        { $ref: '#/components/schemas/ShoppingListItemInputDto' },
      ],
    },
    required: false,
    example: ['Bananas', { name: 'Bread', quantity: 1, category: 'Bakery' }]
  })
  @IsArray()
  @IsOptional()
  items?: (string | ShoppingListItemInputDto)[];

  // NOWE POLE
  @ApiPropertyOptional({ example: true, description: 'Set the favorite status of the list', required: false })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}