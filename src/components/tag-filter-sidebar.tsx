"use client"

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
} from '@/components/ui/sidebar'
import { Tag as TagIcon, Search, X, Filter } from 'lucide-react'

type Tag = {
    id: string
    name: string
    count?: number
}

interface TagFilterSidebarProps {
    availableTags: Tag[]
    selectedTags: string[]
    onTagToggle: (tagName: string) => void
    onClearFilters: () => void
    onClose: () => void
    filteredItemCount: number
    totalItemCount: number
}

export function TagFilterSidebar({
    availableTags,
    selectedTags,
    onTagToggle,
    onClearFilters,
    onClose,
    filteredItemCount,
    totalItemCount
}: TagFilterSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('')
    
    // 検索でフィルタリングされたタグ
    const filteredTags = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // タグを使用頻度順に並び替え
    const sortedTags = filteredTags.sort((a, b) => (b.count || 0) - (a.count || 0))

    const hasActiveFilters = selectedTags.length > 0

    return (
        <>
            {/* オーバーレイ */}
            <div 
                className="fixed inset-0 bg-black/20 z-30"
                onClick={onClose}
            />
            
            {/* サイドバー */}
            <Sidebar 
                side="right" 
                className="w-80 fixed right-0 top-14 h-[calc(100vh-3.5rem)] z-40 border-l bg-background shadow-lg"
            >
                <SidebarHeader className="border-b px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            <h2 className="text-lg font-semibold">タグフィルター</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClearFilters}
                                    className="text-xs"
                                >
                                    <X className="w-3 h-3 mr-1" />
                                    クリア
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="h-8 w-8 p-0"
                            >
                                <X className="w-4 h-4" />
                                <span className="sr-only">閉じる</span>
                            </Button>
                        </div>
                    </div>
                    
                    {/* フィルター結果の表示 */}
                    <div className="text-sm text-muted-foreground">
                        {hasActiveFilters ? (
                            <span>
                                {filteredItemCount} / {totalItemCount} 件のアイテム
                            </span>
                        ) : (
                            <span>{totalItemCount} 件のアイテム</span>
                        )}
                    </div>
                </SidebarHeader>

                <SidebarContent className="overflow-y-auto px-4">
                    {/* 検索ボックス */}
                    <SidebarGroup>
                        <SidebarGroupLabel>タグを検索</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="タグ名で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* 選択中のタグ */}
                    {hasActiveFilters && (
                        <SidebarGroup>
                            <SidebarGroupLabel>選択中のタグ</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTags.map((tagName) => (
                                        <Badge
                                            key={tagName}
                                            variant="default"
                                            className="cursor-pointer flex items-center gap-1"
                                            onClick={() => onTagToggle(tagName)}
                                        >
                                            {tagName}
                                            <X className="w-3 h-3" />
                                        </Badge>
                                    ))}
                                </div>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}

                    {/* 利用可能なタグ一覧 */}
                    <SidebarGroup>
                        <SidebarGroupLabel>
                            利用可能なタグ ({sortedTags.length})
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <div className="space-y-1">
                                {sortedTags.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4 text-center">
                                        {searchQuery ? 'タグが見つかりません' : 'まだタグがありません'}
                                    </p>
                                ) : (
                                    sortedTags.map((tag) => {
                                        const isSelected = selectedTags.includes(tag.name)
                                        return (
                                            <div
                                                key={tag.id}
                                                className={`
                                                    flex items-center justify-between p-2 rounded-md cursor-pointer
                                                    transition-colors hover:bg-accent
                                                    ${isSelected ? 'bg-accent' : ''}
                                                `}
                                                onClick={() => onTagToggle(tag.name)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <TagIcon className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm">{tag.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {tag.count && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {tag.count}
                                                        </span>
                                                    )}
                                                    {isSelected && (
                                                        <div className="w-2 h-2 bg-primary rounded-full" />
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
        </>
    )
} 