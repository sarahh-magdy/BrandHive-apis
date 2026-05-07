import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchProductsDto } from './dto/search.dto';
import { Public } from '@common/decorators/public.decorator';
import { AuthGuard } from '@common/guards';

// ─── Search is public — anyone can search ─────────────────────────
@Controller('search')
@UseGuards(AuthGuard)
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    // GET /search/products
    // ?search=nike&category=id&brand=id1,id2&minPrice=100&maxPrice=500
    // &minRating=4&inStock=true&onSale=true&sortBy=price_asc
    // &withFacets=true&page=1&limit=12
    @Get('products')
    @Public()
    searchProducts(@Query() query: SearchProductsDto) {
        return this.searchService.searchProducts(query);
    }

    // GET /search/facets
    // Returns only the sidebar filter data (brands, price range, ratings)
    @Get('facets')
    @Public()
    getFacets(@Query() query: SearchProductsDto) {
        return this.searchService.getFacets(query);
    }
}