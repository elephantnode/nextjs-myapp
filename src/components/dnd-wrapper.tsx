"use client"

import { ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { DnDProvider } from '@/components/dnd-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type Category = {
    id: string
    workspace_id: string
    name: string
    slug: string
    icon: string
    order: number
    parent_id: string | null
    created_at: string
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
    tags: { id: string; name: string }[]
}

type NotificationState = {
    type: 'success' | 'error'
    title: string
    message: string
    timeout?: number
} | null

interface DnDWrapperProps {
    children: ReactNode
    allCategories: Category[]
    onCategoryReorder?: (categories: Category[]) => void
}

export function DnDWrapper({ children, allCategories, onCategoryReorder }: DnDWrapperProps) {
    const router = useRouter()
    const [notification, setNotification] = useState<NotificationState | null>(null)
    const [isMounted, setIsMounted] = useState(false)
    const supabase = createClient()

    // ハイドレーションエラーを防ぐため、クライアントサイドでのみDnDを有効化
    useEffect(() => {
        setIsMounted(true)
    }, [])

    const showNotification = (type: 'success' | 'error', title: string, message?: string) => {
        setNotification({
            type,
            title,
            message: message || '',
        })

        // 5秒後に自動で通知を非表示にする
        setTimeout(() => {
            setNotification(null)
        }, 5000)
    }

    const hideNotification = () => {
        setNotification(null)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (!over) return

        // カテゴリーの並び替えの場合
        if (
            active.data.current?.type === 'category' && 
            over.data.current?.type === 'category' &&
            active.id !== over.id
        ) {
            const categoryIds = allCategories.map(c => c.id)
            const oldIndex = categoryIds.indexOf(active.id as string)
            const newIndex = categoryIds.indexOf(over.id as string)
            
            if (oldIndex !== -1 && newIndex !== -1) {
                const newCategoryIds = arrayMove(categoryIds, oldIndex, newIndex)
                const newCategories = arrayMove(allCategories, oldIndex, newIndex)
                
                try {
                    // 並び順をSupabaseに保存
                    for (let i = 0; i < newCategoryIds.length; i++) {
                        await supabase.from('categories').update({ order: i }).eq('id', newCategoryIds[i])
                    }
                    
                    // 親コンポーネントに通知（オプション）
                    if (onCategoryReorder) {
                        onCategoryReorder(newCategories)
                    }
                    
                    // ページをリフレッシュして最新データを取得
                    router.refresh()
                } catch (error) {
                    console.error('Error reordering categories:', error)
                    showNotification(
                        'error',
                        'カテゴリーの並び替えに失敗しました',
                        'ネットワークエラーが発生しました。もう一度お試しください。'
                    )
                }
            }
            return
        }

        // アイテムがカテゴリーにドロップされた場合
        if (
            active.data.current?.type === 'item' && 
            over.data.current?.type === 'category'
        ) {
            const itemId = active.id as string
            const targetCategoryId = over.id as string
            const sourceItem = active.data.current.item as Item

            // 同じカテゴリーへの移動は無視
            if (sourceItem.category_id === targetCategoryId) {
                return
            }

            try {
                const response = await fetch(`/api/items/${itemId}/move`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        categoryId: targetCategoryId,
                    }),
                })

                if (!response.ok) {
                    throw new Error('Failed to move item')
                }

                const targetCategory = allCategories.find(c => c.id === targetCategoryId)
                
                // 成功通知
                if (targetCategory) {
                    showNotification(
                        'success',
                        'アイテムを移動しました',
                        `「${sourceItem.title}」を「${targetCategory.name}」に移動しました`
                    )
                }
                
                // ページをリフレッシュして最新データを取得
                router.refresh()
            } catch (error) {
                console.error('Error moving item:', error)
                showNotification(
                    'error',
                    'アイテムの移動に失敗しました',
                    'ネットワークエラーが発生しました。もう一度お試しください。'
                )
            }
        }
    }

    // ハイドレーション前は通常のコンテンツのみ表示
    if (!isMounted) {
        return <>{children}</>
    }

    return (
        <DnDProvider onDragEnd={handleDragEnd}>
            <div className="relative">
                {children}
                
                {/* 通知アラート */}
                {notification && (
                    <div className="fixed top-4 right-4 z-50 w-96">
                        <Alert 
                            variant={notification.type === 'error' ? 'destructive' : 'default'}
                            className="shadow-lg border-2"
                        >
                            {notification.type === 'success' ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <AlertCircle className="h-4 w-4" />
                            )}
                            <AlertTitle className="flex items-center justify-between">
                                {notification.title}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-transparent"
                                    onClick={hideNotification}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </AlertTitle>
                            {notification.message && (
                                <AlertDescription>
                                    {notification.message}
                                </AlertDescription>
                            )}
                        </Alert>
                    </div>
                )}
            </div>
        </DnDProvider>
    )
} 