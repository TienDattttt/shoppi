import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import ProductSearchPage from './ProductSearchPage';
import { vi } from 'vitest';

// Mock child components that might use contexts or be heavy
vi.mock('../../components/customer/product/ProductCard', () => ({
    ProductCard: ({ product }: any) => <div data-testid="product-card">{product.name}</div>
}));

describe('ProductSearchPage', () => {
    it('renders with search query', async () => {
        render(
            <MemoryRouter initialEntries={['/search?q=Laptop']}>
                <ProductSearchPage />
            </MemoryRouter>
        );

        // Should show loading state first (ProductListSkeleton)
        // Then mock data loads after 1s (in real app). 
        // For unit test, we might just check if title renders correctly
        expect(screen.getByText('Search results for "Laptop"')).toBeDefined();
    });

    it('renders default title when no query', () => {
        render(
            <MemoryRouter initialEntries={['/search']}>
                <ProductSearchPage />
            </MemoryRouter>
        );
        expect(screen.getByText('All Products')).toBeDefined();
    });
});
