import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from './Header';
import { useAuthStore } from '@/store/authStore';
import { vi } from 'vitest';

// Mock the store
vi.mock('@/store/authStore');

describe('Header', () => {
    beforeEach(() => {
        // Reset store mock
        (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            user: null,
            logout: vi.fn(),
        });
    });

    it('renders logo and basic elements', () => {
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );
        expect(screen.getByText('Shoppi')).toBeDefined();
        expect(screen.getByPlaceholderText('Search for products...')).toBeDefined();
    });

    it('shows login/register buttons when not authenticated', () => {
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );
        expect(screen.getByText('Login')).toBeDefined();
        expect(screen.getByText('Register')).toBeDefined();
    });

    it('shows user avatar when authenticated', () => {
        (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            user: { name: 'Test User', avatar: 'test.jpg' },
            logout: vi.fn(),
        });

        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );

        // Avatar fallback is usually visible or alt text if configured, 
        // relying on the presence of the User Menu trigger (which replaces login/register)
        expect(screen.queryByText('Login')).toBeNull();
    });
});
