"use client"

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, Plus, Check, X, ExternalLink, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

type SuggestedCategory = {
    id: string
    name: string
    icon: string
    confidence: number
}

interface ChatInterfaceProps {
    workspaceId: string
    categoryId: string
    categoryName: string
    onSave?: () => void
}

export function ChatInterface({ 
    workspaceId, 
    categoryId, 
    categoryName,
    onSave
}: ChatInterfaceProps) {
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
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categoryId)
    const [customTagInput, setCustomTagInput] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [imageError, setImageError] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    // const supabase = createClient()

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
        if (!aiResponse?.content) return

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

                // アイテムとタグの関連付け
                const itemTagInserts = tagIds.map(tagId => ({
                    item_id: item.id,
                    tag_id: tagId
                }))

                const { error: linkError } = await supabase
                    .from('item_tags')
                    .insert(itemTagInserts)

                if (linkError) throw linkError
            }

            // 状態をリセット
            setInput('')
            setAiResponse(null)
            setSelectedTags([])
            setSelectedCategoryId(categoryId)
            setCustomTagInput('')
            setImageError(false)
            
            router.refresh()
            
            const message = result.hasEmbedding 
                ? 'コンテンツを保存しました！（ベクトル検索対応済み）'
                : 'コンテンツを保存しました！（ベクトル生成は失敗しましたが、キーワード検索は利用可能です）'
            
            alert(message)
            
            // ドロワーを閉じる
            onSave?.()

        } catch (error) {
            console.error('Save error:', error)
            alert('保存中にエラーが発生しました: ' + (error as Error).message)
        } finally {
            setIsSaving(false)
        }
    }

    // スクロール管理
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [aiResponse])

    return (
        <div className="flex flex-col h-full max-h-[500px]">
            {/* チャット履歴 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30 text-sm">
                {aiResponse === null ? (
                    <div className="text-center text-muted-foreground">
                        URLを貼り付けるか、メモの内容を入力してください
                    </div>
                ) : (
                    <>
                        <div className={`flex ${aiResponse.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`text-md px-3 py-2 rounded-lg max-w-[70%] whitespace-pre-line ${
                                aiResponse.type === 'user' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted'
                            }`}>
                                {aiResponse.message}
                            </div>
                        </div>
                        
                        {/* コンテンツプレビュー */}
                        {aiResponse.content && (
                            <Card className="border-2 border-blue-200 bg-blue-50/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-blue-900">
                                        {aiResponse.content.type === 'bookmark' ? (
                                            <>
                                                <ExternalLink className="w-5 h-5" />
                                                ブックマーク
                                            </>
                                        ) : (
                                            <>
                                                <Globe className="w-5 h-5" />
                                                メモ
                                            </>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* コンテンツ情報 */}
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-lg">{aiResponse.content.title}</h3>
                                        
                                        {aiResponse.content.site_name && (
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Globe className="w-4 h-4" />
                                                {aiResponse.content.site_name}
                                            </p>
                                        )}
                                        
                                        {aiResponse.content.url && (
                                            <p className="text-sm text-blue-600 break-all">
                                                {aiResponse.content.url}
                                            </p>
                                        )}
                                        
                                        {aiResponse.content.site_description && (
                                            <p className="text-sm text-gray-700 line-clamp-3">
                                                {aiResponse.content.site_description}
                                            </p>
                                        )}
                                        
                                        {aiResponse.content.content && (
                                            <p className="text-sm text-gray-700 line-clamp-4">
                                                {aiResponse.content.content}
                                            </p>
                                        )}
                                        
                                        {/* OGP画像 */}
                                        {aiResponse.content.site_image_url && !imageError && (
                                            <div className="mt-3">
                                                <img 
                                                    src={aiResponse.content.site_image_url} 
                                                    alt={aiResponse.content.site_title || aiResponse.content.title}
                                                    className="w-full max-w-md h-40 object-cover rounded-lg border"
                                                    onError={handleImageError}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* タグ選択エリア */}
                                    <div className="space-y-4 pt-4 border-t border-blue-200">
                                        {/* AI提案タグ */}
                                        {(aiResponse.tags && aiResponse.tags.length > 0) && (
                                            <div>
                                                <p className="text-sm font-medium mb-3 text-blue-900">AIが提案するタグ:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {aiResponse.tags.map((tag: string) => (
                                                        <Button
                                                            key={tag}
                                                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                                                            size="sm"
                                                            className={`transition-all ${
                                                                selectedTags.includes(tag) 
                                                                    ? 'bg-blue-600 text-white' 
                                                                    : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                                                            }`}
                                                            onClick={() => toggleTag(tag)}
                                                        >
                                                            {selectedTags.includes(tag) && <Check className="w-3 h-3 mr-1" />}
                                                            {tag}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* 選択済みタグ */}
                                        {selectedTags.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium mb-3 text-blue-900">選択中のタグ:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedTags.map((tag) => (
                                                        <Badge key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-800">
                                                            {tag}
                                                            <X 
                                                                className="w-3 h-3 cursor-pointer hover:text-red-600" 
                                                                onClick={() => removeTag(tag)}
                                                            />
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* カスタムタグ追加 */}
                                        <div>
                                            <p className="text-sm font-medium mb-2 text-blue-900">カスタムタグを追加:</p>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={customTagInput}
                                                    onChange={(e) => setCustomTagInput(e.target.value)}
                                                    placeholder="新しいタグ名"
                                                    className="flex-1"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            addCustomTag()
                                                        }
                                                    }}
                                                />
                                                <Button 
                                                    type="button"
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={addCustomTag}
                                                    disabled={!customTagInput.trim()}
                                                >
                                                    追加
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        {/* AIカテゴリ提案 */}
                                        {aiResponse.suggestedCategories && aiResponse.suggestedCategories.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium mb-3 text-blue-900">AIが提案するカテゴリ:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {aiResponse.suggestedCategories.map((category) => (
                                                        <Button
                                                            key={category.id}
                                                            variant={selectedCategoryId === category.id ? "default" : "outline"}
                                                            size="sm"
                                                            className={`transition-all ${
                                                                selectedCategoryId === category.id 
                                                                    ? 'bg-green-600 text-white' 
                                                                    : 'border-green-300 text-green-700 hover:bg-green-50'
                                                            }`}
                                                            onClick={() => setSelectedCategoryId(category.id)}
                                                        >
                                                            {selectedCategoryId === category.id && <Check className="w-3 h-3 mr-1" />}
                                                            {category.name}
                                                            <span className="ml-1 text-xs opacity-70">
                                                                ({Math.round(category.confidence * 100)}%)
                                                            </span>
                                                        </Button>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    現在選択中: <strong>{aiResponse.suggestedCategories.find(c => c.id === selectedCategoryId)?.name || categoryName}</strong>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* アクションボタン */}
                                    <div className="flex gap-2 pt-4">
                                        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    保存中...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    {aiResponse.suggestedCategories?.find(c => c.id === selectedCategoryId)?.name || categoryName}に追加
                                                </>
                                            )}
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            onClick={() => {
                                                setInput('')
                                                setAiResponse(null)
                                                setSelectedTags([])
                                                setSelectedCategoryId(categoryId)
                                                setCustomTagInput('')
                                                setImageError(false)
                                            }}
                                        >
                                            キャンセル
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
                
                <div ref={bottomRef} />
            </div>

            {/* 入力フォーム */}
            <div className="border-t p-4">
                <form 
                    onSubmit={handleSubmit}
                    className="flex gap-2"
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="URLまたはメモの内容を入力..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()}>
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    )
} 