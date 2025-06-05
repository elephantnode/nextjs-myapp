"use client"

import { useState, useEffect, useRef } from 'react'
import { 
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
    Search, 
    Send, 
    Bot, 
    User, 
    ExternalLink, 
    FileText, 
    Loader2,
    X,
    Globe,
    Clock
} from 'lucide-react'
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
    category_name?: string
    category_slug?: string
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

type Message = {
    id: string
    role: 'user' | 'assistant'
    content: string
    searchResults?: Item[]
    timestamp: Date
}

interface AISearchDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    workspaceId?: string
    workspaceName?: string
}

export function AISearchDrawer({ 
    open, 
    onOpenChange, 
    workspaceId,
    workspaceName 
}: AISearchDrawerProps) {
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    // const supabase = createClient()

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })
    }

    const handleSearch = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            // アイテム検索API呼び出し
            const response = await fetch('/api/search/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: userMessage.content,
                    workspaceId,
                }),
            })

            if (!response.ok) {
                throw new Error('検索に失敗しました')
            }

            const data = await response.json()

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message || '検索結果をお示しします。',
                searchResults: data.results || [],
                timestamp: new Date()
            }

            setMessages(prev => [...prev, assistantMessage])
        } catch (error) {
            console.error('Search error:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '申し訳ございません。検索中にエラーが発生しました。もう一度お試しください。',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSearch()
        }
    }

    const clearChat = () => {
        setMessages([])
        setInput('')
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="h-[80vh] max-h-[80vh]">
                <div className="mx-auto w-full max-w-4xl h-full flex flex-col">
                    <DrawerHeader className="flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <DrawerTitle className="flex items-center gap-2 text-left">
                                    <Search className="w-5 h-5" />
                                    AI検索アシスタント
                                </DrawerTitle>
                                {workspaceName && (
                                    <p className="text-sm text-muted-foreground text-left">
                                        ワークスペース「{workspaceName}」内のアイテムを検索
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {messages.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={clearChat}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        履歴をクリア
                                    </Button>
                                )}
                            </div>
                        </div>
                    </DrawerHeader>

                    {/* メッセージエリア */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <Bot className="w-12 h-12 mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">AIアシスタントに質問してください</h3>
                            <p className="text-sm max-w-md">
                                「React関連の記事を探して」「昨日追加したブックマークは？」「タグにデザインがついているものを見せて」など、自然な言葉で検索できます。
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {messages.map((message) => (
                                <div key={message.id} className="space-y-4">
                                    {/* メッセージバブル */}
                                    <div className={`flex items-start gap-3 ${
                                        message.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}>
                                        {message.role === 'assistant' && (
                                            <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                <Bot className="w-4 h-4 text-primary" />
                                            </div>
                                        )}
                                        
                                        <div className={`max-w-[80%] ${
                                            message.role === 'user' 
                                                ? 'bg-primary text-primary-foreground' 
                                                : 'bg-muted'
                                        } rounded-lg px-4 py-2`}>
                                            <p className="text-sm">{message.content}</p>
                                        </div>

                                        {message.role === 'user' && (
                                            <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                                                <User className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>

                                    {/* 検索結果 */}
                                    {message.searchResults && message.searchResults.length > 0 && (
                                        <div className="space-y-3 ml-11">
                                            <p className="text-sm text-muted-foreground">
                                                {message.searchResults.length}件の結果が見つかりました
                                            </p>
                                            
                                            <div className="grid gap-3">
                                                {message.searchResults.map((item) => (
                                                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start gap-3">
                                                                {/* アイコン */}
                                                                <div className="flex-shrink-0 mt-1">
                                                                    {item.type === 'bookmark' ? (
                                                                        <ExternalLink className="w-4 h-4 text-blue-600" />
                                                                    ) : (
                                                                        <FileText className="w-4 h-4 text-green-600" />
                                                                    )}
                                                                </div>

                                                                {/* コンテンツ */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <Link
                                                                            href={`/workspace/${workspaceName}/${item.category_slug}/${item.id}`}
                                                                            className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
                                                                        >
                                                                            {item.title}
                                                                        </Link>
                                                                        
                                                                        {item.type === 'bookmark' && item.url && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                asChild
                                                                                className="h-6 w-6 p-0"
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

                                                                    {/* 説明文 */}
                                                                    {(item.site_description || item.content) && (
                                                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                                                            {item.site_description || item.content}
                                                                        </p>
                                                                    )}

                                                                    {/* メタ情報 */}
                                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
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

                                                                        {item.category_name && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {item.category_name}
                                                                            </Badge>
                                                                        )}
                                                                    </div>

                                                                    {/* タグ */}
                                                                    {item.tags.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {item.tags.slice(0, 4).map((tag) => (
                                                                                <Badge
                                                                                    key={tag.id}
                                                                                    variant="secondary"
                                                                                    className="text-xs"
                                                                                >
                                                                                    {tag.name}
                                                                                </Badge>
                                                                            ))}
                                                                            {item.tags.length > 4 && (
                                                                                <Badge variant="outline" className="text-xs">
                                                                                    +{item.tags.length - 4}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {message.searchResults && message.searchResults.length === 0 && message.role === 'assistant' && (
                                        <div className="ml-11 p-4 bg-muted/50 rounded-lg text-center">
                                            <p className="text-sm text-muted-foreground">
                                                お探しの条件に一致するアイテムが見つかりませんでした。
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {isLoading && (
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="bg-muted rounded-lg px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-sm text-muted-foreground">検索中...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* 入力エリア */}
                <DrawerFooter className="border-t pt-4">
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="何をお探しですか？（例：React関連の記事、昨日追加したブックマーク）"
                            disabled={isLoading}
                            className="flex-1"
                        />
                        <Button 
                            onClick={handleSearch} 
                            disabled={!input.trim() || isLoading}
                            size="icon"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    )
} 