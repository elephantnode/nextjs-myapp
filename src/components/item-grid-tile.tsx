"use client"

import { ItemWithTags } from '@/types/database'
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, FileText, Edit3, Trash2, Eye } from "lucide-react"
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ItemGridTileProps {
    item: ItemWithTags
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
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const handleImageError = () => {
        setImageError(true)
    }

    const handleDelete = async () => {
        if (!confirm('このアイテムを削除しますか？')) return
        
        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('items')
                .update({ status: 'trashed' })
                .eq('id', item.id)
            
            if (error) throw error
            router.refresh()
        } catch (error) {
            console.error('削除エラー:', error)
            alert('削除に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="group hover:shadow-md transition-shadow overflow-hidden">
            <CardContent className="p-0">
                {/* 画像エリア */}
                <div className="relative h-32 bg-muted overflow-hidden">
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
                    
                    {/* ホバー時のアクションボタン */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="secondary" size="sm" asChild>
                            <Link href={`/workspace/${workspaceName}/${categorySlug}/${item.id}`}>
                                <Eye className="w-4 h-4" />
                            </Link>
                        </Button>
                        
                        <Button variant="secondary" size="sm" asChild>
                            <Link href={`/workspace/${workspaceName}/${categorySlug}/${item.id}?edit=true`}>
                                <Edit3 className="w-4 h-4" />
                            </Link>
                        </Button>
                        
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={handleDelete}
                            disabled={isLoading}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        
                        {item.type === 'bookmark' && item.url && (
                            <Button variant="secondary" size="sm" asChild>
                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </Button>
                        )}
                    </div>
                </div>

                {/* コンテンツエリア */}
                <div className="p-3 space-y-2">
                    <h3 className="font-medium text-sm line-clamp-2">
                        {item.title}
                    </h3>
                    
                    {(item.site_description || item.content) && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.site_description || item.content}
                        </p>
                    )}

                    {/* タグ */}
                    {item.item_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {item.item_tags.slice(0, 3).map((itemTag) => (
                                <Badge
                                    key={itemTag.tags.id}
                                    variant={selectedTags.includes(itemTag.tags.name) ? "default" : "secondary"}
                                    className={`text-xs cursor-pointer transition-colors ${
                                        selectedTags.includes(itemTag.tags.name) 
                                            ? 'bg-primary text-primary-foreground' 
                                            : 'hover:bg-primary/10'
                                    }`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onTagToggle(itemTag.tags.name)
                                    }}
                                >
                                    {itemTag.tags.name}
                                </Badge>
                            ))}
                            {item.item_tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{item.item_tags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* 日付 */}
                    <div className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString('ja-JP')}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
} 