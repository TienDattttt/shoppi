export interface User {
    _id: string;
    username: string;
    email: string;
    role: 'admin' | 'partner' | 'user';
    status: 'active' | 'banned' | 'inactive';
    createdAt: string;
    avatar?: string;
}

export interface Shop {
    _id: string;
    name: string;
    ownerId: string;
    status: 'active' | 'pending' | 'rejected' | 'suspended';
    description?: string;
    address?: string;
    rating: number;
    revenue: number;
    products: number;
}

export interface Product {
    _id: string;
    name: string;
    price: number;
    stock: number;
    shopId: string;
    status: 'active' | 'draft' | 'deleted';
    category: string;
    images: string[];
}

export interface Order {
    _id: string;
    userId: string;
    shopId: string;
    total: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    createdAt: string;
    items: Array<{
        productId: string;
        quantity: number;
        price: number;
    }>;
}
