import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { CategoryForm, CategoryFormValues } from "./category-form"
import { z } from "zod"
import { useState } from "react"

const categorySchema = z.object({
    name: z.string().min(1, "カテゴリー名は必須です"),
    slug: z.string()
        .min(1, "スラッグは必須です")
        .regex(/^[a-zA-Z0-9-_]+$/, "スラッグは英数字・ハイフン・アンダースコアのみ使用できます"),
    icon: z.string().min(1, "アイコンは必須です"),
})

export function CategoryDialog({
    open,
    onOpenChange,
    initial,
    onSubmit,
    onDelete,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    initial?: CategoryFormValues
    onSubmit: (values: CategoryFormValues) => void
    onDelete?: (slug: string) => void
}) {
    const [error, setError] = useState<string | null>(null)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>{initial ? "カテゴリーを編集" : "カテゴリーを追加"}</DialogTitle>
                <DialogDescription>
                    {initial ? "カテゴリーの情報を編集できます。" : "新しいカテゴリーを作成します。"}
                </DialogDescription>
                <CategoryForm
                    initial={initial}
                    onSubmit={values => {
                        setError(null)
                        const result = categorySchema.safeParse(values)
                        if (!result.success) {
                            setError(result.error.errors[0].message)
                            return
                        }
                        onSubmit(values)
                    }}
                    onCancel={() => onOpenChange(false)}
                    onDelete={onDelete}
                />
                {error && <div className="text-red-500 text-sm">{error}</div>}
            </DialogContent>
        </Dialog>
    )
} 