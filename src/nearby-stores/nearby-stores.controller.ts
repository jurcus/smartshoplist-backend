import { Controller, Get, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ShoppingListsService } from '../shopping-lists/shopping-lists.service';

@Controller('shopping-lists')
export class NearbyStoresController {
  constructor(private readonly shoppingListsService: ShoppingListsService) {}

  @UseGuards(AuthGuard)
  @Get(':id/nearby-stores')
  async findNearbyStores(
    @Request() req,
    @Param('id') id: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ): Promise<any[]> {
    if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      throw new BadRequestException('Invalid lat or lng parameters');
    }
    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    return this.shoppingListsService.findNearbyStores(req.user, parseInt(id), location);
  }
}