"use client"

import { LayoutGrid, List, Grid3X3, Grid2X2 } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export type LayoutType = 'list-compact' | 'list-card' | 'grid-3' | 'grid-5'

interface LayoutSelectorProps {
    currentLayout: LayoutType
    onLayoutChange: (layout: LayoutType) => void
}

const layoutOptions = [
    {
        value: 'list-compact' as LayoutType,
        label: '一行リスト',
        icon: List,
        description: 'コンパクトな一行表示'
    },
    {
        value: 'list-card' as LayoutType,
        label: 'カードリスト',
        icon: LayoutGrid,
        description: '詳細カード表示'
    },
    {
        value: 'grid-3' as LayoutType,
        label: '3列タイル',
        icon: Grid3X3,
        description: '3列グリッド表示'
    },
    {
        value: 'grid-5' as LayoutType,
        label: '5列タイル',
        icon: Grid2X2,
        description: '5列グリッド表示'
    }
]

export function LayoutSelector({ currentLayout, onLayoutChange }: LayoutSelectorProps) {
    // const currentOption = layoutOptions.find(option => option.value === currentLayout)
    // const CurrentIcon = currentOption?.icon || List

    return (
        <Select value={currentLayout} onValueChange={onLayoutChange}>
            <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                    {/* <CurrentIcon className="w-4 h-4" /> */}
                    <SelectValue />
                </div>
            </SelectTrigger>
            <SelectContent>
                {layoutOptions.map((option) => {
                    const IconComponent = option.icon
                    return (
                        <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                                <IconComponent className="w-4 h-4" />
                                <div>
                                    <div className="font-medium">{option.label}</div>
                                    {/* <div className="text-xs text-muted-foreground">{option.description}</div> */}
                                </div>
                            </div>
                        </SelectItem>
                    )
                })}
            </SelectContent>
        </Select>
    )
} 