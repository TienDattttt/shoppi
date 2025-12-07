import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
    return (
        <footer className="bg-muted/30 pt-16 pb-8 border-t">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                            <span>🛍️</span> Shoppi
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            The best place to find everything you need at the best prices. Quality and satisfaction guaranteed.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></a>
                            <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>
                            <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                            <li><Link to="/products" className="hover:text-primary transition-colors">Shop All</Link></li>
                            <li><Link to="/flash-sale" className="hover:text-primary transition-colors">Flash Sale</Link></li>
                            <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    {/* Customer Service */}
                    <div>
                        <h4 className="font-semibold mb-4">Customer Service</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link to="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
                            <li><Link to="/returns" className="hover:text-primary transition-colors">Returns & Refunds</Link></li>
                            <li><Link to="/shipping" className="hover:text-primary transition-colors">Shipping Policy</Link></li>
                            <li><Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="font-semibold mb-4">Contact Us</h4>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> 123 Shoppi Street, HCM City
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="h-4 w-4" /> +84 123 456 789
                            </li>
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4" /> support@shoppi.com
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t pt-8 text-center text-sm text-muted-foreground">
                    <p>© 2025 Shoppi. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
