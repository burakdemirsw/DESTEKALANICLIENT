/** Tanıtım sayfasındaki (/home) referans markası */
export interface CustomerReference {
  name: string;
  category: string;
  /** Marka sitesi; yoksa null (ad bağlantısız gösterilir) */
  url: string | null;
}

/**
 * Raf Takip WMS kullanan markalar — raftakip.com "Referanslar" bölümüyle aynı liste ve sıra
 * (kaynak: Landing reposu, src/app/core/services/customers.data.ts). Orada marka eklenir ya da
 * çıkarılırsa burası da güncellenir.
 */
export const CUSTOMER_REFERENCES: CustomerReference[] = [
  { name: 'Esra Helvacı', category: 'Kadın giyim', url: 'https://www.esrahelvaci.com' },
  { name: 'Void', category: 'Streetwear giyim', url: 'https://voidtr.com' },
  { name: 'Levidor', category: 'Tesettür ve kadın giyim', url: 'https://www.levidor.com.tr' },
  { name: 'Antioch', category: 'Erkek ve kadın giyim', url: 'https://www.antiochmen.com' },
  { name: 'Vamos', category: 'Streetwear erkek giyim', url: 'https://vamosclo.com' },
  { name: 'Assur', category: 'Elektrikli el aletleri', url: 'https://www.assurplus.com.tr' },
  { name: 'Cigit', category: 'Bebek ve çocuk giyim', url: 'https://www.cigit.com.tr' },
  { name: 'Olcay Store', category: 'Tesettür giyim', url: 'https://www.olcaystore.com' },
  { name: 'Levidor Toptan', category: 'Toptan tesettür giyim ve aksesuar', url: 'https://www.levidor.com.tr' },
  { name: 'Antioch Toptan', category: 'Toptan erkek ve kadın giyim', url: 'https://www.antiochmen.com' },
  { name: 'Vamos Toptan', category: 'Toptan streetwear erkek giyim', url: 'https://vamosclo.com' },
  { name: 'Polar Star Jr', category: 'Çocuk oyuncak ve aksesuar', url: 'https://polarstarjr.com' },
  { name: 'Davye', category: 'Diş hekimliği malzemeleri', url: 'https://www.davye.com' },
  { name: 'Hafka Giyim', category: 'Erkek giyim', url: 'https://www.hafkagiyim.com' },
  { name: 'Ahel Tasarım', category: 'Kadın giyim', url: 'https://www.aheltasarim.com.tr' },
  { name: 'Atlas Kırtasiye', category: 'Kırtasiye, kitap ve oyuncak', url: 'https://atlaskirtasiye.com' },
  { name: 'Five Scarf', category: 'Şal ve eşarp', url: 'https://www.fivescarf.com' },
  { name: 'Lijuri', category: 'Kadın giyim', url: 'https://www.lijuri.com' },
  { name: 'Sobe İstanbul', category: 'Toptan kadın giyim', url: 'https://www.instagram.com/sobe_istanbul/' },
  { name: 'Outfit Man', category: 'Erkek giyim', url: 'https://www.outfit-man.com' },
  { name: 'Osteos Wear', category: 'Erkek giyim', url: 'https://osteoswear.com' },
  { name: 'Melih Günal Ecza Deposu', category: 'Ecza deposu ve ilaç dağıtımı', url: null },
  { name: 'Miss Rouge', category: 'Kadın giyim', url: 'https://www.missrouge.com.tr' },
  { name: 'Daymod', category: 'Kadın ve çocuk çorapları', url: 'https://www.daymod.com' },
  { name: 'Explosion', category: 'Kadın giyim', url: 'https://www.explosion.com.tr' },
  { name: 'Lizge', category: 'Kadın giyim', url: 'https://www.lizge.com.tr' },
  { name: 'İmza', category: 'Klasik erkek giyim', url: 'https://imza.com.tr' },
  { name: 'Kadir Büyükkaya', category: 'Erkek giyim', url: 'https://kadirbuyukkayashop.com' },
  { name: 'Manu Atelier', category: 'Lüks çanta ve aksesuar', url: 'https://tr.manuatelier.com' },
  { name: 'Monamise', category: 'Ev giyim', url: 'https://www.monamise.com.tr' },
  { name: 'Ahlemden', category: 'Tesettür giyim', url: 'https://ahlemden.com' },
  { name: 'Elele Baby', category: 'Anne bebek ürünleri', url: 'https://www.elelebaby.com/' },
  { name: 'Erşan Giyim', category: 'Kadın giyim', url: 'https://ersangiyim.com/' },
];
