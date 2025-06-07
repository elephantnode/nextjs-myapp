"use client"

import { useState } from "react"
import { SidebarIcon, Search } from "lucide-react"
import { AISearchDrawer } from "@/components/ai-search-drawer"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"

export interface BreadcrumbItemData {
  label: string
  href?: string
  isCurrentPage?: boolean
}

interface SiteHeaderProps {
  workspaceId?: string
  workspaceName?: string
  breadcrumbItems?: BreadcrumbItemData[]
}

export function SiteHeader({ workspaceId, workspaceName, breadcrumbItems = [] }: SiteHeaderProps) {
  const { toggleSidebar } = useSidebar()
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false)

  return (
    <>
      <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
        <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
          <Button
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
          >
            <SidebarIcon />
          </Button>
          <Separator orientation="vertical" className="mr-2 h-4" />
          
          {breadcrumbItems.length > 0 && (
            <Breadcrumb className="hidden sm:block">
              <BreadcrumbList>
                {breadcrumbItems.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <BreadcrumbItem>
                      {item.isCurrentPage ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.href || "#"}>
                          {item.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          
          {/* AI検索ボタン */}
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchDrawerOpen(true)}
              className="gap-2"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">AI検索</span>
            </Button>
          </div>
        </div>
      </header>

      {/* AI検索ドロワー */}
      <AISearchDrawer
        open={searchDrawerOpen}
        onOpenChange={setSearchDrawerOpen}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
      />
    </>
  )
}
