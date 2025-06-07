"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// import { CategoryIconMap } from '@/components/nav/category-icons'
import { Filter, ArrowUpDown, Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TagFilterSidebar } from '@/components/tag-filter-sidebar'
import { DraggableItemCard } from '@/components/draggable-item-card'
import { SortableItemCard } from '@/components/sortable-item-card'
import { ItemListCompact } from '@/components/item-list-compact'
import { SortableItemListCompact } from '@/components/sortable-item-list-compact'
import { ItemGridTile } from '@/components/item-grid-tile'
import { SortableItemGridTile } from '@/components/sortable-item-grid-tile'
import type { LayoutType } from '@/components/layout-selector'
import { 
    DndContext, 
    closestCenter, 
    PointerSensor, 
    useSensor, 
    useSensors,
    DragEndEvent
} from '@dnd-kit/core'
import { 
    SortableContext, 
    verticalListSortingStrategy,
    arrayMove 
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

interface CategoryItemsListProps {
    items: Item[]
    availableTags: Tag[]
    workspaceName: string
    categorySlug: string
    category: Category
    layout: LayoutType
}

export function CategoryItemsList({
    items: initialItems,
    availableTags,
    workspaceName,
    categorySlug,
    category,
    layout
}: CategoryItemsListProps) {
    const router = useRouter()
    const [items, setItems] = useState<Item[]>(initialItems)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [isTagSidebarOpen, setIsTagSidebarOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [isReordering, setIsReordering] = useState(false)
    const [isReorderSaving, setIsReorderSaving] = useState(false)

    // ハイドレーションエラーを防ぐため、クライアントサイドでのみDnDをレンダリング
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // アイテムが更新された時にローカル状態を同期
    useEffect(() => {
        setItems(initialItems)
    }, [initialItems])

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

    // 並び替えモードの切り替え
    const handleToggleReordering = () => {
        setIsReordering(!isReordering)
    }

    // 並び替え保存
    const handleSaveReorder = async () => {
        setIsReorderSaving(true)
        try {
            const response = await fetch('/api/items/reorder', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    itemIds: items.map(item => item.id),
                    categoryId: category.id
                }),
            })

            if (!response.ok) {
                throw new Error('並び替えの保存に失敗しました')
            }

            setIsReordering(false)
            router.refresh() // データを最新状態に更新
        } catch (error) {
            console.error('Error saving reorder:', error)
            alert('並び替えの保存に失敗しました。もう一度お試しください。')
        } finally {
            setIsReorderSaving(false)
        }
    }

    // 並び替えキャンセル
    const handleCancelReorder = () => {
        setItems(initialItems) // 元の順序に戻す
        setIsReordering(false)
    }

    // ドラッグエンドハンドラー
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (!over || active.id === over.id) {
            return
        }

        setItems((items) => {
            const oldIndex = items.findIndex(item => item.id === active.id)
            const newIndex = items.findIndex(item => item.id === over.id)

            return arrayMove(items, oldIndex, newIndex)
        })
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
                    // 並び替えモードの場合はSortableItemListCompactを使用
                    if (isReordering) {
                        return (
                            <SortableItemListCompact
                                key={itemKey}
                                item={item}
                                selectedTags={selectedTags}
                                onTagToggle={handleTagToggle}
                                workspaceName={workspaceName}
                                categorySlug={categorySlug}
                                isReordering={true}
                            />
                        )
                    } else {
                        return (
                            <ItemListCompact
                                key={itemKey}
                                item={item}
                                selectedTags={selectedTags}
                                onTagToggle={handleTagToggle}
                                workspaceName={workspaceName}
                                categorySlug={categorySlug}
                            />
                        )
                    }
                
                case 'grid-3':
                case 'grid-5':
                    // 並び替えモードの場合はSortableItemGridTileを使用
                    if (isReordering) {
                        return (
                            <SortableItemGridTile
                                key={itemKey}
                                item={item}
                                selectedTags={selectedTags}
                                onTagToggle={handleTagToggle}
                                workspaceName={workspaceName}
                                categorySlug={categorySlug}
                                isReordering={true}
                            />
                        )
                    } else {
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
                    }
                
                case 'list-card':
                default:
                    // 並び替えモードの場合はSortableItemCardを使用
                    if (isReordering) {
                        return (
                            <SortableItemCard
                                key={itemKey}
                                item={item}
                                selectedTags={selectedTags}
                                onTagToggle={handleTagToggle}
                                workspaceName={workspaceName}
                                categorySlug={categorySlug}
                                isReordering={true}
                            />
                        )
                    } else {
                        return (
                            <DraggableItemCard
                                key={itemKey}
                                item={item}
                                selectedTags={selectedTags}
                                onTagToggle={handleTagToggle}
                                workspaceName={workspaceName}
                                categorySlug={categorySlug}
                            />
                        )
                    }
            }
        })
    }

    // const IconComponent = CategoryIconMap[category.icon as keyof typeof CategoryIconMap] || Hash

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

                    {/* 並び替えモード表示 */}
                    {isReordering && (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                            並び替えモード
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* 並び替えコントロール */}
                    {isReordering ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelReorder}
                                disabled={isReorderSaving}
                                className="gap-2"
                            >
                                <X className="w-4 h-4" />
                                キャンセル
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveReorder}
                                disabled={isReorderSaving}
                                className="gap-2"
                            >
                                <Check className="w-4 h-4" />
                                {isReorderSaving ? '保存中...' : '保存'}
                            </Button>
                        </>
                    ) : (
                        // 並び替えボタン（全レイアウトで表示）
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToggleReordering}
                            className="gap-2"
                        >
                            <ArrowUpDown className="w-4 h-4" />
                            並び替え
                        </Button>
                    )}

                    {/* タグフィルターボタン */}
                    {availableTags.length > 0 && !isReordering && (
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
            {isReordering ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext 
                        items={filteredItems.map(item => item.id)} 
                        strategy={verticalListSortingStrategy}
                    >
                        <div className={`grid gap-4 ${getGridClass()}`}>
                            {renderItems()}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
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