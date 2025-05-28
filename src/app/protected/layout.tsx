import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { createClient } from '@/lib/supabase/server'
import { redirect } from "next/navigation"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    //Profileからユーザー情報を取得
    // ここでprofilesテーブルから追加情報を取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', user.id)
        .single()

    // Props用のuser情報を整形
    const userProfile = {
        id: user.id,
        name: profile?.full_name ?? user.email ?? "",
        username: profile?.username ?? "",
        email: user.email ?? "",
        avatar: profile?.avatar_url ?? "",
    }

    return (
        <div className="[--header-height:calc(theme(spacing.14))]">
            <SidebarProvider className="flex flex-col">
                <SiteHeader />
                <div className="flex flex-1">
                    <AppSidebar userProfile={userProfile} />
                    <SidebarInset>
                        {children}
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </div>
    )
}