export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  mode: 'payment' | 'subscription';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_TCvLJb5dILdFq1',
    priceId: 'price_1SGVUhCJDWSNg39p6wxlpgTn',
    name: 'Ai Menu',
    description: 'Empower your restaurant with the intelligence of AI',
    price: 399.00,
    currency: 'eur',
    mode: 'subscription'
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};