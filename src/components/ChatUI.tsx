"use client"
import { useRef, useEffect, useState } from "react"
import { useChat } from '@ai-sdk/react';
import { createClient } from '@/lib/supabase/client'
import { CategoryIconMap } from "./nav/category-icons"

// 型定義を追加
type WorkspaceInfo = {
    workspaceName: string
    workspaceId: string
}

export function ChatUI({ workspaceInfo }: { workspaceInfo: WorkspaceInfo }) {
    const [initialized, setInitialized] = useState(false)
    const [selectedCategories, setSelectedCategories] = useState<Array<{ name: string, slug: string, icon: string, order?: number }>>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isRegistered, setIsRegistered] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    const { messages, input, handleSubmit, setInput } = useChat({
        api: "/api/chat",
        body: {
            systemType: "empty_category"
        },
        onFinish: () => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
        }
    })

    useEffect(() => {
        if (!initialized && Array.isArray(messages) && messages.length === 0) {
            setInput(workspaceInfo.workspaceName);
            setInitialized(true);
        }
    }, [messages, initialized, setInput, workspaceInfo.workspaceName]);

    useEffect(() => {
        if (initialized && input === workspaceInfo.workspaceName && messages.length === 0) {
            handleSubmit();
        }
    }, [input, initialized, messages, handleSubmit, workspaceInfo.workspaceName]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleSend = () => {
        if (!input.trim()) return;
        handleSubmit()
    }

    const setInputValue = (value: string) => {
        setInput(value);
    }

    const handleCategoryToggle = (category: { name: string, slug: string, icon: string }) => {
        setSelectedCategories(prev =>
            prev.find(c => c.name === category.name)
                ? prev.filter(c => c.name !== category.name)
                : [...prev, category]
        );
    };

    const handleRegistration = async () => {
        setIsLoading(true)
        
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            alert('認証エラー: ログインしてください')
            setIsLoading(false)
            return
        }

        try {
            // 既存のカテゴリを取得
            const { data: existingCategories } = await supabase
                .from('categories')
                .select('name, slug')
                .eq('workspace_id', workspaceInfo.workspaceId)

            const existingNames = new Set(existingCategories?.map(cat => cat.name) || [])
            const existingSlugSet = new Set(existingCategories?.map(cat => cat.slug) || [])

            // 重複しないカテゴリをフィルタリング
            const filteredCategories = selectedCategories.filter(category => {
                if (existingNames.has(category.name)) {
                    return false
                }
                return true
            })

            // slug の衝突を避ける
            const categoriesToInsert = filteredCategories.map(category => {
                // デバッグ用ログ
                console.log('AI提案カテゴリー:', {
                    name: category.name,
                    originalSlug: category.slug,
                    icon: category.icon
                })
                
                // AIが提案したslugを使用、無効な場合のみフォールバック
                const baseSlug = category.slug && category.slug !== '--' && category.slug.length > 0 
                    ? category.slug 
                    : category.name.toLowerCase().replace(/[ぁ-んァ-ヶー一-龯]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'category'
                    
                let finalSlug = baseSlug
                let counter = 1

                while (existingSlugSet.has(finalSlug)) {
                    finalSlug = `${baseSlug}-${counter}`
                    counter++
                }
                
                existingSlugSet.add(finalSlug)
                
                console.log('最終slug:', finalSlug)

                const categoryData = {
                    workspace_id: workspaceInfo.workspaceId,
                    name: category.name,
                    slug: finalSlug,
                    icon: category.icon,
                    order: category.order || 0,
                    parent_id: null,
                }

                return categoryData
            })

            if (categoriesToInsert.length === 0) {
                alert('選択されたカテゴリはすべて既に存在します')
                setIsLoading(false)
                return
            }

            // データベースに挿入
            const { error } = await supabase
                .from('categories')
                .insert(categoriesToInsert)
                .select()

            if (error) {
                throw error
            }

            // 登録成功時の処理
            setIsRegistered(true)
            
            // 成功メッセージを表示
            alert(`${categoriesToInsert.length}個のカテゴリーが正常に登録されました！`)
            
            // 少し待ってからページをリロード
            setTimeout(() => {
                window.location.reload()
            }, 1000)
        } catch (error) {
            console.error('カテゴリ登録エラー:', error)
            alert('カテゴリの登録に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[80vh] max-h-[600px] w-full border rounded-xl bg-background overflow-hidden shadow">
            {/* チャット履歴 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30 text-sm">
                {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground">チャット履歴はありません</div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i}>
                            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`text-md px-3 py-2 rounded-lg max-w-[70%] whitespace-pre-line ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    {msg.content}
                                </div>
                            </div>
                            {/* toolInvocationsをチェック */}
                            {msg.toolInvocations?.map(toolInvocation => {
                                if (toolInvocation.state === 'result' && toolInvocation.toolName === 'suggestCategories') {
                                    const { result } = toolInvocation;
                                    return (
                                        <div key={toolInvocation.toolCallId} className="space-y-3">
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {result.categories.map((category: { name: string, slug: string, icon: string }) => {
                                                    const IconComponent = CategoryIconMap[category.icon as keyof typeof CategoryIconMap];
                                                    return (
                                                        <button
                                                            key={category.name}
                                                            className={`flex items-center gap-1 px-3 py-1 rounded border ${selectedCategories.find(c => c.name === category.name) ? 'bg-primary text-white' : 'bg-muted'}`}
                                                            onClick={() => handleCategoryToggle(category)}
                                                            type="button"
                                                        >
                                                            {IconComponent && <IconComponent className="w-4 h-4" />}
                                                            {category.name} <span className="text-xs opacity-70">({category.slug})</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {selectedCategories.length > 0 && (
                                                <div className="flex items-center gap-2 pt-2 border-t">
                                                    <span className="text-sm text-muted-foreground">
                                                        {selectedCategories.length}個選択中:
                                                    </span>
                                                    {!isRegistered ? (
                                                        <button
                                                            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 disabled:opacity-50"
                                                            onClick={handleRegistration}
                                                            disabled={isLoading}
                                                            type="button"
                                                        >
                                                            {isLoading ? '登録中...' : '選択したカテゴリーを登録'}
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded border border-green-300">
                                                                ✓ 登録完了 - ページを更新中...
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
            {/* 入力欄 */}
            <form
                className="flex border-t p-3 gap-2 bg-background"
                onSubmit={e => { e.preventDefault(); handleSend(); }}
            >
                <input
                    className="flex-1 border rounded px-3 py-2"
                    value={input}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="メッセージを入力..."
                />
                <button
                    type="submit"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded shadow"
                >
                    送信
                </button>
            </form>
        </div>
    )
}

// default exportを追加
export default ChatUI