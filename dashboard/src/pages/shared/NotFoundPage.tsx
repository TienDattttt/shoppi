import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
            <h1 className="text-9xl font-extrabold text-primary tracking-tighter">404</h1>
            <div className="bg-primary text-primary-foreground px-2 text-sm rounded rotate-12 absolute">
                Page Not Found
            </div>
            <p className="text-muted-foreground mt-8 text-lg max-w-sm">
                Sorry, the page you are looking for might have been removed, had its name changed or is temporarily unavailable.
            </p>
            <div className="flex gap-4 mt-8">
                <Button onClick={() => navigate(-1)} variant="outline">
                    Go Back
                </Button>
                <Button asChild>
                    <Link to="/">Go Home</Link>
                </Button>
            </div>
        </div>
    );
}
