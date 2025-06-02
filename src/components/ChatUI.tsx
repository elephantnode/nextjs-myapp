"use client"
import { useRef, useEffect, useState } from "react"
import { useChat } from '@ai-sdk/react';

export default function ChatUI({ workspaceName }: { workspaceName: string }) {
    const bottomRef = useRef<HTMLDivElement>(null)
    const { messages, input, handleInputChange, handleSubmit, setMessages, setInput } = useChat({
        api: "/api/chat",
        body: {
            systemType: "empty_category"
        },
        onFinish: () => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
        }
    })

    const [initialized, setInitialized] = useState(false)
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])

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

    const handleCategoryToggle = (cat: string) => {
        setSelectedCategories(prev =>
            prev.includes(cat)
                ? prev.filter(c => c !== cat)
                : [...prev, cat]
        );
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
                            {msg.toolInvocations?.map(toolInvocation => {
                                if (toolInvocation.state === 'result' && toolInvocation.toolName === 'suggestCategories') {
                                    const { result } = toolInvocation;
                                    return (
                                        <div key={toolInvocation.toolCallId} className="flex flex-wrap gap-2 mt-2">
                                            {result.categories.map((cat: string) => (
                                                <button
                                                    key={cat}
                                                    className={`px-3 py-1 rounded border ${selectedCategories.includes(cat) ? 'bg-primary text-white' : 'bg-muted'}`}
                                                    onClick={() => handleCategoryToggle(cat)}
                                                    type="button"
                                                >
                                                    {cat}
                                                </button>
                                            ))}
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