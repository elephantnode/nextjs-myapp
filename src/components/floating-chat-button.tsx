"use client"

import { MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatDrawer } from '@/components/chat-drawer'
import { WorkspaceChatDrawer } from '@/components/workspace-chat-drawer'

interface FloatingChatButtonProps {
    workspaceId: string
    categoryName?: string
    categoryId?: string
    categorySlug?: string
    workspaceName?: string
    workspaceSlug?: string
    categories?: Array<{
        id: string
        name: string
        slug: string
        icon: string
    }>
}

export function FloatingChatButton({
    workspaceId,
    categoryName,
    categoryId,
    categorySlug,
    workspaceName,
    workspaceSlug,
    categories
}: FloatingChatButtonProps) {
    // カテゴリーが指定されている場合は通常のChatDrawer
    if (categoryName && categoryId && categorySlug && workspaceSlug) {
        return (
            <div className="fixed bottom-6 right-6 z-50">
                <ChatDrawer
                    workspaceId={workspaceId}
                    categoryName={categoryName}
                    categoryId={categoryId}
                    workspaceSlug={workspaceSlug}
                    categorySlug={categorySlug}
                >
                    <Button
                        size="lg"
                        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
                    >
                        <MessageSquarePlus className="h-6 w-6" />
                        <span className="sr-only">コンテンツを追加</span>
                    </Button>
                </ChatDrawer>
            </div>
        )
    }

    // ワークスペース直下の場合はカテゴリー選択付きドロワー
    return (
        <div className="fixed bottom-6 right-6 z-50">
            <WorkspaceChatDrawer
                workspaceId={workspaceId}
                workspaceName={workspaceName || 'ワークスペース'}
                workspaceSlug={workspaceSlug || ''}
                categories={categories || []}
            >
                <Button
                    size="lg"
                    className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
                >
                    <MessageSquarePlus className="h-6 w-6" />
                    <span className="sr-only">コンテンツを追加</span>
                </Button>
            </WorkspaceChatDrawer>
        </div>
    )
} 