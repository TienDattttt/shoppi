import { Link } from "react-router-dom";

const TOP_SEARCHES = [
    { id: 1, name: "Ao Khoac Gio", count: "25k+ sold", image: "https://images.unsplash.com/photo-1551028919-ac7bcd45aa67?w=120&auto=format" },
    { id: 2, name: "Tai Nghe Bluetooth", count: "18k+ sold", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&auto=format" },
    { id: 3, name: "Op Lung iPhone", count: "15k+ sold", image: "https://images.unsplash.com/photo-1601593346740-925612772716?w=120&auto=format" },
    { id: 4, name: "Son Kem Li", count: "12k+ sold", image: "https://images.unsplash.com/photo-1617422275638-3a9615a77c78?w=120&auto=format" },
    { id: 5, name: "Giay Sneaker", count: "10k+ sold", image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=120&auto=format" },
    { id: 6, name: "Balo Laptop", count: "8k+ sold", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=120&auto=format" },
];

export function TopSearchSection() {
    return (
        <div className="bg-white rounded-sm shadow-sm p-4 mb-4">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-shopee-orange font-bold text-lg uppercase">Top Search</h3>
                <Link to="/top-products" className="text-shopee-orange text-sm font-medium">See all</Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {TOP_SEARCHES.map((item) => (
                    <Link key={item.id} to={`/search?q=${item.name}`} className="group relative block aspect-[3/4] rounded-sm overflow-hidden bg-gray-100">
                        <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2">
                            <div className="text-white font-medium text-sm line-clamp-1">{item.name}</div>
                            <div className="text-gray-300 text-xs">{item.count}</div>
                        </div>
                        {/* Top Badge */}
                        <div className="absolute top-0 left-0 bg-shopee-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-br-sm z-10">
                            TOP
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
