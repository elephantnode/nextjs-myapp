"use client"

import { useState } from 'react'

interface ItemImageProps {
    src: string
    alt: string
    className?: string
}

export function ItemImage({ src, alt, className }: ItemImageProps) {
    const [imageError, setImageError] = useState(false)

    const handleImageError = () => {
        setImageError(true)
    }

    if (imageError) {
        return null
    }

    return (
        <img 
            src={src} 
            alt={alt}
            className={className}
            onError={handleImageError}
        />
    )
} 