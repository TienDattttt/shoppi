import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                        <AlertCircle className="h-10 w-10 text-destructive" />
                    </div>
                    <div className="max-w-md space-y-2">
                        <h2 className="text-xl font-semibold">Something went wrong</h2>
                        <p className="text-sm text-muted-foreground">
                            An error occurred while rendering this component. Try refreshing the page or contact support if the issue persists.
                        </p>
                        {this.state.error && (
                            <pre className="mt-4 max-h-[200px] overflow-auto rounded bg-muted p-4 text-left text-xs text-muted-foreground">
                                {this.state.error.message}
                            </pre>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => {
                            this.setState({ hasError: false, error: undefined });
                            window.location.reload();
                        }}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reload Page
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
