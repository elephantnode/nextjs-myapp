import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { WorkspaceForm, WorkspaceFormValues } from "./workspace-form"
import { z } from "zod"
import { useState } from "react"

const workspaceSchema = z.object({
    name: z.string().min(1, "ワークスペース名は必須です"),
    icon: z.string().min(1),
    slug: z.string()
        .min(1, "スラッグは必須です")
        .regex(/^[a-zA-Z0-9-_]+$/, "スラッグは英数字・ハイフン・アンダースコアのみ使用できます"),
})

export function WorkspaceDialog({
    open,
    onOpenChange,
    initial,
    onSubmit,
    onDelete,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    initial?: WorkspaceFormValues
    onSubmit: (values: WorkspaceFormValues) => void
    onDelete?: (slug: string) => void
}) {
    const [error, setError] = useState<string | null>(null)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>{initial ? "ワークスペースを編集" : "ワークスペースを追加"}</DialogTitle>
                <DialogDescription>
                    {initial ? "ワークスペースの情報を編集できます。" : "新しいワークスペースを作成します。"}
                </DialogDescription>
                <WorkspaceForm
                    initial={initial}
                    onSubmit={values => {
                        setError(null)
                        const result = workspaceSchema.safeParse(values)
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
