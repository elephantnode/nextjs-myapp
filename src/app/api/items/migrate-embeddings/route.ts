import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, createEmbeddingText } from '@/lib/embedding'

export async function POST(request: NextRequest) {
    try {
        const { batchSize = 10 } = await request.json()

        const supabase = await createClient()

        // 認証されたユーザーを取得
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: '認証が必要です' },
                { status: 401 }
            )
        }

        // embeddingがnullのアイテムを取得（カテゴリー・タグ情報含む）
        const { data: items, error: fetchError } = await supabase
            .from('items')
            .select(`
                id, title, content, site_title, site_description, site_name, url,
                categories!inner(name),
                item_tags(tags!inner(name))
            `)
            .is('embedding', null)
            .eq('status', 'active')
            .limit(batchSize)

        if (fetchError) {
            console.error('アイテム取得エラー:', fetchError)
            return NextResponse.json(
                { error: 'アイテムの取得に失敗しました' },
                { status: 500 }
            )
        }

        if (!items || items.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'すべてのアイテムに埋め込みが設定済みです',
                processed: 0,
                remaining: 0
            })
        }

        console.log(`${items.length}件のアイテムの埋め込みを生成中...`)

        let successCount = 0
        let errorCount = 0

        // 各アイテムの埋め込みを生成
        for (const item of items) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const categoryName = (item as any)?.categories?.name
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const tags = (item as any)?.item_tags?.map((it: any) => it.tags.name) || []

                const embeddingText = createEmbeddingText({
                    title: item.title,
                    content: item.content,
                    site_title: item.site_title,
                    site_description: item.site_description,
                    site_name: item.site_name,
                    url: item.url,
                    category_name: categoryName,
                    tags
                })

                if (!embeddingText) {
                    console.log(`アイテム ${item.id}: 埋め込み用テキストが空のためスキップ`)
                    continue
                }

                const embedding = await generateEmbedding(embeddingText)

                // 埋め込みを保存
                const { error: updateError } = await supabase
                    .from('items')
                    .update({ 
                        embedding,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', item.id)

                if (updateError) {
                    console.error(`アイテム ${item.id} の更新エラー:`, updateError)
                    errorCount++
                } else {
                    console.log(`アイテム ${item.id}: 埋め込み生成完了 (${embedding.length}次元)`)
                    successCount++
                }

                // レート制限を避けるため少し待機
                await new Promise(resolve => setTimeout(resolve, 100))

            } catch (error) {
                console.error(`アイテム ${item.id} の埋め込み生成エラー:`, error)
                errorCount++
            }
        }

        // 残りのアイテム数を確認
        const { count: remainingCount } = await supabase
            .from('items')
            .select('id', { count: 'exact', head: true })
            .is('embedding', null)
            .eq('status', 'active')

        return NextResponse.json({
            success: true,
            processed: successCount,
            errors: errorCount,
            remaining: remainingCount || 0,
            message: `${successCount}件の埋め込みを生成しました（エラー: ${errorCount}件）`
        })

    } catch (error) {
        console.error('マイグレーションエラー:', error)
        return NextResponse.json(
            { error: '埋め込みマイグレーションに失敗しました' },
            { status: 500 }
        )
    }
} 