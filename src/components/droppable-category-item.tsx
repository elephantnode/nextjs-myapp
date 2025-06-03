"use client"

import { useDroppable } from '@dnd-kit/core'
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

interface DroppableCategoryItemProps {
    category: Category
    workspaceSlug: string
    isActive: boolean
}

export function DroppableCategoryItem({ 
    category, 
    workspaceSlug, 
    isActive 
}: DroppableCategoryItemProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: category.id,
        data: {
            type: 'category',
            category: category,
        },
    })

    const IconComponent = CategoryIconMap[category.icon as keyof typeof CategoryIconMap] || Hash

    return (
        <div 
            ref={setNodeRef}
            className={`transition-all ${
                isOver 
                    ? 'bg-blue-50 border-2 border-blue-300 border-dashed rounded-lg' 
                    : ''
            }`}
        >
            <Button
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start transition-all ${
                    isOver ? 'scale-105 shadow-md' : ''
                }`}
                asChild
            >
                <Link href={`/workspace/${workspaceSlug}/${category.slug}`}>
                    <IconComponent className="mr-2 h-4 w-4" />
                    {category.name}
                    {isOver && (
                        <span className="ml-auto text-xs text-blue-600 font-medium">
                            ドロップ
                        </span>
                    )}
                </Link>
            </Button>
        </div>
    )
} 