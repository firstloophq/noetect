import React, { createContext, useContext } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { RouteParams } from "@/hooks/useRouting";

type WorkspaceContextType = ReturnType<typeof useWorkspace>;

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

interface WorkspaceProviderProps {
    children: React.ReactNode;
    initialRoute?: RouteParams;
}

export function WorkspaceProvider({ children, initialRoute }: WorkspaceProviderProps) {
    const workspaceState = useWorkspace(initialRoute);
    
    return (
        <WorkspaceContext.Provider value={workspaceState}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspaceContext() {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error("useWorkspaceContext must be used within a WorkspaceProvider");
    }
    return context;
}