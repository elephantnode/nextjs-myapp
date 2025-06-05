"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Save, ArrowLeft, X, Plus, Loader2, Trash2 } from 'lucide-react'
import { ItemImage } from '@/components/item-image'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type Item = {
    id: string
    workspace_id: string
    category_id: string | null
    type: 'bookmark' | 'note'
    title: string
    content: string | null
    url: string | null
    site_title: string | null
    site_description: string | null
    site_image_url: string | null
    site_name: string | null
    order: number
    status: 'active' | 'trashed'
    created_at: string
    updated_at: string
    tags: Tag[]
}

type Tag = {
    id: string
    name: string
}

interface ItemEditFormProps {
    item: Item
    workspaceId: string
    workspaceSlug: string
    categorySlug: string
}

export function ItemEditForm({
    item,
    workspaceId,
    workspaceSlug,
    categorySlug
}: ItemEditFormProps) {
    const router = useRouter()
    const supabase = createClient()
    
    const [formData, setFormData] = useState({
        title: item.title,
        content: item.content || '',
        url: item.url || '',
        site_description: item.site_description || ''
    })
    
    const [selectedTags, setSelectedTags] = useState<string[]>(
        item.tags.map(tag => tag.name)
    )
    const [customTagInput, setCustomTagInput] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const addCustomTag = () => {
        const tag = customTagInput.trim()
        if (tag && !selectedTags.includes(tag)) {
            setSelectedTags(prev => [...prev, tag])
            setCustomTagInput('')
        }
    }

    const removeTag = (tag: string) => {
        setSelectedTags(prev => prev.filter(t => t !== tag))
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            // APIエンドポイントを使用してアイテムを更新（embedding生成含む）
            const updateData = {
                id: item.id,
                title: formData.title,
                content: formData.content || null,
                url: formData.url || null,
                site_title: item.site_title,
                site_description: formData.site_description || null,
                site_image_url: item.site_image_url,
                site_name: item.site_name
            }

            console.log('アイテム更新データ:', updateData)

            const response = await fetch('/api/items', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            })

            if (!response.ok) {
                throw new Error('アイテムの更新に失敗しました')
            }

            const result = await response.json()
            console.log('アイテム更新結果:', result)

            if (!result.success) {
                throw new Error(result.error || 'アイテムの更新に失敗しました')
            }

            // 既存のタグ関連付けを削除
            const { error: deleteTagsError } = await supabase
                .from('item_tags')
                .delete()
                .eq('item_id', item.id)

            if (deleteTagsError) throw deleteTagsError

            // 新しいタグを処理
            if (selectedTags.length > 0) {
                const tagPromises = selectedTags.map(async (tagName) => {
                    const { data: existingTag } = await supabase
                        .from('tags')
                        .select('id')
                        .eq('workspace_id', workspaceId)
                        .eq('name', tagName)
                        .single()

                    if (existingTag) {
                        return existingTag.id
                    } else {
                        const { data: newTag, error } = await supabase
                            .from('tags')
                            .insert({
                                workspace_id: workspaceId,
                                name: tagName
                            })
                            .select('id')
                            .single()
                        
                        if (error) throw error
                        return newTag.id
                    }
                })

                const tagIds = await Promise.all(tagPromises)

                // アイテムとタグの関連付け
                const itemTagInserts = tagIds.map(tagId => ({
                    item_id: item.id,
                    tag_id: tagId
                }))

                const { error: linkError } = await supabase
                    .from('item_tags')
                    .insert(itemTagInserts)

                if (linkError) throw linkError
            }

            const message = result.hasEmbedding 
                ? 'アイテムを更新しました！（ベクトル検索対応済み）'
                : 'アイテムを更新しました！（ベクトル生成は失敗しましたが、キーワード検索は利用可能です）'
            
            alert(message)
            router.push(`/workspace/${workspaceSlug}/${categorySlug}`)
            router.refresh()

        } catch (error) {
            console.error('Save error:', error)
            alert('保存中にエラーが発生しました: ' + (error as Error).message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            // ソフトデリート（statusをtrashedに変更）
            const { error } = await supabase
                .from('items')
                .update({
                    status: 'trashed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.id)

            if (error) throw error

            alert('アイテムを削除しました')
            router.push(`/workspace/${workspaceSlug}/${categorySlug}`)
            router.refresh()

        } catch (error) {
            console.error('Delete error:', error)
            alert('削除中にエラーが発生しました')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    onClick={() => router.push(`/workspace/${workspaceSlug}/${categorySlug}`)}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    戻る
                </Button>
                
                <div className="flex gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isSaving || isDeleting}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                削除
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                                <AlertDialogDescription>
                                    この操作は取り消すことができません。アイテム「{item.title}」が削除されます。
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            削除中...
                                        </>
                                    ) : (
                                        '削除する'
                                    )}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    
                    <Button onClick={handleSave} disabled={isSaving || isDeleting}>
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                保存中...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                保存
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>基本情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">タイトル</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('title', e.target.value)}
                            placeholder="タイトルを入力..."
                        />
                    </div>

                    {item.type === 'bookmark' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="url">URL</Label>
                                <Input
                                    id="url"
                                    value={formData.url}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('url', e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="site_description">説明</Label>
                                <Textarea
                                    id="site_description"
                                    value={formData.site_description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('site_description', e.target.value)}
                                    placeholder="サイトの説明..."
                                    rows={3}
                                />
                            </div>

                            {/* OGP画像 */}
                            {item.site_image_url && (
                                <div className="space-y-2">
                                    <Label>画像</Label>
                                    <ItemImage
                                        item={{
                                            type: item.type,
                                            site_image_url: item.site_image_url,
                                            title: item.title
                                        }}
                                        className="w-full max-w-md h-40 object-cover rounded-lg border"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {item.type === 'note' && (
                        <div className="space-y-2">
                            <Label htmlFor="content">内容</Label>
                            <Textarea
                                id="content"
                                value={formData.content}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('content', e.target.value)}
                                placeholder="メモの内容..."
                                rows={6}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>タグ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 選択済みタグ */}
                    {selectedTags.length > 0 && (
                        <div className="space-y-2">
                            <Label>現在のタグ</Label>
                            <div className="flex flex-wrap gap-2">
                                {selectedTags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                                        <span>{tag}</span>
                                        <button
                                            type="button"
                                            className="ml-1 hover:bg-red-600/20 rounded-sm p-0.5 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                removeTag(tag)
                                            }}
                                            aria-label={`${tag}タグを削除`}
                                        >
                                            <X className="w-3 h-3 hover:text-red-600" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* カスタムタグ追加 */}
                    <div className="space-y-2">
                        <Label>新しいタグを追加</Label>
                        <div className="flex gap-2">
                            <Input
                                value={customTagInput}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomTagInput(e.target.value)}
                                placeholder="タグ名を入力..."
                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        addCustomTag()
                                    }
                                }}
                            />
                            <Button 
                                type="button"
                                variant="outline" 
                                onClick={addCustomTag}
                                disabled={!customTagInput.trim()}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                追加
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 