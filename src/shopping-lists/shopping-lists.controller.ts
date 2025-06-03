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
} from '@nestjs/common';
import { ShoppingListsService } from './shopping-lists.service';
import { SharedListsService } from './shared-lists.service';
import { AuthGuard } from '../auth/auth.guard';
import { UsersService } from '../users/users.service';
import { Request } from 'express';
import { User } from '../entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'My Shopping List' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Milk' },
              category: { type: 'string', example: 'Dairy' },
              store: { type: 'string', example: 'Local Store' },
              quantity: { type: 'number', example: 1 },
              bought: { type: 'boolean', example: false },
            },
          },
        },
      },
      required: ['name'],
    },
  })
  @ApiResponse({ status: 201, description: 'Shopping list created successfully', type: Object })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@NestRequest() req: AuthRequest, @Body() body: { name: string; items: any[] }) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);

    const normalizedItems = (body.items || []).map((item) => {
      if (typeof item === 'string') {
        console.log(`Normalizing string item: ${item}`);
        return { name: item, category: '', store: '', quantity: 1, bought: false };
      }
      console.log(`Normalizing object item:`, item);
      return {
        name: item.name || '',
        category: item.category || '',
        store: item.store || '',
        quantity: item.quantity || 1,
        bought: item.bought ?? false,
      };
    });

    console.log('Normalized items before sending to service:', normalizedItems);
    return this.shoppingListsService.create(user, body.name, normalizedItems);
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
    @Query('name') name: string,
    @Query('category') category: string,
    @Query('store') store: string,
  ) {
    console.log(`find-items called with query: name=${name}, category=${category}, store=${store}`);
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    return this.shoppingListsService.searchItems(user, { name, category, store });
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific shopping list by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Shopping list ID' })
  @ApiResponse({ status: 200, description: 'Shopping list retrieved successfully', type: Object })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@NestRequest() req: AuthRequest, @Param('id') id: string) {
    console.log(`findOne called with id: ${id}`);
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid ID format');
    }
    return this.shoppingListsService.findOne(user, parsedId);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a shopping list by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Shopping list ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Updated Shopping List' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Milk' },
              category: { type: 'string', example: 'Dairy' },
              store: { type: 'string', example: 'Local Store' },
              quantity: { type: 'number', example: 1 },
              bought: { type: 'boolean', example: false },
            },
          },
        },
      },
      required: ['name'],
    },
  })
  @ApiResponse({ status: 200, description: 'Shopping list updated successfully', type: Object })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @NestRequest() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { name: string; items: any[] },
  ) {
    console.log(`update called with id: ${id}`);
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);

    const normalizedItems = (body.items || []).map((item) => {
      if (typeof item === 'string') {
        console.log(`Normalizing string item: ${item}`);
        return { name: item, category: '', store: '', quantity: 1, bought: false };
      }
      console.log(`Normalizing object item:`, item);
      return {
        name: item.name || '',
        category: item.category || '',
        store: item.store || '',
        quantity: item.quantity || 1,
        bought: item.bought ?? false,
      };
    });

    console.log('Normalized items before sending to service:', normalizedItems);
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid ID format');
    }
    return this.shoppingListsService.update(user, parsedId, body.name, normalizedItems);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a shopping list by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Shopping list ID' })
  @ApiResponse({ status: 200, description: 'Shopping list deleted successfully', type: Object })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@NestRequest() req: AuthRequest, @Param('id') id: string) {
    console.log(`remove called with id: ${id}`);
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid ID format');
    }
    return this.shoppingListsService.remove(user, parsedId);
  }

  @Get(':id/nearby-stores')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find nearby stores for a shopping list' })
  @ApiParam({ name: 'id', type: String, description: 'Shopping list ID' })
  @ApiQuery({ name: 'lat', type: String, description: 'Latitude', required: true })
  @ApiQuery({ name: 'lng', type: String, description: 'Longitude', required: true })
  @ApiResponse({ status: 200, description: 'Nearby stores retrieved successfully', type: Array })
  @ApiResponse({ status: 400, description: 'Invalid ID format or missing latitude/longitude' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findNearbyStores(
    @NestRequest() req: AuthRequest,
    @Param('id') id: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    console.log('findNearbyStores controller - user:', req.user);
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid ID format');
    }
    if (!lat || !lng) {
      throw new BadRequestException('Latitude and longitude are required');
    }
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      throw new BadRequestException('Invalid latitude or longitude format');
    }
    return this.shoppingListsService.findNearbyStores(user, parsedId, { lat: parsedLat, lng: parsedLng });
  }

  @Post(':id/share')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Share a shopping list with another user' })
  @ApiParam({ name: 'id', type: String, description: 'Shopping list ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'friend@example.com' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({ status: 200, description: 'Shopping list shared successfully', type: Object })
  @ApiResponse({ status: 400, description: 'Invalid ID format or missing email' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async shareList(
    @NestRequest() req: AuthRequest,
    @Param('id') id: string,
    @Body('email') email: string,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    if (!email) throw new BadRequestException('Email is required');
    const user = await this.usersService.findById(userId);
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid ID format');
    }
    await this.sharedListsService.shareList(user, parsedId, email);
    return { message: `Shopping list ${parsedId} shared with ${email}` };
  }

  @Delete(':id/share/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke access to a shared shopping list' })
  @ApiParam({ name: 'id', type: String, description: 'Shopping list ID' })
  @ApiParam({ name: 'userId', type: String, description: 'User ID to revoke access for' })
  @ApiResponse({ status: 200, description: 'Access revoked successfully', type: Object })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeSharedAccess(
    @NestRequest() req: AuthRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    const ownerId = req.user?.id;
    if (!ownerId) throw new UnauthorizedException('User not authenticated');
    const parsedId = parseInt(id, 10);
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedId) || isNaN(parsedUserId)) {
      throw new BadRequestException('Invalid ID format');
    }
    const owner = await this.usersService.findById(ownerId);
    await this.sharedListsService.removeSharedAccess(owner, parsedId, parsedUserId);
    return { message: `Access to shopping list ${parsedId} revoked for user ${parsedUserId}` };
  }

  @Post(':id/items')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an item to a shopping list' })
  @ApiParam({ name: 'id', type: String, description: 'Shopping list ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Milk' },
        category: { type: 'string', example: 'Dairy' },
        store: { type: 'string', example: 'Local Store' },
        quantity: { type: 'number', example: 1 },
      },
      required: ['name', 'quantity'],
    },
  })
  @ApiResponse({ status: 201, description: 'Item added successfully', type: Object })
  @ApiResponse({ status: 400, description: 'Invalid ID format or missing data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addItem(
    @NestRequest() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { name: string; category?: string; store?: string; quantity: number },
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid ID format');
    }
    return this.shoppingListsService.addItem(user, parsedId, body);
  }

  @Put(':id/items/:index')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an item in a shopping list' })
  @ApiParam({ name: 'id', type: String, description: 'Shopping list ID' })
  @ApiParam({ name: 'index', type: String, description: 'Item index' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Milk' },
        category: { type: 'string', example: 'Dairy' },
        store: { type: 'string', example: 'Local Store' },
        quantity: { type: 'number', example: 1 },
        bought: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Item updated successfully', type: Object })
  @ApiResponse({ status: 400, description: 'Invalid ID or index format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateItem(
    @NestRequest() req: AuthRequest,
    @Param('id') id: string,
    @Param('index') index: string,
    @Body() body: { name?: string; category?: string; store?: string; quantity?: number; bought?: boolean },
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    const parsedId = parseInt(id, 10);
    const parsedIndex = parseInt(index, 10);
    if (isNaN(parsedId) || isNaN(parsedIndex)) {
      throw new BadRequestException('Invalid ID or index format');
    }
    return this.shoppingListsService.updateItem(user, parsedId, parsedIndex, body);
  }

  @Post('from-api')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a shopping list from Fake Store API' })
  @ApiResponse({ status: 201, description: 'Shopping list created successfully', type: Object })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createFromApi(@NestRequest() req: AuthRequest) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const user = await this.usersService.findById(userId);
    return this.shoppingListsService.createFromApi(user);
  }
}