import { createClient } from './server'
import { UserProfile } from '@/types/userProfile'

export async function getUserProfile(): Promise<UserProfile | null> {
    const supabase = await createClient()
    
    // 認証ユーザーを取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
        return null
    }
    
    // プロファイル情報を取得
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
    
    if (profileError || !profile) {
        return null
    }
    
    return {
        id: profile.id,
        name: profile.full_name || '',
        username: profile.username || '',
        email: user.email || '',
        avatar: profile.avatar_url || ''
    }
} 