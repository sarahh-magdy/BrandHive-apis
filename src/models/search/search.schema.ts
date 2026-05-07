import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SearchHistoryDocument = SearchHistory & Document;

/**
 * SearchHistory — persists every search query made by logged-in users.
 *
 * Used for:
 *  - "Recent searches" UI widget
 *  - Search analytics (trending, popular)
 *  - Personalised recommendations (future)
 */
@Schema({ timestamps: true })
export class SearchHistory {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ required: true, maxlength: 200, index: true })
    query: string;

    /** Normalised lowercase version for deduplication */
    @Prop({ required: true })
    queryNorm: string;

    /** How many results were returned for this query */
    @Prop({ default: 0 })
    resultsCount: number;

    /** Filters applied alongside the query (stored for analytics) */
    @Prop({ type: Object, default: {} })
    appliedFilters: Record<string, any>;

    /** Did the user click a result after this search? */
    @Prop({ default: false })
    resulted_in_click: boolean;

    createdAt: Date;
}

export const SearchHistorySchema = SchemaFactory.createForClass(SearchHistory);

SearchHistorySchema.index({ userId: 1, createdAt: -1 });
SearchHistorySchema.index({ queryNorm: 1 });

// ─────────────────────────────────────────────────────────────────────────────

export type PopularSearchDocument = PopularSearch & Document;

/**
 * PopularSearch — aggregated leaderboard, updated by a cron job.
 * Allows O(1) reads for the "trending searches" widget.
 */
@Schema({ timestamps: true })
export class PopularSearch {
    @Prop({ required: true, unique: true })
    query: string;

    @Prop({ required: true, default: 1 })
    count: number;

    @Prop({ default: () => new Date() })
    lastSearchedAt: Date;
}

export const PopularSearchSchema = SchemaFactory.createForClass(PopularSearch);

PopularSearchSchema.index({ count: -1 });