"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Filter } from "lucide-react"
import { DraggableItemCard } from '@/components/draggable-item-card'
import { ItemGridTile } from '@/components/item-grid-tile'
import { ItemListCompact } from '@/components/item-list-compact'
import { TagFilterSidebar } from '@/components/tag-filter-sidebar'
import { LayoutType } from '@/components/layout-selector'
import { ItemWithTags } from '@/types/database'

type Tag = {
    id: string
    name: string
    count?: number
}

// 子コンポーネントで期待される型
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
    tags: { id: string; name: string }[]
}

// ItemWithTagsをItem型に変換する関数
const convertToItem = (itemWithTags: ItemWithTags): Item => ({
    ...itemWithTags,
    tags: itemWithTags.item_tags.map(itemTag => itemTag.tags)
})

interface CategoryItemsListProps {
    items: ItemWithTags[]
    availableTags: Tag[]
    workspaceName: string
    categorySlug: string
    layout: LayoutType
}

export function CategoryItemsList({
    items,
    availableTags,
    workspaceName,
    categorySlug,
    layout
}: CategoryItemsListProps) {
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [isTagSidebarOpen, setIsTagSidebarOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    // ハイドレーションエラーを防ぐため、クライアントサイドでのみDnDをレンダリング
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // フィルター済みアイテム
    const filteredItems = items.filter(item => {
        if (selectedTags.length === 0) return true
        return selectedTags.every(selectedTag => 
            item.item_tags.some(itemTag => itemTag.tags.name === selectedTag)
        )
    })

    // タグ選択/解除のハンドラー
    const handleTagToggle = (tagName: string) => {
        setSelectedTags(prev => 
            prev.includes(tagName)
                ? prev.filter(t => t !== tagName)
                : [...prev, tagName]
        )
    }

    // フィルターをクリア
    const handleClearFilters = () => {
        setSelectedTags([])
    }

    // レイアウトに応じたグリッドクラスを取得
    const getGridClass = () => {
        switch (layout) {
            case 'grid-3':
                return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            case 'grid-5':
                return 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            case 'list-compact':
                return 'grid-cols-1'
            case 'list-card':
            default:
                return 'grid-cols-1'
        }
    }

    // アイテムをレンダリングする関数
    const renderItems = () => {
        if (filteredItems.length === 0) {
            return (
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">
                            {selectedTags.length > 0 
                                ? 'フィルター条件に一致するアイテムがありません' 
                                : 'まだアイテムがありません'
                            }
                        </p>
                    </CardContent>
                </Card>
            )
        }

        if (!isMounted) {
            // ハイドレーション前は静的な表示
            return filteredItems.map((item) => (
                <div key={item.id} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))
        }

        // レイアウトに応じてアイテムをレンダリング
        return filteredItems.map((item) => {
            const itemKey = item.id

            switch (layout) {
                case 'list-compact':
                    return (
                        <ItemListCompact
                            key={itemKey}
                            item={convertToItem(item)}
                            selectedTags={selectedTags}
                            onTagToggle={handleTagToggle}
                            workspaceName={workspaceName}
                            categorySlug={categorySlug}
                        />
                    )
                
                case 'grid-3':
                case 'grid-5':
                    return (
                        <ItemGridTile
                            key={itemKey}
                            item={item}
                            selectedTags={selectedTags}
                            onTagToggle={handleTagToggle}
                            workspaceName={workspaceName}
                            categorySlug={categorySlug}
                        />
                    )
                
                case 'list-card':
                default:
                    return (
                        <DraggableItemCard
                            key={itemKey}
                            item={convertToItem(item)}
                            selectedTags={selectedTags}
                            onTagToggle={handleTagToggle}
                            workspaceName={workspaceName}
                            categorySlug={categorySlug}
                        />
                    )
            }
        })
    }

    return (
        <>
            {/* カテゴリー情報ヘッダー - カテゴリページから移動したので削除 */}

            {/* 選択中タグの表示 */}
            {selectedTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">フィルター中:</span>
                    {selectedTags.map((tag) => (
                        <Badge 
                            key={tag} 
                            variant="default" 
                            className="cursor-pointer hover:opacity-80"
                            onClick={() => handleTagToggle(tag)}
                        >
                            {tag} ×
                        </Badge>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-xs h-6 px-2"
                    >
                        すべてクリア
                    </Button>
                </div>
            )}

            {/* フィルターコントロール */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* アイテム数 */}
                    <Badge variant="secondary">
                        {selectedTags.length > 0 
                            ? `${filteredItems.length} / ${items.length}` 
                            : `${items.length}`
                        } アイテム
                    </Badge>
                </div>

                {/* タグフィルターボタン */}
                {availableTags.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTagSidebarOpen(true)}
                        className="gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        タグフィルター
                        {selectedTags.length > 0 && (
                            <Badge variant="default" className="ml-1">
                                {selectedTags.length}
                            </Badge>
                        )}
                    </Button>
                )}
            </div>

            {/* アイテムリスト */}
            <div className={`grid gap-4 ${getGridClass()}`}>
                {renderItems()}
            </div>

            {/* 右側タグフィルターサイドバー - レイアウト外に配置 */}
            {isTagSidebarOpen && (
                <TagFilterSidebar
                    availableTags={availableTags}
                    selectedTags={selectedTags}
                    onTagToggle={handleTagToggle}
                    onClearFilters={handleClearFilters}
                    onClose={() => setIsTagSidebarOpen(false)}
                    filteredItemCount={filteredItems.length}
                    totalItemCount={items.length}
                />
            )}
        </>
    )
} 