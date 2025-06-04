import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { generateQueryEmbedding } from '@/lib/embedding'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { query, workspaceId } = body

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: '検索クエリが必要です' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // 認証されたユーザーを取得
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: '認証が必要です' },
                { status: 401 }
            )
        }

        // ワークスペース内の既存タグとカテゴリを取得（AI分析用）
        let existingTags: string[] = []
        let categories: Array<{id: string, name: string, slug: string}> = []

        if (workspaceId) {
            // 既存のタグを取得
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

            // カテゴリを取得
            const { data: categoriesData } = await supabase
                .from('categories')
                .select('id, name, slug')
                .eq('workspace_id', workspaceId)

            categories = categoriesData || []
        }

        // AIを使って検索クエリを詳細に解析
        const searchAnalysis = await analyzeSearchQueryWithAI(query, existingTags, categories)

        // ベクトル検索とキーワード検索を並行実行
        const [vectorResults, keywordResults] = await Promise.all([
            performVectorSearch(supabase, workspaceId, query),
            performKeywordSearch(supabase, workspaceId, searchAnalysis)
        ])

        // 結果を統合（重複排除）
        const combinedResults = combineSearchResults(vectorResults, keywordResults)

        // AI応答メッセージを生成
        const aiMessage = generateIntelligentResponse(query, combinedResults, searchAnalysis, {
            vectorCount: vectorResults.length,
            keywordCount: keywordResults.length,
            combinedCount: combinedResults.length
        })

        return NextResponse.json({
            results: combinedResults,
            message: aiMessage,
            query: query,
            analysis: searchAnalysis,
            debug: {
                workspaceId: workspaceId,
                searchTerms: searchAnalysis.searchTerms,
                filters: searchAnalysis.filters,
                intent: searchAnalysis.intent,
                availableTagsCount: existingTags.length,
                availableCategoriesCount: categories.length,
                vectorResultsCount: vectorResults.length,
                keywordResultsCount: keywordResults.length,
                finalResultCount: combinedResults.length,
                vectorSearchThreshold: 0.7,
                averageSimilarity: combinedResults.length > 0 
                    ? (() => {
                        const validSimilarities = combinedResults
                            .map(item => item.similarity)
                            .filter(sim => typeof sim === 'number' && !isNaN(sim) && sim > 0)
                        
                        if (validSimilarities.length === 0) return 'N/A'
                        
                        const avg = validSimilarities.reduce((sum, sim) => sum + sim, 0) / validSimilarities.length
                        return avg.toFixed(3)
                    })()
                    : null
            }
        })

    } catch (error) {
        console.error('AI Search API error:', error)
        return NextResponse.json(
            { error: '内部サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

// AIを使用して検索クエリを解析
async function analyzeSearchQueryWithAI(
    query: string, 
    existingTags: string[], 
    categories: Array<{id: string, name: string, slug: string}>
) {
    try {
        const analysisSchema = z.object({
            intent: z.enum([
                'find_by_keyword',     // キーワード検索
                'find_by_tag',         // タグ検索
                'find_by_category',    // カテゴリ検索
                'find_by_date',        // 日付検索
                'find_by_type',        // タイプ検索
                'find_similar',        // 類似検索
                'explore_topics'       // トピック探索
            ]).describe('検索の主な意図'),
            
            searchTerms: z.array(z.string()).describe('検索に使用するキーワード（複数可）'),
            
            filters: z.object({
                dateRange: z.object({
                    startDate: z.string().optional().describe('検索開始日（ISO形式）'),
                    endDate: z.string().optional().describe('検索終了日（ISO形式）'),
                    relativePeriod: z.enum(['today', 'yesterday', 'this_week', 'this_month', 'last_week', 'last_month']).optional().describe('相対的な期間')
                }).optional(),
                
                contentTypes: z.array(z.enum(['bookmark', 'note'])).optional().describe('検索対象のコンテンツタイプ'),
                
                tags: z.array(z.string()).optional().describe('関連するタグ名'),
                
                categories: z.array(z.string()).optional().describe('関連するカテゴリ名'),
                
                sentiment: z.enum(['positive', 'negative', 'neutral']).optional().describe('感情的なトーン（該当する場合）'),
                
                urgency: z.enum(['high', 'medium', 'low']).optional().describe('検索の緊急度'),
                
                scope: z.enum(['exact', 'partial', 'related', 'broad']).default('partial').describe('検索の範囲')
            }),
            
            suggestions: z.array(z.string()).optional().describe('検索改善のための提案'),
            
            confidence: z.number().min(0).max(1).describe('解析結果の信頼度'),
            
            explanation: z.string().describe('解析結果の説明')
        })

        const result = await generateObject({
            model: google('gemini-2.0-flash'),
            schema: analysisSchema,
            prompt: `
あなたは優秀な検索アシスタントです。ユーザーの自然言語検索クエリを詳細に分析し、**実用的で寛容な**検索戦略を提案してください。

**最重要原則**: 結果が見つからないより、関連する可能性のあるアイテムを多く返すことを優先してください。

ユーザーの検索クエリ: "${query}"

利用可能なコンテキスト:
- 既存のタグ: ${existingTags.length > 0 ? existingTags.slice(0, 20).join(', ') : 'なし'}
- カテゴリ: ${categories.map(c => c.name).join(', ')}

**実用的な分析ガイドライン**:

1. **検索キーワードの抽出**:
   - メインキーワードを1-3個に絞る
   - 「ブックマーク」「記事」「ノート」などのメタ語は検索キーワードに含めない
   - 曖昧な表現は具体的なキーワードに変換
   - 例: "音楽のブックマーク" → ["音楽"] （「ブックマーク」は除外）

2. **フィルターの保守的な適用**:
   - contentTypes: 明確に指定された場合のみ適用
   - tags/categories: 既存のものと完全一致する場合のみ
   - dateRange: 具体的な日付表現がある場合のみ
   - **不確実な場合はフィルターを適用しない**

3. **検索範囲の決定**:
   - 常に 'related' または 'broad' を選択
   - 'exact' や 'partial' は避ける

4. **confidence の設定**:
   - 0.3-0.6 の範囲で設定（低めに）
   - 曖昧な検索ほど低く設定

5. **実用的な例**:
   - "音楽のブックマーク" → searchTerms: ["音楽"], contentTypes: なし, confidence: 0.4
   - "最近保存した記事" → searchTerms: ["記事"], dateRange: this_week, confidence: 0.5
   - "React関連" → searchTerms: ["React"], confidence: 0.6
   - "デザインの参考" → searchTerms: ["デザイン"], confidence: 0.4

**避けるべき行動**:
- 複数の厳格なフィルターの同時適用
- 存在しないカテゴリ名の指定
- メタ語（ブックマーク、記事など）の検索キーワード化
- 高いconfidence値の設定（0.7以上）

必ず日本語で簡潔な説明を提供してください。
            `,
            temperature: 0.3
        })

        return result.object
    } catch (error) {
        console.error('AI analysis error:', error)
        
        // フォールバック: 基本的な解析
        return {
            intent: 'find_by_keyword' as const,
            searchTerms: [query],
            filters: {},
            confidence: 0.3,
            explanation: 'AI解析でエラーが発生したため、基本的なキーワード検索にフォールバックしました。'
        }
    }
}

// ベクトル類似検索を実行
async function performVectorSearch(
    supabase: any,
    workspaceId: string | undefined,
    query: string,
    limit: number = 20
) {
    try {
        console.log('=== ベクトル検索開始 ===')
        console.log('検索クエリ:', query)

        // クエリをベクトル化
        const queryEmbedding = await generateQueryEmbedding(query)
        console.log('クエリベクトル生成完了:', queryEmbedding.length, '次元')

        // ベクトル類似度検索（PostgreSQLのvector拡張）
        const { data: items, error: searchError } = await supabase
            .rpc('match_items_by_embedding', {
                query_embedding: queryEmbedding,
                match_threshold: 0.7, // 類似度の閾値を70%に引き上げ（さらに厳格に）
                match_count: 10, // 結果数を制限
                target_workspace_id: workspaceId // パラメータ名をtarget_workspace_idに変更
            })

        if (searchError) {
            console.error('ベクトル検索エラー:', searchError)
            
            // RPCが存在しない場合やエラーの場合の代替クエリ
            console.log('フォールバック検索を実行中...')
            let fallbackQuery = supabase
                .from('items')
                .select(`
                    *,
                    categories!inner(name, slug)
                `)
                .eq('status', 'active')
                .not('embedding', 'is', null)

            if (workspaceId) {
                fallbackQuery = fallbackQuery.eq('workspace_id', workspaceId)
            }

            const { data: fallbackItems } = await fallbackQuery
                .order('created_at', { ascending: false })
                .limit(limit)
                
            console.log('フォールバック検索結果:', fallbackItems?.length || 0, '件')
            return await addTagsToItems(supabase, fallbackItems || [])
        }

        console.log('ベクトル検索結果:', items?.length || 0, '件')
        
        // 類似度スコアを含むデバッグ情報
        if (items && items.length > 0) {
            console.log('ベクトル検索結果の詳細:')
            items.forEach((item: any, index: number) => {
                console.log(`  ${index + 1}. ${item.title}`)
                console.log(`     - ID: ${item.id}`)
                console.log(`     - distance: ${item.distance} (type: ${typeof item.distance})`)
                console.log(`     - similarity: ${item.similarity} (type: ${typeof item.similarity})`)
                console.log(`     - 全てのキー:`, Object.keys(item))
            })
        }
        
        // RPCの結果にはカテゴリ情報が含まれていないので、再取得が必要
        if (items && items.length > 0) {
            const itemIds = items.map((item: any) => item.id)
            
            const { data: itemsWithCategories } = await supabase
                .from('items')
                .select(`
                    *,
                    categories!inner(name, slug)
                `)
                .in('id', itemIds)
            
            // 類似度情報を保持
            const itemsWithSimilarity = itemsWithCategories?.map((item: any) => {
                const vectorItem = items.find((vi: any) => vi.id === item.id)
                let similarity = 0
                
                if (vectorItem) {
                    // PostgreSQL関数から返される値に応じて適切に計算
                    if (typeof vectorItem.similarity === 'number') {
                        similarity = vectorItem.similarity // 直接類似度が返される場合（新しい関数）
                    } else if (typeof vectorItem.distance === 'number') {
                        similarity = 1 - vectorItem.distance // コサイン距離の場合（古い関数）
                    } else {
                        console.log(`警告: アイテム ${item.id} の距離/類似度情報が不正:`, vectorItem)
                    }
                }
                
                return {
                    ...item,
                    similarity: similarity,
                    vectorDistance: vectorItem?.distance,
                    vectorSimilarity: vectorItem?.similarity
                }
            }) || []
            
            return await addTagsToItems(supabase, itemsWithSimilarity)
        }
        
        return []

    } catch (error) {
        console.error('ベクトル検索でエラー:', error)
        return []
    }
}

// キーワード検索を実行（既存のロジックをリネーム）
async function performKeywordSearch(
    supabase: any, 
    workspaceId: string | undefined, 
    analysis: any
) {
    console.log('=== キーワード検索開始 ===')
    console.log('ワークスペースID:', workspaceId)
    console.log('検索意図:', analysis.intent)
    console.log('検索キーワード:', analysis.searchTerms)
    console.log('フィルター:', analysis.filters)

    // 基本クエリの構築
    let searchQuery = supabase
        .from('items')
        .select(`
            *,
            categories!inner(name, slug)
        `)
        .eq('status', 'active')

    // ワークスペース制限
    if (workspaceId) {
        searchQuery = searchQuery.eq('workspace_id', workspaceId)
        console.log('ワークスペース制限を適用:', workspaceId)
    } else {
        console.log('⚠️ ワークスペースIDが指定されていません')
    }

    // キーワード検索
    if (analysis.searchTerms && analysis.searchTerms.length > 0) {
        // OR条件で検索（任意のキーワードが含まれていればマッチ）
        const searchConditions: string[] = []
        analysis.searchTerms.forEach((term: string) => {
            searchConditions.push(
                `title.ilike.%${term}%`,
                `content.ilike.%${term}%`,
                `url.ilike.%${term}%`,
                `site_title.ilike.%${term}%`,
                `site_description.ilike.%${term}%`,
                `site_name.ilike.%${term}%`
            )
        })
        searchQuery = searchQuery.or(searchConditions.join(','))
        console.log('キーワード検索条件を適用（OR条件）:', analysis.searchTerms)
        console.log('生成された検索条件数:', searchConditions.length)
    } else {
        console.log('⚠️ 検索キーワードがありません - 全アイテムを取得')
        // キーワードがない場合は、他のフィルターのみで検索（全アイテムから絞り込み）
    }

    // タイプフィルター（曖昧な検索の場合は適用しない）
    if (analysis.filters?.contentTypes && analysis.filters.contentTypes.length > 0 && analysis.confidence > 0.7) {
        searchQuery = searchQuery.in('type', analysis.filters.contentTypes)
        console.log('タイプフィルターを適用:', analysis.filters.contentTypes)
    } else if (analysis.filters?.contentTypes) {
        console.log('タイプフィルターをスキップ（信頼度が低い）:', analysis.filters.contentTypes)
    }

    // 日付フィルター
    if (analysis.filters?.dateRange) {
        const dateRange = analysis.filters.dateRange
        
        if (dateRange.relativePeriod) {
            const dates = getRelativeDates(dateRange.relativePeriod)
            if (dates.startDate) {
                searchQuery = searchQuery.gte('created_at', dates.startDate)
                console.log('日付フィルター開始:', dates.startDate)
            }
            if (dates.endDate) {
                searchQuery = searchQuery.lte('created_at', dates.endDate)
                console.log('日付フィルター終了:', dates.endDate)
            }
        } else {
            if (dateRange.startDate) {
                searchQuery = searchQuery.gte('created_at', dateRange.startDate)
                console.log('カスタム日付フィルター開始:', dateRange.startDate)
            }
            if (dateRange.endDate) {
                searchQuery = searchQuery.lte('created_at', dateRange.endDate)
                console.log('カスタム日付フィルター終了:', dateRange.endDate)
            }
        }
    }

    // 基本検索結果取得
    const { data: items, error: searchError } = await searchQuery.limit(50)
    
    console.log('基本検索結果:', items?.length || 0, '件')
    if (searchError) {
        console.error('検索エラー:', searchError)
        return []
    }

    let filteredItems = items || []

    // 結果が少ない場合のフォールバック検索
    if (filteredItems.length < 5 && analysis.searchTerms && analysis.searchTerms.length > 0) {
        console.log('🔄 結果が少ないため、より広範囲な検索を実行中...')
        
        // より緩い条件で再検索
        let fallbackQuery = supabase
            .from('items')
            .select(`
                *,
                categories!inner(name, slug)
            `)
            .eq('status', 'active')

        if (workspaceId) {
            fallbackQuery = fallbackQuery.eq('workspace_id', workspaceId)
        }

        // 単一キーワードでの検索
        const mainKeyword = analysis.searchTerms[0]
        fallbackQuery = fallbackQuery.or(
            `title.ilike.%${mainKeyword}%,content.ilike.%${mainKeyword}%,site_title.ilike.%${mainKeyword}%,site_description.ilike.%${mainKeyword}%`
        )

        const { data: fallbackItems } = await fallbackQuery.limit(20)
        console.log('フォールバック検索結果:', fallbackItems?.length || 0, '件')
        
        if (fallbackItems && fallbackItems.length > filteredItems.length) {
            filteredItems = fallbackItems
            console.log('フォールバック検索結果を採用')
        }
    }

    // タグフィルター処理
    if (analysis.filters?.tags && analysis.filters.tags.length > 0 && filteredItems.length > 0 && analysis.confidence > 0.6) {
        console.log('タグフィルターを適用:', analysis.filters.tags)
        const itemIds = filteredItems.map((item: any) => item.id)
        
        const { data: itemTags } = await supabase
            .from('item_tags')
            .select(`
                item_id,
                tags!inner(id, name)
            `)
            .in('item_id', itemIds)
        
        console.log('取得したタグ関連データ:', itemTags?.length || 0, '件')
        
        const matchingItemIds = new Set<string>()
        
        if (itemTags) {
            itemTags.forEach((itemTag: any) => {
                const tagName = itemTag.tags.name.toLowerCase()
                if (analysis.filters.tags.some((filter: string) => 
                    tagName.includes(filter.toLowerCase()) || filter.toLowerCase().includes(tagName)
                )) {
                    matchingItemIds.add(itemTag.item_id)
                }
            })
        }
        
        console.log('タグフィルター後のマッチアイテム数:', matchingItemIds.size)
        filteredItems = filteredItems.filter((item: any) => matchingItemIds.has(item.id))
    } else if (analysis.filters?.tags && analysis.filters.tags.length > 0) {
        console.log('タグフィルターをスキップ（信頼度が低いか結果なし）:', analysis.filters.tags)
    }

    const itemsWithTags = await addTagsToItems(supabase, filteredItems)

    console.log('最終キーワード検索結果:', itemsWithTags.length, '件')
    console.log('========================')

    return itemsWithTags
}

// 検索結果を統合（重複排除）
function combineSearchResults(vectorResults: any[], keywordResults: any[]) {
    console.log('=== 検索結果統合 ===')
    console.log('ベクトル検索結果:', vectorResults.length, '件')
    console.log('キーワード検索結果:', keywordResults.length, '件')

    const seenIds = new Set<string>()
    const combinedResults = []

    // ベクトル検索結果の平均類似度を確認
    const vectorAvgSimilarity = vectorResults.length > 0 
        ? vectorResults.reduce((sum, item) => sum + (item.similarity || 0), 0) / vectorResults.length 
        : 0

    console.log('ベクトル検索結果の平均類似度:', vectorAvgSimilarity.toFixed(3))

    // 高い類似度（0.8以上）のベクトル検索結果を優先
    const highSimilarityResults = vectorResults.filter(item => item.similarity >= 0.8)
    
    if (highSimilarityResults.length > 0) {
        console.log('高類似度ベクトル検索結果を優先:', highSimilarityResults.length, '件')
        for (const item of highSimilarityResults) {
            if (!seenIds.has(item.id)) {
                seenIds.add(item.id)
                combinedResults.push({
                    ...item,
                    searchType: 'vector-high'
                })
            }
        }
    }

    // キーワード検索結果を追加（重複除去）
    for (const item of keywordResults) {
        if (!seenIds.has(item.id)) {
            seenIds.add(item.id)
            combinedResults.push({
                ...item,
                searchType: 'keyword'
            })
        }
    }

    // 残りのベクトル検索結果を追加（高類似度以外）
    const remainingVectorResults = vectorResults.filter(item => item.similarity < 0.8)
    for (const item of remainingVectorResults) {
        if (!seenIds.has(item.id)) {
            seenIds.add(item.id)
            combinedResults.push({
                ...item,
                searchType: 'vector'
            })
        }
    }

    console.log('統合後の結果:', combinedResults.length, '件')
    console.log('=================')

    return combinedResults.slice(0, 15) // 最大15件に制限
}

// アイテムにタグ情報を追加
async function addTagsToItems(supabase: any, items: any[]) {
    if (items.length === 0) return []

    const itemIds = items.map((item: any) => item.id)
    
    const { data: allItemTags } = await supabase
        .from('item_tags')
        .select(`
            item_id,
            tags!inner(id, name)
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

// 相対的な日付を具体的な日付に変換
function getRelativeDates(period: string) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (period) {
        case 'today':
            return {
                startDate: today.toISOString(),
                endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
            }
        case 'yesterday':
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
            return {
                startDate: yesterday.toISOString(),
                endDate: today.toISOString()
            }
        case 'this_week':
            const startOfWeek = new Date(today)
            startOfWeek.setDate(today.getDate() - today.getDay())
            return {
                startDate: startOfWeek.toISOString(),
                endDate: null
            }
        case 'this_month':
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
            return {
                startDate: startOfMonth.toISOString(),
                endDate: null
            }
        case 'last_week':
            const lastWeekEnd = new Date(today)
            lastWeekEnd.setDate(today.getDate() - today.getDay())
            const lastWeekStart = new Date(lastWeekEnd)
            lastWeekStart.setDate(lastWeekEnd.getDate() - 7)
            return {
                startDate: lastWeekStart.toISOString(),
                endDate: lastWeekEnd.toISOString()
            }
        case 'last_month':
            const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
            return {
                startDate: lastMonthStart.toISOString(),
                endDate: lastMonthEnd.toISOString()
            }
        default:
            return {}
    }
}

// AIによるインテリジェントな応答生成
function generateIntelligentResponse(query: string, results: any[], analysis: any, debug: any): string {
    const resultCount = results.length
    
    if (resultCount === 0) {
        let message = `${analysis.explanation}\n\n`
        message += `「${query}」に一致するアイテムは見つかりませんでした。`
        
        if (analysis.suggestions && analysis.suggestions.length > 0) {
            message += `\n\n💡 検索のヒント:\n${analysis.suggestions.map((s: string) => `• ${s}`).join('\n')}`
        }
        
        return message
    }
    
    let message = `${analysis.explanation}\n\n`
    message += `${resultCount}件のアイテムが見つかりました。`
    
    // 検索意図に応じたメッセージのカスタマイズ
    switch (analysis.intent) {
        case 'find_by_date':
            message += ` 指定された期間内のアイテムを表示しています。`
            break
        case 'find_by_tag':
            message += ` タグに基づいて関連するアイテムを表示しています。`
            break
        case 'find_by_category':
            message += ` 指定されたカテゴリ内のアイテムを表示しています。`
            break
        case 'find_similar':
            message += ` 類似するアイテムを表示しています。`
            break
        case 'explore_topics':
            message += ` 関連するトピックを幅広く表示しています。`
            break
    }
    
    // 適用されたフィルターの説明
    const filters = []
    if (analysis.filters?.contentTypes && analysis.filters.contentTypes.length > 0) {
        const typeNames = analysis.filters.contentTypes.map((type: string) => 
            type === 'bookmark' ? 'ブックマーク' : 'ノート'
        )
        filters.push(`タイプ: ${typeNames.join('、')}`)
    }
    
    if (analysis.filters?.tags && analysis.filters.tags.length > 0) {
        filters.push(`タグ: ${analysis.filters.tags.join('、')}`)
    }
    
    if (analysis.filters?.dateRange?.relativePeriod) {
        const periodMap: Record<string, string> = {
            'today': '今日',
            'yesterday': '昨日',
            'this_week': '今週',
            'this_month': '今月',
            'last_week': '先週',
            'last_month': '先月'
        }
        filters.push(`期間: ${periodMap[analysis.filters.dateRange.relativePeriod] || analysis.filters.dateRange.relativePeriod}`)
    }
    
    if (filters.length > 0) {
        message += `\n\n🔍 適用されたフィルター: ${filters.join('、')}`
    }
    
    // 結果の内訳
    const bookmarkCount = results.filter((item: any) => item.type === 'bookmark').length
    const noteCount = results.filter((item: any) => item.type === 'note').length
    
    if (bookmarkCount > 0 && noteCount > 0) {
        message += `\n\n📊 内訳: ブックマーク ${bookmarkCount}件、ノート ${noteCount}件`
    }
    
    // 信頼度が低い場合の注意
    if (analysis.confidence < 0.6) {
        message += `\n\n⚠️ 検索結果の精度が低い可能性があります。より具体的なキーワードで再検索してみてください。`
    }
    
    return message
} 