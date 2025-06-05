import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { CategoryPageClient } from '@/components/category-page-client'
import { FloatingChatButton } from '@/components/floating-chat-button'
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DnDWrapper } from '@/components/dnd-wrapper'

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
    slug: string
    icon: string
    status: boolean
    is_active: boolean
    user_id: string
    order: number
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

type Tag = {
    id: string
    name: string
    count?: number
}

// Database types for better type safety
type DbWorkspace = {
    id: string
    name: string
    slug: string
    icon: string
    status: boolean
    is_active: boolean
    user_id: string
    order: number
}

type DbCategory = {
    id: string
    workspace_id: string
    name: string
    slug: string
    icon: string
    order: number
    parent_id: string | null
    created_at: string
}

type DbItem = {
    id: string
    workspace_id: string
    category_id: string | null
    type: 'bookmark' | 'note'
    title: string
    content: string | null
    url: string | null
    site_title: string | null
    site_description: string | null
    site_image_url: string | null
    site_name: string | null
    order: number
    status: 'active' | 'trashed'
    created_at: string
    updated_at: string
}

export default async function CategoryPage({ 
    params 
}: { 
    params: Promise<{ name: string; category: string }> 
}) {
    const resolvedParams = await params
    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/auth/login')
    }

    // プロファイル情報を取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', user.id)
        .single()

    const userProfile: UserProfile = {
        id: user.id,
        name: profile?.full_name ?? user.email ?? "",
        username: profile?.username ?? "",
        email: user.email ?? "",
        avatar: profile?.avatar_url ?? "",
    }

    // ワークスペース取得
    const { data: workspacesData } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

    const workspaces: Workspace[] = (workspacesData || []).map((workspace: DbWorkspace) => ({
        id: workspace.id,
        name: workspace.name,
        order: workspace.order,
        icon: workspace.icon,
        status: workspace.status,
        is_active: workspace.is_active,
        user_id: workspace.user_id,
        slug: workspace.slug,
    }))

    const currentWorkspace = workspaces.find(w => w.slug === resolvedParams.name)
    if (!currentWorkspace) {
        notFound()
    }

    // カテゴリー取得
    const { data: categoryData } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('slug', resolvedParams.category)
        .single()

    if (!categoryData) {
        notFound()
    }

    const category: Category = {
        id: categoryData.id,
        workspace_id: categoryData.workspace_id,
        name: categoryData.name,
        slug: categoryData.slug,
        icon: categoryData.icon,
        order: categoryData.order,
        parent_id: categoryData.parent_id,
        created_at: categoryData.created_at,
    }

    // ワークスペース内の全カテゴリーを取得（サイドバー用）
    const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('order', { ascending: true })

    const allCategories: Category[] = (categoriesData || []).map((cat: DbCategory) => ({
        id: cat.id,
        workspace_id: cat.workspace_id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        order: cat.order,
        parent_id: cat.parent_id,
        created_at: cat.created_at,
    }))

    // カテゴリー内のアイテム取得
    const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('category_id', category.id)
        .eq('status', 'active')
        .order('order', { ascending: true })

    // 全アイテムのタグを一度に取得
    const itemIds = (itemsData || []).map((item: DbItem) => item.id)
    const { data: allItemTagsData } = await supabase
        .from('item_tags')
        .select(`
            item_id,
            tags!inner (
                id,
                name
            )
        `)
        .in('item_id', itemIds)

    // アイテムIDごとにタグをグループ化
    const tagsByItemId: Record<string, Tag[]> = {}
    const tagCounts: Record<string, number> = {}
    
    if (allItemTagsData) {
        allItemTagsData.forEach((relation: unknown) => {
            const typedRelation = relation as { 
                item_id: string; 
                tags: { id: string; name: string } 
            };
            if (!tagsByItemId[typedRelation.item_id]) {
                tagsByItemId[typedRelation.item_id] = []
            }
            tagsByItemId[typedRelation.item_id].push({
                id: typedRelation.tags.id,
                name: typedRelation.tags.name
            })
            
            // タグの使用回数をカウント
            tagCounts[typedRelation.tags.name] = (tagCounts[typedRelation.tags.name] || 0) + 1
        })
    }

    // アイテムデータを整形（タグ付き）
    const itemsWithTags = (itemsData || []).map((item: DbItem) => ({
        id: item.id,
        workspace_id: item.workspace_id,
        category_id: item.category_id,
        type: item.type,
        title: item.title,
        content: item.content,
        url: item.url,
        site_title: item.site_title,
        site_description: item.site_description,
        site_image_url: item.site_image_url,
        site_name: item.site_name,
        order: item.order,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at,
        item_tags: (tagsByItemId[item.id] || []).map(tag => ({
            tags: {
                id: tag.id,
                name: tag.name
            }
        }))
    }))

    // 利用可能なタグリストを作成
    const availableTags = Array.from(new Set(Object.keys(tagCounts))).map(tagName => ({
        id: tagName, // 仮のID
        name: tagName,
        count: tagCounts[tagName]
    }))

    return (
        <SidebarProvider className="flex flex-col">
            <SiteHeader 
                workspaceId={currentWorkspace.id}
                workspaceName={currentWorkspace.name}
            />
            <DnDWrapper allCategories={allCategories}>
                <div className="flex flex-1">
                    <AppSidebar 
                        userProfile={userProfile} 
                        workspaces={workspaces} 
                        categories={allCategories}
                        currentWorkspace={currentWorkspace}
                        enableItemDrop={true}
                    />
                    <SidebarInset>
                        <CategoryPageClient
                            category={category}
                            itemsWithTags={itemsWithTags}
                            availableTags={availableTags}
                            workspaceName={resolvedParams.name}
                            categorySlug={resolvedParams.category}
                        />
                    </SidebarInset>
                </div>
            </DnDWrapper>
            
            {/* フローティングチャットボタン */}
            <FloatingChatButton
                workspaceId={currentWorkspace.id}
                categoryName={category.name}
                categoryId={category.id}
            />
        </SidebarProvider>
    )
} 