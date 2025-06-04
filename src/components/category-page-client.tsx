"use client"

import { useState, useEffect } from 'react'
import { CategoryIconMap } from '@/components/nav/category-icons'
import { Hash, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryItemsList } from '@/components/category-items-list'
import { NewsModal } from '@/components/news-modal'
import { LayoutSelector, type LayoutType } from '@/components/layout-selector'

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
    const [newsModalOpen, setNewsModalOpen] = useState(false)
    const [currentLayout, setCurrentLayout] = useState<LayoutType>('list-card')
    const IconComponent = CategoryIconMap[category.icon as keyof typeof CategoryIconMap] || Hash

    // ローカルストレージからレイアウト設定を復元
    useEffect(() => {
        const savedLayout = localStorage.getItem('category-layout')
        if (savedLayout && ['list-compact', 'list-card', 'grid-3', 'grid-5'].includes(savedLayout)) {
            setCurrentLayout(savedLayout as LayoutType)
        }
    }, [])

    // レイアウト変更時にローカルストレージに保存
    const handleLayoutChange = (layout: LayoutType) => {
        setCurrentLayout(layout)
        localStorage.setItem('category-layout', layout)
    }

    const handleNewsButtonClick = () => {
        setNewsModalOpen(true)
    }

    const handleNewsModalChange = (open: boolean) => {
        setNewsModalOpen(open)
    }

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
                    <div className="flex items-center gap-2">
                        <LayoutSelector 
                            currentLayout={currentLayout}
                            onLayoutChange={handleLayoutChange}
                        />
                        <Button
                            onClick={handleNewsButtonClick}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            関連ニュース
                        </Button>
                    </div>
                </div>

                {/* アイテム一覧とフィルタリング機能 */}
                <CategoryItemsList
                    items={itemsWithTags}
                    availableTags={availableTags}
                    workspaceName={workspaceName}
                    categorySlug={categorySlug}
                    category={category}
                    layout={currentLayout}
                />
            </div>

            {/* ニュースモーダル */}
            <NewsModal
                open={newsModalOpen}
                onOpenChange={handleNewsModalChange}
                categoryId={category.id}
                categoryName={category.name}
            />
        </div>
    )
} 