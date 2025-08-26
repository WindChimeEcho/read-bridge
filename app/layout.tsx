import type { Metadata } from "next";

import "./globals.css";
import { ThemeProvider } from "@/app/components/layout/theme-provider";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import StructureLayout from '@/app/components/layout/structure-layout';


export const metadata: Metadata = {
  title: "ReadBridge",
  description: "ReadBridge",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full overflow-hidden">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes" />
      </head>
      <body className={`antialiased h-full`}>
        <ThemeProvider>
          <AntdRegistry>
            <StructureLayout>
              {children}
            </StructureLayout>
          </AntdRegistry>
        </ThemeProvider>
      </body>
    </html>
  );
}
