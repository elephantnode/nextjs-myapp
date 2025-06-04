import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

type NewsItem = {
    title: string
    description: string
    url: string
    source: string
    publishDate?: string
    relevanceScore?: number
    keywords?: string[]
}

type NewsData = {
    categoryName: string
    keywords: string[]
    news: NewsItem[]
    generatedAt: string
    searchSummary: string
}

type CategoryData = {
    id: string
    name: string
    workspace_id: string
    slug: string
    icon: string
    order: number
    parent_id: string | null
    created_at: string
}

type ItemData = {
    id: string
    workspace_id: string
    category_id: string
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

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ categoryId: string }> }
) {
    try {
        const { categoryId } = await params
        const supabase = await createClient()

        // 認証チェック
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // カテゴリー情報を取得
        const { data: category, error: categoryError } = await supabase
            .from('categories')
            .select('*')
            .eq('id', categoryId)
            .single()

        if (categoryError || !category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }

        // カテゴリー内のアイテムを取得
        const { data: items, error: itemsError } = await supabase
            .from('items')
            .select('*')
            .eq('category_id', categoryId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(20) // 最新20件まで

        if (itemsError) {
            return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
        }

        // AIを使ってニュース収集と分析（既存のGemini設定と同じモデルを使用）
        const newsData = await analyzeAndSearchNewsWithAI(category, items || [])

        return NextResponse.json(newsData)
    } catch (error) {
        console.error('Error in news API:', error)
        return NextResponse.json(
            { error: 'Internal server error' }, 
            { status: 500 }
        )
    }
}

async function analyzeAndSearchNewsWithAI(category: CategoryData, items: ItemData[]): Promise<NewsData> {
    try {
        // アイテムの内容をまとめて分析用テキストを作成
        const itemsContent = items.map((item) => {
            const parts = [
                item.title || '',
                item.site_title || '',
                item.site_description || '',
                item.content || ''
            ].filter(Boolean)
            return parts.join(' ')
        }).join('\n')

        // AIプロンプトの生成
        const prompt = `
あなたは優秀なニュース分析アシストです。以下のカテゴリーとその中に保存されているブックマークやメモの内容を分析して、関連する最新ニュースを検索してください。

カテゴリー「${category.name}」の詳細分析：

アイテム数: ${items.length}個
コンテンツ情報:
${itemsContent.slice(0, 2000)}

上記の内容から重要なキーワードやトピックを抽出し、それらに関連する最新ニュース（過去1週間以内）を検索してください。

重要な指示：
- 実際にアクセス可能な公開URLのみを使用してください
- Google検索結果のリダイレクトURLは使用しないでください
- 実際のニュースサイトの直接URLを提供してください
- URLが不明な場合は、"#search:" で始まる検索キーワードを提供してください

以下のJSON形式で回答してください：

{
  "keywords": ["抽出されたキーワード1", "キーワード2", "キーワード3"],
  "searchSummary": "分析の概要と検索したトピック",
  "news": [
    {
      "title": "実際のニュースタイトル",
      "description": "ニュースの内容説明",
      "url": "https://実際のニュースサイト.com/記事URL または #search:検索キーワード",
      "source": "ニュースサイト名",
      "publishDate": "2024-01-15",
      "relevanceScore": 0.9,
      "keywords": ["関連キーワード"]
    }
  ]
}

カテゴリー名だけでなく、保存されているアイテムの内容も考慮して、関連する最新ニュースを3-5件程度見つけて返してください。
URLは必ず実際にアクセス可能なものにするか、検索用のキーワードを提供してください。
`

        // Geminiを使用してニュース分析
        const result = await generateText({
            model: google('gemini-2.0-flash', {
                useSearchGrounding: true,
            }),
            prompt: prompt,
            temperature: 0.1,
        })

        // レスポンスからJSONを抽出
        let jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/)
        let jsonString = jsonMatch ? jsonMatch[1] : result.text

        if (!jsonMatch) {
            jsonMatch = result.text.match(/\{[\s\S]*\}/)
            jsonString = jsonMatch ? jsonMatch[0] : result.text
        }

        jsonString = jsonString.trim()

        if (!jsonMatch) {
            throw new Error('AIからの有効なJSONレスポンスが取得できませんでした')
        }

        const aiResponse = JSON.parse(jsonString) as {
            keywords?: string[]
            searchSummary?: string
            news?: Array<{
                title: string
                description: string
                url: string
                source: string
                publishDate?: string
                relevanceScore?: number
                keywords?: string[]
            }>
        }

        // AIの応答が有効なニュースを含んでいる場合はそれを使用
        if (aiResponse.news && aiResponse.news.length > 0) {
            // URLを処理してアクセス可能にする
            const processedNews = aiResponse.news.map((item) => {
                let processedUrl = item.url
                
                // 無効なURLパターンをチェック
                const invalidUrlPatterns = [
                    'vertexaisearch.cloud.google.com',
                    'grounding-api-redirect',
                    'example.com'
                ]
                
                if (invalidUrlPatterns.some(pattern => item.url.includes(pattern))) {
                    processedUrl = `#search:${item.title}`
                }
                
                return {
                    ...item,
                    url: processedUrl,
                    relevanceScore: item.relevanceScore || 0.5
                }
            })
            
            return {
                categoryName: category.name,
                keywords: aiResponse.keywords || [category.name],
                news: processedNews,
                searchSummary: aiResponse.searchSummary || 'AIが関連ニュースを分析しました',
                generatedAt: new Date().toISOString()
            }
        }

        // フォールバック: ニュースが取得できない場合
        return {
            categoryName: category.name,
            keywords: [category.name],
            news: [{
                title: `${category.name}に関する情報収集中`,
                description: `現在${category.name}に関連する最新ニュースを分析中です。しばらくお待ちください。`,
                url: '#',
                source: 'システム',
                publishDate: new Date().toISOString(),
                keywords: [category.name],
                relevanceScore: 0.5
            }],
            searchSummary: 'ニュース分析を準備中です',
            generatedAt: new Date().toISOString()
        }

    } catch (error) {
        console.error('Error in AI analysis:', error)
        
        // エラー時のフォールバック
        return {
            categoryName: category.name,
            keywords: [category.name],
            news: [{
                title: `${category.name}に関する情報収集中`,
                description: `現在${category.name}に関連する最新ニュースを分析中です。しばらくお待ちください。`,
                url: '#',
                source: 'システム',
                publishDate: new Date().toISOString(),
                keywords: [category.name],
                relevanceScore: 0.5
            }],
            searchSummary: 'ニュース分析を準備中です',
            generatedAt: new Date().toISOString()
        }
    }
} 