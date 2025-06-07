"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bookmark, FileText, ExternalLink, Calendar, GripVertical } from 'lucide-react'
import { ItemImage } from '@/components/item-image'
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

interface SortableItemGridTileProps {
    item: Item
    selectedTags: string[]
    onTagToggle: (tag: string) => void
    workspaceName: string
    categorySlug: string
    isReordering?: boolean
}

export function SortableItemGridTile({
    item,
    selectedTags,
    onTagToggle,
    workspaceName,
    categorySlug,
    isReordering = false
}: SortableItemGridTileProps) {
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
        <Card 
            ref={setNodeRef} 
            style={style}
            className={`group cursor-default h-full transition-all ${
                isDragging ? 'opacity-50 shadow-lg scale-105' : 'hover:shadow-md'
            } ${isReordering ? 'border-blue-200' : ''}`}
        >
            <CardHeader className="pb-2 relative">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
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
                                <Bookmark className="w-4 h-4 text-blue-600" />
                            ) : (
                                <FileText className="w-4 h-4 text-green-600" />
                            )}
                        </div>
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
                
                {/* タイトル */}
                <CardTitle className="text-sm line-clamp-2 mt-2">
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
                </CardTitle>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-3">
                {/* OGP画像 */}
                {item.site_image_url && (
                    <div className="aspect-video">
                        <ItemImage
                            src={item.site_image_url}
                            alt={item.site_title || item.title}
                            className="w-full h-full object-cover rounded-md"
                        />
                    </div>
                )}
                
                {/* サイト情報 */}
                {item.site_name && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate">{item.site_name}</span>
                    </div>
                )}
                
                {/* 説明文 */}
                {(item.site_description || item.content) && (
                    <p className="text-xs text-muted-foreground line-clamp-3">
                        {item.site_description || item.content}
                    </p>
                )}
                
                {/* タグ */}
                {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 2).map((tag) => (
                            <Badge
                                key={tag.id}
                                variant={selectedTags.includes(tag.name) ? "default" : "secondary"}
                                className="text-xs cursor-pointer transition-colors"
                                onClick={() => onTagToggle(tag.name)}
                            >
                                {tag.name}
                            </Badge>
                        ))}
                        {item.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                                +{item.tags.length - 2}
                            </Badge>
                        )}
                    </div>
                )}
                
                {/* 作成日時 */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
                </div>
            </CardContent>
        </Card>
    )
} 