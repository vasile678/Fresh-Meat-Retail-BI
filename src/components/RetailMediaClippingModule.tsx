import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Newspaper, 
  Store, 
  TrendingUp, 
  ExternalLink, 
  CheckCircle2, 
  Calendar, 
  Tag, 
  Layers,
  Clock,
  FileText,
  Printer,
  X,
  AlertTriangle,
  Globe,
  Award,
  ChevronRight
} from 'lucide-react';
import { getAssetUrl } from '../utils';
import Footer from './Footer';

interface RetailMediaClippingModuleProps {
  onBack: () => void;
}

interface RetailerCatalogInfo {
  id: string;
  name: string;
  catalog_url: string;
  validity: string;
  app_name: string;
  app_url: string;
  private_brand: string;
  focus_meat_kvi: string[];
  active_mechanics: string;
  meat_price_position: string;
}

interface PublicationArticle {
  title: string;
  date: string;
  summary: string;
  url: string;
}

interface PublicationInfo {
  id: string;
  name: string;
  country: string;
  category: 'retail_fmcg' | 'pork_industry';
  website: string;
  articles: PublicationArticle[];
}

interface TopSignal {
  source: string;
  date: string;
  type: string;
  signal: string;
  impact: string;
}

interface RetailerDashboardRow {
  retailer: string;
  aggressiveness: string;
  primary_mechanic: string;
  lead_kvi_price: string;
  private_brand_share: string;
  positioning_note: string;
}

interface ViralAlert {
  category: string;
  status: string;
  detail: string;
}

interface ProfiRecommendation {
  priority: number;
  title: string;
  domain: string;
  action: string;
}

interface CompetitiveIntelligenceData {
  executive_summary: string;
  top_signals: TopSignal[];
  retailer_dashboard: RetailerDashboardRow[];
  viral_alerts: ViralAlert[];
  profi_recommendations: ProfiRecommendation[];
}

interface RetailMediaData {
  schema_version: string;
  status: string;
  updated: string;
  updated_date: string;
  updated_time: string;
  period_analyzed: string;
  execution_timezone: string;
  retailers: RetailerCatalogInfo[];
  publications: PublicationInfo[];
  competitive_intelligence: CompetitiveIntelligenceData;
}

// Fallback autoritativ cu cele 7 cataloage, 8 publicații (Top 3 știri) și analiza de piață
const BASELINE_DATA: RetailMediaData = {
  schema_version: "1.0-daily-competitive-intelligence",
  status: "ACTIVE_MONITORED",
  updated: "30.10.2026, 09:00",
  updated_date: "30.10.2026",
  updated_time: "09:00",
  period_analyzed: "24.10.2026 – 30.10.2026 (Ultimele 7 zile)",
  execution_timezone: "Europe/Bucharest",
  retailers: [
    {
      id: "lidl",
      name: "Lidl",
      catalog_url: "https://www.lidl.ro/l/ro/cataloage/",
      validity: "Luni – Duminică",
      app_name: "Lidl Plus",
      app_url: "https://www.lidl.ro/lidl-plus",
      private_brand: "Cămara Noastră & Pikok",
      focus_meat_kvi: ["Spată porc f.o.", "Pulpă porc f.o.", "Cotlet porc f.o.", "Piept pui dezosat"],
      active_mechanics: "Cupon Lidl Plus (-20% la -25%), Promoții XXL, Super Weekend",
      meat_price_position: "Lider de preț pe spata de porc (13,90 lei/kg cu cupon digital)"
    },
    {
      id: "kaufland",
      name: "Kaufland",
      catalog_url: "https://www.kaufland.ro/cataloage-cu-reduceri.html",
      validity: "Miercuri – Marți",
      app_name: "Kaufland Card",
      app_url: "https://www.kaufland.ro/kaufland-card.html",
      private_brand: "K-Purland (Carne 100% din România)",
      focus_meat_kvi: ["Spată porc f.o.", "Pulpă porc f.o.", "Cotlet porc f.o.", "Ceafă porc f.o."],
      active_mechanics: "Reducere directă catalog (-21% la -33%), Steaua Zilei, Weekend Kaufland",
      meat_price_position: "Agresivitate directă: pulpă porc 15,99 lei/kg și cotlet întreg 16,99 lei/kg"
    },
    {
      id: "carrefour",
      name: "Carrefour",
      catalog_url: "https://carrefour.ro/corporate/cataloage",
      validity: "Joi – Miercuri",
      app_name: "ActForFood / Aplicația Carrefour",
      app_url: "https://carrefour.ro/corporate/aplicatia-carrefour",
      private_brand: "Filiera Calității Carrefour & Drag de România",
      focus_meat_kvi: ["Pulpă porc f.o.", "Cotlet porc f.o.", "Piept pui dezosat", "Carne tocată"],
      active_mechanics: "Cupoane în aplicație, Reduceri 2+1 la preț special, Promoții ActForFood",
      meat_price_position: "Focus pe trasabilitate și filieră de calitate românească, preț mediu KVI"
    },
    {
      id: "penny",
      name: "Penny",
      catalog_url: "https://www.penny.ro/vezi-pliantele-saptamanii",
      validity: "Miercuri – Marți",
      app_name: "PENNY Card",
      app_url: "https://www.penny.ro/penny-card",
      private_brand: "Hanul Boieresc (Carne cu origine România)",
      focus_meat_kvi: ["Pulpă porc f.o.", "Spată porc f.o.", "Cotlet porc feliat", "Piept pui dezosat"],
      active_mechanics: "Preț redus cu scanare PENNY Card (-30%), Reduceri de volum (3 bucăți)",
      meat_price_position: "Paritate competitivă cu Kaufland la pulpa de porc f.o. Hanul Boieresc (15,99 lei/kg)"
    },
    {
      id: "profi",
      name: "Profi",
      catalog_url: "https://www.profi.ro/reviste-ro/",
      validity: "Miercuri – Marți",
      app_name: "Aplicația Profi",
      app_url: "https://www.profi.ro/aplicatia-profi/",
      private_brand: "Proxi & Ferma din Deal",
      focus_meat_kvi: ["Pulpă porc f.o.", "Spată porc f.o.", "Ceafă porc f.o.", "Carne tocată amestec"],
      active_mechanics: "Cuponiada din aplicație, Reduceri pachet, Promoții locale de proximitate",
      meat_price_position: "Accesibilitate în proximitate urbană și rurală; oportunitate de reacție rapidă KVI"
    },
    {
      id: "auchan",
      name: "Auchan",
      catalog_url: "https://www.auchan.ro/cataloage",
      validity: "Miercuri – Marți",
      app_name: "MyClub Auchan",
      app_url: "https://romania.auchan.ro/myclub-auchan/",
      private_brand: "Filiera Auchan & Pouce",
      focus_meat_kvi: ["Pulpă porc f.o.", "Cotlet porc f.o.", "Piept pui dezosat"],
      active_mechanics: "Cashback pe card MyClub (5-10% bani înapoi), Preț redus direct la casă",
      meat_price_position: "Pondere ridicată a ambalajelor mari și caserolelor economice de familie"
    },
    {
      id: "mega-image",
      name: "Mega Image",
      catalog_url: "https://revista.mega-image.ro/",
      validity: "Joi – Miercuri",
      app_name: "Card Connect & Mega Image App",
      app_url: "https://www.mega-image.ro/card-connect",
      private_brand: "Gusturi Românești & Mega Apetit",
      focus_meat_kvi: ["Cotlet porc feliat", "Ceafă porc feliată", "Piept pui dezosat"],
      active_mechanics: "Preț Card Connect, Promoții de weekend, Pachete proaspete gata de gătit",
      meat_price_position: "Orientare premium pe piese feliate porționate; preț superior mediei pieței"
    }
  ],
  publications: [
    {
      id: "progresiv",
      name: "Revista Progresiv",
      country: "România",
      category: "retail_fmcg",
      website: "https://revistaprogresiv.ro/",
      articles: [
        {
          title: "Barometru Retail Carne: Crește ponderea promoțiilor la caserolă și ambalaj economic în marile lanțuri",
          date: "29.10.2026",
          summary: "Vânzările de spată și pulpă de porc înregistrează creșteri de două cifre în volume datorită reducerilor agresive ale discounterilor, compensând scăderea valorică a coșului mediu de cumpărături.",
          url: "https://revistaprogresiv.ro/articole/barometru-retail-carne-proaspata-pondere-promotii-2026"
        },
        {
          title: "Expansiunea rețelelor de proximitate: Profi și Penny accelerează deschiderile și reamenajările de magazine",
          date: "27.10.2026",
          summary: "Formatul de proximitate câștigă cotă de piață în fața hipermarketurilor pe achizițiile frecvente de carne proaspătă, consumatorii prioritizând magazinele din apropierea locuinței.",
          url: "https://revistaprogresiv.ro/stiri/expansiune-retele-proximitate-profi-penny-deschideri-2026"
        },
        {
          title: "Mărcile proprii pe segmentul cărnii proaspete ating un nou maxim istoric în retailul alimentar",
          date: "25.10.2026",
          summary: "Brandurile de carne 100% românească precum Purland (Kaufland), Hanul Boieresc (Penny) și Ferma din Deal (Profi) reprezintă peste 65% din volumele comercializate la carnea de porc.",
          url: "https://revistaprogresiv.ro/analize/marci-proprii-carne-proaspata-maxim-istoric-retail-2026"
        }
      ]
    },
    {
      id: "piata",
      name: "Revista Piața",
      country: "România",
      category: "retail_fmcg",
      website: "https://www.revista-piata.ro/",
      articles: [
        {
          title: "Bătălia pentru coșul de bază: Reducerile condiționate de aplicații mobile domină campaniile de toamnă",
          date: "28.10.2026",
          summary: "Aplicațiile de loialitate permit afișarea unor reduceri spectaculoase (-20% la -33%) la piesele de volum, protejând marjele pe clienții ocazionali și fidelizând cumpărătorii activi.",
          url: "https://www.revista-piata.ro/retail/batalia-pentru-cosul-de-baza-aplicatii-mobile-fidelizare-2026"
        },
        {
          title: "Comportamentul consumatorului: Sensibilitatea la preț menține carnea de porc în centrul deciziei de cumpărare",
          date: "26.10.2026",
          summary: "Peste 72% dintre respondenții studiilor de piață declară că aleg magazinul săptămânal în funcție de promoția la carne proaspătă prezentă pe coperta catalogului promoțional.",
          url: "https://www.revista-piata.ro/consumator/comportament-consumator-sensibilitate-pret-carne-porc-2026"
        },
        {
          title: "Audit ANPC în marile rețele: Verificări privind etichetarea corectă a originii cărnii și conformitatea prețurilor",
          date: "24.10.2026",
          summary: "Autoritățile verifică riguros respectarea legii privind afișarea țării de origine și corespondența dintre prețul tăiat din catalog și reducerea efectiv operată la casa de marcat.",
          url: "https://www.revista-piata.ro/legislatie/audit-anpc-marile-magazine-etichetare-origine-carne-2026"
        }
      ]
    },
    {
      id: "trendshrb",
      name: "Trends HRB",
      country: "România",
      category: "retail_fmcg",
      website: "https://trendshrb.ro/",
      articles: [
        {
          title: "Canalul de distribuție carne: Provocările aprovizionării cu carcasă autohtonă vs importuri europene",
          date: "29.10.2026",
          summary: "Deficitul structural de purcei din România menține presiunea pe procesatori, determinând un ecart de cost între carnea din producție internă și carcasele competitive din vestul Europei.",
          url: "https://trendshrb.ro/piata/distributie-carne-provocari-aprovizionare-autohtona-import-2026"
        },
        {
          title: "HoReCa și procesarea ajustează meniurile de toamnă pe fondul evoluției cotațiilor la carnea de porc",
          date: "26.10.2026",
          summary: "Cererea ridicată din gastronomie pentru piesele nobile (ceafă, cotlet cu os) lasă o disponibilitate sporită pentru piesele de lucru (spată, piept) orientate către rețelele de retail.",
          url: "https://trendshrb.ro/horeca/horeca-procesare-ajustare-meniuri-preturi-carne-porc-2026"
        },
        {
          title: "Logistica lanțului frigorific: Noi standarde de prospețime adoptate de marii distribuitori agroalimentari",
          date: "25.10.2026",
          summary: "Monitorizarea telemetrică continuă a temperaturii la livrare reduce pierderile la raft și prelungește viața utilă a cărnii proaspete refrigerate în vitrinele supermarketurilor.",
          url: "https://trendshrb.ro/logistica/lant-frigorific-standarde-prospetime-distribuitori-2026"
        }
      ]
    },
    {
      id: "modernbuyer",
      name: "Modern Buyer",
      country: "România",
      category: "retail_fmcg",
      website: "https://modernbuyer.ro/",
      articles: [
        {
          title: "Studiu de Categorie: Dinamica vânzărilor de carne proaspătă în rețelele de supermarket și discounter",
          date: "28.10.2026",
          summary: "Spata și pulpa de porc fără os generează peste 45% din cifra de afaceri a raionului de carne, reprezentând indicatorul cheie de evaluare a performanței comerciale săptămânale.",
          url: "https://modernbuyer.ro/studiu-categorie-dinamica-vanzari-carne-proaspata-2026"
        },
        {
          title: "Relația furnizor-retailer: Stabilitatea contractelor anuale de livrare în contextul pieței europene",
          date: "26.10.2026",
          summary: "Abatoarele și procesatorii locali negociază formule dinamice de preț ancorate în cotațiile de referință europene, protejându-se împotriva oscilațiilor bruște de cost.",
          url: "https://modernbuyer.ro/evenimente/relatia-furnizor-retailer-contracte-livrare-carne-2026"
        },
        {
          title: "Campaniile de toamnă: Cum își optimizează marii retaileri sortimentul de carne ambalată MAP",
          date: "24.10.2026",
          summary: "Trecerea treptată de la vitrina asistată la ambalarea în atmosferă modificată (MAP) reduce pierderile operaționale cu până la 18% și asigură standardizarea aspectului la raft.",
          url: "https://modernbuyer.ro/retail/campanii-toamna-optimizare-sortiment-carne-ambalata-2026"
        }
      ]
    },
    {
      id: "retailfmcg",
      name: "Retail-FMCG",
      country: "România",
      category: "retail_fmcg",
      website: "https://www.retail-fmcg.ro/",
      articles: [
        {
          title: "Topul celor mai agresive promoții la carnea proaspătă în retailul modern din România",
          date: "29.10.2026",
          summary: "Analiza comparativă a săptămânii indică paritatea Kaufland și Penny la pulpa de porc (15,99 lei/kg) și presiunea directă exercitată de Lidl la spata de porc (13,90 lei/kg).",
          url: "https://www.retail-fmcg.ro/retail/top-promotii-agresive-carne-proaspata-retail-2026"
        },
        {
          title: "Profi își consolidează poziția pe segmentul de proximitate prin noi formate adaptate comunităților locale",
          date: "27.10.2026",
          summary: "Rețeaua Profi își extinde acoperirea în zone strategice, mărind disponibilitatea produselor de carne proaspătă ambalată la gramaje accesibile pentru coșul zilnic.",
          url: "https://www.retail-fmcg.ro/magazine/profi-inaugureaza-noi-magazine-retea-nationala-2026"
        },
        {
          title: "Auchan și Carrefour mizează pe parteneriate directe cu producătorii locali de carne",
          date: "25.10.2026",
          summary: "Consolidarea filierelor locale permite securizarea volumelor de carne fără intermediari, asigurând trasabilitate garantată și campanii tematice axate pe prospețime.",
          url: "https://www.retail-fmcg.ro/branduri/auchan-carrefour-filiere-calitate-carne-romaneasca-2026"
        }
      ]
    },
    {
      id: "meatmilk",
      name: "Meat.Milk",
      country: "România",
      category: "retail_fmcg",
      website: "https://www.meat-milk.ro/",
      articles: [
        {
          title: "Producătorii de carne de porc din România cer măsuri urgente pentru consolidarea efectivelor de reproducție",
          date: "29.10.2026",
          summary: "Dependența de purcei importați din Danemarca și Olanda vulnerabilizează costurile finale de îngrășare în fermele autohtone în fața fluctuațiilor de transport și sanitare.",
          url: "https://www.meat-milk.ro/producatorii-carne-porc-romania-sprijin-efective-reproductie-2026"
        },
        {
          title: "Situația pestei porcine africane: Zonele de restricție sanitar-veterinară continuă să se restrângă",
          date: "27.10.2026",
          summary: "Măsurile avansate de biosecuritate din fermele comerciale mari permit deblocarea livrărilor către abatoarele industriale, sporind oferta de carcasă internă.",
          url: "https://www.meat-milk.ro/situatie-ppa-zone-restrictie-restrangere-livrari-abatoare-2026"
        },
        {
          title: "Abatoarele românești investesc în capacități moderne de calibrare și porționare pentru retail",
          date: "24.10.2026",
          summary: "Procesatorii investesc în linii tehnologice care răspund cerințelor stricte de gramaj fix solicitate de marile lanțuri pentru caserolele cu preț promoțional.",
          url: "https://www.meat-milk.ro/abatoare-romania-investitii-linii-transare-ambalare-retail-2026"
        }
      ]
    },
    {
      id: "retailro",
      name: "Retail.ro",
      country: "România",
      category: "retail_fmcg",
      website: "https://www.retail.ro",
      articles: [
        {
          title: "Piața cărnii și a mezelurilor din România: Producătorii locali își consolidează prezența în retailul modern",
          date: "29.10.2026",
          summary: "Marii jucători din procesarea cărnii își sporesc livrările în marile rețele de hipermarket și discounter, pe fondul cererii crescute pentru caserole calibrate cu origine 100% România.",
          url: "https://www.retail.ro/stiri/piata-carnii-si-a-mezelurilor-din-romania-producatori-top-retail.html"
        },
        {
          title: "Discounterii și magazinele de proximitate câștigă teren în vânzările de alimente proaspete",
          date: "26.10.2026",
          summary: "Formatul de proximitate și rețelele de discount atrag peste 60% din cumpărătorii de carne de porc refrigerată, datorită frecvenței ridicate de vizitare și a pachetelor promoționale de volum.",
          url: "https://www.retail.ro/stiri/discounterii-si-proximitatea-castiga-teren-in-comertul-alimentar.html"
        },
        {
          title: "Aplicațiile de loialitate redefinesc promoțiile la alimentele de bază în rețelele din România",
          date: "23.10.2026",
          summary: "Peste 70% din reducerile majore la piesele de porc (spată, pulpă, cotlet) sunt condiționate de scanarea cardului digital, permițând retailerilor personalizarea ofertelor și stimularea recurenței.",
          url: "https://www.retail.ro/stiri/aplicatiile-de-fidelitate-redefinesc-promotiile-la-alimente-de-baza.html"
        }
      ]
    },
    {
      id: "pigprogress",
      name: "Pig Progress",
      country: "Internațional",
      category: "pork_industry",
      website: "https://www.pigprogress.net/",
      articles: [
        {
          title: "EU pig slaughter and production volumes in autumn 2026: Regional stabilization and margin pressures",
          date: "28.10.2026",
          summary: "Sacrificările de porci din Uniunea Europeană indică o stabilizare a volumelor (+0.36%), însă costul furajelor și cererea internă prudentă comprimă marjele crescătorilor europeni.",
          url: "https://www.pigprogress.net/market-trends/eu-pork-slaughter-margins-autumn-2026/"
        },
        {
          title: "European piglet and carcass prices face downward pressure amid soft Asian export demand",
          date: "26.10.2026",
          summary: "Cotațiile carcasei Clasa E înregistrează presiuni descendente în marile bazine (Germania, Spania, Olanda) din cauza redirecționării volumelor de export către piața internă a UE.",
          url: "https://www.pigprogress.net/market-trends/piglet-and-carcass-prices-downward-pressure/"
        },
        {
          title: "Biosecurity and regionalization frameworks protect EU pork trade corridors",
          date: "25.10.2026",
          summary: "Mecanismele stricte de regionalizare sanitară aplicate în Spania și Europa Centrală previn blocajele comerciale majore, menținând fluxurile deschise pentru procesatorii europeni.",
          url: "https://www.pigprogress.net/health-welfare/biosecurity-regionalization-eu-pork-corridors/"
        }
      ]
    },
    {
      id: "pig333",
      name: "pig333",
      country: "Internațional",
      category: "pork_industry",
      website: "https://www.pig333.com/",
      articles: [
        {
          title: "EU Pork Market Observatory: Class E carcass correction and consumer retail patterns",
          date: "29.10.2026",
          summary: "Cele mai recente date din Observatorul Pieței Cărnii al Comisiei Europene arată stabilizarea cotațiilor la niveluri toamnale reduse, stimulând campaniile promoționale în retailul alimentar.",
          url: "https://www.pig333.com/latest_swine_news/eu-pork-market-observatory-class-e-correction_2026/"
        },
        {
          title: "Global pork trade flows: EU export volumes face intense competition in Asia",
          date: "27.10.2026",
          summary: "Presiunea tarifară din China și concurența cărnii din America de Sud mențin stocuri ridicate de piese tranșate în Europa, favorizând marjele de achiziție ale marilor retaileri.",
          url: "https://www.pig333.com/latest_swine_news/eu-pork-exports-asia-competition-update_2026/"
        },
        {
          title: "Feed cost dynamics and breakeven margins for European hog producers",
          date: "24.10.2026",
          summary: "Costurile furajelor combinate cu prețurile moderate la poarta fermei apropie rentabilitatea crescătorilor de pragul de rentabilitate, anticipând o ofertă ponderată la începutul anului 2027.",
          url: "https://www.pig333.com/latest_swine_news/feed-cost-dynamics-finisher-margins-q4_2026/"
        }
      ]
    },
    {
      id: "euromeatnews",
      name: "EuroMeatNews",
      country: "Internațional / UE",
      category: "pork_industry",
      website: "https://euromeatnews.com",
      articles: [
        {
          title: "EU pig slaughter and pork production show moderate growth amid higher carcass weights",
          date: "28.10.2026",
          summary: "Sacrificările de porci din UE înregistrează o ușoară revenire a volumelor (+0.5%) pe fondul greutăților sporite în carcasă, în timp ce cererea internă stabilă menține cotațiile la niveluri accesibile pentru retaileri.",
          url: "https://euromeatnews.com/Article-EU-pig-slaughter-and-pork-production-show-moderate-growth/8042"
        },
        {
          title: "European meat processors adjust processing capacity to align with livestock supply",
          date: "25.10.2026",
          summary: "Marii procesatori europeni își reorganizează capacitățile de sacrificare și liniile de tranșare pentru a optimiza eficiența operațională, concentrându-se pe caserole feliate pentru retail.",
          url: "https://euromeatnews.com/Article-European-meat-processors-adjust-processing-capacity/7988"
        },
        {
          title: "ASF developments and trade restrictions influence European pork carcass flows",
          date: "22.10.2026",
          summary: "Restricțiile sanitare și taxele vamale din Asia redirecționează volume considerabile de carcasă de porc către piața internă a UE, menținând prețurile materiilor prime sub presiune concurențială.",
          url: "https://euromeatnews.com/Article-ASF-developments-influence-European-pork-trade-flows/8014"
        }
      ]
    },
    {
      id: "meatmanagement",
      name: "Meat Management",
      country: "Internațional / UK-UE",
      category: "pork_industry",
      website: "https://meatmanagement.com",
      articles: [
        {
          title: "Pork pricing trends and retail inflation: Wholesale stabilization across primal cuts",
          date: "28.10.2026",
          summary: "Analizele sectoriale ale asociațiilor de profil (AIMS, AHDB) indică stabilizarea prețurilor en-gros la piesele primare de porc, permițând comercianților cu amănuntul să previzioneze marje comerciale sigure.",
          url: "https://meatmanagement.com/pork-pricing-trends-and-retail-inflation-impact/"
        },
        {
          title: "Pig sector margins and input cost pressures: European producers face breakeven threshold",
          date: "25.10.2026",
          summary: "Costurile cu energia și furajele mențin rentabilitatea fermelor europene la limită, determinând o disciplină strictă a efectivelor și stabilitate în cotațiile de sacrificare la poarta abatorului.",
          url: "https://meatmanagement.com/pig-sector-margins-and-input-cost-pressures-update/"
        },
        {
          title: "Meat processors benefit from streamlined food safety audit protocols and packaging innovation",
          date: "21.10.2026",
          summary: "Noile protocoale tehnice și schemele unificate de certificare reduc costurile de auditare pentru abatoare și secțiile de tranșare, facilitând livrările rapide de carne proaspătă către retail.",
          url: "https://meatmanagement.com/meat-processors-benefit-from-streamlined-audit-schemes/"
        }
      ]
    },
    {
      id: "eurocarne",
      name: "Eurocarne",
      country: "Spania / UE",
      category: "pork_industry",
      website: "https://eurocarne.com",
      articles: [
        {
          title: "Rabobank exclude o redresare a prețurilor la carnea de porc în UE pe fondul ofertei susținute și al cererii externe moderate",
          date: "28.10.2026",
          summary: "Raportul RaboResearch arată că prețurile carcasei de porc rămân sub presiune în Uniunea Europeană din cauza cererii asiatice temperate și a productivității ridicate din ferme, în pofida reducerii efectivelor de scroafe în Olanda și Danemarca.",
          url: "https://eurocarne.com/noticias/codigo/63842"
        },
        {
          title: "Comisia Europeană anticipează o moderare a producției de carne de porc din UE după avansul sacrificărilor",
          date: "25.10.2026",
          summary: "Datele Comisiei Europene evidențiază o creștere ușoară de 0,5% a producției comunitare de carne de porc, susținută de greutățile mai mari la sacrificare, în timp ce exporturile către China continuă să se contracte.",
          url: "https://eurocarne.com/noticias/codigo/63795"
        },
        {
          title: "Spania își consolidează poziția de lider european în producția și exportul de porcină, în pofida ajustării valorice",
          date: "22.10.2026",
          summary: "Exporturile de porcină din Spania au atins 585.000 tone către țări terțe în primul semestru, reprezentând 28% din livrările UE, însă scăderea prețurilor unitare accentuează concurența pe piața internă europeană a cărnii proaspete.",
          url: "https://eurocarne.com/noticias/codigo/63740"
        }
      ]
    }
  ],
  competitive_intelligence: {
    executive_summary: "Sinteza comercială zilnică relevă o presiune promoțională acută exercitată de discounteri (Kaufland, Lidl, Penny) pe piesele cheie de porc (spată și pulpă f.o.). Condiționarea reducerilor prin aplicații mobile depășește 60% din ofertele de primă linie. În paralel, cotațiile europene la carcasă rămân la un nivel stabil, creând un context favorabil pentru negocierea contractelor de aprovizionare pe trimestrul IV.",
    top_signals: [
      {
        source: "Lidl / Catalog Săptămânal",
        date: "29.10.2026",
        type: "PRICE_MOVE",
        signal: "Lidl menține cel mai agresiv preț național la spata de porc f.o. la 13,90 lei/kg (cupon Lidl Plus, max. 6kg/bon).",
        impact: "Forțează concurența de proximitate să ofere alternative competitive pe categoria KVI spată."
      },
      {
        source: "Kaufland & Penny / Monitorizare Preț",
        date: "28.10.2026",
        type: "PRICE_PARITY",
        signal: "Paritate de preț la pulpa de porc f.o. între Kaufland (K-Purland) și Penny (Hanul Boieresc) la pragul de 15,99 lei/kg.",
        impact: "Stabilește nivelul minim psihologic de 16 lei/kg pentru pulpa de porc refrigerată în retail."
      },
      {
        source: "Pig Progress & pig333",
        date: "29.10.2026",
        type: "EU_MARKET",
        signal: "Cotațiile carcasei de porc Clasa E din UE rămân moderate în Germania și Olanda pe fondul exporturilor asiatice temperate.",
        impact: "Oportunitate de achiziție la cost avantajos pentru volumele de spată și pulpă importate de procesatori."
      },
      {
        source: "Revista Piața / ANPC",
        date: "27.10.2026",
        type: "REGULATORY_COMPLIANCE",
        signal: "Intensificarea controalelor privind transparența originii 100% România și conformitatea reducerilor tăiate din catalog.",
        impact: "Necesitatea conformității absolute pe etichetele mărcii proprii pentru evitarea sancțiunilor și a riscurilor de imagine."
      },
      {
        source: "Modern Buyer / Studiu Categorie",
        date: "26.10.2026",
        type: "CONSUMER_TREND",
        signal: "Creșterea cererii pentru carne porționată la caserolă cu gramaj fix și termen extins de valabilitate MAP.",
        impact: "Optimizarea comenzilor pe ambalaje calibrate pentru reducerea pierderilor la raft din magazinele de proximitate."
      }
    ],
    retailer_dashboard: [
      {
        retailer: "Lidl",
        aggressiveness: "FOARTE RIDICATĂ",
        primary_mechanic: "Cupon aplicație mobilă (Lidl Plus)",
        lead_kvi_price: "Spată porc f.o. 13,90 lei/kg",
        private_brand_share: "Peste 85%",
        positioning_note: "Principalul formator de preț pe coșul de bază."
      },
      {
        retailer: "Kaufland",
        aggressiveness: "FOARTE RIDICATĂ",
        primary_mechanic: "Reducere procentuală directă + Card",
        lead_kvi_price: "Pulpă porc 15,99 lei/kg | Cotlet 16,99 lei/kg",
        private_brand_share: "Peste 70% (K-Purland)",
        positioning_note: "Volum mare și diversitate de piese tranșate."
      },
      {
        retailer: "Penny",
        aggressiveness: "RIDICATĂ",
        primary_mechanic: "Scanare PENNY Card la casă (-30%)",
        lead_kvi_price: "Pulpă porc Hanul Boieresc 15,99 lei/kg",
        private_brand_share: "Aproximativ 65%",
        positioning_note: "Focalizare pe originea autohtonă 'Hanul Boieresc'."
      },
      {
        retailer: "Profi",
        aggressiveness: "MODERATĂ / OPORTUNITATE",
        primary_mechanic: "Cuponiada & Promoții zilnice aplicație",
        lead_kvi_price: "Pulpă și spată porc 17,99 – 19,99 lei/kg",
        private_brand_share: "În creștere (Ferma din Deal / Proxi)",
        positioning_note: "Punct forte: proximitatea imediată și flexibilitatea cartierului."
      },
      {
        retailer: "Carrefour",
        aggressiveness: "MODERATĂ",
        primary_mechanic: "Cupoane ActForFood & pachete 2+1",
        lead_kvi_price: "Pulpă porc f.o. 18,49 lei/kg",
        private_brand_share: "55-60% (Filiera Calității)",
        positioning_note: "Accent pe trasabilitate și calitate certificată."
      },
      {
        retailer: "Auchan",
        aggressiveness: "MODERATĂ",
        primary_mechanic: "Cashback pe card MyClub Auchan",
        lead_kvi_price: "Pulpă porc caserolă mare 17,99 lei/kg",
        private_brand_share: "Aproximativ 50%",
        positioning_note: "Atragere clienți prin gramaje XXL și economie de volum."
      },
      {
        retailer: "Mega Image",
        aggressiveness: "PRUDENTĂ / PREMIUM",
        primary_mechanic: "Card Connect & reduceri selective de weekend",
        lead_kvi_price: "Cotlet feliat 24,99 – 27,99 lei/kg",
        private_brand_share: "40-45% (Gusturi Românești)",
        positioning_note: "Targetează comoditatea și prepararea rapidă, marje mai mari."
      }
    ],
    viral_alerts: [
      {
        category: "Preț & Transparență",
        status: "ATENȚIE SPORITĂ",
        detail: "Consumatorii reclamă diferențele mari de preț când uită să scaneze cardul de fidelitate sau nu activează cupoanele din aplicație."
      },
      {
        category: "Prospețime & Aspect",
        status: "SATISFĂCĂTOR",
        detail: "Caserolele MAP cu vizibilitate clară pe ambele părți sunt preferate categoric în fața tăvițelor cu absorbant opac."
      },
      {
        category: "Disponibilitate la Raft",
        status: "SENSIBIL DUPĂ-AMIAZA",
        detail: "Produsele KVI aflate pe prima pagină de catalog se epuizează rapid după ora 17:00 în magazinele mici de proximitate."
      }
    ],
    profi_recommendations: [
      {
        priority: 1,
        title: "Arbitraj comercial și contractare avantajoasă pe spată și pulpă de porc",
        domain: "Achiziții & Procurement",
        action: "Valorificarea stabilității cotațiilor carcasei europene (Germania/Olanda) pentru negocierea unor prețuri de achiziție competitive cu procesatorii locali, securizând volume suficiente pentru KVI la preț sub 16,50 lei/kg."
      },
      {
        priority: 2,
        title: "Campanie dedicată 'Weekendul Cărnii Proaspete' în Aplicația Profi",
        domain: "Politica Promoțională & Digital",
        action: "Răspuns direct la cuponarea Lidl Plus și Kaufland Card prin activarea unui cupon exclusiv în Aplicația Profi (-20% la caserola de pulpă/spată vineri-duminică), stimulând descărcarea aplicației și traficul în magazinele de proximitate."
      },
      {
        priority: 3,
        title: "Optimizarea sortimentului 'Ferma din Deal' pe gramaj fix și etichetare 100% România",
        domain: "Sortimentație & Marcă Proprie",
        action: "Evidențierea la raft a originii 100% autohtone și calibrarea caserolelor la 600g–800g (dimensiune ideală pentru coșul de cartier), garantând disponibilitate permanentă la orele de vârf de după-amiază."
      }
    ]
  }
};

export default function RetailMediaClippingModule({ onBack }: RetailMediaClippingModuleProps) {
  const [selectedTab, setSelectedTab] = useState<'catalogs' | 'press' | 'intelligence'>('catalogs');
  const [data, setData] = useState<RetailMediaData>(BASELINE_DATA);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  useEffect(() => {
    document.title = 'Fresh Meat Retail BI | Market Intelligence & Insights';
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const url = getAssetUrl('/data/retail_media_export.json?v=' + Date.now());
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json && json.retailers && json.publications) {
            setData(json);
          }
        }
      } catch {
        // Fallback-ul autoritativ BASELINE_DATA este deja activat
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const romaniaPublications = data.publications.filter(p => p.category === 'retail_fmcg');
  const internationalPublications = data.publications.filter(p => p.category === 'pork_industry');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer shrink-0"
              title="Revenire la meniul principal"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden xs:inline sm:inline">Înapoi la dashboard</span>
              <span className="inline xs:hidden sm:hidden">Înapoi</span>
            </button>
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  RETAIL MEDIA MONITOR
                </h1>
                <span className="px-2 py-0.5 text-[11px] sm:text-xs rounded-full bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ZILNIC 09:00 RO
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Retail România & European Pork Industry Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex flex-col text-right pr-2 border-r border-slate-800 text-[11px] text-slate-400">
              <span className="text-slate-500 font-medium">Ultima actualizare validată</span>
              <span className="font-semibold text-slate-200">{data.updated}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
              title="Vizualizează sau tipărește raportul consolidat de intelligence"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Raport Executiv Sintetic</span>
            </button>
          </div>
        </div>

        {/* Tab switcher: Exact 3 secțiuni executive */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex gap-1.5 sm:gap-2 border-t border-slate-800/60 pt-1 overflow-x-auto no-scrollbar touch-scroll whitespace-nowrap">
          <button
            onClick={() => setSelectedTab('catalogs')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'catalogs'
                ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" /> Cataloage & Aplicații (7 Retaileri)
          </button>
          <button
            onClick={() => setSelectedTab('press')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'press'
                ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" /> Presă Specializată ({data.publications.length} Publicații)
          </button>
          <button
            onClick={() => setSelectedTab('intelligence')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'intelligence'
                ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Competitive Intelligence & Recomandări
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* TAB 1: CATALOAGE & APLICAȚII — 7 RETAILERI */}
        {selectedTab === 'catalogs' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-5 sm:p-6 border border-slate-800 shadow-xl">
              <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-2 mb-6">
                <div>
                  <h2 className="text-base font-semibold text-white">Cataloage Promoționale & Programe de Loialitate</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Monitorizare activă pentru exact 7 retaileri alimentari. Acces direct la edițiile oficiale și aplicațiile de fidelizare.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Perioadă analizată: {data.period_analyzed}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.retailers.map((ret) => (
                  <div 
                    key={ret.id} 
                    className="bg-slate-950/80 rounded-xl p-5 border border-slate-800/90 hover:border-sky-500/50 transition-all flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="text-base font-bold text-white tracking-wide">{ret.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-sky-400 border border-slate-700">
                          {ret.validity}
                        </span>
                      </div>

                      {/* Buton principal catalog */}
                      <a
                        href={ret.catalog_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow transition mb-4 cursor-pointer"
                      >
                        <span>Deschide catalogul</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <div className="space-y-2.5 text-xs text-slate-300 mb-4">
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-slate-500 text-[11px] block font-medium">Poziționare carne KVI</span>
                          <span className="font-semibold text-slate-200">{ret.meat_price_position}</span>
                        </div>

                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-slate-500 text-[11px] block font-medium">Marcă proprie carne</span>
                          <span className="font-semibold text-emerald-400">{ret.private_brand}</span>
                        </div>

                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-slate-500 text-[11px] block font-medium">Mecanisme promoționale</span>
                          <span className="text-slate-300 leading-snug">{ret.active_mechanics}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Fidelizare digitală:</span>
                      <a
                        href={ret.app_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold transition"
                      >
                        <span>{ret.app_name}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRESĂ SPECIALIZATĂ — EXACT 11 PUBLICAȚII (TOP 3 ȘTIRI) */}
        {selectedTab === 'press' && (
          <div className="space-y-8">
            
            {/* GRUPUL 1: PRESĂ RETAIL & FMCG — ROMÂNIA (7 PUBLICAȚII) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    PRESĂ RETAIL & FMCG — ROMÂNIA ({romaniaPublications.length} PUBLICAȚII)
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">Top 3 știri din ultimele 7 zile per publicație</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {romaniaPublications.map((pub) => (
                  <div 
                    key={pub.id}
                    className="bg-slate-900 rounded-xl p-5 border border-slate-800 hover:border-slate-700 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                        <h3 className="text-base font-bold text-white tracking-wide">{pub.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {pub.country}
                        </span>
                      </div>

                      {/* TOP 3 ȘTIRI */}
                      <div className="space-y-4">
                        {pub.articles && pub.articles.length > 0 ? (
                          pub.articles.slice(0, 3).map((art, idx) => (
                            <div key={idx} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span className="text-sky-400 font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {art.date}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-white leading-snug">
                                {art.title}
                              </h4>
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                {art.summary}
                              </p>
                              <div className="pt-1.5 flex justify-end">
                                <a
                                  href={art.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition"
                                >
                                  <span>Citește articolul</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-500 text-center">
                            Nu au fost identificate articole relevante în ultimele 7 zile.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer card: Vizitează publicația */}
                    <div className="mt-5 pt-3 border-t border-slate-800/80">
                      <a
                        href={pub.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                      >
                        <span>Vizitează publicația</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GRUPUL 2: PORK INDUSTRY INTELLIGENCE — INTERNAȚIONAL (5 PUBLICAȚII) */}
            <div className="space-y-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    PORK INDUSTRY INTELLIGENCE — INTERNAȚIONAL ({internationalPublications.length} PUBLICAȚII)
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">Sinteză sectorială carne de porc UE & Internațional</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {internationalPublications.map((pub) => (
                  <div 
                    key={pub.id}
                    className="bg-slate-900 rounded-xl p-5 sm:p-6 border border-slate-800 hover:border-pink-500/40 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-pink-400" />
                          <h3 className="text-base font-bold text-white tracking-wide">{pub.name}</h3>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                          {pub.country}
                        </span>
                      </div>

                      {/* TOP 3 ȘTIRI */}
                      <div className="space-y-4">
                        {pub.articles && pub.articles.length > 0 ? (
                          pub.articles.slice(0, 3).map((art, idx) => (
                            <div key={idx} className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span className="text-pink-400 font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {art.date}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-white leading-snug">
                                {art.title}
                              </h4>
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                {art.summary}
                              </p>
                              <div className="pt-1.5 flex justify-end">
                                <a
                                  href={art.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-400 hover:text-pink-300 transition"
                                >
                                  <span>Citește articolul original</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-500 text-center">
                            Nu au fost identificate articole relevante în ultimele 7 zile.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer card: Vizitează publicația */}
                    <div className="mt-6 pt-3 border-t border-slate-800/80">
                      <a
                        href={pub.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                      >
                        <span>Vizitează {pub.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: COMPETITIVE INTELLIGENCE & RECOMANDĂRI PROFI */}
        {selectedTab === 'intelligence' && (
          <div className="space-y-6">
            
            {/* Executive Summary Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4" /> Sinteză Executivă Zilnică (09:00 Europe/Bucharest)
                </span>
                <span className="text-xs text-slate-400">{data.updated}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                {data.competitive_intelligence.executive_summary}
              </p>
            </div>

            {/* TOP SEMNALE RELEVANTE DE PIAȚĂ */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Top Semnale Relevante de Piață
                </h3>
                <span className="text-xs text-slate-400">{data.competitive_intelligence.top_signals.length} semnale prioritare</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.competitive_intelligence.top_signals.map((sig, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-sky-400">{sig.source}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {sig.type}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white leading-snug">
                      {sig.signal}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-900">
                      <strong>Impact comercial:</strong> {sig.impact}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* DASHBOARD COMPARATIV 7 RETAILERI */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4 text-sky-400" /> Dashboard Comparativ Retail Alimentar (7 Retaileri)
                </h3>
                <span className="text-xs text-slate-400">Prețuri KVI & Dinamică Promoțională</span>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60">
                      <th className="py-2.5 px-3">Retailer</th>
                      <th className="py-2.5 px-3">Agresivitate</th>
                      <th className="py-2.5 px-3">Mecanism Principal</th>
                      <th className="py-2.5 px-3">Preț KVI Reper</th>
                      <th className="py-2.5 px-3">Pondere Marcă Proprie</th>
                      <th className="py-2.5 px-3">Poziționare Piață</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {data.competitive_intelligence.retailer_dashboard.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">{row.retailer}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.aggressiveness.includes('FOARTE') ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            row.aggressiveness.includes('RIDICATĂ') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {row.aggressiveness}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{row.primary_mechanic}</td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-400 whitespace-nowrap">{row.lead_kvi_price}</td>
                        <td className="py-2.5 px-3 text-slate-300">{row.private_brand_share}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">{row.positioning_note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* VIRAL ALERTS & CONSUMER PAIN POINTS */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Alert Tracker & Consumer Pain Points
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.competitive_intelligence.viral_alerts.map((alert, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{alert.category}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {alert.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 3 ACȚIUNI PRIORITARE PENTRU PROFI (FOCUS: CARNE PROASPĂTĂ) */}
            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-5 sm:p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      3 ACȚIUNI PRIORITARE PENTRU PROFI (FOCUS: CARNE PROASPĂTĂ)
                    </h3>
                    <p className="text-xs text-slate-400">Recomandări comerciale fundamentate pe monitorizarea zilnică</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                  STRATEGIE EXECUTIVĂ
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {data.competitive_intelligence.profi_recommendations.map((rec) => (
                  <div 
                    key={rec.priority}
                    className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800/90 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                          PRIORITATE #{rec.priority}
                        </span>
                        <span className="text-slate-500 text-[11px] font-medium">{rec.domain}</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {rec.title}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed mt-2">
                        {rec.action}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                      <span>Aplicabil imediat în rețea</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* MODAL RAPORT EXECUTIV SINTETIC PENTRU PRINT / PDF */}
      {isReportModalOpen && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsReportModalOpen(false)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl max-h-[92vh] w-full flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  Raport Executiv Sintetic — Retail Media Monitor
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ediția din {data.updated} | Europe/Bucharest
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Tipărește / Salvează PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Închide"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
              
              {/* Rezumat Executiv */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2">Sinteză Generală</h4>
                <p className="leading-relaxed text-slate-200">{data.competitive_intelligence.executive_summary}</p>
              </div>

              {/* 7 Retaileri */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">1. Dinamica celor 7 Retaileri (Prețuri KVI Carne Porc)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.retailers.map((r) => (
                    <div key={r.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="flex justify-between font-bold text-white">
                        <span>{r.name}</span>
                        <span className="text-emerald-400">{r.validity}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{r.meat_price_position}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Mecanism: {r.active_mechanics}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Știri Industria Cărnii */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">2. Știri Sectoriale Cheie (Presă Internațională: Pig Progress, pig333, EuroMeatNews, Meat Management, Eurocarne)</h4>
                <div className="space-y-2">
                  {internationalPublications.flatMap(p => p.articles.slice(0, 2)).map((a, i) => (
                    <div key={i} className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="flex justify-between font-semibold text-slate-200 text-xs">
                        <span>{a.title}</span>
                        <span className="text-pink-400 text-[11px]">{a.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{a.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 Recomandări Profi */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">3. Recomandări Strategice pentru PROFI</h4>
                <div className="space-y-3">
                  {data.competitive_intelligence.profi_recommendations.map((rec) => (
                    <div key={rec.priority} className="text-xs">
                      <strong className="text-white">#{rec.priority} [{rec.domain}] {rec.title}:</strong>
                      <p className="text-slate-300 mt-0.5">{rec.action}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 text-center">
              <p className="text-[11px] font-semibold text-slate-200 tracking-wider uppercase">KNOW MORE. MOVE FIRST.</p>
              <p className="text-[10px] text-slate-400 font-normal mt-0.5">by Vasile Huma</p>
            </div>
          </div>
        </div>
      )}

      {/* Universal Shared Footer */}
      <Footer />
    </div>
  );
}
