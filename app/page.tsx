import Image from "next/image";
import Hero from "@/components/Hero";
import FeaturedProducts from "@/components/FeaturedProducts";
import CategoryShowcase from "@/components/CategoryShowcase";
import ProductGrid from "@/components/ProductGrid";
import { catalogueProducts } from "@/data/catalogue";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedProducts />
      <CategoryShowcase />

      {/* Full collection grid */}
      <section id="collection" className="py-20 px-4 sm:px-6 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <ProductGrid
            products={catalogueProducts}
            title="Full Collection"
            subtitle={`${catalogueProducts.length} Burnt Toast pieces — filter by category, gender, or search.`}
            showFilters
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <Image
                src="https://burnt-toast.com/cdn/shop/files/Logo-8_1.png"
                alt="Burnt Toast"
                width={120}
                height={40}
                className="h-10 w-auto object-contain mb-3 brightness-0 invert"
                style={{ width: "auto" }}
              />
              <p className="text-gray-500 text-sm leading-relaxed">
                Real style for real moments. Sometimes the most extraordinary things emerge from the unexpected.
              </p>
            </div>
            {[
              {
                title: "Shop",
                links: [
                  { label: "New Arrivals",  href: "/" },
                  { label: "Tops",          href: "/?category=Tops" },
                  { label: "Bottoms",       href: "/?category=Bottoms" },
                  { label: "Wishlist",      href: "/wishlist" },
                  { label: "My Cart",       href: "/cart" },
                ],
              },
              {
                title: "Styling",
                links: [
                  { label: "Ask Toastie",   href: "/chat" },
                  { label: "Y2K Looks",     href: "/chat" },
                  { label: "Campus Vibes",  href: "/chat" },
                  { label: "Night Out",     href: "/chat" },
                ],
              },
              {
                title: "Support",
                links: [
                  { label: "Size Guide",    href: "#size-guide" },
                  { label: "Shipping Info", href: "#shipping" },
                  { label: "Returns",       href: "#returns" },
                  { label: "Contact Us",    href: "#contact" },
                ],
              },
            ].map(({ title, links }) => (
              <div key={title}>
                <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-4">{title}</p>
                <ul className="space-y-2">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <a href={href} className="text-sm text-gray-600 hover:text-gray-300 transition-colors duration-200">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-xs tracking-wider">© 2026 Burnt Toast · Made by Nikita</p>
            <p className="text-gray-600 text-xs tracking-wider">AI-Powered Fashion Stylist</p>
          </div>
        </div>
      </footer>
    </>
  );
}
