"use client"

import { useDraggable } from '@dnd-kit/core'
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

interface DraggableItemCardProps {
    item: Item
    selectedTags: string[]
    onTagToggle: (tagName: string) => void
    workspaceName: string
    categorySlug: string
}

export function DraggableItemCard({
    item,
    selectedTags,
    onTagToggle,
    workspaceName,
    categorySlug
}: DraggableItemCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: item.id,
        data: {
            type: 'item',
            item: item,
            title: item.title,
        },
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <Card 
            ref={setNodeRef} 
            style={style}
            className={`overflow-hidden transition-all ${
                isDragging ? 'shadow-lg scale-105 cursor-grabbing' : 'cursor-grab hover:shadow-md'
            }`}
        >
            <CardHeader>
                <div className="flex items-start gap-3">
                    {/* ドラッグハンドル */}
                    <div 
                        {...listeners} 
                        {...attributes}
                        className="flex-shrink-0 mt-1 p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical className="w-4 h-4 text-gray-400" />
                    </div>

                    {/* タイプアイコン */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center mt-1">
                        {item.type === 'bookmark' ? (
                            <Bookmark className="w-4 h-4 text-blue-600" />
                        ) : (
                            <FileText className="w-4 h-4 text-green-600" />
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg leading-tight flex-1">
                                {item.url ? (
                                    <a 
                                        href={item.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="hover:text-primary flex items-center gap-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {item.title}
                                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                    </a>
                                ) : (
                                    item.title
                                )}
                            </CardTitle>
                            
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(item.created_at).toLocaleDateString('ja-JP')}
                                </div>
                                
                                {/* アクションメニュー */}
                                <ItemActionsMenu 
                                    itemId={item.id}
                                    itemTitle={item.title}
                                    workspaceName={workspaceName}
                                    categorySlug={categorySlug}
                                />
                            </div>
                        </div>
                        
                        {/* サイト情報（ブックマークの場合） */}
                        {item.type === 'bookmark' && item.site_name && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {item.site_name}
                            </p>
                        )}
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
                {/* 説明/コンテンツ */}
                {item.type === 'bookmark' && item.site_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.site_description}
                    </p>
                )}
                
                {item.type === 'note' && item.content && (
                    <p className="text-sm line-clamp-3">
                        {item.content}
                    </p>
                )}
                
                {/* タグ */}
                {item.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <TagIcon className="w-3 h-3 text-muted-foreground" />
                        {item.tags.map((tag) => (
                            <Badge 
                                key={tag.id} 
                                variant={selectedTags.includes(tag.name) ? "default" : "secondary"} 
                                className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onTagToggle(tag.name)
                                }}
                            >
                                {tag.name}
                            </Badge>
                        ))}
                    </div>
                )}
                
                {/* サイト画像（ブックマークの場合） */}
                {item.type === 'bookmark' && item.site_image_url && (
                    <div className="mt-3">
                        <ItemImage
                            src={item.site_image_url}
                            alt={item.site_title || item.title}
                            className="w-full max-w-sm h-32 object-cover rounded-md border"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
} 