"use client"

import { Hash, Plus } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from '@/lib/supabase/client'

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SortableCategoryItem } from "@/components/ui/sortableCategoryItem"
import { DroppableCategoryItem } from "@/components/droppable-category-item"
import { SortableDroppableCategoryItem } from "@/components/ui/sortable-droppable-category-item"
import { CategoryDialog } from "./category-dialog"
import { CategoryFormValues } from "./category-form"
import { CategoryIconMap } from "./category-icons"
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'

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

interface NavWorkspaceCategoriesProps {
    categories: Category[]
    currentWorkspace?: Workspace
    enableItemDrop?: boolean
}

export function NavWorkspaceCategories({
    categories: initialCategories,
    currentWorkspace,
    enableItemDrop = false
}: NavWorkspaceCategoriesProps) {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    
    const [categories, setCategories] = useState(initialCategories)
    const [items, setItems] = useState(initialCategories.map(c => c.id))
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<Category | null>(null)
    const [isDndEnabled, setIsDndEnabled] = useState(false)
    
    useEffect(() => {
        setCategories(initialCategories)
        setItems(initialCategories.map(c => c.id))
    }, [initialCategories])

    // クライアントサイドでのみDnD機能を有効化（Hydrationエラー回避）
    // アイテムドロップモードでもカテゴリー並び替えは有効にする
    useEffect(() => {
        setIsDndEnabled(true)
    }, [])
    
    if (!currentWorkspace) {
        return null
    }

    // 編集ボタン用
    const handleEditCategory = (category: Category) => {
        setEditTarget(category)
        setDialogOpen(true)
    }

    // 新規追加ボタン用
    const handleAddCategory = () => {
        setEditTarget(null)
        setDialogOpen(true)
    }

    const handleSubmit = async (values: CategoryFormValues) => {
        if (editTarget) {
            // 編集
            await supabase.from('categories').update({
                name: values.name,
                slug: values.slug,
                icon: values.icon
            }).eq('id', editTarget.id)
        } else {
            // 新規
            await supabase.from('categories').insert([
                { 
                    name: values.name, 
                    slug: values.slug,
                    icon: values.icon,
                    workspace_id: currentWorkspace.id,
                    order: categories.length,
                    parent_id: null
                }
            ])
        }
        setDialogOpen(false)
        router.refresh() // ページをリフレッシュして最新データを取得
    }

    const handleDeleteCategory = async (slug: string) => {
        // より詳細な削除確認
        const confirmMessage = `本当にこのカテゴリーを削除しますか？

⚠️ 注意：
・このカテゴリーに属するすべてのアイテムも削除されます
・削除されたデータは復元できません
・この操作は元に戻せません

削除を続行しますか？`

        if (!window.confirm(confirmMessage)) {
            return
        }
        
        try {
            // 削除するカテゴリーを取得
            const { data: categoryToDelete } = await supabase
                .from('categories')
                .select('id, name')
                .eq('slug', slug)
                .eq('workspace_id', currentWorkspace.id)
                .single()

            if (!categoryToDelete) {
                throw new Error('削除対象のカテゴリーが見つかりません')
            }

            // そのカテゴリーに属するアイテムをソフトデリート
            const { error: itemsError } = await supabase
                .from('items')
                .update({
                    status: 'trashed',
                    updated_at: new Date().toISOString()
                })
                .eq('category_id', categoryToDelete.id)
                .eq('workspace_id', currentWorkspace.id)

            if (itemsError) {
                console.error('Error deleting items:', itemsError)
                // アイテムの削除に失敗してもカテゴリーの削除は続行
            }

            // カテゴリーを削除
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('slug', slug)
                .eq('workspace_id', currentWorkspace.id)
                
            if (error) throw error
            
            setDialogOpen(false)
            
            // 現在表示中のカテゴリーが削除された場合のリダイレクト処理
            const currentCategorySlug = params?.category as string
            if (currentCategorySlug === slug) {
                // 削除されたカテゴリーが現在表示中の場合
                const remainingCategories = categories.filter(cat => cat.slug !== slug)
                
                if (remainingCategories.length > 0) {
                    // 他のカテゴリーがある場合は最初のカテゴリーにリダイレクト
                    const firstCategory = remainingCategories.sort((a, b) => a.order - b.order)[0]
                    router.push(`/workspace/${currentWorkspace.slug}/${firstCategory.slug}`)
                } else {
                    // カテゴリーが残っていない場合はワークスペースのホームページにリダイレクト
                    router.push(`/workspace/${currentWorkspace.slug}`)
                }
            } else {
                // 削除されたカテゴリーが現在表示中でない場合は通常のリフレッシュ
                router.refresh()
            }
        } catch (error) {
            console.error('Error deleting category:', error)
            alert('カテゴリーの削除中にエラーが発生しました')
        }
    }

    // カテゴリーリストのレンダリング
    const renderCategoryList = () => {
        return categories.map((category) => {
            const categoryUrl = `/workspace/${currentWorkspace.slug}/${category.slug}`
            const isActive = params?.category === category.slug
            const IconComponent = CategoryIconMap[category.icon as keyof typeof CategoryIconMap]
            
            // アイテムドロップ対応版の場合でも、カテゴリー並び替えを有効にする
            if (enableItemDrop) {
                return (
                    <SidebarMenuItem key={category.id}>
                        {isDndEnabled ? (
                            <SortableDroppableCategoryItem
                                category={category}
                                workspaceSlug={currentWorkspace.slug}
                                isActive={isActive}
                                onEdit={() => handleEditCategory(category)}
                            />
                        ) : (
                            <DroppableCategoryItem
                                category={category}
                                workspaceSlug={currentWorkspace.slug}
                                isActive={isActive}
                            />
                        )}
                    </SidebarMenuItem>
                )
            }

            // 通常版（カテゴリー並び替えのみ）
            const categoryContent = (
                <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={categoryUrl}>
                        {IconComponent ? (
                            <IconComponent className="w-4 h-4" />
                        ) : (
                            <Hash className="w-4 h-4" />
                        )}
                        <span>{category.name}</span>
                    </Link>
                </SidebarMenuButton>
            )

            return (
                <SidebarMenuItem key={category.id}>
                    {isDndEnabled ? (
                        <SortableCategoryItem
                            id={category.id}
                            onEdit={() => handleEditCategory(category)}
                        >
                            {categoryContent}
                        </SortableCategoryItem>
                    ) : (
                        <div className="flex items-center">
                            <div className="w-6" /> {/* グリップ部分のスペース */}
                            <div className="flex-1">{categoryContent}</div>
                            <button
                                type="button"
                                onClick={() => handleEditCategory(category)}
                                className="ml-2 p-1 rounded hover:bg-muted"
                                aria-label="編集"
                            >
                                <Plus className="w-4 h-4 text-muted-foreground rotate-45" />
                            </button>
                        </div>
                    )}
                </SidebarMenuItem>
            )
        })
    }

    return (
        <>
            <SidebarGroup>
                <SidebarGroupLabel>カテゴリー</SidebarGroupLabel>
                <SidebarMenu>
                    {/* SortableContextのみ使用、DnDContextは上位コンポーネントで提供 */}
                    {isDndEnabled ? (
                        <SortableContext items={items} strategy={verticalListSortingStrategy}>
                            {renderCategoryList()}
                        </SortableContext>
                    ) : (
                        renderCategoryList()
                    )}
                    
                    {/* 新規追加ボタン */}
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={handleAddCategory}>
                            <Plus className="w-4 h-4" />
                            <span>新しいカテゴリー</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            <CategoryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                onDelete={editTarget ? () => handleDeleteCategory(editTarget.slug) : undefined}
                initial={editTarget ? {
                    name: editTarget.name,
                    slug: editTarget.slug,
                    icon: editTarget.icon
                } : undefined}
            />
        </>
    )
} 