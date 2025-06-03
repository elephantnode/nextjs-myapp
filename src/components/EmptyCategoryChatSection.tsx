"use client"
import ChatUI from "./ChatUI"

export default function EmptyCategoryChatSection({ workspaceName, workspaceId }: { workspaceName: string; workspaceId: string }) {
    console.log('EmptyCategoryChatSection props:', { workspaceName, workspaceId });
    console.log('workspaceId:', workspaceId);
    
    return <ChatUI workspaceInfo={{ workspaceName, workspaceId }} />
} 