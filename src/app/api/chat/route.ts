import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { tools } from '@/lib/ai/tools';

export async function POST(req: Request) {
    const { messages, systemType } = await req.json();

    // 最新のユーザー発言（最初のワークスペース名）を取得
    const firstUserMessage = messages.find(m => m.role === 'user')?.content ?? "";

    // toolsのsuggestCategoriesToolのパラメータを補完
    const toolsWithParam = {
        ...tools,
        suggestCategories: {
            ...tools.suggestCategories,
            execute: async (params: any) => {
                if (!params.workspaceName) {
                    params.workspaceName = firstUserMessage;
                }
                return tools.suggestCategories.execute(params);
            }
        }
    };

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
        tools: toolsWithParam,
        maxSteps: 5,
    });
    return response.toDataStreamResponse();
}