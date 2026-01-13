export interface RouteHandler<_TResponse = unknown, _TBody = unknown> {
    GET?: (req: Request) => Promise<Response> | Response;
    POST?: (req: Request) => Promise<Response> | Response;
    PUT?: (req: Request) => Promise<Response> | Response;
    DELETE?: (req: Request) => Promise<Response> | Response;
    PATCH?: (req: Request) => Promise<Response> | Response;
    OPTIONS?: (req: Request) => Promise<Response> | Response;
}