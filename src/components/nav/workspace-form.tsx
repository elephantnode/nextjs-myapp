import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { IconMap } from "./workspace-switcher" // アイコン選択用に流用
import slugify from "slugify"

export type WorkspaceFormValues = {
    name: string
    icon: string
    slug: string
}

type Props = {
    initial?: WorkspaceFormValues
    onSubmit: (values: WorkspaceFormValues) => void
    onCancel: () => void
    onDelete?: (slug: string) => void
}

export function WorkspaceForm({ initial, onSubmit, onCancel, onDelete }: Props) {
    const [name, setName] = useState(initial?.name ?? "")
    const [icon, setIcon] = useState(initial?.icon ?? "Folder")
    const [slug, setSlug] = useState(initial?.slug ?? "")
    const [slugEdited, setSlugEdited] = useState(!!initial?.slug)

    useEffect(() => {
        if (initial?.slug) {
            setSlug(initial.slug)
            setSlugEdited(true)
        }
    }, [initial?.slug])

    useEffect(() => {
        if (!slugEdited) {
            const suggestion = /^[a-zA-Z0-9-_]+$/.test(name)
                ? name
                : slugify(name, { lower: true, strict: true })
            setSlug(suggestion)
        }
    }, [name, slugEdited])

    return (
        <form
            onSubmit={e => {
                e.preventDefault()
                onSubmit({ name, icon, slug })
            }}
            className="flex flex-col gap-4"
        >
            <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">ワークスペース名</span>
                <Input value={name} onChange={e => {
                    setName(e.target.value)
                    setSlugEdited(false)
                }} placeholder="ワークスペース名" required />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">アイコン</span>
                <div className="flex gap-2 flex-wrap">
                    {Object.entries(IconMap).map(([key, Icon]) => (
                        <button
                            type="button"
                            key={key}
                            className={`p-2 rounded border ${icon === key ? 'bg-accent' : ''}`}
                            onClick={() => setIcon(key)}
                            aria-label={key}
                        >
                            <Icon className="w-5 h-5" />
                        </button>
                    ))}
                </div>
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">スラッグ</span>
                <Input value={slug} onChange={e => {
                    setSlug(e.target.value)
                    setSlugEdited(true)
                }} placeholder="スラッグ" required />
            </label>
            <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={onCancel}>キャンセル</Button>
                {initial && onDelete && (
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => onDelete(slug)}
                    >
                        削除
                    </Button>
                )}
                <Button type="submit">{initial ? "保存" : "追加"}</Button>
            </div>
        </form>
    )
}
