"use client"

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Globe, Plus, ExternalLink, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Image from 'next/image'

interface WorkspaceChatInterfaceProps {
    workspaceId: string
    categories: Array<{
        id: string
        name: string
        slug: string
        icon: string
    }>
    onSave?: () => void
}

type SuggestedCategory = {
    id: string
    name: string
    icon: string
    confidence: number
}

export function WorkspaceChatInterface({ 
    workspaceId, 
    categories,
    onSave
}: WorkspaceChatInterfaceProps) {
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [aiResponse, setAiResponse] = useState<{
        type: string
        content: {
            title: string
            description?: string
            content?: string
            url?: string
            site_title?: string
            site_description?: string
            site_image_url?: string
            site_name?: string
            type: 'bookmark' | 'note'
        }
        tags: string[]
        suggestedCategories?: SuggestedCategory[]
        message: string
    } | null>(null)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
    const [customTagInput, setCustomTagInput] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [imageError, setImageError] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        setIsLoading(true)
        setAiResponse(null)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: input.trim() }],
                    systemType: 'content_addition',
                    workspaceId: workspaceId
                }),
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const responseText = await response.text()

            try {
                const data = JSON.parse(responseText)
                setAiResponse(data)
                // AI提案のタグを自動選択
                setSelectedTags(data.tags || [])
                
                // AIが提案したカテゴリがある場合、最も信頼度の高いものを初期選択
                if (data.suggestedCategories && data.suggestedCategories.length > 0) {
                    // 信頼度でソートして最も高いものを選択
                    const bestCategory = data.suggestedCategories.sort((a: SuggestedCategory, b: SuggestedCategory) => b.confidence - a.confidence)[0]
                    setSelectedCategoryId(bestCategory.id)
                }
            } catch (parseError) {
                console.error('JSON parse error:', parseError)
                throw new Error('Invalid JSON response')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('エラーが発生しました。もう一度お試しください。')
        } finally {
            setIsLoading(false)
        }
    }

    // タグの選択/選択解除
    const toggleTag = (tag: string) => {
        setSelectedTags(prev => 
            prev.includes(tag) 
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        )
    }

    // カスタムタグの追加
    const addCustomTag = () => {
        const tag = customTagInput.trim()
        if (tag && !selectedTags.includes(tag)) {
            setSelectedTags(prev => [...prev, tag])
            setCustomTagInput('')
        }
    }

    // タグの削除
    const removeTag = (tag: string) => {
        setSelectedTags(prev => prev.filter(t => t !== tag))
    }

    // 画像エラーハンドラー
    const handleImageError = () => {
        setImageError(true)
    }

    // コンテンツの保存
    const handleSave = async () => {
        if (!aiResponse?.content || !selectedCategoryId) {
            alert('カテゴリーを選択してください')
            return
        }

        setIsSaving(true)
        try {
            const finalTags = selectedTags
            
            const itemData = {
                workspace_id: workspaceId,
                category_id: selectedCategoryId,
                type: aiResponse.content.type,
                title: aiResponse.content.title,
                content: aiResponse.content.content || null,
                url: aiResponse.content.url || null,
                site_title: aiResponse.content.site_title || null,
                site_description: aiResponse.content.site_description || null,
                site_image_url: aiResponse.content.site_image_url || null,
                site_name: aiResponse.content.site_name || null,
                order: 0
            }

            console.log('アイテム保存データ:', itemData)

            // APIエンドポイントを使用してアイテムを作成（embedding生成含む）
            const response = await fetch('/api/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            })

            if (!response.ok) {
                throw new Error('アイテムの作成に失敗しました')
            }

            const result = await response.json()
            console.log('アイテム作成結果:', result)

            if (!result.success) {
                throw new Error(result.error || 'アイテムの作成に失敗しました')
            }

            const item = result.item

            // タグを保存
            if (finalTags.length > 0) {
                const supabase = createClient()
                
                // 既存のタグを確認/作成
                const tagPromises = finalTags.map(async (tagName) => {
                    const { data: existingTag } = await supabase
                        .from('tags')
                        .select('id')
                        .eq('workspace_id', workspaceId)
                        .eq('name', tagName)
                        .single()

                    if (existingTag) {
                        return existingTag.id
                    } else {
                        const { data: newTag, error } = await supabase
                            .from('tags')
                            .insert({
                                workspace_id: workspaceId,
                                name: tagName
                            })
                            .select('id')
                            .single()

                        if (error) throw error
                        return newTag.id
                    }
                })

                const tagIds = await Promise.all(tagPromises)

                // アイテムとタグを関連付け
                const itemTagData = tagIds.map(tagId => ({
                    item_id: item.id,
                    tag_id: tagId
                }))

                const { error: itemTagError } = await supabase
                    .from('item_tags')
                    .insert(itemTagData)

                if (itemTagError) throw itemTagError
            }

            // 成功メッセージ
            alert(`「${aiResponse.content.title}」を保存しました！${result.embedding_generated ? ' (AI検索用の埋め込み生成済み)' : ''}`)
            
            // フォームをリセット
            setInput('')
            setAiResponse(null)
            setSelectedTags([])
            setSelectedCategoryId('')
            setCustomTagInput('')
            setImageError(false)

            // コールバック実行（ドロワーを閉じるなど）
            onSave?.()
            
            // 少し待ってからページをリロード
            setTimeout(() => {
                window.location.reload()
            }, 1000)

        } catch (error) {
            console.error('保存エラー:', error)
            alert('保存に失敗しました: ' + (error as Error).message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* チャット入力 */}
            <div className="flex-shrink-0 mb-4">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="URLまたはメモを入力してください..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button 
                        type="submit" 
                        disabled={!input.trim() || isLoading}
                        size="icon"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </form>
            </div>

            {/* AI応答の表示 */}
            {aiResponse && (
                <div className="flex-1 overflow-y-auto space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                {aiResponse.content.type === 'bookmark' ? (
                                    <Globe className="h-5 w-5" />
                                ) : (
                                    <Plus className="h-5 w-5" />
                                )}
                                {aiResponse.content.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* プレビューコンテンツ */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    {aiResponse.content.site_description && (
                                        <p className="text-muted-foreground text-sm mb-2">
                                            {aiResponse.content.site_description}
                                        </p>
                                    )}
                                    
                                    {aiResponse.content.content && (
                                        <p className="text-sm mb-2">
                                            {aiResponse.content.content}
                                        </p>
                                    )}
                                    
                                    {aiResponse.content.url && (
                                        <div className="flex items-center gap-2 text-sm text-blue-600">
                                            <ExternalLink className="h-4 w-4" />
                                            <a 
                                                href={aiResponse.content.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="hover:underline"
                                            >
                                                {new URL(aiResponse.content.url).hostname}
                                            </a>
                                        </div>
                                    )}
                                </div>
                                
                                {aiResponse.content.site_image_url && !imageError && (
                                    <div className="flex-shrink-0">
                                        <Image 
                                            src={aiResponse.content.site_image_url} 
                                            alt={aiResponse.content.title}
                                            width={80}
                                            height={80}
                                            className="object-cover rounded"
                                            onError={handleImageError}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* カテゴリー選択 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">カテゴリーを選択:</label>
                                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="カテゴリーを選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                
                                {/* AIが提案したカテゴリーを表示 */}
                                {aiResponse.suggestedCategories && aiResponse.suggestedCategories.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-xs text-muted-foreground mb-1">AI提案:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {aiResponse.suggestedCategories.map((suggestedCat) => (
                                                <Button
                                                    key={suggestedCat.id}
                                                    variant={selectedCategoryId === suggestedCat.id ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setSelectedCategoryId(suggestedCat.id)}
                                                    className="text-xs"
                                                >
                                                    {suggestedCat.name} ({Math.round(suggestedCat.confidence * 100)}%)
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* タグ選択・編集 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">タグ:</label>
                                
                                {/* 提案されたタグ */}
                                {aiResponse.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {aiResponse.tags.map((tag) => (
                                            <Badge
                                                key={tag}
                                                variant={selectedTags.includes(tag) ? "default" : "secondary"}
                                                className="cursor-pointer"
                                                onClick={() => toggleTag(tag)}
                                            >
                                                {tag}
                                                {selectedTags.includes(tag) && (
                                                    <Check className="ml-1 h-3 w-3" />
                                                )}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                
                                {/* 選択されたタグの表示 */}
                                {selectedTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {selectedTags.map((tag) => (
                                            <Badge key={tag} variant="default" className="flex items-center gap-1">
                                                {tag}
                                                <X 
                                                    className="h-3 w-3 cursor-pointer" 
                                                    onClick={() => removeTag(tag)}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                
                                {/* カスタムタグ追加 */}
                                <div className="flex gap-2">
                                    <Input
                                        value={customTagInput}
                                        onChange={(e) => setCustomTagInput(e.target.value)}
                                        placeholder="カスタムタグを追加..."
                                        className="flex-1"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                addCustomTag()
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={addCustomTag}
                                        disabled={!customTagInput.trim()}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* 保存ボタン */}
                            <div className="flex justify-end">
                                <Button 
                                    onClick={handleSave}
                                    disabled={isSaving || !selectedCategoryId}
                                    className="flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                    保存
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    )
} 