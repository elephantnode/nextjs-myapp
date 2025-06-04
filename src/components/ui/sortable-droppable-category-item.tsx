"use client"

import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import React from 'react'
import { GripVertical, Pencil } from "lucide-react"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CategoryIconMap } from '@/components/nav/category-icons'
import { Hash } from 'lucide-react'

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

interface SortableDroppableCategoryItemProps {
    category: Category
    workspaceSlug: string
    isActive: boolean
    onEdit?: () => void
}

export function SortableDroppableCategoryItem({ 
    category, 
    workspaceSlug, 
    isActive,
    onEdit 
}: SortableDroppableCategoryItemProps) {
    // ソート機能
    const sortable = useSortable({ 
        id: category.id,
        data: {
            type: 'category',
        }
    })

    // ドロップ機能
    const droppable = useDroppable({
        id: category.id,
        data: {
            type: 'category',
            category: category,
        },
    })

    const IconComponent = CategoryIconMap[category.icon as keyof typeof CategoryIconMap] || Hash

    const style = {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
    }

    // ソート用のref設定
    const setNodeRef = (node: HTMLElement | null) => {
        sortable.setNodeRef(node)
        droppable.setNodeRef(node)
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center">
            {/* グリップ部分 */}
            <span
                {...sortable.attributes}
                {...sortable.listeners}
                className="cursor-grab select-none px-2 text-xl text-muted-foreground"
                style={{ userSelect: 'none' }}
                tabIndex={0}
                aria-label="ドラッグして並べ替え"
            >
                <GripVertical className="w-4 h-4" />
            </span>
            
            {/* カテゴリー本体（ドロップ対応） */}
            <div 
                className={`flex-1 transition-all ${
                    droppable.isOver 
                        ? 'bg-blue-50 border-2 border-blue-300 border-dashed rounded-lg' 
                        : ''
                }`}
            >
                <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start transition-all ${
                        droppable.isOver ? 'scale-105 shadow-md' : ''
                    }`}
                    asChild
                >
                    <Link href={`/workspace/${workspaceSlug}/${category.slug}`}>
                        <IconComponent className="mr-2 h-4 w-4" />
                        {category.name}
                        {droppable.isOver && (
                            <span className="ml-auto text-xs text-blue-600 font-medium">
                                ドロップ
                            </span>
                        )}
                    </Link>
                </Button>
            </div>
            
            {/* 右端のエディットアイコン */}
            {onEdit && (
                <button
                    type="button"
                    onClick={onEdit}
                    className="ml-2 p-1 rounded hover:bg-muted"
                    aria-label="編集"
                >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
            )}
        </div>
    )
} 