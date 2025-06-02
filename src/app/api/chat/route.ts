import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { tools } from '@/lib/ai/tools';


// メッセージの型
type Message = {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export async function POST(req: Request) {
    const { messages, systemType }: { messages: Message[], systemType: string } = await req.json();

    // 最新のユーザー発言（最初のワークスペース名）を取得
    const firstUserMessage = messages.find((m: Message) => m.role === 'user')?.content ?? "";

    let systemMessage = "";
    if (systemType === "empty_category") {
        systemMessage = `あなたはワークスペース「${firstUserMessage}」のカテゴリー設計を手伝うAIアシスタントです。
        ユーザーの説明から最適なカテゴリーを5個以内で提案し、ツール呼び出しで返してください。
        新しく説明があった場合は、聞き返さないように説明された内容を含めて5個で提案し直してください。`;
    } else {
        systemMessage = "あなたは親切なアシスタントです。";
    }

    const response = await streamText({
        model: google('gemini-2.0-flash'),
        system: systemMessage,
        messages,
        tools,
        maxSteps: 5,
    });
    return response.toDataStreamResponse();
}