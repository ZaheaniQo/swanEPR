import React, { useEffect, useState } from "react";
import { ShoppingCart, Star, Plus, Minus, X, Building2, User } from "lucide-react";
import { useTranslation, useApp } from "../AppContext";
import { dataService } from "../services/dataService";
import { Product, CartItem } from "../types";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=400";

const Ecommerce: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const items = await dataService.getProducts();
        setProducts(items.map(p => ({ ...p, price: p.price ?? p.avgCost ?? 0 })));
      } catch (err) {
        console.error(err);
        showToast(t("msg.error"), "error");
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [showToast, t]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { ...product, quantity: 1, price: product.price || 0 }];
    });
    showToast(`${product.name} added`, "success");
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id === id) return { ...item, quantity: Math.max(1, item.quantity + delta) };
        return item;
      })
    );
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = async (type: "B2B" | "B2C") => {
    if (cart.length === 0) return;
    try {
      await dataService.processOrder(cart, type);
      showToast(t("msg.stockSuccess"), "success");
      setCart([]);
      setIsCartOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t("msg.error"), "error");
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

  return (
    <div className="space-y-6 relative min-h-screen">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-teal-900/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="space-y-4 max-w-lg relative z-10">
          <h2 className="text-3xl font-bold tracking-tight">{t("ecommerce.heroTitle") || "Premium Medical Wear"}</h2>
          <p className="text-teal-100 text-lg">{t("ecommerce.heroText") || "High quality uniforms for professionals."}</p>
          <button className="bg-white text-teal-700 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-teal-50 transition-colors">
            {t("btn.viewCatalog")}
          </button>
        </div>
        <div className="hidden md:block relative z-10">
          <ShoppingCart size={140} className="text-teal-200 opacity-80 rotate-[-12deg]" />
        </div>
      </div>

      {/* Floating Cart Button */}
      <button
        onClick={() => setIsCartOpen(true)}
        className={`fixed bottom-8 z-40 bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:bg-slate-800 transition-all hover:scale-105 flex items-center justify-center group ${lang === "ar" ? "left-8" : "right-8"}`}
      >
        <ShoppingCart size={24} />
        {cart.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
            {cart.reduce((s, i) => s + i.quantity, 0)}
          </span>
        )}
      </button>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading && (
          <div className="col-span-full p-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
            {t("loading") || "Loading products..."}
          </div>
        )}
        {!loading && products.length === 0 && (
          <div className="col-span-full p-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
            {t("noData")}
          </div>
        )}
        {!loading &&
          products.map(product => (
            <div key={product.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <div className="relative h-64 overflow-hidden">
                <img src={product.image || PLACEHOLDER_IMG} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 relative z-10" />
                <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                  <Star size={12} className="text-amber-400 fill-amber-400" /> {product.rating || "4.5"}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-slate-800 mb-1 text-lg">{product.name}</h3>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-2xl font-bold text-teal-600">{(product.price || 0).toLocaleString()} {t("currency")}</span>
                  <button
                    onClick={() => addToCart(product)}
                    className="bg-slate-900 text-white p-3 rounded-xl hover:bg-teal-600 transition-colors shadow-md"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Cart Sidebar */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${isCartOpen ? "visible" : "invisible"}`}>
        <button
          type="button"
          aria-label="Close cart"
          className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isCartOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsCartOpen(false)}
        />

        <div className={`absolute top-0 bottom-0 ${lang === "ar" ? "left-0" : "right-0"} w-full max-w-md bg-white shadow-2xl transition-transform duration-300 transform ${isCartOpen ? "translate-x-0" : lang === "ar" ? "-translate-x-full" : "translate-x-full"} flex flex-col`}>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="text-teal-600" /> {t("ecommerce.cart") || "Shopping Cart"}
            </h2>
            <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                <p>{t("ecommerce.emptyCart") || "Cart is empty"}</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <img src={item.image || PLACEHOLDER_IMG} alt={item.name} className="w-20 h-20 object-cover rounded-lg bg-slate-100" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-slate-800 line-clamp-1">{item.name}</h4>
                      <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500">
                        <X size={16} />
                      </button>
                    </div>
                    <p className="text-teal-600 font-bold mb-3">{((item.price || 0) * item.quantity).toLocaleString()} {t("currency")}</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 rounded-md bg-slate-100 hover:bg-slate-200">
                        <Minus size={14} />
                      </button>
                      <span className="font-medium w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 rounded-md bg-slate-100 hover:bg-slate-200">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-6 bg-slate-50 border-t border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <span className="text-slate-500 font-medium">{t("ecommerce.total") || "Total"}</span>
                <span className="text-2xl font-bold text-slate-900">{totalAmount.toLocaleString()} {t("currency")}</span>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleCheckout("B2C")}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-300"
                >
                  <User size={18} /> {t("ecommerce.checkoutB2C") || "Consumer Checkout"}
                </button>
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-300"></div>
                  <span className="flex-shrink mx-2 text-slate-400 text-xs uppercase">OR</span>
                  <div className="flex-grow border-t border-slate-300"></div>
                </div>
                <button
                  onClick={() => handleCheckout("B2B")}
                  className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-200"
                >
                  <Building2 size={18} /> {t("ecommerce.checkoutB2B") || "Business Checkout"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ecommerce;
