// src/shopping-lists/dto/create-shopping-list.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShoppingListItemInputDto } from './shopping-list-item-input.dto';

export class CreateShoppingListDto {
  @ApiProperty({
    example: 'My Groceries',
    description: 'Name of the shopping list',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  // Zmieniamy typ 'items' na bardziej konkretny, ale wciąż pozwalający na elastyczność,
  // którą obsługuje serwis. Dla Swaggera i podstawowej walidacji typu tablicy.
  // Pełna walidacja każdego elementu w mieszanej tablicy string | object jest trudna z class-validator.
  // Serwis _normalizeAndCreateItemEntities zajmie się szczegółową normalizacją.
  @ApiProperty({
    description:
      'Items in the shopping list. Can be an array of strings or item objects as defined in ShoppingListItemInputDto.',
    type: 'array',
    items: {
      oneOf: [
        // Swagger: pokazuje, że elementy mogą być stringiem LUB obiektem
        { type: 'string', example: 'Apples' },
        { $ref: '#/components/schemas/ShoppingListItemInputDto' }, // Odniesienie do schematu DTO
      ],
    },
    required: false,
    example: ['Apples', { name: 'Milk', quantity: 2, category: 'Dairy' }],
  })
  @IsArray()
  @IsOptional()
  // W praktyce, `ValidationPipe` z `whitelist: true` może odfiltrować stringi, jeśli nie ma dla nich
  // jawnego dopasowania w typie DTO. Jeśli chcemy wspierać stringi, typ `any[]` lub
  // własny walidator byłby potrzebny dla `class-validator`.
  // Na razie zostawiamy tak, aby kontroler przyjmował to, co wcześniej, a serwis normalizował.
  // Jeśli chcemy ścisłej walidacji obiektów:
  // @ValidateNested({ each: true })
  // @Type(() => ShoppingListItemInputDto)
  // items?: ShoppingListItemInputDto[]; // Wtedy tylko obiekty byłyby dozwolone
  items?: (string | ShoppingListItemInputDto)[];
}
