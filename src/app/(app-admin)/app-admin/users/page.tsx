import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function AdminUsersIndexPage() {
  redirect('/app-admin/users/all');
}

