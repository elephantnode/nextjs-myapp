import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategoryIconMap, categoryIconOptions } from "./category-icons"

export type CategoryFormValues = {
    name: string
    slug: string
    icon: string
}

export function CategoryForm({
    initial,
    onSubmit,
    onCancel,
    onDelete,
}: {
    initial?: CategoryFormValues
    onSubmit: (values: CategoryFormValues) => void
    onCancel: () => void
    onDelete?: (slug: string) => void
}) {
    const [name, setName] = useState(initial?.name || "")
    const [slug, setSlug] = useState(initial?.slug || "")
    const [icon, setIcon] = useState(initial?.icon || "Hash")

    useEffect(() => {
        if (initial) {
            setName(initial.name)
            setSlug(initial.slug)
            setIcon(initial.icon)
        }
    }, [initial])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({ name, slug, icon })
    }

    const handleDelete = () => {
        if (initial?.slug && onDelete) {
            onDelete(initial.slug)
        }
    }

    const IconComponent = CategoryIconMap[icon as keyof typeof CategoryIconMap]

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">カテゴリー名</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="カテゴリー名を入力"
                    required
                />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="slug">スラッグ</Label>
                <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="slug-format"
                    pattern="^[a-zA-Z0-9-_]+$"
                    title="英数字・ハイフン・アンダースコアのみ使用できます"
                    required
                />
                <p className="text-xs text-muted-foreground">
                    英数字・ハイフン・アンダースコアのみ使用できます
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="icon">アイコン</Label>
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-10 h-10 border rounded bg-muted/20">
                        {IconComponent ? (
                            <IconComponent className="w-5 h-5 text-foreground" />
                        ) : (
                            <span className="text-xs text-muted-foreground">NO</span>
                        )}
                    </div>
                    <Select value={icon} onValueChange={setIcon}>
                        <SelectTrigger className="flex-1">
                            <SelectValue>
                                {icon && categoryIconOptions.find(opt => opt.value === icon)?.label || "アイコンを選択"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {categoryIconOptions.map((option) => {
                                const OptionIcon = CategoryIconMap[option.value as keyof typeof CategoryIconMap]
                                return (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                            {OptionIcon ? (
                                                <OptionIcon className="w-4 h-4" />
                                            ) : (
                                                <span className="w-4 h-4 bg-gray-200 rounded"></span>
                                            )}
                                            <span>{option.label}</span>
                                        </div>
                                    </SelectItem>
                                )
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <div>
                    {initial && onDelete && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            削除
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        キャンセル
                    </Button>
                    <Button type="submit">
                        {initial ? "更新" : "作成"}
                    </Button>
                </div>
            </div>
        </form>
    )
} 