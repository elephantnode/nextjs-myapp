import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ itemId: string }> }
) {
    try {
        const { itemId } = await params
        const { categoryId } = await request.json()

        const supabase = await createClient()

        // 認証チェック
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // アイテムの存在チェック
        const { data: item, error: fetchError } = await supabase
            .from('items')
            .select('workspace_id')
            .eq('id', itemId)
            .single()

        if (fetchError || !item) {
            console.error('Error fetching item:', fetchError)
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // ワークスペースの所有者チェック
        const { data: workspace, error: workspaceError } = await supabase
            .from('workspaces')
            .select('user_id')
            .eq('id', item.workspace_id)
            .single()

        if (workspaceError || !workspace || workspace.user_id !== user.id) {
            console.error('Workspace access denied:', workspaceError)
            return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 })
        }

        // アイテムのカテゴリーを更新
        const { error } = await supabase
            .from('items')
            .update({ 
                category_id: categoryId,
                updated_at: new Date().toISOString()
            })
            .eq('id', itemId)

        if (error) {
            console.error('Error moving item:', error)
            return NextResponse.json({ error: 'Failed to move item' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in move item API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 