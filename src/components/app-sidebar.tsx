"use client"

import {
  LifeBuoy,
  Send,
} from "lucide-react"

import { WorkspaceSwitcher } from "@/components/nav/workspace-switcher"
import { NavWorkspaceCategories } from "@/components/nav/nav-workspace-categories"
import { NavSecondary } from "@/components/nav/nav-secondary"
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

const data = {
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
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
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userProfile} />
      </SidebarFooter>
    </Sidebar>
  )
}
