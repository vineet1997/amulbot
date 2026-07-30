update amulbot.products
set product_url = 'https://shop.amul.com/en/product/amul-chocolate-whey-protein-gift-pack-34-g-or-pack-of-10-sachets'
where sku = 'WPCCP06_01';

insert into amulbot.products (sku, name, package_label, product_url, price_inr, active)
values
  ('WPW32_30', 'Amul Whey Protein', '32 g × 30 sachets', 'https://shop.amul.com/en/product/amul-whey-protein-32-g-or-pack-of-30-sachets', 2400, true),
  ('WPW32_60', 'Amul Whey Protein', '32 g × 60 sachets', 'https://shop.amul.com/en/product/amul-whey-protein-32-g-or-pack-of-60-sachets', 4200, true),
  ('HPL200_30', 'Amul High Protein Plain Lassi', '200 mL × 30', 'https://shop.amul.com/en/product/amul-high-protein-plain-lassi-200-ml-or-pack-of-30', 900, true),
  ('HPR200_30', 'Amul High Protein Rose Lassi', '200 mL × 30', 'https://shop.amul.com/en/product/amul-high-protein-rose-lassi-200-ml-or-pack-of-30', 900, true),
  ('HPB200_30', 'Amul High Protein Buttermilk', '200 mL × 30', 'https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-30', 900, true),
  ('HPM250_32', 'Amul High Protein Milk', '250 mL × 32', 'https://shop.amul.com/en/product/amul-high-protein-milk-250-ml-or-pack-of-32', 3520, true)
on conflict (sku) do update set
  name = excluded.name,
  package_label = excluded.package_label,
  product_url = excluded.product_url,
  price_inr = excluded.price_inr,
  active = excluded.active;
