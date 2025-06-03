// src/shopping-lists/shopping-lists.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request as NestRequest,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  ParseIntPipe,
  ParseFloatPipe, // Dodajemy ParseFloatPipe dla lat/lng
} from '@nestjs/common';
import { ShoppingListsService } from './shopping-lists.service';
import { SharedListsService } from './shared-lists.service';
import { AuthGuard } from '../auth/auth.guard';
import { UsersService } from '../users/users.service';
import { Request } from 'express';
import { User } from '../entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { UpdateShoppingListDto } from './dto/update-shopping-list.dto';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

interface AuthRequest extends Request {
  user?: User;
}

@ApiTags('shopping-lists')
@Controller('shopping-lists')
@UseGuards(AuthGuard)
export class ShoppingListsController {
  constructor(
    private readonly shoppingListsService: ShoppingListsService,
    private readonly sharedListsService: SharedListsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new shopping list' })
  @ApiBody({ type: CreateShoppingListDto })
  @ApiResponse({ status: 201, description: 'Shopping list created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request / Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@NestRequest() req: AuthRequest, @Body() createShoppingListDto: CreateShoppingListDto) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    // POPRAWKA: Przekazujemy cały obiekt DTO do serwisu
    return this.shoppingListsService.create(user, createShoppingListDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all shopping lists for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Shopping lists retrieved successfully', type: Array })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@NestRequest() req: AuthRequest) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    return this.shoppingListsService.findAll(user);
  }

  @Get('find-items')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search items in shopping lists' })
  @ApiQuery({ name: 'name', required: false, type: String, description: 'Item name to search for' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Item category to search for' })
  @ApiQuery({ name: 'store', required: false, type: String, description: 'Store to search for' })
  @ApiResponse({ status: 200, description: 'Items retrieved successfully', type: Array })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(
    @NestRequest() req: AuthRequest,
    @Query('name') name?: string,
    @Query('category') category?: string,
    @Query('store') store?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    return this.shoppingListsService.searchItems(user, { name, category, store });
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific shopping list by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Shopping list ID' })
  @ApiResponse({ status: 200, description: 'Shopping list retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@NestRequest() req: AuthRequest, @Param('id', ParseIntPipe) listId: number) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    return this.shoppingListsService.findOne(user, listId);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a shopping list by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Shopping list ID' })
  @ApiBody({ type: UpdateShoppingListDto })
  @ApiResponse({ status: 200, description: 'Shopping list updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format / Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @NestRequest() req: AuthRequest,
    @Param('id', ParseIntPipe) listId: number,
    @Body() updateShoppingListDto: UpdateShoppingListDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    // POPRAWKA: Przekazujemy cały obiekt DTO do serwisu
    return this.shoppingListsService.update(user, listId, updateShoppingListDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a shopping list by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Shopping list ID' })
  @ApiResponse({ status: 200, description: 'Shopping list deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@NestRequest() req: AuthRequest, @Param('id', ParseIntPipe) listId: number) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    await this.shoppingListsService.remove(user, listId);
    return { message: 'Shopping list deleted successfully' };
  }

  @Get(':id/nearby-stores')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find nearby stores for a shopping list' })
  @ApiParam({ name: 'id', type: Number, description: 'Shopping list ID' })
  @ApiQuery({ name: 'lat', type: Number, description: 'Latitude', required: true })
  @ApiQuery({ name: 'lng', type: Number, description: 'Longitude', required: true })
  @ApiResponse({ status: 200, description: 'Nearby stores retrieved successfully', type: Array })
  @ApiResponse({ status: 400, description: 'Invalid ID format or missing/invalid latitude/longitude' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findNearbyStores(
    @NestRequest() req: AuthRequest,
    @Param('id', ParseIntPipe) listId: number,
    @Query('lat', ParseFloatPipe) lat: number, // Użyj ParseFloatPipe dla współrzędnych
    @Query('lng', ParseFloatPipe) lng: number, // Użyj ParseFloatPipe dla współrzędnych
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    return this.shoppingListsService.findNearbyStores(user, listId, { lat, lng });
  }

  @Post(':id/share')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Share a shopping list with another user' })
  @ApiParam({ name: 'id', type: Number, description: 'Shopping list ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { email: { type: 'string', example: 'friend@example.com' } },
      required: ['email'],
    },
  })
  @ApiResponse({ status: 200, description: 'Shopping list shared successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format or missing email' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async shareList(
    @NestRequest() req: AuthRequest,
    @Param('id', ParseIntPipe) listId: number,
    @Body('email') email: string,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    if (!email) throw new BadRequestException('Email is required'); // Można to przenieść do DTO
    const user = await this.usersService.findById(userId);
    await this.sharedListsService.shareList(user, listId, email);
    return { message: `Shopping list ${listId} shared with ${email}` };
  }

  @Delete(':id/share/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke access to a shared shopping list' })
  @ApiParam({ name: 'id', type: Number, description: 'Shopping list ID' })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID to revoke access for' })
  @ApiResponse({ status: 200, description: 'Access revoked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeSharedAccess(
    @NestRequest() req: AuthRequest,
    @Param('id', ParseIntPipe) listId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ) {
    const ownerId = req.user?.id;
    if (!ownerId) throw new UnauthorizedException('User not authenticated');
    const owner = await this.usersService.findById(ownerId);
    await this.sharedListsService.removeSharedAccess(owner, listId, targetUserId);
    return { message: `Access to shopping list ${listId} revoked for user ${targetUserId}` };
  }

  @Post(':id/items')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an item to a shopping list' })
  @ApiParam({ name: 'id', type: Number, description: 'Shopping list ID' })
  @ApiBody({ type: AddItemDto })
  @ApiResponse({ status: 201, description: 'Item added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format or missing data / Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addItem(
    @NestRequest() req: AuthRequest,
    @Param('id', ParseIntPipe) listId: number,
    @Body() addItemDto: AddItemDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    return this.shoppingListsService.addItem(user, listId, addItemDto);
  }

  @Put(':id/items/:itemId') // Używamy :itemId
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an item in a shopping list' })
  @ApiParam({ name: 'id', type: Number, description: 'Shopping list ID' })
  @ApiParam({ name: 'itemId', type: Number, description: 'Item ID' })
  @ApiBody({ type: UpdateItemDto })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID or item ID format / Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateItem(
    @NestRequest() req: AuthRequest,
    @Param('id', ParseIntPipe) listId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    // POPRAWKA: Wywołanie poprawnej nazwy metody w serwisie
    return this.shoppingListsService.updateItemById(user, listId, itemId, updateItemDto);
  }

  @Post('from-api')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a shopping list from Fake Store API' })
  @ApiResponse({ status: 201, description: 'Shopping list created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createFromApi(@NestRequest() req: AuthRequest) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    return this.shoppingListsService.createFromApi(user);
  }
}