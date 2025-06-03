"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Loader2 } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

interface DeleteItemButtonProps {
    itemId: string
    itemTitle: string
}

export function DeleteItemButton({ itemId, itemTitle }: DeleteItemButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            // ソフトデリート（statusをtrashedに変更）
            const { error } = await supabase
                .from('items')
                .update({
                    status: 'trashed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', itemId)

            if (error) throw error

            alert('アイテムを削除しました')
            router.refresh()

        } catch (error) {
            console.error('Delete error:', error)
            alert('削除中にエラーが発生しました')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem 
                    className="cursor-pointer text-red-600"
                    onSelect={(e) => e.preventDefault()}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                        この操作は取り消すことができません。アイテム「{itemTitle}」が削除されます。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                削除中...
                            </>
                        ) : (
                            '削除する'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
} 