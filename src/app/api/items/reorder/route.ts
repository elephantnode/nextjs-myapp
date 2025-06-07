import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type CategoryWithWorkspace = {
    workspace_id: string
    workspaces: {
        user_id: string
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { itemIds, categoryId } = await request.json()

        if (!itemIds || !Array.isArray(itemIds)) {
            return NextResponse.json({ error: 'Invalid item IDs' }, { status: 400 })
        }

        const supabase = await createClient()

        // 認証チェック
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // カテゴリーの所有者チェック（もしcategoryIdが提供されている場合）
        if (categoryId) {
            const { data: category, error: categoryError } = await supabase
                .from('categories')
                .select('workspace_id, workspaces!inner(user_id)')
                .eq('id', categoryId)
                .single()

            const typedCategory = category as CategoryWithWorkspace | null
            if (categoryError || !typedCategory || typedCategory.workspaces.user_id !== user.id) {
                return NextResponse.json({ error: 'Category not found or unauthorized' }, { status: 404 })
            }
        }

        // バッチでアイテムの並び順を更新
        const updatePromises = itemIds.map((itemId: string, index: number) => 
            supabase
                .from('items')
                .update({ 
                    order: index,
                    updated_at: new Date().toISOString()
                })
                .eq('id', itemId)
        )

        const results = await Promise.all(updatePromises)
        
        // エラーチェック
        const errors = results.filter(result => result.error)
        if (errors.length > 0) {
            console.error('Error reordering items:', errors)
            return NextResponse.json({ error: 'Failed to reorder some items' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error reordering items:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 