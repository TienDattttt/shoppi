import ProductSearchPage from "./ProductSearchPage";

// Re-use ProductSearchPage logic for now, as Listing and Search are very similar
// In a real app, this might have different initial states or breadcrumbs
export default function ProductListingPage() {
    return <ProductSearchPage />;
}
// Note: Actually, ProductSearchPage is default exported, so we need to import it as default then re-export or wrap.
// Let's fix the import above.
