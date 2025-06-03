"use client"

import { ReactNode } from 'react'
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import { useState } from 'react'

interface DraggedItem {
    title: string
    type: string
    [key: string]: unknown
}

interface DnDProviderProps {
    children: ReactNode
    onDragEnd: (event: DragEndEvent) => void
}

export function DnDProvider({ children, onDragEnd }: DnDProviderProps) {
    const [activeId, setActiveId] = useState<string | null>(null)
    const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
        setDraggedItem(event.active.data.current as DraggedItem || null)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null)
        setDraggedItem(null)
        onDragEnd(event)
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {children}
            <DragOverlay>
                {activeId && draggedItem ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg opacity-95 cursor-grabbing">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                            <span className="font-medium text-sm truncate max-w-xs">
                                {draggedItem.title}
                            </span>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
} 