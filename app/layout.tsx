import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kuchaman Sports Academy | Elite Cricket & Swimming',
  description:
    'Kuchaman Sports Academy (KSA) — A premier sports institution dedicated to elite Cricket turf training and Olympic-grade Swimming practice.',
  openGraph: {
    title: 'Kuchaman Sports Academy | Elite Cricket & Swimming',
    description:
      'Premier sports academy in Kuchaman City offering professional cricket turf nets and precision swimming sessions.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kuchaman Sports Academy | Elite Cricket & Swimming',
    description:
      'Premier sports academy in Kuchaman City offering professional cricket turf nets and precision swimming sessions.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Agbalumo&family=Kalam:wght@300;400;700&family=Rozha+One&family=Tiro+Devanagari+Hindi:ital@0;1&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-[#2C1A0E] antialiased selection:bg-[#8C5A32] selection:text-white overflow-x-hidden font-sans">
        {children}
      </body>
    </html>
  );
}

