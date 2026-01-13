import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import { useAgentsAPI } from "@/hooks/useAgentsAPI";
import type { AgentConfig } from "@/features/agents/index";
import { Bot, ChevronDown, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AgentSelectorProps {
    currentAgentId?: string;
    onAgentChange: (agentId: string) => void;
    disabled?: boolean;
}

export function AgentSelector({ currentAgentId, onAgentChange, disabled }: AgentSelectorProps) {
    const { currentTheme } = useTheme();
    const navigate = useNavigate();
    const api = useAgentsAPI();

    const [agents, setAgents] = useState<AgentConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadAgents() {
        try {
            const agentsList = await api.listAgents();
            setAgents(agentsList);
        } catch (error) {
            console.error("Failed to load agents:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const currentAgent = agents.find((a) => a.id === currentAgentId) || agents[0];

    if (isLoading || agents.length === 0) {
        return (
            <Button variant="ghost" size="sm" disabled className="gap-2">
                <Bot className="h-4 w-4" />
                <span>Loading...</span>
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="gap-2"
                    style={{ color: currentTheme.styles.contentSecondary }}
                >
                    <Bot className="h-4 w-4" />
                    <span className="max-w-[120px] truncate">{currentAgent?.name || "Select Agent"}</span>
                    <ChevronDown className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-[200px]"
                style={{
                    backgroundColor: currentTheme.styles.surfacePrimary,
                    borderColor: currentTheme.styles.borderDefault,
                }}
            >
                {agents.map((agent) => (
                    <DropdownMenuItem
                        key={agent.id}
                        onClick={() => onAgentChange(agent.id)}
                        className="flex items-center gap-2 cursor-pointer"
                        style={{ color: currentTheme.styles.contentPrimary }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.styles.surfaceAccent;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                    >
                        <Bot className="h-4 w-4" />
                        <span className="flex-1 truncate">{agent.name}</span>
                        {agent.id === currentAgentId && (
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: currentTheme.styles.semanticSuccess }}
                            />
                        )}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator style={{ backgroundColor: currentTheme.styles.borderDefault }} />
                <DropdownMenuItem
                    onClick={() => navigate("/agents")}
                    className="flex items-center gap-2 cursor-pointer"
                    style={{ color: currentTheme.styles.contentSecondary }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.styles.surfaceAccent;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                >
                    <Settings className="h-4 w-4" />
                    <span>Manage Agents</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
