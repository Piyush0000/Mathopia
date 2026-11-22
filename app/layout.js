import { Baloo_2 } from 'next/font/google';
import NavBar from '@/components/NavBar';
import './globals.css';
import './styles/tenFrames.css';
import './styles/placeValue.css';
import './styles/measurement.css';
import './styles/shapes.css';
import './styles/motion.css';
import './styles/mobile.css';

const baloo = Baloo_2({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-baloo' });

export const metadata = {
  title: { default: 'Mathopia – Play. Explore. Learn maths.', template: '%s · Mathopia' },
  description: 'Mathopia: interactive maths teaching tools and games for the whole class.',
  applicationName: 'Mathopia',
  appleWebApp: { capable: true, title: 'Mathopia', statusBarStyle: 'black-translucent' },
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#073b4c' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={baloo.variable}>
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
