// import {
//   Controller,
//   Delete,
//   Get,
//   Query,
//   Req,
// } from '@nestjs/common';
// import {
//   ApiBearerAuth,
//   ApiOperation,
//   ApiQuery,
//   ApiResponse,
//   ApiTags,
// } from '@nestjs/swagger';
// import { SearchService } from './search.service';
// import { AutocompleteDto, SearchDto } from './dto/search.dto';

// @ApiTags('Search')
// @Controller('search')
// export class SearchController {
//   constructor(private readonly searchService: SearchService) {}

//   /**
//    * GET /search
//    * Main product search with all filters, facets, sorting, pagination.
//    * Works for both guests and logged-in users.
//    *
//    * Example:
//    *   GET /search?q=headphones&categoryId=64abc&minPrice=100&maxPrice=2000
//    *              &minRating=4&inStockOnly=true&sortBy=price_low&page=1&limit=20
//    */
//   @Get()
//   @ApiOperation({ summary: 'Search products with filters, sorting & facets' })
//   async search(@Query() dto: SearchDto, @Req() req: any) {
//     const userId = req.user?._id;   // optional — works for guests too
//     return this.searchService.search(dto, userId);
//   }

//   /**
//    * GET /search/autocomplete
//    * Fast prefix-match for search-as-you-type input.
//    * Returns matching product names + trending query suggestions.
//    *
//    * Example: GET /search/autocomplete?q=wire
//    */
//   @Get('autocomplete')
//   @ApiOperation({ summary: 'Autocomplete — product names + query suggestions' })
//   @ApiQuery({ name: 'q', example: 'wire' })
//   async autocomplete(@Query() dto: AutocompleteDto) {
//     return this.searchService.autocomplete(dto);
//   }

//   /**
//    * GET /search/trending
//    * Returns the top N most-searched queries.
//    * Used on the homepage or empty search state.
//    */
//   @Get('trending')
//   @ApiOperation({ summary: 'Get trending / popular searches' })
//   async getTrending() {
//     return this.searchService.getTrendingSearches(10);
//   }

//   /**
//    * GET /search/history
//    * Returns the current user's recent unique searches.
//    * Requires auth.
//    */
//   @Get('history')
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Get my recent search history (auth required)' })
//   async getHistory(@Req() req: any) {
//     return this.searchService.getUserSearchHistory(req.user._id, 10);
//   }

//   /**
//    * DELETE /search/history
//    * Clear all of the current user's search history.
//    */
//   @Delete('history')
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Clear my search history' })
//   async clearHistory(@Req() req: any) {
//     await this.searchService.clearUserSearchHistory(req.user._id);
//     return { success: true };
//   }
// }