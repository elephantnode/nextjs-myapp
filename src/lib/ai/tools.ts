import { tool as createTool } from 'ai';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const suggestCategoriesTool = createTool({
    description: 'ユーザーの説明から5個以内のカテゴリー案（名前とslug）を生成する',
    parameters: z.object({
        workspaceName: z.string().describe('ワークスペース名'),
        userRequest: z.string().describe('ユーザーの具体的な要求や説明'),
    }),
    execute: async function ({ workspaceName, userRequest }) {
        const prompt = `
ワークスペース「${workspaceName}」のカテゴリーを提案してください。

ユーザーの要求: "${userRequest}"

重要：ユーザーの具体的な要求に焦点を当てて、その内容に最適なカテゴリーのみを提案してください。

各カテゴリーには以下を含めてください：
- name: 日本語のカテゴリー名
- slug: URL-friendlyな英数字のslug（小文字、ハイフン区切り）

例（「本のカテゴリー」の要求の場合）:
[
  {"name": "小説", "slug": "novels"},
  {"name": "ビジネス書", "slug": "business"},
  {"name": "技術書", "slug": "technical"},
  {"name": "エッセイ", "slug": "essays"},
  {"name": "参考書", "slug": "textbooks"}
]

slugの作成ルール：
- 英語の意味に対応
- 小文字のみ
- 単語間はハイフン区切り
- 特殊文字は使用しない
- 短くて覚えやすい

JSON配列のみを出力してください。ユーザーの要求と関係ないカテゴリーは含めないでください。
        `;
        const result = await generateText({
            model: google('gemini-2.0-flash'),
            prompt,
        });

        let categories: Array<{ name: string, slug: string }> = [];
        try {
            const match = result.text.match(/\[[\s\S]*\]/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                // 各項目がname/slugを持っているか検証
                categories = parsed.filter((item: any) =>
                    item && typeof item.name === 'string' && typeof item.slug === 'string'
                );
            }
        } catch (e) {
            console.error('Failed to parse categories:', e);
            categories = [];
        }

        console.log('Generated categories with slugs:', categories);
        return { categories };
    },
});

export const tools = { suggestCategories: suggestCategoriesTool };