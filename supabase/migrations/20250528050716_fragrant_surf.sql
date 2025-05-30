/*
  # Add RLS policies for virtual currency transactions
  
  1. Changes
    - Add RLS policies for virtual_currency_transactions table
    - Allow users to view and manage their own transactions
    - Allow system to create transactions
  
  2. Security
    - Enable RLS on virtual_currency_transactions table
    - Add appropriate security policies
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own transactions" ON virtual_currency_transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON virtual_currency_transactions;

-- Create policies for virtual_currency_transactions
CREATE POLICY "Users can view their own transactions"
  ON virtual_currency_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions"
  ON virtual_currency_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON virtual_currency_transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);