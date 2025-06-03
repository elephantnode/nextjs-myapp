import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import ogs from 'open-graph-scraper'
import { NextRequest } from 'next/server'
import { tools } from '@/lib/ai/tools'

// メッセージの型
type Message = {
    role: 'user' | 'assistant' | 'system'
    content: string
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { messages, systemType } = body

        if (systemType === 'content_addition') {
            // URL または メモの追加処理
            const lastMessage = messages[messages.length - 1]
            const input = lastMessage.content
            
            let ogpData = null
            
            // URLの場合、OGP情報を取得
            const urlMatch = input.match(/https?:\/\/[^\s]+/)
            if (urlMatch) {
                const url = urlMatch[0]
                try {
                    const options = { url }
                    const { result } = await ogs(options)
                    ogpData = result
                } catch (error) {
                    console.error('OGP取得エラー:', error)
                }
            }

            // AIにタグ提案を依頼
            const result = await generateText({
                model: google('gemini-2.0-flash'),
                prompt: `以下のコンテンツを分析して、関連するタグを5個提案してください。

コンテンツ情報:
- 入力テキスト: ${input}
${ogpData ? `- サイトタイトル: ${ogpData.ogTitle || 'なし'}
- サイト説明: ${ogpData.ogDescription || 'なし'}
- サイト名: ${ogpData.ogSiteName || 'なし'}` : ''}

重要：以下のJSONフォーマットで回答してください。マークダウンやコードブロックは使わず、純粋なJSONのみを返してください。

{
  "type": "content_suggested",
  "content": {
    "title": "適切なタイトル",
    "type": "${ogpData ? 'bookmark' : 'note'}"
  },
  "tags": ["タグ1", "タグ2", "タグ3", "タグ4", "タグ5"],
  "message": "コンテンツを解析しました。"
}

タグは以下の観点から日本語で選んでください：
1. コンテンツの主要なトピック
2. 技術分野（該当する場合）
3. カテゴリー分類
4. 検索に役立つキーワード
5. 内容の性質

例：["プログラミング", "JavaScript", "React", "フロントエンド", "チュートリアル"]`,
                temperature: 0.1
            })
            
            console.log('AI Raw Response:', result.text)
            
            // AIからの応答をパースしてJSONを抽出
            let parsedResponse
            try {
                // マークダウンのJSONコードブロックから実際のJSONを抽出
                const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/)
                let jsonString = jsonMatch ? jsonMatch[1] : result.text
                
                // もしマークダウンブロックがない場合、テキスト全体を試す
                jsonString = jsonString.trim()
                
                const aiResponse = JSON.parse(jsonString)
                
                // AI応答から実際のコンテンツデータを構築
                parsedResponse = {
                    type: "content_suggested",
                    content: {
                        title: ogpData?.ogTitle || aiResponse.content?.title || input.slice(0, 30) + (input.length > 30 ? '...' : ''),
                        type: ogpData ? 'bookmark' : 'note',
                        url: ogpData ? urlMatch[0] : undefined,
                        site_title: ogpData?.ogTitle,
                        site_description: ogpData?.ogDescription,
                        site_image_url: ogpData?.ogImage?.[0]?.url,
                        site_name: ogpData?.ogSiteName,
                        content: ogpData ? undefined : input
                    },
                    tags: Array.isArray(aiResponse.tags) ? aiResponse.tags : ["一般", "メモ"],
                    message: aiResponse.message || "コンテンツを解析しました。"
                }
                
                console.log('Parsed AI Response:', parsedResponse)
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError)
                console.error('Original AI response:', result.text)
                
                // パースに失敗した場合は、AIのテキストから手動でタグを抽出
                let extractedTags = ["一般", "メモ"];
                
                // 日本語の単語パターンで抽出を試行
                const tagMatches = result.text.match(/[ぁ-んァ-ヶー一-龯a-zA-Z0-9]{2,10}/g);
                if (tagMatches) {
                    // JSONキーワードやよくある英単語を除外
                    const excludeWords = ['json', 'type', 'content', 'title', 'description', 'url', 'site', 'message', 'tags', 'suggested', 'bookmark', 'note'];
                    extractedTags = tagMatches
                        .filter(tag => !excludeWords.includes(tag.toLowerCase()))
                        .filter(tag => tag.length >= 2 && tag.length <= 10)
                        .slice(0, 5);
                }
                
                // タグが取得できない場合はコンテンツベースの推測タグを生成
                if (extractedTags.length === 0) {
                    if (ogpData) {
                        extractedTags = ["ブックマーク", "ウェブ"];
                        if (ogpData.ogTitle?.includes('技術') || ogpData.ogTitle?.includes('プログラミング')) {
                            extractedTags.push("技術");
                        }
                        if (ogpData.ogTitle?.includes('ニュース')) {
                            extractedTags.push("ニュース");
                        }
                    } else {
                        extractedTags = ["メモ", "テキスト"];
                    }
                }

                parsedResponse = {
                    type: "content_suggested",
                    content: {
                        title: ogpData?.ogTitle || input.slice(0, 50) + (input.length > 50 ? '...' : ''),
                        description: ogpData?.ogDescription,
                        url: ogpData ? urlMatch[0] : undefined,
                        site_title: ogpData?.ogTitle,
                        site_description: ogpData?.ogDescription,
                        site_image_url: ogpData?.ogImage?.[0]?.url,
                        site_name: ogpData?.ogSiteName,
                        type: ogpData ? "bookmark" : "note",
                        content: ogpData ? undefined : input
                    },
                    tags: extractedTags.slice(0, 5),
                    message: "コンテンツを解析しました。タグを確認して保存してください。"
                }
            }
            
            return new Response(JSON.stringify(parsedResponse), {
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // systemTypeがempty_categoryの場合の処理（既存機能）
        if (systemType === "empty_category") {
            // 最新のユーザー発言（最初のワークスペース名）を取得
            const firstUserMessage = messages.find((m: Message) => m.role === 'user')?.content ?? ""

            const systemMessage = `あなたはワークスペース「${firstUserMessage}」のカテゴリー設計を手伝うAIアシスタントです。

役割：
- ユーザーの具体的な説明や要求を理解する
- その要求に特化したカテゴリーを提案する
- 関係ないカテゴリーは提案しない
- 最初に簡潔なメッセージで理解を示し、その後suggestCategoriesツールを1回だけ呼び出す

手順：
1. ユーザーの要求を理解していることを短く伝える
2. suggestCategoriesツールを呼び出す際、workspaceNameとuserRequest（最新のユーザーメッセージ）を渡す
3. ツール呼び出し後は追加の応答は不要

重要：ユーザーが「本のカテゴリー」と言ったら本関連のみ、「旅行」と言ったら旅行関連のみを提案してください。`

            const { streamText } = await import('ai')
            const response = await streamText({
                model: google('gemini-2.0-flash'),
                system: systemMessage,
                messages,
                tools,
                maxSteps: 1,
            })
            return response.toDataStreamResponse()
        }

        // その他のsystemTypeの処理
        return new Response(
            JSON.stringify({ error: 'Unsupported system type' }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Chat API エラー:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
}