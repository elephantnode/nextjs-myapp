"use client"

import { MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatDrawer } from '@/components/chat-drawer'

interface FloatingChatButtonProps {
    workspaceId: string
    categoryName: string
    categoryId: string
}

export function FloatingChatButton({
    workspaceId,
    categoryName,
    categoryId
}: FloatingChatButtonProps) {
    return (
        <div className="fixed bottom-6 right-6 z-50">
            <ChatDrawer
                workspaceId={workspaceId}
                categoryName={categoryName}
                categoryId={categoryId}
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