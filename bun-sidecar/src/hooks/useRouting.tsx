import { useCallback, useContext, createContext, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export interface RouteParams {
    plugin: string;
    view?: string;
    id?: string;
    [key: string]: string | undefined;
}

type RoutingContextType = {
    currentPath: string;
    navigate: (path: string) => void;
    getPathParams: (pattern: string) => Record<string, string> | null;
    matchesPath: (pattern: string) => boolean;
    updateUrl: (params: RouteParams) => void;
};

const RoutingContext = createContext<RoutingContextType | undefined>(undefined);

// This provider now wraps React Router's functionality
export function RoutingProvider({ children }: { children: ReactNode }) {
    const routerNavigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    const navigate = useCallback(
        (path: string) => {
            routerNavigate(path);
        },
        [routerNavigate]
    );

    const getPathParams = useCallback(
        (pattern: string) => {
            const patternParts = pattern.split("/");
            const pathParts = currentPath.split("/");
            const params: Record<string, string> = {};

            if (patternParts.length !== pathParts.length) {
                return null;
            }

            for (let i = 0; i < patternParts.length; i++) {
                const patternPart = patternParts[i];
                const pathPart = pathParts[i];

                if (patternPart?.startsWith("[") && patternPart?.endsWith("]")) {
                    const paramName = patternPart.slice(1, -1);
                    params[paramName] = pathPart || "";
                } else if (patternPart !== pathPart) {
                    return null;
                }
            }

            return params;
        },
        [currentPath]
    );

    const matchesPath = useCallback(
        (pattern: string) => {
            const result = getPathParams(pattern) !== null;
            return result;
        },
        [getPathParams]
    );

    const updateUrl = useCallback(
        (params: RouteParams) => {
            const newPath = createPluginPath(params);
            navigate(newPath);
        },
        [navigate]
    );

    const value: RoutingContextType = {
        currentPath,
        navigate,
        getPathParams,
        matchesPath,
        updateUrl,
    };

    return <RoutingContext.Provider value={value}>{children}</RoutingContext.Provider>;
}

export function useRouting() {
    const ctx = useContext(RoutingContext);
    if (!ctx) {
        throw new Error("useRouting must be used within a RoutingProvider");
    }
    return ctx;
}

export function createPluginPath(params: RouteParams): string {
    const { plugin, view, id, ...otherParams } = params;

    let path = `/${plugin}`;
    const searchParamsObj = new URLSearchParams();

    if (view) searchParamsObj.set("view", view);
    if (id) searchParamsObj.set("id", id);

    Object.entries(otherParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParamsObj.set(key, value);
        }
    });

    const queryString = searchParamsObj.toString();
    if (queryString) {
        path += `?${queryString}`;
    }

    return path;
}
