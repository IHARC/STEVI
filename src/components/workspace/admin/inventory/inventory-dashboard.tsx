'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { EmptyState } from '@shared/ui/empty-state';
import { cn } from '@/lib/utils';
import type { InventoryDashboard } from '@/lib/inventory/types';

type InventoryDashboardProps = {
  dashboard: InventoryDashboard;
};

export function InventoryDashboardSection({ dashboard }: InventoryDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Items tracked" value={dashboard.summary.totalItems.toLocaleString()} />
        <SummaryCard label="Active items" value={dashboard.summary.activeItems.toLocaleString()} />
        <SummaryCard label="Low stock alerts" value={dashboard.summary.lowStockCount.toLocaleString()} accent />
        <SummaryCard label="Units on hand" value={dashboard.summary.totalOnHand.toLocaleString()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Low stock items</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {dashboard.lowStockItems.length === 0 ? (
              <EmptyState
                title="No low stock items"
                description="All items are currently above their minimum thresholds."
                className="m-4"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="text-right">Threshold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.lowStockItems.slice(0, 8).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category ?? 'Uncategorised'}</TableCell>
                      <TableCell className="text-right">{item.onHandQuantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {item.minimumThreshold === null ? '—' : item.minimumThreshold.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Expiring soon</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {dashboard.expiringItems.length === 0 ? (
              <EmptyState
                title="Nothing expiring soon"
                description="No batches are approaching their expiry window."
                className="m-4"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.expiringItems.slice(0, 8).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell>{item.lotNumber ?? '—'}</TableCell>
                      <TableCell>{item.locationName ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {item.daysUntilExpiry === null ? '—' : item.daysUntilExpiry.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent receipts</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {dashboard.recentReceipts.length === 0 ? (
            <EmptyState
              title="No recent receipts"
              description="No stock receipts recorded in the last few days."
              className="m-4"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.recentReceipts.slice(0, 10).map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.itemName}</TableCell>
                    <TableCell>{receipt.locationName ?? '—'}</TableCell>
                    <TableCell>{receipt.providerOrgName ?? receipt.refType ?? '—'}</TableCell>
                    <TableCell className="text-right">{receipt.qty.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {receipt.unitCost === null ? '—' : `$${receipt.unitCost.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Date(receipt.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card
      className={cn(
        'border-border/60',
        accent && 'border-destructive/60 bg-destructive/5 text-destructive',
      )}
    >
      <CardHeader>
        <CardTitle
          className={cn(
            'text-xs font-medium uppercase text-muted-foreground',
            accent && 'text-destructive',
          )}
        >
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-semibold text-foreground', accent && 'text-destructive')}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
