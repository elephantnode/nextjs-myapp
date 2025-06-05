// データベーススキーマの型定義

export type Item = {
    id: string
    workspace_id: string
    category_id: string | null
    type: 'bookmark' | 'note'
    title: string
    content: string | null
    url: string | null
    site_title: string | null
    site_description: string | null
    site_image_url: string | null
    site_name: string | null
    order: number
    status: 'active' | 'trashed'
    created_at: string
    updated_at: string
    tags?: Tag[]
}

export type Category = {
    id: string
    workspace_id: string
    name: string
    slug: string
    icon: string
    order: number
    parent_id: string | null
    created_at: string
}

export type Tag = {
    id: string
    name: string
    count?: number
}

export type Workspace = {
    id: string
    name: string
    slug: string
    description?: string
    created_at: string
    updated_at: string
}

// データベースから取得する生のデータ型（リレーションなし）
export type DbItem = {
    id: string
    workspace_id: string
    category_id: string | null
    type: 'bookmark' | 'note'
    title: string
    content: string | null
    url: string | null
    site_title: string | null
    site_description: string | null
    site_image_url: string | null
    site_name: string | null
    order: number
    status: 'active' | 'trashed'
    created_at: string
    updated_at: string
}

export type DbTag = {
    id: string
    name: string
    workspace_id: string
    created_at: string
}

export type DbCategory = {
    id: string
    workspace_id: string
    name: string
    slug: string
    icon: string
    order: number
    parent_id: string | null
    created_at: string
}

// リレーションテーブルの型
export type ItemTag = {
    item_id: string
    tag_id: string
    created_at: string
}

// Supabaseクエリ結果の型
export type ItemWithTags = {
    id: string
    workspace_id: string
    category_id: string | null
    type: 'bookmark' | 'note'
    title: string
    content: string | null
    url: string | null
    site_title: string | null
    site_description: string | null
    site_image_url: string | null
    site_name: string | null
    order: number
    status: 'active' | 'trashed'
    created_at: string
    updated_at: string
    item_tags: {
        tags: {
            id: string
            name: string
        }
    }[]
}

export type TagWithItems = {
    id: string
    name: string
    workspace_id: string
    created_at: string
    item_tags: {
        item_id: string
        items: {
            workspace_id: string
        }
    }[]
}

// タグクエリ結果用の型
export type TagQueryResult = {
    tags: {
        name: string
    }
    items: {
        workspace_id: string
    }
}

// アイテムタグクエリ結果用の型
export type ItemTagQueryResult = {
    item_id: string
    tags: {
        id: string
        name: string
    }
}

// 基本的なアイテム型（タグなし）
export type BaseItem = {
    id: string
    workspace_id: string
    category_id: string | null
    type: 'bookmark' | 'note'
    title: string
    content: string | null
    url: string | null
    site_title: string | null
    site_description: string | null
    site_image_url: string | null
    site_name: string | null
    order: number
    status: 'active' | 'trashed'
    created_at: string
    updated_at: string
    similarity?: number
    categories?: {
        name: string
        slug: string
    }
}

// 検索結果用の型
export type SearchResult = Item & {
    similarity?: number
    distance?: number
    searchType?: 'vector' | 'keyword'
    category_name?: string
    category_slug?: string
    categories?: {
        name: string
        slug: string
    }
}

// AI検索分析結果の型
export type SearchAnalysis = {
    intent: string
    searchTerms: string[]
    filters: {
        contentTypes?: string[]
        dateRange?: {
            relativePeriod?: string
            startDate?: string
            endDate?: string
        }
        tags?: string[]
        categories?: string[]
        sentiment?: string
        urgency?: string
        scope?: string
    }
    suggestions?: string[]
    confidence: number
    explanation: string
}

// デバッグ情報の型
export type SearchDebugInfo = {
    vectorCount: number
    keywordCount: number
    combinedCount: number
}

// ニュース関連の型
export type NewsItem = {
    title: string
    description: string
    url: string
    publishedAt: string
    source: string
} 