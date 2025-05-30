export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="[--header-height:calc(theme(spacing.14))]">
            {children}
        </div>
    )
}