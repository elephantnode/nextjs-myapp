"use client"

import { useState } from 'react'
import { CategoryIconMap } from '@/components/nav/category-icons'
import { Hash, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TagFilterSidebar } from '@/components/tag-filter-sidebar'
import { DraggableItemCard } from '@/components/draggable-item-card'

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
}

export function CategoryItemsList({
    items,
    availableTags,
    workspaceName,
    categorySlug,
    category
}: CategoryItemsListProps) {
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [isTagSidebarOpen, setIsTagSidebarOpen] = useState(false)

    // タグフィルタリング
    const filteredItems = selectedTags.length === 0 
        ? items 
        : items.filter(item => 
            selectedTags.every(selectedTag => 
                item.tags.some(tag => tag.name === selectedTag)
            )
        )

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

    const IconComponent = CategoryIconMap[category.icon as keyof typeof CategoryIconMap] || Hash

    return (
        <>
            {/* フィルターヘッダー */}
            <div className="flex items-center justify-between">
                <div className="text-muted-foreground">
                    {filteredItems.length} 個のアイテム
                    {selectedTags.length > 0 && (
                        <span className="ml-2">
                            ({items.length} 件中)
                        </span>
                    )}
                </div>
                
                {/* フィルターボタン */}
                <div className="flex items-center gap-2">
                    {selectedTags.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">フィルター:</span>
                            <div className="flex gap-1">
                                {selectedTags.slice(0, 2).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                                {selectedTags.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                        +{selectedTags.length - 2}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}
                    <Button
                        variant={selectedTags.length > 0 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsTagSidebarOpen(!isTagSidebarOpen)}
                        className="flex items-center gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        タグフィルター
                        {selectedTags.length > 0 && (
                            <Badge variant="secondary" className="text-xs ml-1">
                                {selectedTags.length}
                            </Badge>
                        )}
                    </Button>
                </div>
            </div>

            {/* アイテム一覧 */}
            <div className="grid gap-4">
                {filteredItems.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center mb-4">
                                <IconComponent className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">
                                {selectedTags.length > 0 
                                    ? 'フィルター条件に一致するアイテムがありません'
                                    : 'まだアイテムがありません'
                                }
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                {selectedTags.length > 0 
                                    ? 'フィルター条件を変更してみてください'
                                    : '右下のボタンからURLやメモを追加してみましょう'
                                }
                            </p>
                            {selectedTags.length > 0 && (
                                <Button variant="outline" onClick={handleClearFilters}>
                                    フィルターをクリア
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    filteredItems.map((item) => (
                        <DraggableItemCard
                            key={item.id}
                            item={item}
                            selectedTags={selectedTags}
                            onTagToggle={handleTagToggle}
                            workspaceName={workspaceName}
                            categorySlug={categorySlug}
                        />
                    ))
                )}
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