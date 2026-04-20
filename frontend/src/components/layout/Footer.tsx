import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              MERC<span className="text-gray-500">ATUS</span>
            </span>
            <p className="mt-3 text-sm leading-relaxed max-w-md">
              Curated fashion for the modern individual. Quality materials, timeless
              designs, and sustainable practices.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Shop
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-sm hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/products?gender=men" className="text-sm hover:text-white transition-colors">
                  Men
                </Link>
              </li>
              <li>
                <Link to="/products?gender=women" className="text-sm hover:text-white transition-colors">
                  Women
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Account
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/login" className="text-sm hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-sm hover:text-white transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-sm hover:text-white transition-colors">
                  Order History
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm">
          &copy; {new Date().getFullYear()} Mercatus. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
