export type InventoryItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unitType: string | null;
  minimumThreshold: number | null;
  costPerUnit: number | null;
  supplier: string | null;
  active: boolean;
  onHandQuantity: number;
};

export type InventorySummary = {
  totalItems: number;
  activeItems: number;
  lowStockCount: number;
  expiringCount: number;
  totalOnHand: number;
};

export type LowStockItem = {
  id: string;
  name: string;
  category: string | null;
  unitType: string | null;
  onHandQuantity: number;
  minimumThreshold: number | null;
};

export type ExpiringItem = {
  id: string;
  itemId: string;
  itemName: string;
  lotNumber: string | null;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  locationId: string | null;
  locationName: string | null;
};

export type InventoryLocation = {
  id: string;
  name: string;
  code: string | null;
  type: string | null;
  /**
   * Free-form human readable address. Stored as jsonb in DB; we surface a string for UI.
   */
  address: string | null;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type InventoryOrganization = {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type InventoryReceipt = {
  id: string;
  itemId: string;
  itemName: string;
  locationId: string | null;
  locationName: string | null;
  qty: number;
  refType: string | null;
  providerOrgId: number | null;
  providerOrgName: string | null;
  notes: string | null;
  unitCost: number | null;
  createdAt: string;
  createdBy: string | null;
  batchId: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
};

export type InventoryDashboard = {
  summary: InventorySummary;
  lowStockItems: LowStockItem[];
  expiringItems: ExpiringItem[];
  recentReceipts: InventoryReceipt[];
};

export type InventoryBootstrap = {
  items: InventoryItem[];
  dashboard: InventoryDashboard;
  locations: InventoryLocation[];
  organizations: InventoryOrganization[];
  receipts: InventoryReceipt[];
};

export type InventoryItemInput = {
  name: string;
  description?: string | null;
  category: string;
  unitType: string;
  minimumThreshold?: number | null;
  costPerUnit?: number | null;
  supplier?: string | null;
  active: boolean;
};

export type InventoryItemWithInitialStockInput = InventoryItemInput & {
  initialStockQuantity?: number;
  initialStockLocationId?: string | null;
  initialStockNotes?: string | null;
};

export type InventoryLocationInput = {
  name: string;
  code: string;
  type: string;
  address?: string | null;
  active?: boolean;
};

export type StockReceiptInput = {
  itemId: string;
  locationId: string;
  quantity: number;
  unitCost?: number | null;
  notes?: string | null;
  sourceType?: string | null;
  providerOrganizationId?: number | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
};

export type StockTransferInput = {
  itemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  notes?: string | null;
};

export type StockAdjustmentInput = {
  itemId: string;
  locationId: string;
  quantityDelta: number;
  reason: string;
  notes?: string | null;
  unitCost?: number | null;
};

export type BulkReceiptItemInput = {
  itemId: string;
  quantity: number;
  locationId?: string | null;
  unitCost?: number | null;
  notes?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
};

export type BulkReceiptInput = {
  items: BulkReceiptItemInput[];
  sourceType?: string | null;
  providerOrganizationId?: number | null;
  defaultLocationId?: string | null;
  globalNotes?: string | null;
};
