import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications | ErandWork',
  description: 'View and manage your notifications',
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
