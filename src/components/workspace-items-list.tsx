"use client"

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Filter, ExternalLink } from 'lucide-react'
import { TagFilterSidebar } from '@/components/tag-filter-sidebar'

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
    categories?: {
        name: string
        slug: string
    }
}

type TaggedItem = {
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
    tag: {
        id: string
        name: string
    }
}

interface WorkspaceItemsListProps {
    recentItems: Item[]
    taggedItems: TaggedItem[]
    allTags: Tag[]
    workspaceSlug: string
}

export function WorkspaceItemsList({
    recentItems,
    taggedItems,
    allTags,
    workspaceSlug
}: WorkspaceItemsListProps) {
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [isTagSidebarOpen, setIsTagSidebarOpen] = useState(false)

    // フィルター済みの最新アイテム
    const filteredRecentItems = recentItems.filter(item => {
        if (selectedTags.length === 0) return true
        return selectedTags.every(selectedTag => 
            item.tags.some(itemTag => itemTag.name === selectedTag)
        )
    })

    // フィルター済みのタグ付きアイテム
    const filteredTaggedItems = taggedItems.filter(item => {
        if (selectedTags.length === 0) return true
        return selectedTags.includes(item.tag.name)
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

    return (
        <>
            <div className="space-y-8">
                {/* フィルターコントロール */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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
                    </div>

                    {/* タグフィルターボタン */}
                    {allTags.length > 0 && (
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

                {/* 最新の登録内容 */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold tracking-tight">最新の登録内容</h2>
                        <p className="text-sm text-muted-foreground">
                            {selectedTags.length > 0 
                                ? `${filteredRecentItems.length} / ${recentItems.length}件` 
                                : `最近追加された${recentItems.length}件`
                            }
                        </p>
                    </div>
                    
                    {filteredRecentItems.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredRecentItems.map((item: Item) => (
                                <div key={item.id} className="group relative rounded-lg border hover:shadow-md transition-shadow overflow-hidden">
                                    <div className="flex items-start">
                                        <div className="flex-1 min-w-0 p-4">
                                            <h3 className="font-medium truncate mb-2">
                                                {item.type === 'bookmark' && item.url ? (
                                                    <a 
                                                        href={item.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:underline text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                    >
                                                        {item.title}
                                                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                                    </a>
                                                ) : (
                                                    <a 
                                                        href={`/workspace/${workspaceSlug}/${item.categories?.slug}/${item.id}`}
                                                        className="hover:underline"
                                                    >
                                                        {item.title}
                                                    </a>
                                                )}
                                            </h3>
                                            
                                            {item.type === 'bookmark' && item.site_description && (
                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                    {item.site_description}
                                                </p>
                                            )}
                                            
                                            {item.type === 'note' && item.content && (
                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                    {item.content}
                                                </p>
                                            )}
                                            
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                                <span className={`px-2 py-1 rounded-full ${
                                                    item.type === 'bookmark' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {item.type === 'bookmark' ? 'ブックマーク' : 'ノート'}
                                                </span>
                                                <span>・</span>
                                                <span>{item.categories?.name}</span>
                                                <span>・</span>
                                                <span>{new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
                                            </div>

                                            {/* タグ */}
                                            {item.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.tags.slice(0, 3).map((tag) => (
                                                        <Badge
                                                            key={tag.id}
                                                            variant={selectedTags.includes(tag.name) ? "default" : "secondary"}
                                                            className={`text-xs cursor-pointer transition-colors ${
                                                                selectedTags.includes(tag.name) 
                                                                    ? 'bg-primary text-primary-foreground' 
                                                                    : 'hover:bg-primary/10'
                                                            }`}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleTagToggle(tag.name)
                                                            }}
                                                        >
                                                            {tag.name}
                                                        </Badge>
                                                    ))}
                                                    {item.tags.length > 3 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{item.tags.length - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {item.type === 'bookmark' && item.site_image_url && (
                                            <div className="w-20 h-20 flex-shrink-0 m-4 ml-0">
                                                <img 
                                                    src={item.site_image_url} 
                                                    alt={item.title}
                                                    className="w-full h-full object-cover rounded-md"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            {selectedTags.length > 0 ? 'フィルター条件に一致するアイテムがありません' : 'まだアイテムが登録されていません'}
                        </div>
                    )}
                </section>

                {/* タグ付きアイテム */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold tracking-tight">タグ付きアイテム</h2>
                        <p className="text-sm text-muted-foreground">
                            {selectedTags.length > 0 ? (
                                `選択中のタグ: ${selectedTags.length}個`
                            ) : (
                                `${allTags.length}個のタグ`
                            )}
                        </p>
                    </div>
                    
                    {(selectedTags.length > 0 ? filteredTaggedItems.length > 0 : taggedItems.length > 0) ? (
                        <div className="space-y-6">
                            {allTags
                                .filter(tag => selectedTags.length === 0 || selectedTags.includes(tag.name))
                                .map((tag: Tag) => {
                                    const itemsWithTag = taggedItems.filter((item: TaggedItem) => item.tag.id === tag.id)
                                    if (itemsWithTag.length === 0) return null
                                    
                                    return (
                                        <div key={tag.id} className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span 
                                                    className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                                                        selectedTags.includes(tag.name)
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                                                    }`}
                                                    onClick={() => handleTagToggle(tag.name)}
                                                >
                                                    {tag.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {itemsWithTag.length}件
                                                </span>
                                            </div>
                                            
                                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pl-4">
                                                {itemsWithTag.slice(0, 6).map((item: TaggedItem) => (
                                                    <div key={`${tag.id}-${item.id}`} className="group rounded-lg border p-3 hover:shadow-sm transition-shadow">
                                                        <h4 className="font-medium truncate mb-1">
                                                            {item.type === 'bookmark' && item.url ? (
                                                                <a 
                                                                    href={item.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="hover:underline text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                                >
                                                                    {item.title}
                                                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                                                </a>
                                                            ) : (
                                                                <a 
                                                                    href={`/workspace/${workspaceSlug}/${item.category_id}/${item.id}`}
                                                                    className="hover:underline"
                                                                >
                                                                    {item.title}
                                                                </a>
                                                            )}
                                                        </h4>
                                                        
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span className={`px-2 py-0.5 rounded-full ${
                                                                item.type === 'bookmark' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                            }`}>
                                                                {item.type === 'bookmark' ? 'ブックマーク' : 'ノート'}
                                                            </span>
                                                            <span>{new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {itemsWithTag.length > 6 && (
                                                <div className="pl-4">
                                                    <p className="text-xs text-muted-foreground">
                                                        他 {itemsWithTag.length - 6} 件...
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            {selectedTags.length > 0 ? 'フィルター条件に一致するタグ付きアイテムがありません' : 'タグ付きアイテムがありません'}
                        </div>
                    )}
                </section>
            </div>

            {/* 右側タグフィルターサイドバー */}
            {isTagSidebarOpen && (
                <TagFilterSidebar
                    availableTags={allTags}
                    selectedTags={selectedTags}
                    onTagToggle={handleTagToggle}
                    onClearFilters={handleClearFilters}
                    onClose={() => setIsTagSidebarOpen(false)}
                    filteredItemCount={filteredRecentItems.length + filteredTaggedItems.length}
                    totalItemCount={recentItems.length + taggedItems.length}
                />
            )}
        </>
    )
} 