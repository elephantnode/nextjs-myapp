"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import {
    Activity,
    ChevronsUpDown,
    Folder,
    Briefcase,
    BookOpen,
    Archive,
    Code2,
    Lock,
    Map,
    Settings,
    Star,
    User,
    Plus,
} from "lucide-react"
import { SortableWorkspaceItem } from "@/components/ui/sortableWorkspaceItem"
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { WorkspaceDialog } from "./workspace-dialog"
import { WorkspaceFormValues } from "./workspace-form"
import { UserProfile } from '@/types/userProfile'

export const IconMap = {
    Folder: Folder,
    Briefcase: Briefcase,
    BookOpen: BookOpen,
    Archive: Archive,
    Code2: Code2,
    Lock: Lock,
    Activity: Activity,
    Star: Star,
    Map: Map,
    User: User,
    Settings: Settings
}

type Workspace = {
    id: string
    name: string
    order: number
    icon: string
    status: boolean
    is_active: boolean
    user_id: string
    slug: string
}



export function WorkspaceSwitcher({
    workspaces,
    userProfile,
}: {
    workspaces: Workspace[]
    userProfile: UserProfile
}) {
    const { isMobile } = useSidebar()
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
    const [items, setItems] = useState(workspaces.map(w => w.id));
    const sensors = useSensors(useSensor(PointerSensor));
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<Workspace | null>(null)

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const activeWorkspace = workspaces.find((workspace) => workspace.is_active)
        if (activeWorkspace) {
            setActiveWorkspace(activeWorkspace)
        }
    }, [workspaces])

    useEffect(() => {
        setItems(workspaces.map(w => w.id));
    }, [workspaces]);

    useEffect(() => {
        if (!workspaces || workspaces.length === 0) {
            setDialogOpen(true);
        }
    }, [workspaces]);

    const IconComponent = activeWorkspace?.icon ? IconMap[activeWorkspace.icon as keyof typeof IconMap] : undefined;

    // ワークスペース切り替え
    const handleWorkspaceSwitch = async (workspace: Workspace) => {
        await supabase.from('workspaces').update({ is_active: false }).eq('user_id', workspace.user_id)
        await supabase.from('workspaces').update({ is_active: true }).eq('id', workspace.id)
        // ページ遷移
        router.push(`/workspace/${workspace.slug}`)
    }


    // 並べ替え確定時の処理
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newItems = arrayMove(items, oldIndex, newIndex);
        setItems(newItems);
    
        // 並び順をSupabaseに保存
        for (let i = 0; i < newItems.length; i++) {
            await supabase.from('workspaces').update({ order: i }).eq('id', newItems[i]);
        }
    };

    // 編集ボタン用
    const handleEditWorkspace = (workspace: Workspace) => {
        setEditTarget(workspace)
        setDialogOpen(true)
    }

    // 新規追加ボタン用
    const handleAddWorkspace = () => {
        setEditTarget(null)
        setDialogOpen(true)
    }

    const handleSubmit = async (values: WorkspaceFormValues) => {
        if (editTarget) {
            // 編集
            await supabase.from('workspaces').update({
                name: values.name,
                icon: values.icon,
                slug: values.slug
            }).eq('id', editTarget.id)
        } else {
            // 新規 - propsのuserを使用
            await supabase.from('workspaces').insert([
                { 
                    name: values.name, 
                    icon: values.icon, 
                    slug: values.slug, 
                    user_id: userProfile.id, 
                    order: workspaces.length, 
                    status: true, 
                    is_active: workspaces.length === 0 // 空の場合のみアクティブ
                }
            ])
        }
        setDialogOpen(false)
        //画面更新
        router.refresh()
    }

    const handleDeleteWorkspace = async (slug: string) => {
        if (!window.confirm('本当にこのワークスペースを削除しますか？この操作は元に戻せません。')) {
            return;
        }
        await supabase.from('workspaces').delete().eq('slug', slug)
        router.refresh()
    }

    return (
        <SidebarMenu>
            {(!workspaces || workspaces.length === 0) ? (
                <>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
                                <Folder className="size-5" />
                                <span>No Workspace</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <button
                                type="button"
                                className="flex items-center gap-2 px-3 py-2 text-primary"
                                onClick={handleAddWorkspace}
                            >
                                <Plus className="size-5" />
                                <span>Add Workspace</span>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </>
            ) : activeWorkspace ? (
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    {IconComponent && <IconComponent className="size-4" />}
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">
                                        {activeWorkspace.name}
                                    </span>
                                    <span className="truncate text-xs">{activeWorkspace.name}</span>
                                </div>
                                <ChevronsUpDown className="ml-auto" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                            align="start"
                            side={isMobile ? "bottom" : "right"}
                            sideOffset={4}
                        >
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                                Workspaces
                            </DropdownMenuLabel>
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                                    {items.map((id, index) => {
                                        const workspace = workspaces.find(w => w.id === id);
                                        if (!workspace) return null;
                                        const WorkspaceIcon = workspace.icon ? IconMap[workspace.icon as keyof typeof IconMap] : undefined;
                                        return (
                                            <SortableWorkspaceItem
                                                key={id}
                                                id={id}
                                                onEdit={() => handleEditWorkspace(workspace)}
                                            >
                                                <DropdownMenuItem
                                                    onClick={() => handleWorkspaceSwitch(workspace)}
                                                    className="gap-2 p-2"
                                                >
                                                    <div className="flex size-6 items-center justify-center rounded-sm border">
                                                        {WorkspaceIcon && <WorkspaceIcon className="size-4 shrink-0" />}
                                                    </div>
                                                    {workspace.name}
                                                    <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                                                </DropdownMenuItem>
                                            </SortableWorkspaceItem>
                                        );
                                    })}
                                </SortableContext>
                            </DndContext>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 p-2" onClick={handleAddWorkspace}>
                                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                                    <Plus className="size-4" />
                                </div>
                                <div className="font-medium text-muted-foreground">Add Workspace</div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            ) : null}
            <WorkspaceDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                initial={editTarget ? { name: editTarget.name, icon: editTarget.icon, slug: editTarget.slug } : undefined}
                onSubmit={handleSubmit}
                onDelete={editTarget ? (slug) => handleDeleteWorkspace(slug) : undefined}
            />
        </SidebarMenu>
    )
}
