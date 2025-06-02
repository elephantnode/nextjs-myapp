import { tool as createTool } from 'ai';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const suggestCategoriesTool = createTool({
    description: 'ユーザーの説明から5個以内のカテゴリー案を生成する',
    parameters: z.object({
        workspaceName: z.string().describe('ワークスペース名'),
    }),
    execute: async function ({ workspaceName }) {
        const prompt = `
あなたはワークスペース「${workspaceName}」の内部カテゴリー設計を手伝うAIアシスタントです。
このワークスペースに最適なカテゴリーを5個以内で日本語で提案してください。
出力は必ずJSON配列（例: ["営業", "開発", "管理", "マーケ", "サポート"]）のみ。他の文字や説明は一切含めないでください。
        `;
        const result = await generateText({
            model: google('gemini-2.0-flash'),
            prompt,
        });
        let categories: string[] = [];
        try {
            const match = result.text.match(/\[[\s\S]*\]/);
            if (match) {
                categories = JSON.parse(match[0]);
            } else {
                categories = [];
            }
        } catch (e) {
            categories = [];
            console.error(e);
        }
        return { categories };
    },
});

export const tools = { suggestCategories: suggestCategoriesTool };