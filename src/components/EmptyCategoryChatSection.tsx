"use client"
import ChatUI from "./ChatUI"

export default function EmptyCategoryChatSection({ workspaceName, workspaceId }: { workspaceName: string, workspaceId: string }) {
    const workspaceInfo = { workspaceName, workspaceId }
    
    return <ChatUI workspaceInfo={workspaceInfo} />
} 