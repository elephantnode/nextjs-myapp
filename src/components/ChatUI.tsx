"use client"
import { useRef, useEffect, useState } from "react"
import { useChat } from '@ai-sdk/react';
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ChatUI({ workspaceName, workspaceId }: { workspaceName: string, workspaceId: string }) {
    const bottomRef = useRef<HTMLDivElement>(null)

    // propsのデバッグ
    console.log('ChatUI props:', { workspaceName, workspaceId });
    console.log('workspaceId type:', typeof workspaceId);
    console.log('workspaceId length:', workspaceId?.length);

    const { messages, input, handleSubmit, setInput } = useChat({
        api: "/api/chat",
        body: {
            systemType: "empty_category"
        },
        onFinish: () => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
        }
    })

    const [initialized, setInitialized] = useState(false)
    const [selectedCategories, setSelectedCategories] = useState<Array<{ name: string, slug: string }>>([])
    const [isRegistering, setIsRegistering] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        if (!initialized && Array.isArray(messages) && messages.length === 0) {
            setInput(workspaceName);
            setInitialized(true);
        }
    }, [messages, initialized, setInput, workspaceName]);

    useEffect(() => {
        if (initialized && input === workspaceName && messages.length === 0) {
            handleSubmit();
        }
    }, [input, initialized, messages, handleSubmit, workspaceName]);

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

    const handleCategoryToggle = (category: { name: string, slug: string }) => {
        setSelectedCategories(prev =>
            prev.find(c => c.name === category.name)
                ? prev.filter(c => c.name !== category.name)
                : [...prev, category]
        );
    };

    const handleRegisterCategories = async () => {
        if (selectedCategories.length === 0) return;

        console.log('=== Registration Debug ===');
        console.log('workspaceId:', workspaceId);
        console.log('workspaceId type:', typeof workspaceId);
        console.log('workspaceId valid:', !!workspaceId);

        if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') {
            alert('ワークスペースIDが正しく設定されていません。');
            console.error('Invalid workspaceId:', workspaceId);
            return;
        }

        setIsRegistering(true);
        try {
            console.log('Starting registration...');
            console.log('Selected categories:', selectedCategories);
            console.log('Workspace ID:', workspaceId);

            // 現在のユーザーを確認
            const { data: { user } } = await supabase.auth.getUser();
            console.log('Current user:', user);

            if (!user) {
                alert('ユーザーが認証されていません。');
                return;
            }

            // 既存のカテゴリー名とslugを確認
            const { data: existingCategories } = await supabase
                .from('categories')
                .select('name, slug')
                .eq('workspace_id', workspaceId);

            const existingNames = existingCategories?.map(c => c.name) || [];
            const existingSlugSet = new Set(existingCategories?.map(c => c.slug) || []);
            console.log('Existing categories:', existingNames);
            console.log('Existing slugs:', Array.from(existingSlugSet));

            // カテゴリーデータを準備（AIが生成したslugを使用）
            const categoriesToInsert = [];

            for (const [index, category] of selectedCategories.entries()) {
                // 名前の重複チェック
                if (existingNames.includes(category.name)) {
                    console.log(`Skipping duplicate name: ${category.name}`);
                    continue;
                }

                console.log('Processing category:', category);

                // slug重複チェックと自動調整
                let finalSlug = category.slug;
                let counter = 1;

                while (existingSlugSet.has(finalSlug)) {
                    finalSlug = `${category.slug}-${counter}`;
                    counter++;
                    console.log(`Slug conflict, trying: ${finalSlug}`);
                }

                existingSlugSet.add(finalSlug); // 今回のバッチでの重複も防止
                console.log(`Final slug for "${category.name}": ${finalSlug}`);

                const categoryData = {
                    workspace_id: workspaceId,
                    name: category.name,
                    slug: finalSlug,
                    order: index,
                    parent_id: null
                };

                console.log('Category data:', categoryData);
                categoriesToInsert.push(categoryData);
            }

            console.log('Categories to insert:', categoriesToInsert);

            if (categoriesToInsert.length === 0) {
                alert('選択されたカテゴリーはすべて既に存在します。');
                return;
            }

            // Supabaseにカテゴリーを一括挿入
            const { data, error } = await supabase
                .from('categories')
                .insert(categoriesToInsert)
                .select();

            if (error) {
                console.error('Supabase insert error:', error);
                alert(`カテゴリー登録エラー: ${error.message}`);
                return;
            }

            console.log('Successfully inserted categories:', data);

            // 成功メッセージ
            alert(`${categoriesToInsert.length}個のカテゴリーを登録しました！\nページをリロードして反映します。`);

            // 選択状態をクリア
            setSelectedCategories([]);

            // ページをリロードして新しいカテゴリーを表示
            window.location.reload();

        } catch (error) {
            console.error('エラー:', error);
            alert(`エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsRegistering(false);
        }
    };

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
                                                {result.categories.map((category: { name: string, slug: string }) => (
                                                    <button
                                                        key={category.name}
                                                        className={`px-3 py-1 rounded border ${selectedCategories.find(c => c.name === category.name) ? 'bg-primary text-white' : 'bg-muted'}`}
                                                        onClick={() => handleCategoryToggle(category)}
                                                        type="button"
                                                    >
                                                        {category.name} <span className="text-xs opacity-70">({category.slug})</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {selectedCategories.length > 0 && (
                                                <div className="flex items-center gap-2 pt-2 border-t">
                                                    <span className="text-sm text-muted-foreground">
                                                        {selectedCategories.length}個選択中:
                                                    </span>
                                                    <button
                                                        className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 disabled:opacity-50"
                                                        onClick={handleRegisterCategories}
                                                        disabled={isRegistering}
                                                        type="button"
                                                    >
                                                        {isRegistering ? '登録中...' : '選択したカテゴリーを登録'}
                                                    </button>
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