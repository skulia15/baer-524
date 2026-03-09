CREATE TABLE shopping_item_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES house(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('added', 'bought', 'deleted')),
  item_name text NOT NULL,
  household_id uuid REFERENCES household(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shopping_item_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users read shopping log" ON shopping_item_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth users insert shopping log" ON shopping_item_log FOR INSERT TO authenticated WITH CHECK (true);
