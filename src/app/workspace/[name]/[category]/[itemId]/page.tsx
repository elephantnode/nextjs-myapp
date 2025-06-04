import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { CategoryIconMap } from '@/components/nav/category-icons'
import { Hash } from 'lucide-react'
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ItemEditForm } from '@/components/item-edit-form'

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

type Item = {
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
    tags: Tag[]
}

type Tag = {
    id: string
    name: string
}

export default async function ItemEditPage({ 
    params 
}: { 
    params: Promise<{ name: string; category: string; itemId: string }> 
}) {
    const { name: workspaceName, category: categorySlug, itemId } = await params
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

    const workspaces: Workspace[] = (workspacesData || []).map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        order: workspace.order,
        icon: workspace.icon,
        status: workspace.status,
        is_active: workspace.is_active,
        user_id: workspace.user_id,
        slug: workspace.slug,
    }))

    const currentWorkspace = workspaces.find(w => w.slug === workspaceName)
    
    if (!currentWorkspace) {
        notFound()
    }

    // カテゴリー取得
    const { data: categoryData } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('slug', categorySlug)
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

    // アイテム取得
    const { data: itemData } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .eq('workspace_id', currentWorkspace.id)
        .eq('category_id', category.id)
        .eq('status', 'active')
        .single()

    if (!itemData) {
        notFound()
    }

    // アイテムのタグ取得
    const { data: itemTagsData } = await supabase
        .from('item_tags')
        .select(`
            tags!inner (
                id,
                name
            )
        `)
        .eq('item_id', itemId)

    const tags: Tag[] = (itemTagsData || [])
        .filter((relation: unknown) => relation && typeof relation === 'object' && 'tags' in relation)
        .map((relation: unknown) => {
            const typedRelation = relation as { tags: { id: string; name: string } };
            return typedRelation.tags;
        })
        .map((tag) => ({
            id: tag.id,
            name: tag.name
        }))

    const item: Item = {
        id: itemData.id,
        workspace_id: itemData.workspace_id,
        category_id: itemData.category_id,
        type: itemData.type,
        title: itemData.title,
        content: itemData.content,
        url: itemData.url,
        site_title: itemData.site_title,
        site_description: itemData.site_description,
        site_image_url: itemData.site_image_url,
        site_name: itemData.site_name,
        order: itemData.order,
        status: itemData.status,
        created_at: itemData.created_at,
        updated_at: itemData.updated_at,
        tags
    }

    // ワークスペース内の全カテゴリーを取得（サイドバー用）
    const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('order', { ascending: true })

    const allCategories: Category[] = (categoriesData || []).map((cat) => ({
        id: cat.id,
        workspace_id: cat.workspace_id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        order: cat.order,
        parent_id: cat.parent_id,
        created_at: cat.created_at,
    }))

    const IconComponent = CategoryIconMap[category.icon as keyof typeof CategoryIconMap] || Hash

    return (
        <SidebarProvider className="flex flex-col">
            <SiteHeader 
                workspaceId={currentWorkspace.id}
                workspaceName={currentWorkspace.name}
            />
            <div className="flex flex-1">
                <AppSidebar 
                    userProfile={userProfile} 
                    workspaces={workspaces} 
                    categories={allCategories}
                    currentWorkspace={currentWorkspace}
                />
                <SidebarInset>
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <div className="space-y-6">
                            {/* ヘッダー */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <IconComponent className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">アイテム編集</h1>
                                    <p className="text-muted-foreground">
                                        {category.name} - {item.title}
                                    </p>
                                </div>
                            </div>

                            {/* 編集フォーム */}
                            <ItemEditForm 
                                item={item}
                                workspaceId={currentWorkspace.id}
                                categorySlug={categorySlug}
                                workspaceSlug={workspaceName}
                            />
                        </div>
                    </div>
                </SidebarInset>
            </div>
        </SidebarProvider>
    )
} 