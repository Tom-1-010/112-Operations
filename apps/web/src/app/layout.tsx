import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MeldkamerSpel',
  description: 'Police dispatch simulation game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className="dark">
      <body className="min-h-screen bg-dark-900 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
