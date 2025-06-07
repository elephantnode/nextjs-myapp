import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, createEmbeddingText } from '@/lib/embedding'

// アイテム作成
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            workspace_id,
            category_id,
            type,
            title,
            content,
            url,
            site_title,
            site_description,
            site_image_url,
            site_name,
            order
        } = body

        const supabase = await createClient()

        // 認証されたユーザーを取得
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: '認証が必要です' },
                { status: 401 }
            )
        }

        // カテゴリー名を取得
        let categoryName = null
        if (category_id) {
            const { data: categoryData } = await supabase
                .from('categories')
                .select('name')
                .eq('id', category_id)
                .single()
            categoryName = categoryData?.name
        }

        // ベクトル埋め込み用のテキストを生成（カテゴリー情報含む）
        const embeddingText = createEmbeddingText({
            title,
            content,
            site_title,
            site_description,
            site_name,
            url,
            category_name: categoryName
        })

        console.log('ベクトル化テキスト:', embeddingText)

        // ベクトル埋め込みを生成
        let embedding: number[] | null = null
        if (embeddingText) {
            try {
                embedding = await generateEmbedding(embeddingText)
                console.log('ベクトル生成成功:', embedding.length, '次元')
            } catch (error) {
                console.error('ベクトル生成エラー:', error)
                // ベクトル生成に失敗してもアイテム作成は続行
            }
        }

        // アイテムをデータベースに挿入
        const { data, error } = await supabase
            .from('items')
            .insert({
                workspace_id,
                category_id,
                type,
                title,
                content,
                url,
                site_title,
                site_description,
                site_image_url,
                site_name,
                order,
                embedding,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('アイテム作成エラー:', error)
            return NextResponse.json(
                { error: 'アイテムの作成に失敗しました' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            item: data,
            hasEmbedding: embedding !== null
        })

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: '内部サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

// アイテム更新
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            id,
            title,
            content,
            url,
            site_title,
            site_description,
            site_image_url,
            site_name,
            ...otherFields
        } = body

        const supabase = await createClient()

        // 認証されたユーザーを取得
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: '認証が必要です' },
                { status: 401 }
            )
        }

        // 現在のアイテム情報とカテゴリー、タグを取得
        const { data: currentItem } = await supabase
            .from('items')
            .select(`
                category_id,
                categories!inner(name),
                item_tags!inner(tags!inner(name))
            `)
            .eq('id', id)
            .single()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const categoryName = (currentItem as any)?.categories?.name
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tags = (currentItem as any)?.item_tags?.map((it: any) => it.tags.name) || []

        // ベクトル埋め込み用のテキストを生成（カテゴリー・タグ情報含む）
        const embeddingText = createEmbeddingText({
            title,
            content,
            site_title,
            site_description,
            site_name,
            url,
            category_name: categoryName,
            tags
        })

        // ベクトル埋め込みを生成
        let embedding: number[] | null = null
        if (embeddingText) {
            try {
                embedding = await generateEmbedding(embeddingText)
                console.log('ベクトル更新成功:', embedding.length, '次元')
            } catch (error) {
                console.error('ベクトル生成エラー:', error)
                // ベクトル生成に失敗してもアイテム更新は続行
            }
        }

        // アイテムを更新
        const { data, error } = await supabase
            .from('items')
            .update({
                title,
                content,
                url,
                site_title,
                site_description,
                site_image_url,
                site_name,
                embedding,
                updated_at: new Date().toISOString(),
                ...otherFields
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('アイテム更新エラー:', error)
            return NextResponse.json(
                { error: 'アイテムの更新に失敗しました' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            item: data,
            hasEmbedding: embedding !== null
        })

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: '内部サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
} 