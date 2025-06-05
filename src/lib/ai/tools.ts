import { tool as createTool } from 'ai';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const suggestCategoriesTool = createTool({
    description: 'ユーザーの説明から5個以内のカテゴリー案（名前、slug、アイコン）を生成する',
    parameters: z.object({
        workspaceName: z.string().describe('ワークスペース名'),
        userRequest: z.string().describe('ユーザーの具体的な要求や説明'),
    }),
    execute: async function ({ workspaceName, userRequest }) {
        const availableIcons = [
            'Hash', 'BookOpen', 'Code2', 'Briefcase', 'Heart', 'Music', 'Camera', 'Gamepad2', 
            'Coffee', 'Car', 'Home', 'Star', 'Zap', 'Target', 'Gift', 'MapPin', 'Clock', 
            'Users', 'DollarSign', 'ShoppingCart', 'Laptop', 'Smartphone', 'Tv', 'Headphones', 
            'Book', 'FileText', 'Image', 'Video', 'Bookmark', 'Tag', 'Folder', 'Archive', 
            'Settings', 'Globe', 'Lightbulb', 'Palette', 'Trophy', 'Calendar', 'Mail'
        ];

        const prompt = `
あなたはワークスペース「${workspaceName}」のカテゴリー設計アシスタントです。

ユーザーの要求: "${userRequest}"

ユーザーの要求に基づいて、最適なカテゴリー5個以内を提案してください。

カテゴリー生成ルール：
1. name: 日本語のカテゴリー名（わかりやすく具体的に）
2. slug: 英語のURL-friendly名前（小文字、ハイフン区切り、特殊文字なし）
3. icon: カテゴリー内容に最適なアイコン（必ず下記リストから選択）

利用可能アイコン：
${availableIcons.join(', ')}

slug作成の重要ルール：
- 日本語のカテゴリー名の英語翻訳を使用
- 略語や記号（---、数字のみ）は絶対に使用しない
- 例：「お気に入り」→ "favorites"、「仕事」→ "work"、「趣味」→ "hobbies"

出力例（ワークスペース「本」の場合）：
[
  {"name": "小説", "slug": "novels", "icon": "BookOpen"},
  {"name": "ビジネス書", "slug": "business-books", "icon": "Briefcase"},
  {"name": "技術書", "slug": "technical-books", "icon": "Code2"},
  {"name": "エッセイ", "slug": "essays", "icon": "FileText"},
  {"name": "参考書", "slug": "reference-books", "icon": "Book"}
]

注意：
- JSONの配列形式で回答
- マークダウンのコードブロックは使用しない
- ユーザーの要求と無関係なカテゴリーは含めない
- slugは必ず英語の意味のある単語を使用`;

        const result = await generateText({
            model: google('gemini-2.0-flash'),
            prompt,
            temperature: 0.3, // 一貫性を向上させる
        });

        let categories: Array<{ name: string, slug: string, icon: string }> = [];
        try {
            // JSONの抽出を改善
            let jsonString = result.text.trim();
            const match = jsonString.match(/\[[\s\S]*\]/);
            if (match) {
                jsonString = match[0];
            }
            
            const parsed = JSON.parse(jsonString);
            
            // 各項目を検証・修正
            categories = parsed.filter((item: unknown): item is { name: string, slug?: string, icon?: string } => 
                item !== null && 
                typeof item === 'object' && 
                'name' in item && 
                typeof (item as { name: unknown }).name === 'string'
            ).map((item: { name: string; slug?: string; icon?: string }) => {
                const { name } = item;
                let { slug, icon } = item;
                
                // slugの検証・修正
                if (!slug || typeof slug !== 'string' || slug.includes('---') || /^\d+$/.test(slug)) {
                    // 日本語のカテゴリー名から英語slugを生成
                    const slugMap: {[key: string]: string} = {
                        'お気に入り': 'favorites',
                        '仕事': 'work',
                        '趣味': 'hobbies',
                        '勉強': 'study',
                        '料理': 'cooking',
                        '旅行': 'travel',
                        '音楽': 'music',
                        '映画': 'movies',
                        '本': 'books',
                        '小説': 'novels',
                        'ビジネス': 'business',
                        '技術': 'tech',
                        'プログラミング': 'programming',
                        'ニュース': 'news',
                        '健康': 'health',
                        'ゲーム': 'games',
                        'スポーツ': 'sports',
                        '写真': 'photos',
                        '動画': 'videos',
                        'レシピ': 'recipes',
                    };
                    
                    slug = slugMap[name] || name.toLowerCase()
                        .replace(/[ぁ-んァ-ヶー一-龯]/g, '') // 日本語文字を除去
                        .replace(/[^a-z0-9]/g, '-') // 英数字以外をハイフンに
                        .replace(/-+/g, '-') // 連続ハイフンを1つに
                        .replace(/^-|-$/g, '') // 先頭末尾のハイフンを除去
                        || 'category'; // 空の場合はデフォルト
                }
                
                // アイコンの検証
                if (!icon || !availableIcons.includes(icon)) {
                    icon = 'Hash'; // デフォルトアイコン
                }
                
                return { name, slug, icon };
            })
            .filter((item: { name: string; slug: string; icon: string }) => item.name && item.slug); // 有効な項目のみ
                
        } catch (e) {
            console.error('Failed to parse categories:', e);
            console.error('AI response:', result.text);
            categories = [];
        }

        return { categories };
    },
});

export const tools = { suggestCategories: suggestCategoriesTool };