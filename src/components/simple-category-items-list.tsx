"use client"

import { useState, useEffect } from 'react'
import { Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TagFilterSidebar } from '@/components/tag-filter-sidebar'
import { AlwaysSortableItemCard } from '@/components/always-sortable-item-card'
import { ItemListCompact } from '@/components/item-list-compact'
import { ItemGridTile } from '@/components/item-grid-tile'
import type { LayoutType } from '@/components/layout-selector'
import { 
    DndContext, 
    closestCenter, 
    PointerSensor, 
    useSensor, 
    useSensors
} from '@dnd-kit/core'
import { 
    SortableContext, 
    verticalListSortingStrategy
} from '@dnd-kit/sortable'

type Tag = {
    id: string
    name: string
    count?: number
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

interface SimpleCategoryItemsListProps {
    items: Item[]
    availableTags: Tag[]
    workspaceName: string
    categorySlug: string
    layout: LayoutType
}

export function SimpleCategoryItemsList({
    items,
    availableTags,
    workspaceName,
    categorySlug,
    layout
}: SimpleCategoryItemsListProps) {
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [isTagSidebarOpen, setIsTagSidebarOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    // ハイドレーションエラーを防ぐため、クライアントサイドでのみDnDをレンダリング
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // ドラッグアンドドロップのセンサー設定
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    // フィルター済みアイテム
    const filteredItems = items.filter(item => {
        if (selectedTags.length === 0) return true
        return selectedTags.every(selectedTag => 
            item.tags.some(itemTag => itemTag.name === selectedTag)
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
                case 'grid-3':
                case 'grid-5':
                    // compact とgridは従来のコンポーネントを使用（並び替え非対応）
                    return layout === 'list-compact' ? (
                        <ItemListCompact
                            key={itemKey}
                            item={item}
                            selectedTags={selectedTags}
                            onTagToggle={handleTagToggle}
                            workspaceName={workspaceName}
                            categorySlug={categorySlug}
                        />
                    ) : (
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
                    // list-cardは新しい常時並び替え対応コンポーネントを使用
                    return (
                        <AlwaysSortableItemCard
                            key={itemKey}
                            item={item}
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

                    {/* 並び替え対応状況の表示 */}
                    {layout === 'list-card' && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                            並び替え対応
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
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
            </div>

            {/* アイテムリスト */}
            {layout === 'list-card' ? (
                // list-cardのみ並び替え対応のDnDContextでラップ
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={() => {}} // 実際のハンドリングは上位のEnhancedDnDWrapperで行う
                >
                    <SortableContext 
                        items={filteredItems.map(item => `sort-${item.id}`)} 
                        strategy={verticalListSortingStrategy}
                    >
                        <div className={`grid gap-4 ${getGridClass()}`}>
                            {renderItems()}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                // その他のレイアウトは通常表示
                <div className={`grid gap-4 ${getGridClass()}`}>
                    {renderItems()}
                </div>
            )}

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