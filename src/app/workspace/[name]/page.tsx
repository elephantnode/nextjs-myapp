import { redirect } from 'next/navigation'

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { createClient } from '@/lib/supabase/server'
import EmptyCategoryChatSection from '@/components/EmptyCategoryChatSection'
import { WorkspaceItemsList } from '@/components/workspace-items-list'
import { FloatingChatButton } from '@/components/floating-chat-button'

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
    
    // フォールバック処理: currentWorkspaceが見つからない場合はactiveWorkspaceまたは最初のワークスペースを使用
    const targetWorkspace = currentWorkspace || activeWorkspace || workspaces[0];
    
    if (!targetWorkspace) {
        redirect('/workspace')
    }

    // 表示中のワークスペース内カテゴリーを取得
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', targetWorkspace.id)
        .order('order', { ascending: true })

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

    // 最新のアイテム30件を取得
    const { data: recentItems } = await supabase
        .from('items')
        .select(`
            *,
            categories!inner(name, slug)
        `)
        .eq('workspace_id', targetWorkspace.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30)

    // 最新アイテムのタグ情報を取得
    const recentItemIds = recentItems?.map(item => item.id) || []
    const { data: recentItemTagsData } = await supabase
        .from('item_tags')
        .select(`
            item_id,
            tags!inner(id, name)
        `)
        .in('item_id', recentItemIds)

    // 最新アイテム用のタグマッピングを作成
    const recentTagsByItemId: Record<string, any[]> = {}
    recentItemTagsData?.forEach((relation: any) => {
        if (!recentTagsByItemId[relation.item_id]) {
            recentTagsByItemId[relation.item_id] = []
        }
        recentTagsByItemId[relation.item_id].push({
            id: relation.tags.id,
            name: relation.tags.name
        })
    })

    // タグ付きアイテムを取得
    const { data: taggedItemsData } = await supabase
        .from('item_tags')
        .select(`
            items!inner(*),
            tags!inner(id, name)
        `)
        .eq('items.workspace_id', targetWorkspace.id)
        .eq('items.status', 'active')
        .order('items.created_at', { ascending: false })
        .limit(50)

    // タグ付きアイテムを整形
    const taggedItems = taggedItemsData?.map((relation: any) => ({
        ...relation.items,
        tag: relation.tags
    })) || []

    // ワークスペース内の全タグを取得（使用回数付き）
    const { data: allTagsData } = await supabase
        .from('item_tags')
        .select(`
            tags!inner(id, name),
            items!inner(id, workspace_id, status)
        `)
        .eq('items.workspace_id', targetWorkspace.id)
        .eq('items.status', 'active')

    // タグの使用回数を計算
    const tagCounts: Record<string, number> = {}
    allTagsData?.forEach((relation: any) => {
        const tagName = relation.tags.name
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1
    })

    // 最新アイテムにタグ情報を追加
    const recentItemsWithTags = recentItems?.map((item: any) => ({
        ...item,
        tags: recentTagsByItemId[item.id] || []
    })) || []

    // 利用可能なタグリストを作成
    const allTags = Array.from(new Set(Object.keys(tagCounts))).map((tagName, index) => ({
        id: `tag-${index}`,
        name: tagName,
        count: tagCounts[tagName]
    }))

    // デバッグ用ログ
    console.log('Debug info:', {
        recentItemsCount: recentItemsWithTags.length,
        taggedItemsCount: taggedItems.length,
        allTagsCount: allTags.length,
        allTagsData: allTagsData?.length || 0,
        tagCounts
    })

    return (

        <SidebarProvider className="flex flex-col">
            <SiteHeader 
                workspaceId={targetWorkspace.id}
                workspaceName={targetWorkspace.name}
            />
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
                            <WorkspaceItemsList
                                recentItems={recentItemsWithTags}
                                taggedItems={taggedItems}
                                allTags={allTags}
                                workspaceSlug={targetWorkspace.slug}
                            />
                        )}
                    </div>

                </SidebarInset>
            </div>
            
            {/* フローティングチャットボタン - カテゴリーがある場合のみ表示 */}
            {categoriesData.length > 0 && (
                <FloatingChatButton
                    workspaceId={targetWorkspace.id}
                    workspaceName={targetWorkspace.name}
                    categories={categoriesData.map(cat => ({
                        id: cat.id,
                        name: cat.name,
                        slug: cat.slug,
                        icon: cat.icon
                    }))}
                />
            )}
        </SidebarProvider>

    )
}
