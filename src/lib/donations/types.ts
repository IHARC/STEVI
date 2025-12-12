export type DonationCatalogMetrics = {
  currentStock: number | null;
  targetBuffer: number | null;
  distributedLast30Days: number | null;
  distributedLast365Days: number | null;
  inventoryItemName: string | null;
  inventoryItemCategory: string | null;
  inventoryUnitType: string | null;
};

export type DonationCatalogItem = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  longDescription: string | null;
  category: string | null;
  inventoryItemId: string;
  unitCostCents: number | null;
  currency: string;
  defaultQuantity: number;
  priority: number;
  targetBuffer: number | null;
  imageUrl: string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  isActive: boolean;
  metrics: DonationCatalogMetrics;
};
