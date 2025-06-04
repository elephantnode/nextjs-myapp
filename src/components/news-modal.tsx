"use client"

import { useState, useEffect, useCallback } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ExternalLink, Calendar, Globe, Sparkles, X } from "lucide-react"

type NewsItem = {
    title: string
    description: string
    url: string
    source: string
    publishDate?: string
    relevanceScore?: number
    keywords?: string[]
}

type NewsData = {
    categoryName: string
    keywords: string[]
    news: NewsItem[]
    generatedAt: string
    searchSummary: string
}

interface NewsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    categoryId: string
    categoryName: string
}

export function NewsModal({ open, onOpenChange, categoryId, categoryName }: NewsModalProps) {
    const [newsData, setNewsData] = useState<NewsData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchRelatedNews = useCallback(async () => {
        setLoading(true)
        setError(null)
        setNewsData(null)

        try {
            const response = await fetch(`/api/categories/${categoryId}/news`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`ニュースの取得に失敗しました (${response.status})`)
            }

            const data: NewsData = await response.json()
            setNewsData(data)
        } catch (err) {
            console.error('Error fetching news:', err)
            setError(err instanceof Error ? err.message : 'エラーが発生しました')
        } finally {
            setLoading(false)
        }
    }, [categoryId, categoryName])

    // モーダルが開かれたときに自動的にニュースを取得
    useEffect(() => {
        if (open && !newsData && !loading) {
            fetchRelatedNews()
        }
    }, [open, newsData, loading, fetchRelatedNews])

    const handleOpenChange = (newOpen: boolean) => {
        try {
            if (newOpen && !newsData && !loading) {
                fetchRelatedNews().catch((err) => {
                    console.error('fetchRelatedNews failed:', err)
                    setError('ニュースの取得中にエラーが発生しました')
                    setLoading(false)
                })
            }
            
            onOpenChange(newOpen)
        } catch (err) {
            console.error('Error in handleOpenChange:', err)
            onOpenChange(newOpen)
        }
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return ''
        try {
            return new Date(dateString).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        } catch {
            return dateString
        }
    }

    // URLを処理する関数を追加
    const processUrl = (url: string, title: string) => {
        // 検索キーワードの場合
        if (url.startsWith('#search:')) {
            const searchKeyword = url.replace('#search:', '')
            return `https://www.google.com/search?q=${encodeURIComponent(searchKeyword + ' ニュース')}`
        }
        
        // 無効なURLパターンをチェック
        const invalidUrlPatterns = [
            'vertexaisearch.cloud.google.com',
            'grounding-api-redirect',
            '#',
            'example.com'
        ]
        
        if (invalidUrlPatterns.some(pattern => url.includes(pattern)) || url === '#') {
            // タイトルを使って検索URLを生成
            return `https://www.google.com/search?q=${encodeURIComponent(title + ' ニュース')}`
        }
        
        return url
    }

    return (
        <Dialog 
            open={open} 
            onOpenChange={(newOpen) => {
                handleOpenChange(newOpen)
            }}
        >
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-500" />
                        {categoryName} の関連ニュース
                    </DialogTitle>
                    <DialogDescription>
                        AIがカテゴリー内のコンテンツを分析して、関連する最新ニュースを収集しました
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 pr-4 overflow-y-auto max-h-[60vh]">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                <p className="text-muted-foreground">
                                    AIがカテゴリーの内容を分析中...
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    関連ニュースを検索しています
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <p className="text-red-500 mb-4">{error}</p>
                                <Button onClick={fetchRelatedNews} variant="outline">
                                    再試行
                                </Button>
                            </div>
                        </div>
                    )}

                    {newsData && (
                        <div className="space-y-6">
                            {/* AI分析概要 */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-blue-900">
                                    <Sparkles className="w-4 h-4" />
                                    AI分析結果
                                </h3>
                                <p className="text-sm text-blue-800 leading-relaxed">
                                    {newsData.searchSummary}
                                </p>
                            </div>

                            {/* キーワード表示 */}
                            <div>
                                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Globe className="w-4 h-4" />
                                    検索キーワード
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {newsData.keywords.map((keyword, index) => (
                                        <Badge key={index} variant="secondary">
                                            {keyword}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* ニュース一覧 */}
                            <div>
                                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    関連ニュース ({newsData.news.length}件)
                                </h3>
                                
                                {newsData.news.length === 0 ? (
                                    <Card>
                                        <CardContent className="py-8 text-center">
                                            <p className="text-muted-foreground">
                                                関連するニュースが見つかりませんでした
                                            </p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-4">
                                        {newsData.news.map((item, index) => (
                                            <Card key={index} className="hover:shadow-md transition-shadow">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <CardTitle className="text-base leading-tight">
                                                            {item.title}
                                                        </CardTitle>
                                                        {item.relevanceScore && (
                                                            <Badge 
                                                                variant={item.relevanceScore > 0.8 ? "default" : "secondary"}
                                                                className="shrink-0"
                                                            >
                                                                関連度 {Math.round(item.relevanceScore * 100)}%
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Globe className="w-3 h-3" />
                                                            {item.source}
                                                        </span>
                                                        {item.publishDate && (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                {formatDate(item.publishDate)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-0">
                                                    <CardDescription className="mb-4 leading-relaxed">
                                                        {item.description}
                                                    </CardDescription>
                                                    
                                                    {item.keywords && item.keywords.length > 0 && (
                                                        <div className="mb-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {item.keywords.slice(0, 5).map((keyword, kIndex) => (
                                                                    <Badge key={kIndex} variant="outline" className="text-xs">
                                                                        {keyword}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        asChild
                                                        className="w-full"
                                                    >
                                                        <a 
                                                            href={processUrl(item.url, item.title)} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-center gap-2"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                            {(() => {
                                                                const processedUrl = processUrl(item.url, item.title)
                                                                if (item.url.startsWith('#search:') || processedUrl.includes('google.com/search')) {
                                                                    return '関連記事を検索'
                                                                }
                                                                return '記事を読む'
                                                            })()}
                                                        </a>
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* フッター情報 */}
                            <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                                生成日時: {new Date(newsData.generatedAt).toLocaleString('ja-JP')}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    {newsData && (
                        <Button onClick={fetchRelatedNews} variant="outline" size="sm">
                            <Sparkles className="w-4 h-4 mr-2" />
                            再検索
                        </Button>
                    )}
                    <Button onClick={() => onOpenChange(false)} variant="outline" size="sm">
                        閉じる
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
} 