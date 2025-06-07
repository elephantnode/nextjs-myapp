"use client"

import { useDraggable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bookmark, FileText, ExternalLink, Calendar, Tag as TagIcon, GripVertical } from 'lucide-react'
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

interface AlwaysSortableItemCardProps {
    item: Item
    selectedTags: string[]
    onTagToggle: (tag: string) => void
    workspaceName: string
    categorySlug: string
}

export function AlwaysSortableItemCard({
    item,
    selectedTags,
    onTagToggle,
    workspaceName,
    categorySlug
}: AlwaysSortableItemCardProps) {
    // 並び替え用（ハンドル部分）
    const sortable = useSortable({
        id: `sort-${item.id}`,
        data: {
            type: 'sortable-item',
            item: item,
        },
    })

    // カテゴリー移動用（アイテム全体）
    const draggable = useDraggable({
        id: `move-${item.id}`,
        data: {
            type: 'item',
            item: item,
        },
    })

    const sortStyle = {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
    }

    const dragStyle = {
        transform: CSS.Transform.toString(draggable.transform),
    }

    // どちらかがドラッグ中の場合のスタイル
    const isDragging = sortable.isDragging || draggable.isDragging
    
    // ドラッグ中はsortableのスタイルを優先（ハンドルドラッグの場合）
    const activeStyle = sortable.isDragging ? sortStyle : dragStyle

    return (
        <Card 
            ref={draggable.setNodeRef}
            style={activeStyle}
            className={`cursor-default transition-all ${
                isDragging ? 'opacity-50 shadow-lg scale-105' : ''
            }`}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* ドラッグハンドル（並び替え用） */}
                        <div
                            ref={sortable.setNodeRef}
                            {...sortable.attributes}
                            {...sortable.listeners}
                            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors"
                            aria-label="ドラッグして並び替え"
                            style={sortStyle}
                        >
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </div>
                        
                        {/* アイテムタイプアイコン */}
                        <div className="flex-shrink-0">
                            {item.type === 'bookmark' ? (
                                <Bookmark className="w-5 h-5 text-blue-600" />
                            ) : (
                                <FileText className="w-5 h-5 text-green-600" />
                            )}
                        </div>
                        
                        {/* タイトル */}
                        <CardTitle className="text-base line-clamp-2 min-w-0">
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
                    </div>
                    
                    {/* アクションメニュー */}
                    <ItemActionsMenu 
                        itemId={item.id}
                        itemTitle={item.title}
                        workspaceName={workspaceName}
                        categorySlug={categorySlug}
                    />
                </div>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-3">
                {/* サイト情報 */}
                {item.site_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ExternalLink className="w-4 h-4" />
                        <span className="truncate">{item.site_name}</span>
                    </div>
                )}
                
                {/* 説明文 */}
                {(item.site_description || item.content) && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                        {item.site_description || item.content}
                    </p>
                )}
                
                {/* OGP画像 */}
                {item.site_image_url && (
                    <div className="mt-3">
                        <ItemImage
                            src={item.site_image_url}
                            alt={item.site_title || item.title}
                            className="w-full h-40 object-cover rounded-lg"
                        />
                    </div>
                )}
                
                {/* タグ */}
                {item.tags && item.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <TagIcon className="w-4 h-4 text-muted-foreground" />
                        {item.tags.map((tag) => (
                            <Badge
                                key={tag.id}
                                variant={selectedTags.includes(tag.name) ? "default" : "secondary"}
                                className="cursor-pointer transition-colors"
                                onClick={() => onTagToggle(tag.name)}
                            >
                                {tag.name}
                            </Badge>
                        ))}
                    </div>
                )}
                
                {/* 作成日時 */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
                </div>
            </CardContent>
        </Card>
    )
} 