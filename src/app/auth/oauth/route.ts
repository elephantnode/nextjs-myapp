import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // ログイン成功後、アクティブなワークスペースを探す
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // ワークスペース情報を取得
        const { data: workspacesData } = await supabase
          .from('workspaces')
          .select('*')
          .eq('user_id', user.id)
          .order('order', { ascending: true })

        if (workspacesData && workspacesData.length > 0) {
          // アクティブなワークスペースを探す
          const activeWorkspace = workspacesData.find(workspace => workspace.is_active)
          // アクティブなワークスペースがない場合は最初のワークスペースを使用
          const targetWorkspace = activeWorkspace || workspacesData[0]
          
          if (targetWorkspace && targetWorkspace.slug) {
            const workspaceUrl = `/workspace/${targetWorkspace.slug}`
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            
            if (isLocalEnv) {
              return NextResponse.redirect(`${origin}${workspaceUrl}`)
            } else if (forwardedHost) {
              return NextResponse.redirect(`https://${forwardedHost}${workspaceUrl}`)
            } else if (next) {
              return NextResponse.redirect(`${origin}${next}`)
            } else {
              return NextResponse.redirect(`${origin}${workspaceUrl}`)
            }
          }
        }
        
        // ワークスペースが見つからない場合は /workspace ページへ
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}/workspace`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}/workspace`)
        } else {
          return NextResponse.redirect(`${origin}/workspace`)
        }
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`)
}
