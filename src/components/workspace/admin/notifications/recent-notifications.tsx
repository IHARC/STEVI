'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import type { NotificationRecord } from './types';

type RecentNotificationsProps = {
  notifications: NotificationRecord[];
};

const formatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Pending';
  }
  try {
    return formatter.format(new Date(value));
  } catch {
    return value;
  }
}

export function RecentNotifications({ notifications }: RecentNotificationsProps) {
  const rows = useMemo(
    () =>
      notifications.map((notification) => ({
        ...notification,
        sentLabel: formatTimestamp(notification.sentAt),
        statusLabel: notification.status.replace(/_/g, ' '),
      })),
    [notifications],
  );

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">Delivery history</CardTitle>
        <CardDescription>Last 20 notifications queued through STEVI.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Queued</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell className="max-w-xs">
                    <p className="font-medium text-foreground">{notification.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.bodyText}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-col">
                      {notification.profileId ? (
                        <span className="font-medium text-foreground">
                          {notification.profileName ?? notification.profileId}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">External</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {notification.recipientEmail}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs uppercase text-muted-foreground">
                    {notification.notificationType}
                  </TableCell>
                  <TableCell>
                    <Badge variant={notification.status === 'sent' ? 'secondary' : 'outline'}>
                      {notification.statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTimestamp(notification.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{notification.sentLabel}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
