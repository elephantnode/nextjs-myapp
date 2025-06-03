import { redirect } from 'next/navigation'

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { LogoutButton } from '@/components/logout-button'
import { createClient } from '@/lib/supabase/server'
import EmptyCategoryChatSection from '@/components/EmptyCategoryChatSection'

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

type Category = {
    id: string
    workspace_id: string
    name: string
    slug: string
    icon: string
    order: number
    parent_id: string | null
    created_at: string
}

export default async function WorkspacePage({ params }: { params: Promise<{ name: string }> }) {
    console.log('=== PARAMS DEBUG ===');
    console.log('Raw params:', params);
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const { name } = await params
    console.log('Destructured name:', name);
    console.log('Name type:', typeof name);

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

    // ワークスペース情報を取得
    const { data: workspacesData } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

    // 一つもなかったら親ページへリダイレクト
    if (workspacesData?.length === 0) {
        redirect('/workspace')
    }

    // ワークスペース情報を整形
    const workspaces: Workspace[] = (workspacesData ?? []).map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        order: workspace.order,
        icon: workspace.icon,
        status: workspace.status,
        is_active: workspace.is_active,
        user_id: workspace.user_id,
        slug: workspace.slug,
    }))


    const activeWorkspace = workspaces.find((workspace) => workspace.is_active)

    // 現在表示中のワークスペース（URLのnameパラメータに対応）を取得
    const currentWorkspace = workspaces.find((workspace) => workspace.slug === name)
    
    console.log('=== Server Side Debug ===');
    console.log('URL name parameter:', name);
    console.log('Available workspaces:', workspaces.map(w => ({ id: w.id, name: w.name, slug: w.slug })));
    console.log('Raw workspaces data:', workspacesData);
    console.log('Current workspace:', currentWorkspace);
    console.log('Current workspace ID:', currentWorkspace?.id);
    
    // フォールバック処理: currentWorkspaceが見つからない場合はactiveWorkspaceまたは最初のワークスペースを使用
    const targetWorkspace = currentWorkspace || activeWorkspace || workspaces[0];
    
    if (!targetWorkspace) {
        console.error('No workspace found at all');
        redirect('/workspace')
    }
    
    console.log('Target workspace (fallback):', targetWorkspace);
    console.log('Target workspace ID:', targetWorkspace.id);
    
    // デバッグ: targetWorkspaceを確認
    console.log('=== FINAL DEBUG ===', {
        targetWorkspace,
        targetWorkspaceId: targetWorkspace.id,
        targetWorkspaceKeys: Object.keys(targetWorkspace),
        hasId: 'id' in targetWorkspace,
        idValue: targetWorkspace.id
    });

    // 表示中のワークスペース内カテゴリーを取得
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', targetWorkspace.id)
        .order('order', { ascending: true })

    console.log('categories', categories)

    // カテゴリーデータを型安全に整形
    const categoriesData: Category[] = (categories ?? []).map((category) => ({
        id: category.id,
        workspace_id: category.workspace_id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        order: category.order,
        parent_id: category.parent_id,
        created_at: category.created_at,
    }))

    return (

        <SidebarProvider className="flex flex-col">
            <SiteHeader />
            <div className="flex flex-1">
                <AppSidebar 
                    userProfile={userProfile} 
                    workspaces={workspaces} 
                    categories={categoriesData}
                    currentWorkspace={targetWorkspace}
                />
                <SidebarInset>
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        {(!categories || categories.length === 0) ? (
                            <EmptyCategoryChatSection 
                                workspaceName={targetWorkspace.name} 
                                workspaceId={targetWorkspace.id} 
                            />
                        ) : (
                            <>
                                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                                    <div className="aspect-video rounded-xl bg-muted/50" />
                                    <div className="aspect-video rounded-xl bg-muted/50" />
                                    <div className="aspect-video rounded-xl bg-muted/50" />
                                </div>
                                <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
                                <div className="flex h-svh w-full items-center justify-center gap-2">
                                    <p>
                                        Hello <span>{userProfile.email}</span>
                                    </p>
                                    <LogoutButton />
                                </div>
                            </>
                        )}
                    </div>

                </SidebarInset>
            </div>
        </SidebarProvider>

    )
}
