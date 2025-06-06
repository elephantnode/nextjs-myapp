import { google } from '@ai-sdk/google'
import { embed } from 'ai'

// Google の text-embedding-004 モデルを使用
const embeddingModel = google.textEmbeddingModel('text-embedding-004', {
    taskType: 'SEMANTIC_SIMILARITY'
})

/**
 * テキストをベクトル化する
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const { embedding } = await embed({
            model: embeddingModel,
            value: text
        })
        
        return embedding
    } catch (error) {
        console.error('Embedding generation error:', error)
        throw new Error('ベクトル生成に失敗しました')
    }
}

/**
 * アイテムのメタデータからベクトル化用のテキストを生成
 */
export function createEmbeddingText(item: {
    title?: string
    content?: string
    site_title?: string
    site_description?: string
    site_name?: string
    url?: string
    category_name?: string
    tags?: string[]
}): string {
    const parts = []
    
    // 基本情報
    if (item.title) parts.push(item.title)
    if (item.content) parts.push(item.content)
    if (item.site_title && item.site_title !== item.title) parts.push(item.site_title)
    if (item.site_description) parts.push(item.site_description)
    if (item.site_name) parts.push(item.site_name)
    
    // カテゴリー情報を追加
    if (item.category_name) {
        parts.push(`カテゴリー:${item.category_name}`)
    }
    
    // タグ情報を追加
    if (item.tags && item.tags.length > 0) {
        parts.push(`タグ:${item.tags.join(' ')}`)
    }
    
    // URLからドメイン名を抽出（例：github.com, youtube.com など）
    if (item.url) {
        try {
            const domain = new URL(item.url).hostname.replace('www.', '')
            parts.push(domain)
        } catch (error) {
            // URL解析に失敗した場合は無視
            console.error('URL解析に失敗しました:', error)
        }
    }
    
    return parts.join(' ').trim()
}

/**
 * クエリをベクトル化する（検索用）
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
    return generateEmbedding(query)
} 