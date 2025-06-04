"use client"

import { WorkspaceSwitcher } from "@/components/nav/workspace-switcher"
import { NavWorkspaceCategories } from "@/components/nav/nav-workspace-categories"
import { NavUser } from "@/components/nav/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"

import { UserProfile } from "@/types/userProfile"
import { Workspace } from "@/types/workspace"

type Category = {
  id: string
  workspace_id: string
  name: string
  slug: string
  icon: string
  order: number
  parent_id: string | null
  created_at: string
}

export function AppSidebar({ 
  userProfile, 
  workspaces, 
  categories = [], 
  currentWorkspace,
  enableItemDrop = false
}: { 
  userProfile: UserProfile, 
  workspaces: Workspace[],
  categories?: Category[],
  currentWorkspace?: Workspace,
  enableItemDrop?: boolean
}) {

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
    >
      <SidebarHeader>
        <WorkspaceSwitcher workspaces={workspaces} userProfile={userProfile} />
      </SidebarHeader>
      <SidebarContent>
        <NavWorkspaceCategories 
          categories={categories} 
          currentWorkspace={currentWorkspace}
          enableItemDrop={enableItemDrop}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userProfile} />
      </SidebarFooter>
    </Sidebar>
  )
}
