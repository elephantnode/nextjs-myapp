"use client"

import { useState } from 'react'
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { WorkspaceChatInterface } from "@/components/workspace-chat-interface"

interface WorkspaceChatDrawerProps {
    workspaceId: string
    workspaceName: string
    workspaceSlug: string
    categories: Array<{
        id: string
        name: string
        slug: string
        icon: string
    }>
    children: React.ReactNode
}

export function WorkspaceChatDrawer({
    workspaceId,
    workspaceName,
    workspaceSlug,
    categories,
    children
}: WorkspaceChatDrawerProps) {
    const [open, setOpen] = useState(false)

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                {children}
            </DrawerTrigger>
            <DrawerContent className="h-[80vh] max-h-[80vh]">
                <div className="mx-auto w-full max-w-4xl h-full flex flex-col">
                    <DrawerHeader className="flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <DrawerTitle className="text-left">
                                    {workspaceName} - コンテンツ追加
                                </DrawerTitle>
                                <DrawerDescription className="text-left">
                                    URLを貼り付けるか、メモを入力してください。AIがカテゴリーとタグを提案します。
                                </DrawerDescription>
                            </div>
                            <DrawerClose asChild>
                                <Button variant="ghost" size="sm">
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">閉じる</span>
                                </Button>
                            </DrawerClose>
                        </div>
                    </DrawerHeader>
                    
                    <div className="px-4 pb-4 flex-1 overflow-hidden">
                                                <WorkspaceChatInterface
                            workspaceId={workspaceId}
                            workspaceSlug={workspaceSlug}
                            categories={categories}
                            onSave={() => setOpen(false)}
                        />
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    )
} 