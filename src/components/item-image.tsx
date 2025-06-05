"use client"

import { useState } from 'react'
import { FileText } from 'lucide-react'

interface ItemImageProps {
    item: {
        type: 'bookmark' | 'note'
        site_image_url?: string | null
        title: string
    }
    className?: string
}

export function ItemImage({ item, className = '' }: ItemImageProps) {
    const [imageError, setImageError] = useState(false)

    const handleImageError = () => {
        setImageError(true)
    }

    if (item.type === 'bookmark' && item.site_image_url && !imageError) {
        return (
            <img
                src={item.site_image_url}
                alt={item.title}
                className={`object-cover ${className}`}
                onError={handleImageError}
            />
        )
    }

    // フォールバック画像
    return (
        <div className={`bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}>
            <FileText className="w-8 h-8 text-gray-400" />
        </div>
    )
} 