"use client";
import type { Order } from "@/lib/types";

/** Our usual orders: starred ones first, kept short. */
export default function OrderChips({ orders, max = 5 }: { orders: Order[]; max?: number }) {
  const sorted = [...orders].sort((x, y) => Number(!!y.fav) - Number(!!x.fav));
  const extra = sorted.length - max;
  return (
    <div className="order-chips view">
      {sorted.slice(0, max).map((o) => (
        <span key={o.d} className={`order-chip ${o.fav ? "fav" : ""}`}>{o.fav && <i>★</i>}{o.d}</span>
      ))}
      {extra > 0 && <span className="order-more">+{extra} more</span>}
    </div>
  );
}

