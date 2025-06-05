import { redirect } from 'next/navigation'

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { createClient } from '@/lib/supabase/server'

type UserProfile = {
    id: string
    name: string
    username: string
    email: string
    avatar: string
}

type Workspace = {
    id: string
    name: string
    order: number
    icon: string
    status: boolean
    is_active: boolean
    user_id: string
    slug: string
}

export default async function WorkspaceTopPage({ params }: { params: Promise<{ name: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const { name } = await params

    //Profileからユーザー情報を取得
    // ここでprofilesテーブルから追加情報を取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', user.id)
        .single()

    // Props用のuser情報を整形
    const userProfile: UserProfile = {
        id: user.id,
        name: profile?.full_name ?? user.email ?? "",
        username: profile?.username ?? "",
        email: user.email ?? "",
        avatar: profile?.avatar_url ?? "",
    }

    // まず利用可能なワークスペースを取得
    const { data: workspacesData, error: workspacesError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

    if (workspacesError) {
        console.error('ワークスペース取得エラー:', workspacesError)
        return <div>エラーが発生しました</div>
    }

    const workspaces: Workspace[] = (workspacesData || []).map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        icon: workspace.icon,
        status: workspace.status,
        is_active: workspace.is_active,
        user_id: workspace.user_id,
        order: workspace.order,
    }))

    // 表示中のワークスペース内カテゴリーを取得
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', name)
        .order('order', { ascending: true })

    return (

        <SidebarProvider className="flex flex-col">
            <SiteHeader />
            <div className="flex flex-1">
                <AppSidebar userProfile={userProfile} workspaces={workspaces} />
                <SidebarInset>
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <div className="flex flex-col items-center justify-center h-full p-8">
                            <h1 className="text-2xl font-bold mb-4">ワークスペースを選択してください</h1>
                            <p className="text-muted-foreground mb-8">
                                サイドバーからワークスペースを選択するか、新しいワークスペースを作成してください。
                            </p>
                            {workspaces.length === 0 ? (
                                <div className="text-center">
                                    <p className="text-muted-foreground mb-4">ワークスペースがありません</p>
                                    <p className="text-sm text-muted-foreground">
                                        サイドバーの「Add Workspace」から新しいワークスペースを作成してください。
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-muted-foreground">
                                        利用可能なワークスペース: {workspaces.length}個
                                    </p>
                                </div>
                        )}
                        </div>
                    </div>

                </SidebarInset>
            </div>
        </SidebarProvider>

    )
}
