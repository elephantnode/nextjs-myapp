"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Bookmark, FileText, ExternalLink, Tag as TagIcon, GripVertical, Calendar } from 'lucide-react'
import { ItemActionsMenu } from '@/components/item-actions-menu'

type Tag = {
    id: string
    name: string
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

interface SortableItemListCompactProps {
    item: Item
    selectedTags: string[]
    onTagToggle: (tag: string) => void
    workspaceName: string
    categorySlug: string
    isReordering?: boolean
}

export function SortableItemListCompact({
    item,
    selectedTags,
    onTagToggle,
    workspaceName,
    categorySlug,
    isReordering = false
}: SortableItemListCompactProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        data: {
            type: 'sortable-item',
            item: item,
        },
        disabled: !isReordering
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className={`group relative bg-card border rounded-lg p-4 transition-all ${
                isDragging ? 'opacity-50 shadow-lg scale-105' : 'hover:shadow-md'
            } ${isReordering ? 'border-blue-200' : ''}`}
        >
            <div className="flex items-center gap-3">
                {/* ドラッグハンドル */}
                {isReordering && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
                        aria-label="ドラッグして並び替え"
                    >
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </div>
                )}
                
                {/* アイテムタイプアイコン */}
                <div className="flex-shrink-0">
                    {item.type === 'bookmark' ? (
                        <Bookmark className="w-5 h-5 text-blue-600" />
                    ) : (
                        <FileText className="w-5 h-5 text-green-600" />
                    )}
                </div>
                
                {/* メインコンテンツ */}
                <div className="flex-1 min-w-0">
                    {/* タイトル */}
                    <h3 className="font-medium line-clamp-1 mb-1">
                        {item.url ? (
                            <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-blue-600 transition-colors"
                            >
                                {item.title}
                            </a>
                        ) : (
                            item.title
                        )}
                    </h3>
                    
                    {/* サイト情報・説明 */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        {item.site_name && (
                            <div className="flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                <span className="truncate max-w-32">{item.site_name}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
                        </div>
                    </div>
                    
                    {/* 説明文 */}
                    {(item.site_description || item.content) && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {item.site_description || item.content}
                        </p>
                    )}
                    
                    {/* タグ */}
                    {item.tags && item.tags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <TagIcon className="w-3 h-3 text-muted-foreground" />
                            {item.tags.slice(0, 3).map((tag) => (
                                <Badge
                                    key={tag.id}
                                    variant={selectedTags.includes(tag.name) ? "default" : "secondary"}
                                    className="text-xs cursor-pointer transition-colors"
                                    onClick={() => onTagToggle(tag.name)}
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
                
                {/* アクションメニュー */}
                {!isReordering && (
                    <ItemActionsMenu 
                        itemId={item.id}
                        itemTitle={item.title}
                        workspaceName={workspaceName}
                        categorySlug={categorySlug}
                    />
                )}
            </div>
        </div>
    )
} 