/*
  # Fix profiles table RLS policy

  1. Changes
    - Add RLS policy to allow new users to insert their own profile
    - This is required for the registration process to work correctly

  2. Security
    - Policy ensures users can only insert their own profile
    - Maintains existing RLS policies for other operations
*/

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);