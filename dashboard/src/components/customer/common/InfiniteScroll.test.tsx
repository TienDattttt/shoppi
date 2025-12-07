import { render, screen } from '@testing-library/react';
import { InfiniteScroll } from './InfiniteScroll';
import { vi } from 'vitest';

describe('InfiniteScroll', () => {
    it('renders loading state when isLoading is true', () => {
        render(<InfiniteScroll onLoadMore={() => { }} hasMore={true} isLoading={true} />);
        expect(screen.getByText('Loading more...')).toBeDefined();
    });

    it('does not render loading state when isLoading is false', () => {
        render(<InfiniteScroll onLoadMore={() => { }} hasMore={true} isLoading={false} />);
        const loader = screen.queryByText('Loading more...');
        expect(loader).toBeNull();
    });
});
