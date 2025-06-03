// src/shopping-lists/dto/update-shopping-list.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';
import { ShoppingListItemInputDto } from './shopping-list-item-input.dto';
// Można by też użyć PartialType(CreateShoppingListDto) z @nestjs/mapped-types,
// ale dla jasności definiujemy osobno, ponieważ logika może się różnić.

export class UpdateShoppingListDto {
  @ApiProperty({
    example: 'My Updated Groceries',
    description: 'New name of the shopping list',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description:
      'Items to update in the shopping list. Replaces all existing items. Can be an array of strings or item objects.',
    type: 'array',
    items: {
      oneOf: [
        { type: 'string', example: 'Bananas' },
        { $ref: '#/components/schemas/ShoppingListItemInputDto' },
      ],
    },
    required: false, // Items są opcjonalne, ale jeśli podane, zastępują istniejące
    example: ['Bananas', { name: 'Bread', quantity: 1, category: 'Bakery' }],
  })
  @IsArray()
  @IsOptional()
  items?: (string | ShoppingListItemInputDto)[];
}
