import React, { useState } from 'react';
import { X, DollarSign, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';

interface TokenPurchaseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TokenPurchaseModal: React.FC<TokenPurchaseModalProps> = ({ onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card'>('paypal');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const tokenAmount = parseInt(amount) * 10; // $1 = 10 tokens

      // Crear transacción pendiente
      const { data: transaction, error: transactionError } = await supabase
        .from('virtual_currency_transactions')
        .insert({
          user_id: user.id,
          amount: tokenAmount,
          transaction_type: 'purchase',
          payment_method: paymentMethod,
          status: 'pending'
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Actualizar tokens del usuario inmediatamente (para demo)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coins: `coins + ${tokenAmount}` })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Actualizar estado de la transacción
      const { error: statusError } = await supabase
        .from('virtual_currency_transactions')
        .update({ status: 'completed' })
        .eq('id', transaction.id);

      if (statusError) throw statusError;

      // Redirigir al método de pago seleccionado
      if (paymentMethod === 'paypal') {
        window.open('https://paypal.me/Daniel13341?country.x=DO&locale.x=es_XC', '_blank');
      } else {
        alert('Por favor realiza el pago a la tarjeta: 5360 5810 9481 3898');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al procesar la compra:', error);
      alert('Error al procesar la compra. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const tokenPackages = [
    { amount: '5', tokens: 50 },
    { amount: '10', tokens: 100 },
    { amount: '20', tokens: 250 },
    { amount: '50', tokens: 750 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-gray-900 rounded-lg w-full max-w-sm overflow-hidden"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Comprar Tokens</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {tokenPackages.map((pkg) => (
              <button
                key={pkg.amount}
                type="button"
                onClick={() => setAmount(pkg.amount)}
                className={`p-2 rounded-lg border transition-colors ${
                  amount === pkg.amount
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-lg font-bold">${pkg.amount}</div>
                <div className="text-xs text-gray-400">{pkg.tokens} tokens</div>
              </button>
            ))}
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('paypal')}
              className={`flex-1 p-2 rounded-lg border flex items-center justify-center space-x-2 ${
                paymentMethod === 'paypal'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <DollarSign size={16} />
              <span className="text-sm">PayPal</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`flex-1 p-2 rounded-lg border flex items-center justify-center space-x-2 ${
                paymentMethod === 'card'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <CreditCard size={16} />
              <span className="text-sm">Tarjeta</span>
            </button>
          </div>

          <Button
            type="submit"
            isLoading={loading}
            disabled={!amount || loading}
            className="w-full"
          >
            Comprar Tokens
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default TokenPurchaseModal;