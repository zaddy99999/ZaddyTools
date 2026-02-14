import type { Metadata } from 'next';
import './globals.css';
import ErrorSuppressor from '@/components/ErrorSuppressor';

export const metadata: Metadata = {
  title: 'ZaddyTools',
  description: 'Crypto dashboard and analytics',
  icons: {
    icon: '/ZaddyPFP.png',
    apple: '/ZaddyPFP.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var keywords = ['MetaMask', 'ethereum', 'inpage.js', 'chrome-extension', 'User rejected', 'wallet connect', 'Failed to connect'];

                function shouldSuppress(str) {
                  if (!str) return false;
                  str = String(str);
                  for (var i = 0; i < keywords.length; i++) {
                    if (str.indexOf(keywords[i]) > -1) return true;
                  }
                  return false;
                }

                // Intercept errors before anything else
                window.addEventListener('error', function(e) {
                  if (shouldSuppress(e.message) || shouldSuppress(e.filename)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return false;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  if (shouldSuppress(e.reason)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return false;
                  }
                }, true);

                // Override console methods
                var origError = console.error;
                console.error = function() {
                  var args = Array.prototype.slice.call(arguments);
                  if (shouldSuppress(args.join(' '))) return;
                  origError.apply(console, args);
                };

                var origWarn = console.warn;
                console.warn = function() {
                  var args = Array.prototype.slice.call(arguments);
                  if (shouldSuppress(args.join(' '))) return;
                  origWarn.apply(console, args);
                };

                // Remove Next.js error overlay if it contains MetaMask errors
                setInterval(function() {
                  var portal = document.querySelector('nextjs-portal');
                  if (portal && portal.shadowRoot) {
                    var text = portal.shadowRoot.textContent || '';
                    if (shouldSuppress(text)) {
                      portal.remove();
                    }
                  }
                }, 50);
              })();
            `,
          }}
        />
      </head>
      <body>
        <ErrorSuppressor />
        {children}
      </body>
    </html>
  );
}
