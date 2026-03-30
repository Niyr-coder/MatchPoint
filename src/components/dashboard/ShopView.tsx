"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ShoppingBag,
  ShoppingCart,
  X,
  Plus,
  Minus,
  Package,
  Users,
  BookOpen,
  Tag,
  CheckCircle,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"

type ProductCategory = "equipment" | "membership" | "class" | "other"

interface Product {
  id: string
  club_id: string
  name: string
  description: string | null
  price: number
  category: ProductCategory
  stock: number
  image_url: string | null
  is_active: boolean
  created_at: string
}

interface CartItem {
  product: Product
  quantity: number
}

interface ShopViewProps {
  userId: string
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "equipment", label: "Equipamiento" },
  { value: "membership", label: "Membresías" },
  { value: "class", label: "Clases" },
  { value: "other", label: "Otros" },
]

const CATEGORY_ICONS: Record<ProductCategory, React.ElementType> = {
  equipment: Package,
  membership: Users,
  class: BookOpen,
  other: Tag,
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(price)
}

export function ShopView({ userId: _userId }: ShopViewProps) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState("")
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  const loadProducts = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeCategory) params.set("category", activeCategory)

    fetch(`/api/shop/products?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { products?: Product[] }) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [activeCategory])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const confirmOrder = async () => {
    if (!cart.length || ordering) return
    setOrdering(true)

    try {
      const items = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        product_name: item.product.name,
      }))

      const r = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })

      if (r.ok) {
        setCart([])
        setCartOpen(false)
        setOrderSuccess(true)
        router.refresh()
        loadProducts()
        setTimeout(() => setOrderSuccess(false), 5000)
      }
    } catch {
      // silent — user can retry
    } finally {
      setOrdering(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="TIENDA"
        title="Tienda"
        description="Equipamiento, membresías y clases de tu club"
        action={
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <ShoppingCart className="size-4" />
            <span>Carrito</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 size-5 bg-blue-700 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        }
      />

      {/* Success banner */}
      {orderSuccess && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="size-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-800">Pedido confirmado</p>
            <p className="text-xs text-green-600">
              Tu pedido ha sido enviado. El club se pondrá en contacto contigo.
            </p>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeCategory === cat.value
                ? "bg-zinc-900 text-white"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border border-[#e5e5e5] rounded-2xl overflow-hidden">
              <div className="h-40 bg-zinc-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-zinc-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-zinc-100 rounded animate-pulse w-1/2" />
                <div className="h-8 bg-zinc-100 rounded-xl animate-pulse mt-3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="El club aún no tiene productos disponibles"
          description="Cuando el club publique productos, aparecerán aquí para que puedas adquirirlos."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const CategoryIcon = CATEGORY_ICONS[product.category] ?? Tag
            const cartItem = cart.find((c) => c.product.id === product.id)
            const isOutOfStock = product.stock === 0

            return (
              <div
                key={product.id}
                className="border border-[#e5e5e5] rounded-2xl overflow-hidden bg-white hover:border-zinc-300 transition-colors"
              >
                {/* Product image / placeholder */}
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="h-40 bg-zinc-50 flex items-center justify-center">
                    <CategoryIcon className="size-10 text-zinc-200" />
                  </div>
                )}

                <div className="p-4 flex flex-col gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      {CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category}
                    </span>
                    <p className="text-sm font-bold text-zinc-900 mt-0.5 leading-snug">
                      {product.name}
                    </p>
                    {product.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-base font-black text-zinc-900">
                      {formatPrice(product.price)}
                    </p>
                    {product.stock > 0 && product.stock !== -1 && (
                      <p className="text-[10px] text-zinc-400 font-medium">
                        {product.stock} disponibles
                      </p>
                    )}
                  </div>

                  {cartItem ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(product.id, -1)}
                        className="size-8 rounded-lg border border-[#e5e5e5] flex items-center justify-center hover:bg-zinc-50 transition-colors"
                        aria-label="Reducir cantidad"
                      >
                        <Minus className="size-3.5 text-zinc-600" />
                      </button>
                      <span className="flex-1 text-center text-sm font-bold text-zinc-800">
                        {cartItem.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(product.id, 1)}
                        className="size-8 rounded-lg border border-[#e5e5e5] flex items-center justify-center hover:bg-zinc-50 transition-colors"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus className="size-3.5 text-zinc-600" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className="w-full py-2 rounded-xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isOutOfStock ? "Sin stock" : "Agregar"}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Cart drawer overlay */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-black/30"
            onClick={() => setCartOpen(false)}
            aria-label="Cerrar carrito"
          />

          {/* Drawer */}
          <div className="relative w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#e5e5e5]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  PEDIDO
                </p>
                <h2 className="text-xl font-black text-zinc-900 leading-none">Carrito</h2>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
                aria-label="Cerrar"
              >
                <X className="size-5 text-zinc-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <ShoppingCart className="size-10 text-zinc-200" />
                  <p className="text-sm font-bold text-zinc-400">El carrito está vacío</p>
                  <p className="text-xs text-zinc-300">Agrega productos para continuar</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-3 p-3 border border-[#e5e5e5] rounded-xl"
                    >
                      <div className="size-10 rounded-lg bg-zinc-50 flex items-center justify-center shrink-0">
                        {(() => {
                          const Icon = CATEGORY_ICONS[item.product.category] ?? Tag
                          return <Icon className="size-5 text-zinc-300" />
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-800 truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {formatPrice(item.product.price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="size-6 rounded-lg border border-[#e5e5e5] flex items-center justify-center hover:bg-zinc-50"
                          aria-label="Reducir"
                        >
                          <Minus className="size-3 text-zinc-500" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-zinc-700">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="size-6 rounded-lg border border-[#e5e5e5] flex items-center justify-center hover:bg-zinc-50"
                          aria-label="Aumentar"
                        >
                          <Plus className="size-3 text-zinc-500" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="size-6 rounded-lg hover:bg-red-50 flex items-center justify-center ml-1"
                          aria-label="Eliminar"
                        >
                          <X className="size-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-[#e5e5e5] space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-500">Total</p>
                  <p className="text-xl font-black text-zinc-900">{formatPrice(cartTotal)}</p>
                </div>
                <button
                  onClick={() => void confirmOrder()}
                  disabled={ordering}
                  className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {ordering ? "Procesando..." : "Confirmar Pedido"}
                </button>
                <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
                  El club revisará tu pedido y se pondrá en contacto contigo para coordinar el pago y la entrega.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
