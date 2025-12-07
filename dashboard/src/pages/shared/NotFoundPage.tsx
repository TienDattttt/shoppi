import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
            <div className="bg-white p-8 rounded-lg shadow-sm max-w-md w-full flex flex-col items-center">
                <div className="h-20 w-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="h-10 w-10 text-shopee-orange" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
                <p className="text-gray-500 mb-8">
                    The page you are looking for does not exist or has been moved.
                </p>
                <div className="flex gap-4 w-full">
                    <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                        Go Back
                    </Button>
                    <Button className="flex-1 bg-shopee-orange hover:bg-shopee-orange-hover" onClick={() => navigate('/')}>
                        Go Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
