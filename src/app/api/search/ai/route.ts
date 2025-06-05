import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { generateQueryEmbedding } from '@/lib/embedding'
import type { 
    SearchResult, 
    SearchAnalysis, 
    SearchDebugInfo, 
    ItemWithTags, 
    TagWithItems 
} from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const { query, workspaceId } = await request.json()
        console.log('AI検索リクエスト:', { query, workspaceId })
        
        const supabase = await createClient()
        
        // ユーザー認証チェック
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
        }

        // AI分析でクエリを解析
        console.log('AIによる検索解析を開始...')
        const searchAnalysis = await analyzeSearchQuery(query, workspaceId, supabase)
        console.log('検索解析結果:', searchAnalysis)

        // ベクトル検索を並行実行
        const [vectorResults, keywordResults] = await Promise.all([
            performVectorSearch(supabase, workspaceId, query),
            performKeywordSearch(supabase, workspaceId, searchAnalysis)
        ])

        console.log('ベクトル検索結果数:', vectorResults.length)
        console.log('キーワード検索結果数:', keywordResults.length)

        // 結果を統合し、重複を排除
        const combinedResults = combineSearchResults(vectorResults, keywordResults)
        console.log('統合後の結果数:', combinedResults.length)

        // AI応答メッセージを生成
        const aiMessage = generateIntelligentResponse(query, combinedResults, searchAnalysis, {
            vectorCount: vectorResults.length,
            keywordCount: keywordResults.length,
            combinedCount: combinedResults.length
        })

        return NextResponse.json({
            success: true,
            results: combinedResults,
            analysis: searchAnalysis,
            message: aiMessage,
            debug: {
                vectorCount: vectorResults.length,
                keywordCount: keywordResults.length,
                combinedCount: combinedResults.length
            }
        })

    } catch (error) {
        console.error('AI検索エラー:', error)
        return NextResponse.json(
            { error: '検索処理中にエラーが発生しました' }, 
            { status: 500 }
        )
    }
}

// AI分析でクエリを解析
async function analyzeSearchQuery(query: string, workspaceId: string | undefined, supabase: SupabaseClient): Promise<SearchAnalysis> {
    try {
        console.log('=== AI分析開始 ===')
        
        // 既存のタグとカテゴリを取得してコンテキストとして使用
        let existingTags: string[] = []
        let existingCategories: string[] = []
        
        if (workspaceId) {
            const { data: tagsData } = await supabase
                .from('item_tags')
                .select(`
                    tags!inner(name),
                    items!inner(workspace_id)
                `)
                .eq('items.workspace_id', workspaceId)
            
            if (tagsData) {
                const tagCounts = new Map<string, number>()
                tagsData.forEach((relation: any) => {
                    const tagName = relation.tags.name
                    tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1)
                })
                existingTags = Array.from(tagCounts.keys())
            }

            const { data: categoriesData } = await supabase
                .from('categories')
                .select('name')
                .eq('workspace_id', workspaceId)
            
            if (categoriesData) {
                existingCategories = categoriesData.map(cat => cat.name)
            }
        }

        console.log('既存タグ:', existingTags.slice(0, 10))
        console.log('既存カテゴリ:', existingCategories)

        const analysisPrompt = `
あなたは検索クエリを分析する専門家です。以下のクエリを分析し、最適な検索戦略を提案してください。

クエリ: "${query}"

利用可能なタグ: ${existingTags.join(', ')}
利用可能なカテゴリ: ${existingCategories.join(', ')}

以下のJSON形式で分析結果を返してください：
{
    "intent": "検索の意図（情報収集、特定アイテム検索、関連情報探索など）",
    "searchTerms": ["主要な検索キーワードの配列"],
    "filters": {
        "contentTypes": ["検索対象のタイプ: bookmark, note"],
        "tags": ["関連するタグ名"],
        "categories": ["関連するカテゴリ名"],
        "dateRange": {
            "relativePeriod": "相対期間（recent, week, month, yearなど）"
        }
    },
    "suggestions": ["検索を改善するための提案"],
    "confidence": 0.85,
    "explanation": "分析の説明"
}
`

        const { object } = await generateObject({
            model: google('gemini-2.0-flash'),
            prompt: analysisPrompt,
            schema: z.object({
                intent: z.string(),
                searchTerms: z.array(z.string()),
                filters: z.object({
                    contentTypes: z.array(z.string()).optional(),
                    dateRange: z.object({
                        relativePeriod: z.string().optional(),
                        startDate: z.string().optional(),
                        endDate: z.string().optional()
                    }).optional(),
                    tags: z.array(z.string()).optional(),
                    categories: z.array(z.string()).optional(),
                    sentiment: z.string().optional(),
                    urgency: z.string().optional(),
                    scope: z.string().optional()
                }).optional(),
                suggestions: z.array(z.string()).optional(),
                confidence: z.number(),
                explanation: z.string()
            })
        })

        console.log('AI分析完了:', object)
        return object as SearchAnalysis

    } catch (error) {
        console.error('AI分析エラー:', error)
        return {
            intent: '基本的な検索',
            searchTerms: [query],
            filters: {},
            confidence: 0.5,
            explanation: 'AI分析に失敗したため、基本的な検索を実行します'
        }
    }
}

// ベクトル類似検索を実行
async function performVectorSearch(
    supabase: SupabaseClient,
    workspaceId: string | undefined,
    query: string,
    limit: number = 20
): Promise<SearchResult[]> {
    try {
        console.log('=== ベクトル検索開始 ===')
        console.log('クエリ:', query)

        if (!workspaceId) {
            console.log('ワークスペースIDが指定されていません')
            return []
        }

        // クエリのベクトル化
        const queryEmbedding = await generateQueryEmbedding(query)
        if (!queryEmbedding) {
            console.log('クエリのベクトル化に失敗しました')
            return []
        }

        console.log('ベクトル類似検索を実行中...')
        
        // ベクトル類似検索を実行
        const { data: vectorData, error: vectorError } = await supabase.rpc(
            'match_items', 
            {
                query_embedding: queryEmbedding,
                match_threshold: 0.1,
                match_count: limit,
                workspace_id_param: workspaceId
            }
        )

        if (vectorError) {
            console.error('ベクトル検索エラー:', vectorError)
            return []
        }

        console.log('ベクトル検索生データ:', vectorData?.slice(0, 3))

        if (!vectorData || vectorData.length === 0) {
            console.log('ベクトル検索結果が空です')
            return []
        }

        // タグ情報を追加
        const itemsWithTags = await addTagsToItems(supabase, vectorData)
        
        const results: SearchResult[] = itemsWithTags.map(item => ({
            ...item,
            similarity: typeof item.similarity === 'number' ? item.similarity : 0,
            searchType: 'vector' as const,
            tags: item.tags || []
        }))

        console.log('ベクトル検索結果:', results.length, '件')
        if (results.length > 0) {
            const similarities = results
                .map(item => item.similarity)
                .filter((sim): sim is number => typeof sim === 'number' && !isNaN(sim) && sim > 0)
            
            if (similarities.length > 0) {
                console.log('類似度統計:', {
                    min: Math.min(...similarities),
                    max: Math.max(...similarities),
                    avg: similarities.reduce((a, b) => a + b, 0) / similarities.length
                })
            }
        }

        return results

    } catch (error) {
        console.error('ベクトル検索でエラーが発生しました:', error)
        return []
    }
}

// キーワード検索を実行（既存のロジックをリネーム）
async function performKeywordSearch(
    supabase: SupabaseClient, 
    workspaceId: string | undefined, 
    analysis: SearchAnalysis
): Promise<SearchResult[]> {
    console.log('=== キーワード検索開始 ===')
    console.log('ワークスペースID:', workspaceId)
    console.log('検索分析:', analysis)

    if (!workspaceId) {
        console.log('ワークスペースIDが指定されていません')
        return []
    }

    try {
        let query = supabase
            .from('items')
            .select(`
                id, workspace_id, category_id, type, title, content, url,
                site_title, site_description, site_image_url, site_name,
                order, status, created_at, updated_at,
                categories (name, slug)
            `)
            .eq('workspace_id', workspaceId)
            .eq('status', 'active')

        // テキスト検索
        const searchTerms = analysis.searchTerms
        if (searchTerms && searchTerms.length > 0) {
            const searchText = searchTerms.join(' ')
            query = query.or(`title.ilike.%${searchText}%,content.ilike.%${searchText}%,site_title.ilike.%${searchText}%`)
        }

        // タイプフィルター
        if (analysis.filters?.contentTypes && analysis.filters.contentTypes.length > 0) {
            query = query.in('type', analysis.filters.contentTypes)
        }

        const { data: items, error } = await query.limit(50)

        if (error) {
            console.error('キーワード検索エラー:', error)
            return []
        }

        if (!items || items.length === 0) {
            console.log('キーワード検索結果が空です')
            return []
        }

        console.log('キーワード検索結果:', items.length, '件')

        // タグ情報を追加
        const itemsWithTags = await addTagsToItems(supabase, items)

        const results: SearchResult[] = itemsWithTags.map(item => ({
            ...item,
            searchType: 'keyword' as const,
            category_name: item.categories?.name,
            category_slug: item.categories?.slug,
            tags: item.tags || []
        }))

        return results

    } catch (error) {
        console.error('キーワード検索でエラーが発生しました:', error)
        return []
    }
}

// 検索結果を統合（重複排除）
function combineSearchResults(vectorResults: SearchResult[], keywordResults: SearchResult[]): SearchResult[] {
    console.log('=== 検索結果統合 ===')
    console.log('ベクトル検索結果:', vectorResults.length, '件')
    console.log('キーワード検索結果:', keywordResults.length, '件')

    const combinedMap = new Map<string, SearchResult>()

    // ベクトル検索結果を追加（優先度高）
    vectorResults.forEach(item => {
        combinedMap.set(item.id, item)
    })

    // キーワード検索結果を追加（重複しない場合のみ）
    keywordResults.forEach(item => {
        if (!combinedMap.has(item.id)) {
            combinedMap.set(item.id, item)
        }
    })

    const results = Array.from(combinedMap.values())
    console.log('統合後の結果:', results.length, '件')

    return results
}

// アイテムにタグ情報を追加
async function addTagsToItems(supabase: SupabaseClient, items: any[]): Promise<SearchResult[]> {
    if (items.length === 0) return []

    const itemIds = items.map((item: any) => item.id)
    
    const { data: allItemTags } = await supabase
        .from('item_tags')
        .select(`
            item_id,
            tags (id, name)
        `)
        .in('item_id', itemIds)
    
    return items.map((item: any) => ({
        ...item,
        tags: allItemTags
            ?.filter((itemTag: any) => itemTag.item_id === item.id)
            .map((itemTag: any) => ({
                id: itemTag.tags.id,
                name: itemTag.tags.name
            })) || []
    }))
}

// AIによるインテリジェントな応答生成
function generateIntelligentResponse(query: string, results: SearchResult[], analysis: SearchAnalysis, debug: SearchDebugInfo): string {
    const resultCount = results.length
    
    if (resultCount === 0) {
        return `「${query}」に関連するアイテムは見つかりませんでした。検索キーワードを変更するか、関連するタグを確認してみてください。`
    }

    const bookmarkCount = results.filter(item => item.type === 'bookmark').length
    const noteCount = results.filter(item => item.type === 'note').length
    
    let response = `「${query}」に関して、${resultCount}件のアイテムが見つかりました。`
    
    if (bookmarkCount > 0 && noteCount > 0) {
        response += `（ブックマーク${bookmarkCount}件、ノート${noteCount}件）`
    } else if (bookmarkCount > 0) {
        response += `（ブックマーク${bookmarkCount}件）`
    } else {
        response += `（ノート${noteCount}件）`
    }

    // 類似度情報があれば追加
    const vectorResults = results.filter(item => item.searchType === 'vector')
    if (vectorResults.length > 0) {
        const validSimilarities = vectorResults
            .map(item => item.similarity)
            .filter((sim): sim is number => typeof sim === 'number' && !isNaN(sim) && sim > 0)
        
        if (validSimilarities.length > 0) {
            const avgSimilarity = validSimilarities.reduce((a, b) => a + b, 0) / validSimilarities.length
            const maxSimilarity = Math.max(...validSimilarities)
            
            response += `\n\n最も関連性の高いアイテムの類似度: ${(maxSimilarity * 100).toFixed(1)}%`
            if (avgSimilarity > 0.7) {
                response += `\n高い関連性を持つアイテムが見つかりました。`
            }
        }
    }

    // AI分析結果があれば意図を追加
    if (analysis.confidence > 0.7) {
        response += `\n\n検索意図: ${analysis.intent}`
    }

    // 提案があれば追加
    if (analysis.suggestions && analysis.suggestions.length > 0) {
        response += `\n\n💡 検索のヒント: ${analysis.suggestions[0]}`
    }

    return response
} 