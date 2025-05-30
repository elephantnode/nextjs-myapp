// src/components/ui/sortableWorkspaceItem.tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import React from 'react'
import { GripVertical, Pencil } from "lucide-react"

type Props = {
    id: string
    children: React.ReactNode
    onEdit?: () => void
}

export function SortableWorkspaceItem({ id, children, onEdit }: Props) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }
    return (
        <div ref={setNodeRef} style={style} className="flex items-center">
            {/* グリップ部分 */}
            <span
                {...attributes}
                {...listeners}
                className="cursor-grab select-none px-2 text-xl text-muted-foreground"
                style={{ userSelect: 'none' }}
                tabIndex={0}
                aria-label="ドラッグして並べ替え"
            >
                <GripVertical className="w-4 h-4" />
            </span>
            {/* 子要素（リスト本体） */}
            <div className="flex-1">{children}</div>
            {/* 右端のエディットアイコン */}
            <button
                type="button"
                onClick={onEdit}
                className="ml-2 p-1 rounded hover:bg-muted"
                aria-label="編集"
            >
                <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
        </div>
    )
}