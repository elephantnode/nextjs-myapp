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
import { CategoryDialog } from "./category-dialog"
import { CategoryFormValues } from "./category-form"
import { CategoryIconMap } from "./category-icons"
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
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
    
    const sensors = useSensors(useSensor(PointerSensor))
    
    useEffect(() => {
        setCategories(initialCategories)
        setItems(initialCategories.map(c => c.id))
    }, [initialCategories])

    // クライアントサイドでのみDnD機能を有効化（Hydrationエラー回避）
    useEffect(() => {
        setIsDndEnabled(true)
    }, [])
    
    if (!currentWorkspace) {
        return null
    }

    // 並べ替え確定時の処理（カテゴリーの順序変更）
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        const newItems = arrayMove(items, oldIndex, newIndex)
        setItems(newItems)
        
        // 並び順をSupabaseに保存
        for (let i = 0; i < newItems.length; i++) {
            await supabase.from('categories').update({ order: i }).eq('id', newItems[i])
        }
        
        // ローカルの順序も更新
        const newCategories = arrayMove(categories, oldIndex, newIndex)
        setCategories(newCategories)
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
        if (!window.confirm('本当にこのカテゴリーを削除しますか？この操作は元に戻せません。')) {
            return
        }
        await supabase.from('categories').delete().eq('slug', slug).eq('workspace_id', currentWorkspace.id)
        setDialogOpen(false)
        router.refresh()
    }

    // カテゴリーリストのレンダリング
    const renderCategoryList = () => {
        return categories.map((category) => {
            const categoryUrl = `/workspace/${currentWorkspace.slug}/${category.slug}`
            const isActive = params?.category === category.slug
            const IconComponent = CategoryIconMap[category.icon as keyof typeof CategoryIconMap]
            
            // アイテムドロップ対応版の場合
            if (enableItemDrop) {
                return (
                    <SidebarMenuItem key={category.id}>
                        <DroppableCategoryItem
                            category={category}
                            workspaceSlug={currentWorkspace.slug}
                            isActive={isActive}
                        />
                    </SidebarMenuItem>
                )
            }

            // 通常版（カテゴリー並び替え対応）
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
                    {enableItemDrop ? (
                        // アイテムドロップ対応版では並び替えを無効化
                        renderCategoryList()
                    ) : (
                        // 通常版では並び替え対応
                        isDndEnabled ? (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                                    {renderCategoryList()}
                                </SortableContext>
                            </DndContext>
                        ) : (
                            renderCategoryList()
                        )
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