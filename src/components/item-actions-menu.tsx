"use client"

import { useRouter } from 'next/navigation'
import { Edit, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteItemButton } from '@/components/delete-item-button'

interface ItemActionsMenuProps {
    itemId: string
    itemTitle: string
    workspaceName: string
    categorySlug: string
}

export function ItemActionsMenu({ 
    itemId, 
    itemTitle, 
    workspaceName, 
    categorySlug 
}: ItemActionsMenuProps) {
    const router = useRouter()

    const handleEdit = () => {
        router.push(`/workspace/${workspaceName}/${categorySlug}/${itemId}`)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">アクションメニュー</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={handleEdit}
                >
                    <Edit className="mr-2 h-4 w-4" />
                    編集
                </DropdownMenuItem>
                <DeleteItemButton itemId={itemId} itemTitle={itemTitle} />
            </DropdownMenuContent>
        </DropdownMenu>
    )
} 