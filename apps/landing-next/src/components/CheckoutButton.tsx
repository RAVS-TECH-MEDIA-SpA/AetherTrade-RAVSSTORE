'use client';

declare var Paddle: any;

export default function CheckoutButton({ sku, price, email }: { sku: string, price: number, email?: string }) {
  const handleCheckout = () => {
    Paddle.Setup({ vendor: parseInt(process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID!) });
    Paddle.Checkout.open({
      method: 'checkout',
      product: sku, // ID del producto en Paddle o puedes usar 'prices'
      email: email,
      passthrough: JSON.stringify({ sku }), // Metadata para nuestro backend
      successCallback: (data: any) => console.log("Pago exitoso", data),
    });
  };

  return (
    <button onClick={handleCheckout} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold">
      PAGAR EN EUROS
    </button>
  );
}