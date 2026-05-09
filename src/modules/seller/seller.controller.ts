import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { SellerService } from './seller.service';
import {
    SellerCreateProductDto,
    SellerUpdateProductDto,
    GetSellerProductsDto,
    GetSellerOrdersDto,
    SellerAnalyticsDto,
    UpdateBazaarDto,
} from './dto/seller.dto';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { User } from '@common/decorators/user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { multerMemoryConfig } from '../../config/cloudinary/multer-memory.config';

@Controller('seller')
@UseGuards(AuthGuard, RolesGuard)
export class SellerController {
    constructor(private readonly sellerService: SellerService) { }

    // ════════════════════════════════════════════════════════════════
    // DASHBOARD
    // ════════════════════════════════════════════════════════════════

    @Get('dashboard')
    @Auth(['Seller'])
    getDashboard(@User() user: any) {
        return this.sellerService.getDashboard(user._id);
    }

    // ════════════════════════════════════════════════════════════════
    // PRODUCTS
    // ════════════════════════════════════════════════════════════════

    @Get('products')
    @Auth(['Seller'])
    getMyProducts(@User() user: any, @Query() query: GetSellerProductsDto) {
        return this.sellerService.getMyProducts(user._id, query);
    }

    @Get('products/:id')
    @Auth(['Seller'])
    getMyProduct(@Param('id') id: string, @User() user: any) {
        return this.sellerService.getMyProduct(user._id, id);
    }

    @Post('products')
    @Auth(['Seller'])
    @UseInterceptors(FilesInterceptor('images', 10, multerMemoryConfig))
    createProduct(
        @User() user: any,
        @Body() dto: SellerCreateProductDto,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        return this.sellerService.createProduct(user._id, dto, files ?? []);
    }

    @Put('products/:id')
    @Auth(['Seller'])
    @UseInterceptors(FilesInterceptor('images', 10, multerMemoryConfig))
    updateProduct(
        @Param('id') id: string,
        @User() user: any,
        @Body() dto: SellerUpdateProductDto,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        return this.sellerService.updateProduct(user._id, id, dto, files ?? []);
    }

    @Delete('products/:id')
    @Auth(['Seller'])
    deleteProduct(@Param('id') id: string, @User() user: any) {
        return this.sellerService.deleteProduct(user._id, id);
    }

    // ════════════════════════════════════════════════════════════════
    // INVENTORY
    // ════════════════════════════════════════════════════════════════

    @Get('inventory/alerts')
    @Auth(['Seller'])
    getStockAlerts(@User() user: any) {
        return this.sellerService.getStockAlerts(user._id);
    }

    @Patch('inventory/:productId/adjust')
    @Auth(['Seller'])
    adjustStock(
        @Param('productId') productId: string,
        @User() user: any,
        @Body() body: { change: number; note?: string },
    ) {
        return this.sellerService.adjustStock(user._id, productId, body.change, body.note);
    }

    // ════════════════════════════════════════════════════════════════
    // ORDERS
    // ════════════════════════════════════════════════════════════════

    @Get('orders')
    @Auth(['Seller'])
    getMyOrders(@User() user: any, @Query() query: GetSellerOrdersDto) {
        return this.sellerService.getMyOrders(user._id, query);
    }

    @Get('orders/:id')
    @Auth(['Seller'])
    getMyOrderDetails(@Param('id') id: string, @User() user: any) {
        return this.sellerService.getMyOrderDetails(user._id, id);
    }

    // ════════════════════════════════════════════════════════════════
    // ANALYTICS
    // ════════════════════════════════════════════════════════════════

    @Get('analytics')
    @Auth(['Seller'])
    getAnalytics(@User() user: any, @Query() query: SellerAnalyticsDto) {
        return this.sellerService.getAnalytics(user._id, query);
    }

    // ════════════════════════════════════════════════════════════════
    // REVIEWS
    // ════════════════════════════════════════════════════════════════

    @Get('reviews')
    @Auth(['Seller'])
    getMyReviews(
        @User() user: any,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        return this.sellerService.getMyReviews(user._id, +page, +limit);
    }

    // ════════════════════════════════════════════════════════════════
    // BAZAAR — Seller
    // ════════════════════════════════════════════════════════════════

    @Get('bazaar')
    @Auth(['Seller'])
    getMyBazaar(@User() user: any) {
        return this.sellerService.getMyBazaar(user._id);
    }

    @Put('bazaar')
    @Auth(['Seller'])
    @UseInterceptors(
        FileFieldsInterceptor(
            [{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }],
            multerMemoryConfig,
        ),
    )
    updateBazaar(
        @User() user: any,
        @Body() dto: UpdateBazaarDto,
        @UploadedFiles() files: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
    ) {
        return this.sellerService.updateBazaar(
            user._id, dto, files?.logo?.[0], files?.banner?.[0],
        );
    }

    // ─── Seller sends notification to followers ───────────────────
    @Post('bazaar/notify')
    @Auth(['Seller'])
    notifyFollowers(
        @User() user: any,
        @Body() body: { title: string; body: string },
    ) {
        return this.sellerService.notifyBazaarFollowers(user._id, body.title, body.body);
    }

    // ════════════════════════════════════════════════════════════════
    // BAZAAR — Admin
    // ════════════════════════════════════════════════════════════════

    @Get('bazaar/admin/all')
    @Auth(['Admin'])
    getAllBazaarsAdmin(
        @Query('search') search: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        return this.sellerService.getAllBazaarsAdmin(search, +page, +limit);
    }

    @Patch('bazaar/admin/:sellerId/toggle')
    @Auth(['Admin'])
    toggleBazaar(@Param('sellerId') sellerId: string) {
        return this.sellerService.toggleBazaarStatus(sellerId);
    }

    // ════════════════════════════════════════════════════════════════
    // BAZAAR — Public
    // ════════════════════════════════════════════════════════════════

    @Get('bazaar/search')
    @Public()
    searchBazaars(
        @Query('search') search: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        return this.sellerService.searchBazaars(search, +page, +limit);
    }

    @Get('bazaar/:slug')
    @Public()
    getBazaarBySlug(
        @Param('slug') slug: string,
        @Query('page') page = 1,
        @Query('limit') limit = 12,
    ) {
        return this.sellerService.getBazaarBySlug(slug, +page, +limit);
    }
}