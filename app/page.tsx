import Hero from "@/components/Hero";
import FeaturedProducts from "@/components/FeaturedProducts";
import CategoryShowcase from "@/components/CategoryShowcase";
import ProductGrid from "@/components/ProductGrid";
import { products } from "@/data/products";
import { FashionProduct } from "@/types";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedProducts />
      <CategoryShowcase />

      {/* Full collection grid */}
      <section className="py-24 px-4 sm:px-6 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <ProductGrid
            products={products as FashionProduct[]}
            title="Full Collection"
            subtitle="42 handpicked Indian fashion pieces — filter by occasion, gender, or search."
            showFilters
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-400 border-t border-white/5 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <p className="font-display text-xl font-bold tracking-widest text-white uppercase mb-3">
                West<span className="text-gold-400">side</span>
              </p>
              <p className="text-zinc-600 text-sm leading-relaxed">
                AI-powered luxury fashion. Dress for the life you want.
              </p>
            </div>
            {[
              { title: "Shop", links: ["New Arrivals", "Dresses", "Outerwear", "Shoes", "Accessories"] },
              { title: "Styling", links: ["AI Stylist", "Lookbooks", "Style Guides", "Trend Report"] },
              { title: "Support", links: ["Size Guide", "Shipping", "Returns", "Contact"] },
            ].map(({ title, links }) => (
              <div key={title}>
                <p className="text-xs font-semibold text-white tracking-widest uppercase mb-4">{title}</p>
                <ul className="space-y-2">
                  {links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm text-zinc-600 hover:text-zinc-300 transition-colors duration-200">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-zinc-700 text-xs tracking-wider">
              © 2026 WESTSIDE. All rights reserved.
            </p>
            <p className="text-zinc-700 text-xs tracking-wider">
              Powered by AI · Crafted with care
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
