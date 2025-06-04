"use client"

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ExternalLink, FileText, Globe, GripVertical } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card-tile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useState } from 'react'

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

interface ItemGridTileProps {
    item: Item
    selectedTags: string[]
    onTagToggle: (tagName: string) => void
    workspaceName: string
    categorySlug: string
}

export function ItemGridTile({
    item,
    selectedTags,
    onTagToggle,
    workspaceName,
    categorySlug
}: ItemGridTileProps) {
    const [imageError, setImageError] = useState(false)
    
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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ja-JP', {
            month: '2-digit',
            day: '2-digit'
        })
    }

    const truncateText = (text: string, maxLength: number) => {
        return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
    }

    const handleImageError = () => {
        setImageError(true)
    }

    return (
        <Card 
            ref={setNodeRef}
            style={style}
            className={`group hover:shadow-md transition-all duration-200 ${
                isDragging ? 'shadow-lg scale-105 cursor-grabbing' : 'cursor-grab'
            }`}
        >
            <CardContent className="p-0">
                {/* 画像エリア */}
                <div className="relative h-32 bg-muted rounded-t-lg overflow-hidden">
                    {/* ドラッグハンドル */}
                    <div 
                        {...listeners} 
                        {...attributes}
                        className="absolute top-2 left-2 z-10 p-1 rounded bg-white/80 hover:bg-white cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <GripVertical className="w-4 h-4 text-gray-600" />
                    </div>

                    {item.type === 'bookmark' && item.site_image_url && !imageError ? (
                        <img
                            src={item.site_image_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {item.type === 'bookmark' ? (
                                <ExternalLink className="w-8 h-8 text-blue-400" />
                            ) : (
                                <FileText className="w-8 h-8 text-green-400" />
                            )}
                        </div>
                    )}
                    
                    {/* 外部リンクボタン（ブックマークの場合のみ） */}
                    {item.type === 'bookmark' && item.url && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="secondary"
                                size="sm"
                                asChild
                                className="h-7 w-7 p-0"
                            >
                                <a 
                                    href={item.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </Button>
                        </div>
                    )}
                </div>

                {/* コンテンツエリア */}
                <div className="p-3 space-y-2">
                    {/* タイトル */}
                    <Link 
                        href={`/workspace/${workspaceName}/${categorySlug}/${item.id}`}
                        className="block"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors">
                            {item.title}
                        </h3>
                    </Link>

                    {/* 説明文（ある場合のみ） */}
                    {(item.site_description || item.content) && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {truncateText(item.site_description || item.content || '', 80)}
                        </p>
                    )}

                    {/* メタ情報 */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {item.site_name ? (
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                                <Globe className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{item.site_name}</span>
                            </div>
                        ) : (
                            <div className="flex-1" />
                        )}
                        <span className="flex-shrink-0">{formatDate(item.created_at)}</span>
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
                                        onTagToggle(tag.name)
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
            </CardContent>
        </Card>
    )
} 