import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { CategoryIconMap } from '@/components/nav/category-icons'
import { Hash, Bookmark, FileText, ExternalLink, Calendar, Tag as TagIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FloatingChatButton } from '@/components/floating-chat-button'
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ItemImage } from '@/components/item-image'

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

export default async function CategoryPage({ 
    params 
}: { 
    params: Promise<{ name: string; category: string }> 
}) {
    const { name: workspaceName, category: categorySlug } = await params
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

    // カテゴリー内のアイテム取得
    const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('category_id', category.id)
        .eq('status', 'active')
        .order('order', { ascending: true })

    // アイテムデータを整形
    const items: Item[] = (itemsData || []).map((item) => ({
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
        tags: [] // 後で別途取得する場合はここでタグを取得
    }))

    const IconComponent = CategoryIconMap[category.icon as keyof typeof CategoryIconMap] || Hash

    return (
        <SidebarProvider className="flex flex-col">
            <SiteHeader />
            <div className="flex flex-1">
                <AppSidebar 
                    userProfile={userProfile} 
                    workspaces={workspaces} 
                    categories={allCategories}
                    currentWorkspace={currentWorkspace}
                />
                <SidebarInset>
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        {/* カテゴリーページコンテンツ */}
                        <div className="space-y-6">
                            {/* ヘッダー */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                        <IconComponent className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold">{category.name}</h1>
                                        <p className="text-muted-foreground">
                                            {items.length} 個のアイテム
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* アイテム一覧 */}
                            <div className="grid gap-4">
                                {items.length === 0 ? (
                                    <Card>
                                        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                                            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center mb-4">
                                                <IconComponent className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-lg font-semibold mb-2">
                                                まだアイテムがありません
                                            </h3>
                                            <p className="text-muted-foreground mb-4">
                                                右下のボタンからURLやメモを追加してみましょう
                                            </p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    items.map((item) => (
                                        <Card key={item.id} className="overflow-hidden">
                                            <CardHeader>
                                                <div className="flex items-start gap-3">
                                                    {/* タイプアイコン */}
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center mt-1">
                                                        {item.type === 'bookmark' ? (
                                                            <Bookmark className="w-4 h-4 text-blue-600" />
                                                        ) : (
                                                            <FileText className="w-4 h-4 text-green-600" />
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <CardTitle className="text-lg leading-tight">
                                                                {item.url ? (
                                                                    <a 
                                                                        href={item.url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="hover:text-primary flex items-center gap-2"
                                                                    >
                                                                        {item.title}
                                                                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                                                    </a>
                                                                ) : (
                                                                    item.title
                                                                )}
                                                            </CardTitle>
                                                            
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Calendar className="w-3 h-3" />
                                                                {new Date(item.created_at).toLocaleDateString('ja-JP')}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* サイト情報（ブックマークの場合） */}
                                                        {item.type === 'bookmark' && item.site_name && (
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {item.site_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            
                                            <CardContent className="space-y-3">
                                                {/* 説明/コンテンツ */}
                                                {item.type === 'bookmark' && item.site_description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {item.site_description}
                                                    </p>
                                                )}
                                                
                                                {item.type === 'note' && item.content && (
                                                    <p className="text-sm line-clamp-3">
                                                        {item.content}
                                                    </p>
                                                )}
                                                
                                                {/* タグ */}
                                                {item.tags.length > 0 && (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <TagIcon className="w-3 h-3 text-muted-foreground" />
                                                        {item.tags.map((tag) => (
                                                            <Badge key={tag.id} variant="secondary" className="text-xs">
                                                                {tag.name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {/* サイト画像（ブックマークの場合） */}
                                                {item.type === 'bookmark' && item.site_image_url && (
                                                    <div className="mt-3">
                                                        <ItemImage
                                                            src={item.site_image_url}
                                                            alt={item.site_title || item.title}
                                                            className="w-full max-w-sm h-32 object-cover rounded-md border"
                                                        />
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </div>
            
            {/* フローティングチャットボタン */}
            <FloatingChatButton
                workspaceId={currentWorkspace.id}
                categoryName={category.name}
                categoryId={category.id}
            />
        </SidebarProvider>
    )
} 