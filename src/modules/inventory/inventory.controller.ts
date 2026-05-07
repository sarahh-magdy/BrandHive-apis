import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AdjustStockDto, GetStockLogsDto } from './dto/inventory.dto';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { User } from '@common/decorators/user.decorator';

@Controller('inventory')
@UseGuards(AuthGuard, RolesGuard)
@Auth(['Admin'])
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    // POST /inventory/adjust
    @Post('adjust')
    adjustStock(@Body() dto: AdjustStockDto, @User() user: any) {
        return this.inventoryService.adjustStock(dto, user._id);
    }

    // GET /inventory/logs
    @Get('logs')
    getAllStockLogs(@Query() query: GetStockLogsDto) {
        return this.inventoryService.getAllStockLogs(query);
    }

    // GET /inventory/logs/:productId
    @Get('logs/:productId')
    getProductStockLogs(
        @Param('productId') productId: string,
        @Query() query: GetStockLogsDto,
    ) {
        return this.inventoryService.getStockLogs(productId, query);
    }

    // GET /inventory/low-stock?threshold=5
    @Get('low-stock')
    getLowStockProducts(@Query('threshold') threshold?: number) {
        return this.inventoryService.getLowStockProducts(threshold ? +threshold : undefined);
    }

    // GET /inventory/out-of-stock
    @Get('out-of-stock')
    getOutOfStockProducts(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        return this.inventoryService.getOutOfStockProducts(+page, +limit);
    }
}