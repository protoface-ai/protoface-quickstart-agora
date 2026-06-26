import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Protoface + Agora Starter',
  description: 'A realtime Protoface avatar starter for Agora Conversational AI Studio.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
