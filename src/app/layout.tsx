import "@/app/globals.css";

export const metadata = {
  title: "Lawpel",
  description: "Legal deadline and case-document automation for U.S. law firms",
  icons: {
    icon: "/lawpel-symbol.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
