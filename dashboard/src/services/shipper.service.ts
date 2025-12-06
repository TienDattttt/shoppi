import api from "./api";

export interface Shipper {
    _id: string;
    name: string;
    phone: string;
    email: string;
    area: string;
    status: "active" | "inactive" | "banned";
    totalDeliveries: number;
    successRate: number;
    rating: number;
    avatar?: string;
}

export const shipperService = {
    getAllShippers: async () => {
        try {
            const response = await api.get("/shippers");
            return response.data;
        } catch (error) {
            console.error("Fetch shippers error", error);
            return {
                data: [
                    { _id: "shp1", name: "Tran Van Ship", phone: "0987654321", email: "ship1@example.com", area: "District 1", status: "active", totalDeliveries: 1540, successRate: 98, rating: 4.9 },
                    { _id: "shp2", name: "Le Thi Fast", phone: "0987654322", email: "ship2@example.com", area: "District 3", status: "active", totalDeliveries: 890, successRate: 95, rating: 4.7 },
                    { _id: "shp3", name: "Nguyen Van Slow", phone: "0987654323", email: "ship3@example.com", area: "District 5", status: "inactive", totalDeliveries: 120, successRate: 85, rating: 3.5 },
                ],
                total: 3
            };
        }
    },

    getShipperById: async (id: string) => {
        try {
            const response = await api.get(`/shippers/${id}`);
            return response.data;
        } catch (error) {
            console.error("Fetch shipper detail error", error);
            return {
                _id: id,
                name: "Tran Van Ship",
                phone: "0987654321",
                email: "ship1@example.com",
                area: "District 1",
                status: "active",
                totalDeliveries: 1540,
                successRate: 98,
                rating: 4.9,
                avatar: "https://github.com/shadcn.png",
                history: [
                    { id: "del1", orderId: "ORD-001", date: "2023-11-20", status: "delivered", earnings: 15000 },
                    { id: "del2", orderId: "ORD-005", date: "2023-11-19", status: "delivered", earnings: 20000 },
                ]
            };
        }
    },

    updateShipperStatus: async (id: string, status: string) => {
        return new Promise(resolve => setTimeout(resolve, 500));
    },

    createShipper: async (data: Partial<Shipper>) => {
        return api.post("/shippers", data);
    },

    updateShipper: async (id: string, data: Partial<Shipper>) => {
        return api.put(`/shippers/${id}`, data);
    }
};
