// app/login/layout.tsx
import { ReactNode } from "react";

export default function LoginLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="ja">
            <body className="min-h-screen bg-gray-100 flex items-center justify-center">
                <main>
                    {children}
                </main>
            </body>
        </html>
    );
}