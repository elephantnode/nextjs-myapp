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

役割：
- ユーザーの具体的な説明や要求を理解する
- その要求に特化したカテゴリーを提案する
- 関係ないカテゴリーは提案しない
- 最初に簡潔なメッセージで理解を示し、その後suggestCategoriesツールを1回だけ呼び出す

手順：
1. ユーザーの要求を理解していることを短く伝える
2. suggestCategoriesツールを呼び出す際、workspaceNameとuserRequest（最新のユーザーメッセージ）を渡す
3. ツール呼び出し後は追加の応答は不要

重要：ユーザーが「本のカテゴリー」と言ったら本関連のみ、「旅行」と言ったら旅行関連のみを提案してください。`;
    } else {
        systemMessage = "あなたは親切なアシスタントです。";
    }

    const response = await streamText({
        model: google('gemini-2.0-flash'),
        system: systemMessage,
        messages,
        tools,
        maxSteps: 1,
    });
    return response.toDataStreamResponse();
}