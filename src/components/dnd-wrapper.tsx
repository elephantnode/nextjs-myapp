"use client"

import { ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DragEndEvent } from '@dnd-kit/core'
import { DnDProvider } from '@/components/dnd-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    show: boolean
    type: 'success' | 'error'
    title: string
    description?: string
} | null

interface DnDWrapperProps {
    children: ReactNode
    allCategories: Category[]
}

export function DnDWrapper({ children, allCategories }: DnDWrapperProps) {
    const router = useRouter()
    const [notification, setNotification] = useState<NotificationState>(null)

    const showNotification = (type: 'success' | 'error', title: string, description?: string) => {
        setNotification({ show: true, type, title, description })
        
        // 5秒後に自動で非表示
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
                            {notification.description && (
                                <AlertDescription>
                                    {notification.description}
                                </AlertDescription>
                            )}
                        </Alert>
                    </div>
                )}
            </div>
        </DnDProvider>
    )
} 