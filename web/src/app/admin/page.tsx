import { redirect } from 'next/navigation';

// Admin panel is served through the main dashboard for the ADMIN role.
// This route redirects there.
export default function AdminPage() {
  redirect('/dashboard');
}
