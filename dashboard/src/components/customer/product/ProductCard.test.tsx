import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProductCard } from './ProductCard';

const mockProduct = {
    id: "1",
    name: "Test Product",
    slug: "test-product",
    price: 100000,
    rating: 4.5,
    soldCount: 10,
    image: "test.jpg",
    shopLocation: "Hanoi"
};

describe('ProductCard', () => {
    it('renders product information correctly', () => {
        render(
            <BrowserRouter>
                <ProductCard product={mockProduct} />
            </BrowserRouter>
        );

        expect(screen.getByText('Test Product')).toBeDefined();
        expect(screen.getByText('100.000đ')).toBeDefined();
        expect(screen.getByText('Sold 10')).toBeDefined();
        expect(screen.getByText('Hanoi')).toBeDefined();
    });

    it('shows Mall badge when isMall is true', () => {
        render(
            <BrowserRouter>
                <ProductCard product={{ ...mockProduct, isMall: true }} />
            </BrowserRouter>
        );
        expect(screen.getByText('Mall')).toBeDefined();
    });
});
