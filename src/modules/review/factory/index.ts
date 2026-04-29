// import { Types } from 'mongoose';

// interface BuildReviewParams {
//   productId: string;
//   userId: string;
//   rating: number;
//   comment: string;
//   title?: string;
//   images?: { url: string; alt?: string }[];
//   orderId?: string | null;
//   isVerifiedPurchase?: boolean;
// }

// export function buildReview(params: BuildReviewParams) {
//   return {
//     productId: new Types.ObjectId(params.productId),
//     userId: new Types.ObjectId(params.userId),
//     orderId: params.orderId ? new Types.ObjectId(params.orderId) : null,
//     isVerifiedPurchase: params.isVerifiedPurchase ?? false,
//     rating: params.rating,
//     comment: params.comment,
//     title: params.title,

//     images: (params.images ?? []).map(img => ({
//       url: img.url,
//       alt: img.alt ?? '',
//     })),

//     helpfulCount: 0,
//     helpfulVoters: [],
//     isVisible: true,
//     isDeleted: false,
//   };
// }