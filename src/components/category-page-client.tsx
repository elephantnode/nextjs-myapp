"use client"

import { CategoryIconMap } from '@/components/nav/category-icons'
import { Hash } from 'lucide-react'
import { CategoryItemsList } from '@/components/category-items-list'

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
    count?: number
}

interface CategoryPageClientProps {
    category: Category
    itemsWithTags: Item[]
    availableTags: Tag[]
    workspaceName: string
    categorySlug: string
}

export function CategoryPageClient({
    category,
    itemsWithTags,
    availableTags,
    workspaceName,
    categorySlug
}: CategoryPageClientProps) {
    const IconComponent = CategoryIconMap[category.icon as keyof typeof CategoryIconMap] || Hash

    return (
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
                                {itemsWithTags.length} 個のアイテム
                            </p>
                        </div>
                    </div>
                </div>

                {/* アイテム一覧とフィルタリング機能 */}
                <CategoryItemsList
                    items={itemsWithTags}
                    availableTags={availableTags}
                    workspaceName={workspaceName}
                    categorySlug={categorySlug}
                    category={category}
                />
            </div>
        </div>
    )
} 