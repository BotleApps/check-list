
SELECT 
  t.template_id,
  t.name as template_name,
  t.created_at,
  tg.group_id,
  tg.name as group_name,
  ti.text as item_text,
  ti.group_id as item_group_id
FROM templates t
LEFT JOIN template_groups tg ON t.template_id = tg.template_id
LEFT JOIN template_items ti ON t.template_id = ti.template_id
WHERE t.created_at > NOW() - INTERVAL '1 hour'
ORDER BY t.created_at DESC, tg.order_index, ti.order_index;

