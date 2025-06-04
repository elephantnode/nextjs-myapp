"use client"

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ExternalLink, FileText, Clock, Globe, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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

interface ItemListCompactProps {
    item: Item
    selectedTags: string[]
    onTagToggle: (tagName: string) => void
    workspaceName: string
    categorySlug: string
}

export function ItemListCompact({
    item,
    selectedTags,
    onTagToggle,
    workspaceName,
    categorySlug
}: ItemListCompactProps) {
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
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })
    }

    const truncateText = (text: string, maxLength: number) => {
        return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
    }

    return (
        <div 
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-all group ${
                isDragging ? 'shadow-lg scale-105 cursor-grabbing' : 'cursor-grab'
            }`}
        >
            {/* ドラッグハンドル */}
            <div 
                {...listeners} 
                {...attributes}
                className="flex-shrink-0 p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="w-4 h-4 text-gray-400" />
            </div>

            {/* アイコン */}
            <div className="flex-shrink-0">
                {item.type === 'bookmark' ? (
                    <ExternalLink className="w-5 h-5 text-blue-600" />
                ) : (
                    <FileText className="w-5 h-5 text-green-600" />
                )}
            </div>

            {/* メインコンテンツ */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <Link 
                        href={`/workspace/${workspaceName}/${categorySlug}/${item.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors truncate"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {truncateText(item.title, 60)}
                    </Link>
                    
                    {item.type === 'bookmark' && item.url && (
                        <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    )}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {item.site_name && (
                        <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            <span>{item.site_name}</span>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(item.created_at)}</span>
                    </div>
                </div>
            </div>

            {/* タグ */}
            <div className="flex items-center gap-1 flex-shrink-0">
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
        </div>
    )
} 