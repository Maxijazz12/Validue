-- Normalize old baseline category values to unified evidence taxonomy
-- "interest" → "willingness" (solution-seeking behavior maps to willingness)
-- "payment" → "price" (spending behavior maps to price)
UPDATE questions SET category = 'willingness' WHERE category = 'interest';
UPDATE questions SET category = 'price' WHERE category = 'payment';
