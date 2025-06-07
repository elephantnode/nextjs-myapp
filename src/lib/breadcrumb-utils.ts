import { BreadcrumbItemData } from "@/components/site-header"

export function generateBreadcrumbs({
  workspaceName,
  workspaceSlug,
  categoryName,
  categorySlug,
  itemTitle,
  itemId,
  isHomePage = false
}: {
  workspaceName?: string
  workspaceSlug?: string
  categoryName?: string
  categorySlug?: string
  itemTitle?: string
  itemId?: string
  isHomePage?: boolean
}): BreadcrumbItemData[] {
  const breadcrumbs: BreadcrumbItemData[] = []

  if (isHomePage) {
    breadcrumbs.push({
      label: "ホーム",
      isCurrentPage: true
    })
    return breadcrumbs
  }

  // ホームリンク
  breadcrumbs.push({
    label: "ホーム",
    href: "/protected"
  })

  // ワークスペース
  if (workspaceName && workspaceSlug) {
    const isWorkspaceCurrentPage = !categoryName && !itemTitle
    breadcrumbs.push({
      label: workspaceName,
      href: isWorkspaceCurrentPage ? undefined : `/workspace/${workspaceSlug}`,
      isCurrentPage: isWorkspaceCurrentPage
    })
  }

  // カテゴリー
  if (categoryName && categorySlug && workspaceSlug) {
    const isCategoryCurrentPage = !itemTitle
    breadcrumbs.push({
      label: categoryName,
      href: isCategoryCurrentPage ? undefined : `/workspace/${workspaceSlug}/${categorySlug}`,
      isCurrentPage: isCategoryCurrentPage
    })
  }

  // アイテム
  if (itemTitle && itemId && workspaceSlug && categorySlug) {
    breadcrumbs.push({
      label: itemTitle,
      isCurrentPage: true
    })
  }

  return breadcrumbs
} 