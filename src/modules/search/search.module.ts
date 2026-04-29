// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import {
//   SearchHistory,
//   SearchHistorySchema,
//   PopularSearch,
//   PopularSearchSchema,
// } from '../../models/search/search.schema';
// import { SearchService } from './search.service';
// import { SearchController } from './search.controller';

// /**
//  * SearchModule depends on the Product model.
//  * Two ways to handle this:
//  *
//  * Option A — Re-register the Product schema here (fine for small apps):
//  *   MongooseModule.forFeature([{ name: 'Product', schema: ProductSchema }])
//  *
//  * Option B — Export ProductRepository from ProductModule and import ProductModule here.
//  *
//  * We use Option A below — replace ProductSchema with your actual import.
//  */
// // import { Product, ProductSchema } from '../../models/product/product.schema';

// @Module({
//   imports: [
//     MongooseModule.forFeature([
//       { name: SearchHistory.name, schema: SearchHistorySchema },
//       { name: PopularSearch.name, schema: PopularSearchSchema },
//       // { name: 'Product', schema: ProductSchema },   ← uncomment and add your schema
//     ]),
//   ],
//   controllers: [SearchController],
//   providers: [SearchService],
//   exports: [SearchService],
// })
// export class SearchModule {}