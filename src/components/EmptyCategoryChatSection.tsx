"use client"
import ChatUI from "./ChatUI"

export default function EmptyCategoryChatSection({ workspaceName, workspaceId }: { workspaceName: string, workspaceId: string }) {
    console.log('=== EmptyCategoryChatSection DEBUG ===');
    console.log('workspaceName:', workspaceName);
    console.log('workspaceId:', workspaceId);
    
    return <ChatUI workspaceName={workspaceName} workspaceId={workspaceId} />
} 