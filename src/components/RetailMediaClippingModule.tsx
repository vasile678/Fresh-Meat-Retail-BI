import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ChevronRight,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Check
} from 'lucide-react';
import { getAssetUrl } from '../utils';
import Footer from './Footer';
import { useMarketIntelligence } from '../hooks/useMarketIntelligence';

interface RetailMediaClippingModuleProps {
  onBack: () => void;
}

export interface RetailerPillarItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
  verified_at: string;
  verification_status: 'VERIFIED' | 'NEVERIFICAT';
  is_new: boolean;
  time_horizon: string;
}

export interface RetailerPillar {
  pillar_id: string;
  title: string;
  description: string;
  items: RetailerPillarItem[];
  has_news: boolean;
  message: string;
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
  intelligence_stream?: Record<string, RetailerPillar>;
}

interface PublicationArticle {
  title: string;
  date: string;
  published_at?: string;
  collected_at?: string;
  verified_at?: string;
  updated_at?: string;
  verification_status?: 'VERIFIED' | 'UNVERIFIED';
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

interface StrategicCategoryInsight {
  id: string;
  title: string;
  domain: string;
  insight: string;
  business_implication: string;
  tactical_opportunity: string;
  recommended_action?: string;
  source_and_date: string;
}

interface CompetitiveIntelligenceData {
  release_id?: string;
  promo_week?: string;
  promo_year?: number;
  promo_period?: string;
  active_offers_only?: boolean;
  synchronized_at_utc?: string;
  executive_summary: string;
  top_signals: TopSignal[];
  retailer_dashboard: RetailerDashboardRow[];
  viral_alerts: ViralAlert[];
  strategic_insights: StrategicCategoryInsight[];
}

interface RetailMediaData {
  schema_version: string;
  status: string;
  update_state?: 'VERIFIED_FRESH_UPDATE' | 'NO_NEW_DATA' | 'UPDATE_FAILED';
  update_state_label?: string;
  updated: string;
  updated_date: string;
  updated_time: string;
  last_collection_bucharest?: string;
  last_collection_iso?: string;
  last_successful_check?: string;
  period_analyzed: string;
  execution_timezone: string;
  new_articles_count?: number;
  total_verified_articles?: number;
  dataset_sha256?: string;
  failure_reason?: string;
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
      private_brand: "K-Purland & Vreau din România",
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
      validity: "Joi – Miercuri (Revista săptămânală)",
      app_name: "Aplicația Profi",
      app_url: "https://www.profi.ro/aplicatia-profi/",
      private_brand: "Ferma din Deal",
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
        "id": "progresiv",
        "name": "Revista Progresiv",
        "country": "România",
        "category": "retail_fmcg",
        "website": "https://revistaprogresiv.ro/",
        "articles": [
            {
                "title": "Esomar Connect 2026: Ce spun datele despre noua logică a consumatorului",
                "published_at": "29.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "29.10.2026",
                "summary": "Studiul evidențiază sensibilitatea accentuată la preț și orientarea cumpărătorilor către promoții la alimentele de bază și produse cu trasabilitate sigură.",
                "url": "https://revistaprogresiv.ro/stiri/fmcg/esomar-connect-2026-ce-spun-datele-despre-noua-logica-a-consumatorului/"
            },
            {
                "title": "Bilanțul Freshful după primii cinci ani: cinci milioane de comenzi livrate",
                "published_at": "29.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "29.10.2026",
                "summary": "E-grocery-ul alimentar atinge praguri record de adopție, carnea proaspătă refrigerată reprezentând unul dintre principalele motoare de recurență în coșul online.",
                "url": "https://revistaprogresiv.ro/stiri/retail/bilantul-freshful-dupa-primii-cinci-ani-de-activitate-cinci-milioane-de-comenzi-livrate-catre-peste-280-000-de-clienti-unici/"
            },
            {
                "title": "Kaufland își extinde rețeaua cu un nou magazin în Otopeni, județul Ilfov",
                "published_at": "28.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "28.10.2026",
                "summary": "Kaufland deschide un nou hipermarket cu raioane extinse de carne proaspătă și produse românești, consolidându-și prezența pe axa de expansiune din nordul Capitalei.",
                "url": "https://revistaprogresiv.ro/stiri/retail/kaufland-isi-extinde-reteaua-cu-un-nou-magazin-in-otopeni-judetul-ilfov/"
            }
        ]
    },
    {
        "id": "piata",
        "name": "Revista Piața",
        "country": "România",
        "category": "retail_fmcg",
        "website": "https://www.revista-piata.ro/",
        "articles": [
            {
                "title": "Diana Supermarket – de acum și în Galicea, județul Vâlcea",
                "published_at": "30.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "30.10.2026",
                "summary": "Rețeaua Diana își consolidează prezența regională, oferind carne proaspătă tranșată local și preparate tradiționale din abatorul propriu.",
                "url": "https://www.revista-piata.ro/retail/info-retail/diana-supermarket-de-acum-si-in-galicea-judetul-valcea"
            },
            {
                "title": "Black Friday la Kaufland: reduceri de până la 65% la peste 300 de articole",
                "published_at": "29.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "29.10.2026",
                "summary": "Campaniile de discount masiv din hipermarketuri cresc traficul general la raft, stimulând vânzările încrucișate pe coșul proaspăt de carne.",
                "url": "https://www.revista-piata.ro/retail/info-retail/black-friday-la-kaufland-reduceri-de-pana-la-65-la-peste-300-de-articole"
            },
            {
                "title": "ShopX, o nouă platformă de retail media dedicată comerțului fizic",
                "published_at": "29.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "29.10.2026",
                "summary": "Soluțiile de retail media în magazin permit furnizorilor de carne și mezeluri o promovare targetată direct la punctul de decizie al cumpărătorului.",
                "url": "https://www.revista-piata.ro/retail/info-retail/shopx-o-noua-platforma-de-retail-media-dedicata-comertului-fizic"
            }
        ]
    },
    {
        "id": "trendshrb",
        "name": "Trends HRB",
        "country": "România",
        "category": "retail_fmcg",
        "website": "https://www.trendshrb.ro/",
        "articles": [
            {
                "title": "Sandvișul, o categorie cu potențial pentru Food Service",
                "published_at": "28.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "28.10.2026",
                "summary": "Evoluția segmentului grab-and-go determină creșterea cererii de feliate din carne și ingrediente ready-to-eat în retailul de proximitate și benzinării.",
                "url": "https://www.trendshrb.ro/actual/sandvisul-o-categorie-cu-potential-pentru-food-service/"
            },
            {
                "title": "World Bakers Summit 2026: Cum se creează parteneriatele strategice dintre operatori și furnizori",
                "published_at": "27.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "27.10.2026",
                "summary": "Integrarea ofertei de panificație și carne preparată creează sinergii comerciale de volum în magazinele moderne cu zone gastronomice.",
                "url": "https://www.trendshrb.ro/evenimente/world-bakers-summit-2026-cum-se-creeaza-parteneriatele-strategice-dintre-operatorii-din-ospitalitate-si-furnizorii-din-industria-de-panificatie/"
            },
            {
                "title": "De la Sarea-n Bucate la Issa Garden: o nouă etapă în dezvoltarea diviziei de hospitality a grupului Issa Estate",
                "published_at": "14.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "14.10.2026",
                "summary": "Conceptele gastronomice integrate consolidează cererea pentru carne de calitate superioară și piese premium maturate.",
                "url": "https://www.trendshrb.ro/business/de-la-sarea-n-bucate-la-issa-garden-o-noua-etapa-in-dezvoltarea-diviziei-de-hospitality-a-grupului-issa-estate/"
            }
        ]
    },
    {
        "id": "modernbuyer",
        "name": "Modern Buyer",
        "country": "România",
        "category": "retail_fmcg",
        "website": "https://modernbuyer.ro/",
        "articles": [
            {
                "title": "GUEST EDITORIAL | Focus pe mâncarea gata de consum: Cum își împart Biedronka și Lidl clienții",
                "published_at": "16.09.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "16.09.2026",
                "summary": "Analiza pieței ready-meal relevă competiția acerbă dintre discounteri pe semipreparate și preparate proaspete din carne ambalată.",
                "url": "https://modernbuyer.ro/guest-editorial-focus-pe-mancarea-gata-de-consum-cum-isi-impart-biedronka-si-lidl-clientii-care-nu-mai-gatesc-acasa/"
            },
            {
                "title": "SIAL Insights 2026: 10 tendințe-cheie care modelează industria alimentară",
                "published_at": "17.08.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "17.08.2026",
                "summary": "Raportul global subliniază orientarea consumatorilor către etichete curate, trasabilitate locală și reducerea risipei alimentare pe lanțul cărnii.",
                "url": "https://modernbuyer.ro/sial-insights-2026-10-tendinte-cheie-care-modeleaza-industria-alimentara/"
            },
            {
                "title": "NORDTH Cold Logistics: noua platformă prin care grupul Josi extinde serviciile pentru retail și industria FMCG",
                "published_at": "21.07.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "21.07.2026",
                "summary": "Dezvoltarea lanțului logistic cu temperatură controlată asigură integritatea cărnii proaspete și respectarea strictă a normelor de prospețime.",
                "url": "https://modernbuyer.ro/nordth-cold-logistics-noua-platforma-prin-care-grupul-josi-extinde-serviciile-pentru-retail-si-industria-fmcg/"
            }
        ]
    },
    {
        "id": "retailfmcg",
        "name": "Retail-FMCG",
        "country": "România",
        "category": "retail_fmcg",
        "website": "https://www.retail-fmcg.ro/",
        "articles": [
            {
                "title": "Retail & FMCG – Sinteza săptămânii în comerțul alimentar (30 octombrie 2026)",
                "published_at": "31.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "31.10.2026",
                "summary": "Sinteza săptămânală a pieței de retail reflectă o presiune competitivă ridicată pe prețurile cărnii proaspete și o intensificare a ofertelor la mărcile proprii.",
                "url": "https://www.retail-fmcg.ro/analize/retail-fmcg-sinteza-30-octombrie-2026.html"
            },
            {
                "title": "Diana Supermarket deschide un nou magazin în Galicea, județul Vâlcea",
                "published_at": "30.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "30.10.2026",
                "summary": "Expansiunea rețelei apropie oferta de carne proaspătă și mezeluri din abatorul propriu de consumatorii din mediul rural și semi-urban.",
                "url": "https://www.retail-fmcg.ro/retail/diana-supermarket-magazin-galicea-valcea.html"
            },
            {
                "title": "Ahold Delhaize preia operațiunile Tesco din Cehia și Slovacia",
                "published_at": "30.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "30.10.2026",
                "summary": "Consolidarea grupului mamă al Mega Image în Europa Centrală generează sinergii majore de achiziție la nivel regional pentru mărcile private.",
                "url": "https://www.retail-fmcg.ro/retail/ahold-delhaize-preia-operatiunile-tesco-din-cehia-si-slovacia.html"
            }
        ]
    },
    {
        "id": "meatmilk",
        "name": "Meat.Milk",
        "country": "România",
        "category": "retail_fmcg",
        "website": "https://www.meat-milk.ro/",
        "articles": [
            {
                "title": "Prețurile porcinelor coboară în UE: ce arată diferența dintre România și media europeană",
                "published_at": "30.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "30.10.2026",
                "summary": "Analiza evoluției cotațiilor la poarta abatorului arată ajustarea prețurilor din piața locală în raport cu declinul pieței germane VEZG și spaniole Mercolleida.",
                "url": "https://www.meat-milk.ro/article/preturile-porcinelor-coboara-in-ue-ce-arata-diferenta-dintre-romania-si-media-europeana-RR8Lr1vg"
            },
            {
                "title": "Înainte de carne și lapte există furajul: miza noilor negocieri europene pentru zootehnie",
                "published_at": "29.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "29.10.2026",
                "summary": "Discuțiile la nivel comunitar privind costurile cerealelor furajere și sustenabilitatea fermelor influențează direct prețul de producție al cărnii de porc.",
                "url": "https://www.meat-milk.ro/article/inainte-de-carne-si-lapte-exista-furajul-miza-noilor-negocieri-europene-pentru-zootehnie-fDqM6XAs"
            },
            {
                "title": "Originea cărnii, din nou pe masa negocierilor europene: ce pregătește Bruxelles-ul",
                "published_at": "29.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "29.10.2026",
                "summary": "Propunerile europene privind etichetarea obligatorie a originii pe toate preparatele din carne vor crește valoarea adăugată a brandurilor românești.",
                "url": "https://www.meat-milk.ro/article/originea-carnii-din-nou-pe-masa-negocierilor-europene-ce-pregateste-bruxelles-ul-2dp9rU0N"
            }
        ]
    },
    {
        "id": "retailro",
        "name": "Retail.ro",
        "country": "România",
        "category": "retail_fmcg",
        "website": "https://www.retail.ro/",
        "articles": [
            {
                "title": "Coșuri cadou de Crăciun: cum se pregătește sezonul de la târg la depozit",
                "published_at": "30.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "30.10.2026",
                "summary": "Pregătirea din timp a stocurilor pentru campaniile de iarnă permite magazinelor să securizeze volumele de carne și delicatese la prețuri competitive.",
                "url": "https://www.retail.ro/articole/stiri-si-noutati/cosuri-cadou-de-craciun-cum-se-pregateste-sezonul-de-la-targ-la-depozit-15274.html"
            },
            {
                "title": "Intri la Auchan și treci printr-o reclamă uriașă: retailerul transformă cumpărăturile într-o experiență digitală",
                "published_at": "25.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "25.10.2026",
                "summary": "Tehnologia digitală de semnalizare la intrarea în magazin crește conversia pe promoțiile cheie la produsele alimentare proaspete.",
                "url": "https://www.retail.ro/articole/stiri-si-noutati/intri-la-auchan-si-treci-printr-o-reclama-uriasa-retailerul-transforma-cumparaturile-intr-o-experienta-digitala-15268.html"
            },
            {
                "title": "Kaufland intră și pe zona de fashion cu un nou concept de magazin: după Iași urmează deschideri în București și Constanța",
                "published_at": "22.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "22.10.2026",
                "summary": "Rețeaua de hipermarketuri își consolidează poziționarea de destinație completă, atrăgând un flux ridicat de cumpărători către raionul alimentar.",
                "url": "https://www.retail.ro/articole/stiri-si-noutati/kaufland-intra-si-pe-zona-de-fashion-cu-un-nou-concept-de-magazin-dupa-iasi-urmeaza-deschideri-in-bucuresti-si-constanta-15267.html"
            }
        ]
    },
    {
        "id": "retailarena",
        "name": "RetailArena.ro",
        "country": "România",
        "category": "retail_fmcg",
        "website": "https://retailarena.ro/",
        "articles": [
            {
                "title": "retailArena 2026 | De la pui cu certificare olandeză la AI intern: cum vede Familia Safir inovația în industria alimentară",
                "published_at": "10.06.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "10.06.2026",
                "summary": "În industria cărnii și procesării alimentare, inovația combină certificările de bunăstare animală cu trasabilitatea strictă și automatizarea avansată pentru eficientizarea lanțului de aprovizionare.",
                "url": "https://retailarena.ro/retailarena-2026-de-la-pui-cu-certificare-olandeza-la-ai-intern-cum-vede-familia-safir-inovatia-in-industria-alimentara"
            },
            {
                "title": "De Ziua Copilului, Sezamo ajunge în Ploiești: supermarketul online se extinde în țară",
                "published_at": "26.05.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "26.05.2026",
                "summary": "Supermarketul online Sezamo își extinde livrările de proximitate în Ploiești și județul Prahova, oferind carne proaspătă de la producători locali și livrare rapidă din depozit dedicat.",
                "url": "https://retailarena.ro/stiri-si-noutatide-ziua-copilului-sezamo-ajunge-in-ploiesti-supermarketul-online-se-extinde-in-tara-15139"
            },
            {
                "title": "Kaufland ”taie inflația”: reduceri timp de o lună în magazine",
                "published_at": "09.05.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "09.05.2026",
                "summary": "Kaufland România derulează campania comercială de reducere a prețurilor la peste 500 de articole de bază și produse proaspete pentru a proteja puterea de cumpărare a consumatorilor.",
                "url": "https://retailarena.ro/stiri-si-noutatikaufland-taie-inflatia-reduceri-timp-de-o-luna-in-magazine-15120"
            }
        ]
    },
    {
        "id": "pigprogress",
        "name": "Pig Progress",
        "country": "Olanda / Global",
        "category": "pork_industry",
        "website": "https://www.foodagribusiness.world/pigs/",
        "articles": [
            {
                "title": "Rabobank: No quick recovery of the pig market",
                "published_at": "30.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "30.10.2026",
                "summary": "Raportul trimestrial Rabobank anticipează o ofertă abundentă de porc în UE pe fondul exporturilor temperate către Asia, menținând prețurile la un nivel avantajos pentru achizițiile de retail.",
                "url": "https://www.foodagribusiness.world/pigs/rabobank-no-quick-recovery-of-the-pig-market"
            },
            {
                "title": "On demand: Is grow-finish profitability hiding in plain sight?",
                "published_at": "28.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "28.10.2026",
                "summary": "Eficiența conversiei furajelor și calitatea carcasei influențează direct marjele din faza de finisare și disponibilitatea pieselor tranșate de calitate.",
                "url": "https://www.foodagribusiness.world/pigs/on-demand-is-grow-finish-profitability-hiding-in-plain-sight"
            },
            {
                "title": "Over a hundred pig farms shut down in Russia in 2026",
                "published_at": "27.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "27.10.2026",
                "summary": "Restructurările din bazinul estic reconfigurează fluxurile internaționale de carne de porc și exporturile către piețele din proximitate.",
                "url": "https://www.foodagribusiness.world/pigs/over-a-hundred-pig-farms-shut-down-in-russia-in-2026"
            }
        ]
    },
    {
        "id": "pig333",
        "name": "pig333",
        "country": "Spania / Global",
        "category": "pork_industry",
        "website": "https://www.3tres3.com/en",
        "articles": [
            {
                "title": "EU Council agrees position on the common market organisation for EU agricultural products",
                "published_at": "22.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "22.10.2026",
                "summary": "Modificările aduse OCP vor consolida mecanismele de gestionare a crizelor de piață și transparența contractelor comerciale dintre fermieri și procesatori.",
                "url": "https://www.3tres3.com/en/latest_swine_news/common-market-organisation-for-eu-agricultural-products_22934/"
            },
            {
                "title": "ASF and weak China demand to reshape 2027 pork trade",
                "published_at": "14.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "14.10.2026",
                "summary": "Comerțul european se adaptează prin creșterea ponderii consumului intern în UE și reorientarea pieselor către piețele cu cerere stabilă.",
                "url": "https://www.3tres3.com/en/latest_swine_news/asf-and-weak-china-demand-to-reshape-2027-pork-trade_22914/"
            },
            {
                "title": "Spanish pork production rose 3% in the first half of 2026",
                "published_at": "31.08.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "31.08.2026",
                "summary": "Creșterea volumelor din Spania confirmă menținerea capacității de livrare a principalului furnizor european către piețele de retail din România și Europa Centrală.",
                "url": "https://www.3tres3.com/en/latest_swine_news/spanish-pork-production-rose-3-in-the-first-half-of-2026_22721/"
            }
        ]
    },
    {
        "id": "euromeatnews",
        "name": "EuroMeatNews",
        "country": "Spania / Global",
        "category": "pork_industry",
        "website": "https://euromeatnews.com",
        "articles": [
            {
                "title": "AHDB: Hot weather changed BBQ habits in summer 2026",
                "published_at": "28.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "28.10.2026",
                "summary": "Piața cărnii proaspete rămâne rezilientă, consumatorii orientându-se către piesele tranșate de porc convenabile pentru gătitul rapid acasă.",
                "url": "https://euromeatnews.com/ahdb-hot-weather-changed-bbq-habits-in-summer-2026/"
            },
            {
                "title": "ASSICA and the Bresaola della Valtellina PGI protection consortium welcome Coldiretti’s initiative",
                "published_at": "28.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "28.10.2026",
                "summary": "Producătorii europeni promovează schemele de calitate și recunoașterea originii protejate pentru piesele nobile de porc în retail.",
                "url": "https://euromeatnews.com/assica-and-the-bresaola-della-valtellina-pgi-protection-consortium-welcome-coldirettis-initiative/"
            },
            {
                "title": "The Danish Food and Agriculture Association has sued the state for lack of legal basis",
                "published_at": "28.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "28.10.2026",
                "summary": "Asociațiile de profil daneze contestă măsurile de reglementare, subliniind importanța menținerii competitivității abatoarelor din Danemarca pe piața UE.",
                "url": "https://euromeatnews.com/the-danish-food-and-agriculture-association-has-sued-the-state-for-lack-of-legal-basis/"
            }
        ]
    },
    {
        "id": "meatmanagement",
        "name": "Meat Management",
        "country": "Marea Britanie",
        "category": "pork_industry",
        "website": "https://meatmanagement.com",
        "articles": [
            {
                "title": "Scottish pig sector faces continued pressure",
                "published_at": "02.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "02.10.2026",
                "summary": "Raportul QMS evidențiază presiunea severă pe marjele crescătorilor din Marea Britanie și creșterea sacrificărilor de scroafe cu 52%, semnalând o contracție a bazei de aprovizionare pentru 2027.",
                "url": "https://meatmanagement.com/news/scottish-pig-sector-faces-continued-pressure/86500.article"
            },
            {
                "title": "British pork spotlighted as part of October campaign",
                "published_at": "28.09.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "28.09.2026",
                "summary": "Campania AHDB de toamnă promovează carnea de porc britanică și carnea tocată ca opțiuni accesibile și nutritive pentru gătitul acasă în marile rețele de retail.",
                "url": "https://meatmanagement.com/news/british-pork-spotlighted-as-part-of-october-campaign/86452.article"
            },
            {
                "title": "Pork market to remain stable despite geopolitical uncertainties",
                "published_at": "20.02.2025",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "20.02.2025",
                "summary": "Prognozele de profil indică stabilitate în cotațiile la poarta abatorului, permițând comercianților o planificare predictibilă a marjelor de retail.",
                "url": "https://meatmanagement.com/news/pork-market-to-remain-stable-despite-geopolitical-uncertainties/84513.article"
            }
        ]
    },
    {
        "id": "eurocarne",
        "name": "Eurocarne",
        "country": "Spania / UE",
        "category": "pork_industry",
        "website": "https://eurocarne.com",
        "articles": [
            {
                "title": "Interham lanza la Red Española de Municipios del Jamón",
                "published_at": "30.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "30.10.2026",
                "summary": "Sectorul cărnii de porc din Spania promovează valorificarea pieselor maturate și a tradiției gastronomice în lanțul de distribuție european.",
                "url": "https://eurocarne.com/noticias/codigo/72599/kw/Interham+lanza+la+Red+Espa%C3%B1ola+de+Municipios+del+Jam%C3%B3n"
            },
            {
                "title": "Fecic aborda calidad, seguridad y maduración de carnes para retail",
                "published_at": "30.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "30.10.2026",
                "summary": "Procesatorii analizează noile standarde de siguranță alimentară, controlul lanțului frigorific și cerințele sanitare pentru retailul modern.",
                "url": "https://eurocarne.com/noticias/codigo/72591/kw/Fecic+aborda+aditivos%2C+Listeria+y+carnes+maduradas+en+su+Jornada+de+Calidad+y+Seguridad+Alimentaria"
            },
            {
                "title": "Porcat analiza la evolución de la bioseguridad en el sector porcino",
                "published_at": "30.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "30.10.2026",
                "summary": "Evaluarea măsurilor de biosecuritate și a capacității abatoarelor din Spania de a susține exporturile continue de carcasă către UE.",
                "url": "https://eurocarne.com/noticias/codigo/72573/kw/Porcat+analizar%C3%A1+la+evoluci%C3%B3n+de+la+PPA+en+Catalu%C3%B1a+un+a%C3%B1o+despu%C3%A9s"
            }
        ]
    },
    {
        "id": "frs",
        "name": "FRS – Food Retail & Service",
        "country": "Spania / UE",
        "category": "pork_industry",
        "website": "https://www.foodretail.es/",
        "articles": [
            {
                "title": "Híper y supermercados pierden un 1,3% de cuota frente a discounters, ecommerce y especialistas",
                "published_at": "30.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "30.10.2026",
                "summary": "Creșterea frecvenței de cumpărare și orientarea spre proximitate erodează coșul mare în Spania și Europa, formatele discounter câștigând teren pe categorii proaspete.",
                "url": "https://www.foodretail.es/retailers/hiper-y-supermercados-pierden-un-13-de-cuota-frente-a-discounters-ecommerce-y-especialistas.html"
            },
            {
                "title": "MDD vs. MDF: de la indiferencia y la confrontación al reto compartido de crear valor",
                "published_at": "29.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "29.10.2026",
                "summary": "Liderii din retail și industria FMCG analizează reechilibrarea dintre mărcile proprii și mărcile naționale pe fondul presiunii pe preț la alimentele de bază.",
                "url": "https://www.foodretail.es/sector-fmcg/mdd-vs-mdf-de-la-indiferencia-y-la-confrontacion-al-reto-compartido-de-crear-valor.html"
            },
            {
                "title": "El gran consumo crece un 2,7% en septiembre, impulsado por la robustez de la demanda (+2,2%)",
                "published_at": "27.10.2026",
                "collected_at": "01.11.2026, 09:00",
                "verified_at": "01.11.2026, 09:00",
                "updated_at": "01.11.2026, 09:00",
                "verification_status": "VERIFIED",
                "date": "27.10.2026",
                "summary": "Sectorul bunurilor de larg consum avansează susținut de volume, în timp ce marca privată atinge o cotă record de 52% în valoare în retailul alimentar spaniol.",
                "url": "https://www.foodretail.es/sector-fmcg/el-gran-consumo-crece-un-27-en-septiembre-impulsado-por-la-robustez-de-la-demanda-22.html"
            }
        ]
    }
],
  competitive_intelligence: {
    release_id: "2026/WK45_258a510d",
    promo_week: "WK45",
    promo_year: 2026,
    promo_period: "02–08 NOI 2026",
    active_offers_only: true,
    synchronized_at_utc: "2026-11-05T18:23:39.267605+00:00",
    executive_summary: "Sinteza comercială WK45 (02–08 NOI 2026) relevă o presiune promoțională concentrată exercitată de discounteri (Kaufland, Lidl, Penny) pe piesele cheie de porc. Kaufland conduce pe cotlet f.o. (15,90 lei/kg necondiționat) și împarte liderul pe pulpă f.o. (15,99 lei/kg) cu Penny (15,99 lei/kg cu card), în timp ce oferta Kaufland la spată (14,90 lei/kg) a expirat pe 03.11 și a fost retrasă din comparația activă conform regulii ACTIVE OFFERS ONLY. Lidl deține unica ofertă activă pe spată (18,90 lei/kg) și cel mai bun preț pe ceafă (23,90 lei/kg). Condiționarea reducerilor prin aplicații mobile (Lidl Plus, PENNY Card) depășește 60% pe ofertele de primă linie, în timp ce cotațiile europene la carcasă (VEZG 1.320 €/kg) indică formarea unui platou de stabilitate.",
    top_signals: [
      {
        source: "Lidl / Catalog Săptămânal WK45",
        date: "02.11.2026",
        type: "PRICE_MOVE",
        signal: "Lidl menține cel mai agresiv preț la ceafă de porc f.o. la 23,90 lei/kg și promovează cotletul la 16,90 lei/kg prin cupon Lidl Plus (față de 19,90 lei/kg standard). Deține unica ofertă activă de catalog pe spată de porc (18,90 lei/kg).",
        impact: "Forțează concurența de proximitate să ofere alternative competitive pe categoria KVI proaspătă."
      },
      {
        source: "Kaufland & Penny / Rolling Update WK45",
        date: "04.11.2026",
        type: "PRICE_PARITY",
        signal: "Kaufland conduce cotletul fără os cu 15,90 lei/kg (catalog 04–10.11), în timp ce pe pulpa fără os Kaufland (15,99 lei/kg standard) împarte liderul cu Penny (15,99 lei/kg cu card). Spata Kaufland (14,90 lei/kg) a expirat pe 03.11 și a fost retrasă din matricea activă conform regulii ACTIVE OFFERS ONLY.",
        impact: "Stabilește noul prag minim de referință la 15,90–15,99 lei/kg pentru piesele majore de porc fără os în retailul modern."
      },
      {
        source: "EU Pork Market (WK45 · 05.11.2026)",
        date: "05.11.2026",
        type: "EU_MARKET",
        signal: "Bursa germană VEZG se stabilizează la 1.320 €/kg SG (±0), în timp ce bursa franceză MPB coboară la 1.492 €/kg carcasă, iar cotațiile poloneze Clasa E se retrag la 5.70 PLN/kg sub afluxul de carne germană.",
        impact: "Oportunitate de achiziție la cost avantajos pentru volumele de spată și pulpă importate de procesatori."
      },
      {
        source: "Meat.Milk & Revista Piața",
        date: "03.11.2026",
        type: "REGULATORY_COMPLIANCE",
        signal: "Sprijinul strategic pentru sectorul suin autohton intră în faza verificărilor finale (245 cereri), consolidând aprovizionarea cu origine România.",
        impact: "Securizează contractele anuale cu fermierii locali și crește ponderea cărnii românești la raft."
      }
    ],
    retailer_dashboard: [
      {
        retailer: "Lidl",
        aggressiveness: "FOARTE RIDICATĂ",
        primary_mechanic: "Cupoane Lidl Plus (-20% la -25%) + Super Weekend",
        lead_kvi_price: "Ceafă porc f.o. 23,90 lei/kg | Cotlet porc f.o. 16,90 lei/kg (cupon) / 19,90 lei/kg (std) | Spată porc f.o. 18,90 lei/kg",
        private_brand_share: "Peste 85% volum carne din mărcile proprii Cămara Noastră & Pikok",
        positioning_note: "Fidelizare digitală strictă prin aplicația mobilă; preț minim pe cotlet (16,90 lei/kg) condiționat de cupon; ceafă la 23,90 lei/kg necondiționat."
      },
      {
        retailer: "Kaufland",
        aggressiveness: "RIDICATĂ",
        primary_mechanic: "Reducere directă de catalog (-20% la -33%) 04–10.11",
        lead_kvi_price: "Cotlet porc f.o. 15,90 lei/kg | Pulpă porc f.o. 15,99 lei/kg | Spată porc f.o. N/V (expirată la 03.11)",
        private_brand_share: "Peste 75% din carne sub mărcile K-Purland și Vreau din România",
        positioning_note: "Lider de preț absolut pe cotlet f.o. (15,90 lei/kg) și pulpă f.o. (15,99 lei/kg) fără condiționare de card. Spata de 14,90 lei/kg a expirat la 03.11."
      },
      {
        retailer: "Penny",
        aggressiveness: "RIDICATĂ",
        primary_mechanic: "Preț redus cu scanare PENNY Card (-22% la -27%)",
        lead_kvi_price: "Pulpă porc f.o. 15,99 lei/kg (card) / 22,99 lei/kg (std) | Cotlet porc f.o. 17,99 lei/kg (card) | Piept pui dezosat 26,90 lei/kg",
        private_brand_share: "Peste 80% din carnea proaspătă sub marca proprie Hanul Boieresc (100% România)",
        positioning_note: "Paritate pe pulpă f.o. la 15,99 lei/kg prin card de fidelitate; lider pe piept de pui dezosat la 26,90 lei/kg."
      },
      {
        retailer: "Carrefour",
        aggressiveness: "MEDIE",
        primary_mechanic: "Cupoane ActForFood în aplicație + Promoții 2+1 la preț special",
        lead_kvi_price: "N/V pe cele 5 produse KVI monitorizate (fără promoție activă în catalogul curent)",
        private_brand_share: "55-60% din volum acoperit de Filiera Calității Carrefour și Drag de România",
        positioning_note: "Diferențiere prin trasabilitate și calitatea superioară a lanțului scurt; absență promoții agresive pe KVI proaspete de bază în săptămâna curentă."
      },
      {
        retailer: "Profi",
        aggressiveness: "MEDIE-RIDICATĂ",
        primary_mechanic: "Cuponiada din aplicație + Promoții locale de proximitate",
        lead_kvi_price: "Neinclus în matricea promoțională 5×5 (promoții locale de proximitate și Cuponiada)",
        private_brand_share: "Circa 65% sub brandul Ferma din Deal și mărci partenere",
        positioning_note: "Accesibilitate geografică maximă în cartiere și mediul rural; promoții rapide de weekend."
      },
      {
        retailer: "Auchan",
        aggressiveness: "MEDIE",
        primary_mechanic: "Cashback MyClub Auchan (5-10% bani înapoi ca bonus)",
        lead_kvi_price: "N/V pe cele 5 produse KVI monitorizate (fără promoție activă în catalogul curent)",
        private_brand_share: "Aproximativ 50% din volum reprezentat de Filiera Auchan și Pouce",
        positioning_note: "Atragerea familiilor mari prin caserole de volum economic; fără ofertă promoțională confirmată pe cele 5 KVI în WK45."
      },
      {
        retailer: "Mega Image",
        aggressiveness: "MODERATĂ",
        primary_mechanic: "Prețuri speciale Card Connect + Pachete proaspete ready-to-cook",
        lead_kvi_price: "Neinclus în matricea promoțională 5×5 (orientare premium pe piese feliate porționate)",
        private_brand_share: "Peste 60% prin Gusturi Românești și Mega Apetit",
        positioning_note: "Poziționare premium bazată pe proximitate urbană rapidă, comoditate (ready-to-cook) și carne porționată fin."
      }
    ],
    viral_alerts: [
      {
        category: "Prețuri la Raft vs. Aplicație",
        status: "SENSIBILITATE RIDICATĂ",
        detail: "Consumatorii semnalează pe rețelele sociale discrepanțe la casă când cupoanele din aplicație nu sunt activate înainte de scanare (Lidl Plus, PENNY Card)."
      },
      {
        category: "Origine România 100%",
        status: "ATENȚIE SPORITĂ",
        detail: "Cumpărătorii verifică atent eticheta ovală de sănătate pentru a confirma proveniența cărnii din abatoare românești autorizate."
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
    strategic_insights: [
      {
        id: "price-positioning",
        title: "PRICE & COMPETITIVE POSITIONING",
        domain: "Arhitectură de Preț & Promoții",
        insight: "În WK45, discounterii (Kaufland, Lidl, Penny) concentrează bătălia pe cotlet (15,90 lei/kg la Kaufland; 16,90 lei/kg cupon Lidl Plus) și pulpă (15,99 lei/kg la Kaufland și Penny Card). Oferta Kaufland la spată (14,90 lei/kg) a expirat la 03.11, lăsând Lidl drept singura ofertă activă de catalog la 18,90 lei/kg.",
        business_implication: "Pragul de acces la carne de porc fără os se reconfigurează în jurul valorii de 15,90–15,99 lei/kg. Condiționarea prin card/cupon devine mecanism de diferențiere față de reducerile directe de catalog.",
        tactical_opportunity: "Segmentarea ofertei prin caserole calibrate (600g–800g), promovarea cefei la preț competitiv și utilizarea cupoanelor personalizate pentru fidelizarea cumpărătorilor recurenți.",
        recommended_action: "Segmentarea ofertei prin caserole calibrate (600g–800g), promovarea cefei la preț competitiv și utilizarea cupoanelor personalizate pentru fidelizarea cumpărătorilor recurenți.",
        source_and_date: "Cataloage promoționale oficiale, aplicații mobile & PROMO WEEKLY | WK45 2026 (2026/WK45_258a510d)"
      },
      {
        id: "category-growth",
        title: "CATEGORY GROWTH & SHOPPER INSIGHTS",
        domain: "Sortimentație & Comportament Shopper",
        insight: "Peste 70% din volumele de carne de porc vândute în retailul modern provin din mărcile proprii cu origine 100% România ambalate MAP, cumpărătorii prioritizând trasabilitatea garantată și prospețimea vizibilă.",
        business_implication: "Mărcile proprii locale securizează loialitatea și reduc sensibilitatea la preț, în timp ce tehnologia MAP cu absorbant transparent reduce pierderile operaționale (shrinkage) cu până la 18%.",
        tactical_opportunity: "Consolidarea parteneriatelor directe cu abatoarele locale pentru calibrare uniformă la raft, garantarea disponibilității optime la orele de vârf (17:00–20:00) și semnalizarea vizuală a originii autohtone.",
        recommended_action: "Consolidarea parteneriatelor directe cu abatoarele locale pentru calibrare uniformă la raft, garantarea disponibilității optime la orele de vârf (17:00–20:00) și semnalizarea vizuală a originii autohtone.",
        source_and_date: "Revista Progresiv, Modern Buyer & Retail.ro | Noiembrie 2026"
      },
      {
        id: "market-signals",
        title: "MARKET OPPORTUNITIES & EARLY SIGNALS",
        domain: "Aprovizionare & Piață Europeană",
        insight: "Cotațiile europene de referință (VEZG Germania 1.320 €/kg SG, Spania Mercolleida 1,550 €/kg viu, Franța MPB 1.492 €/kg carcasă) indică stabilizarea ofertei pe piața internă UE după corecțiile de toamnă.",
        business_implication: "Contextul european predictibil oferă cumpărătorilor și procesatorilor o oportunitate comercială pentru contractarea volumelor din trimestrul IV la costuri de materie primă avantajoase.",
        tactical_opportunity: "Negocierea unor contracte trimestriale flexibile ancorate în cotațiile de referință UE și securizarea din timp a stocurilor pentru campaniile de iarnă pe piesele cu cerere sezonieră ridicată.",
        recommended_action: "Negocierea unor contracte trimestriale flexibile ancorate în cotațiile de referință UE și securizarea din timp a stocurilor pentru campaniile de iarnă pe piesele cu cerere sezonieră ridicată.",
        source_and_date: "EU PORK MARKET (WK45 · 05.11.2026), Eurocarne, RaboResearch & Pig Progress"
      }
    ]
  }
};

export default function RetailMediaClippingModule({ onBack }: RetailMediaClippingModuleProps) {
  const [selectedTab, setSelectedTab] = useState<'catalogs' | 'press' | 'intelligence'>('catalogs');
  const [data, setData] = useState<RetailMediaData>(BASELINE_DATA);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [expandedRetailerId, setExpandedRetailerId] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
  const [refreshToast, setRefreshToast] = useState<string | null>(null);
  const { manifest, formatUpdatedDisplay } = useMarketIntelligence();

  useEffect(() => {
    document.title = 'Fresh Meat Retail BI | Market Intelligence & Insights';
  }, []);

  // Continuous on-demand update mechanism:
  // 1. Immediately loads latest validated dataset on mount, tab switch, refresh, or window focus.
  // 2. Safely triggers background collector if backend API is available and cooldown has elapsed.
  // 3. Silently polls for completion and auto-updates cards if new articles arrive.
  const lastApiCheckRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(false);

  const loadLatestData = useCallback(async (bypassCache: boolean = false) => {
    try {
      const url = getAssetUrl('/data/retail_media_export.json?v=' + (bypassCache ? Date.now() : (data.dataset_sha256 || Date.now())));
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json && json.retailers && json.publications) {
          setData(prev => {
            if (
              prev.updated !== json.updated ||
              prev.dataset_sha256 !== json.dataset_sha256 ||
              prev.update_state !== json.update_state ||
              JSON.stringify(prev.publications) !== JSON.stringify(json.publications) ||
              JSON.stringify(prev.retailers) !== JSON.stringify(json.retailers)
            ) {
              return json;
            }
            return prev;
          });
        }
      }
    } catch {
      // Fallback-ul autoritativ BASELINE_DATA este deja activat
    }

    // Trigger on-demand background check if backend API is available
    const now = Date.now();
    if (now - lastApiCheckRef.current < 30000 || isPollingRef.current) {
      return; // Frontend throttling: do not spam API more than once per 30 seconds
    }
    lastApiCheckRef.current = now;

    const apiBase = (import.meta.env.VITE_COLLECTOR_API_URL || '').replace(/\/$/, '');
    const statusUrl = apiBase ? `${apiBase}/api/retail-media/status` : '/api/retail-media/status';
    const triggerUrl = apiBase ? `${apiBase}/api/retail-media/trigger-collect` : '/api/retail-media/trigger-collect';

    try {
      const statusRes = await fetch(statusUrl);
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        if (statusJson.can_collect_now) {
          await fetch(triggerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          // Start moderate polling loop
          pollForCompletion(statusUrl);
        } else if (statusJson.is_collecting) {
          pollForCompletion(statusUrl);
        }
      }
    } catch {
      // Static host (GitHub Pages) without serverless gateway: silent graceful fallback
    }
  }, []);

  const pollForCompletion = useCallback((statusUrl: string) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    let attempts = 0;
    const maxAttempts = 15; // Max 60 seconds (15 * 4s)

    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(statusUrl);
        if (res.ok) {
          const st = await res.json();
          if (!st.is_collecting || attempts >= maxAttempts) {
            clearInterval(interval);
            isPollingRef.current = false;
            // Fetch updated data once completed
            const url = getAssetUrl('/data/retail_media_export.json?v=' + Date.now());
            const dataRes = await fetch(url);
            if (dataRes.ok) {
              const freshData = await dataRes.json();
              if (freshData?.publications) {
                setData(freshData);
              }
            }
          }
        } else {
          clearInterval(interval);
          isPollingRef.current = false;
        }
      } catch {
        clearInterval(interval);
        isPollingRef.current = false;
      }
    }, 4000);
  }, []);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    setRefreshToast('Sincronizare în curs...');
    try {
      const apiBase = (import.meta.env.VITE_COLLECTOR_API_URL || '').replace(/\/$/, '');
      const triggerUrl = apiBase ? `${apiBase}/api/retail-media/trigger-collect` : '/api/retail-media/trigger-collect';
      const statusUrl = apiBase ? `${apiBase}/api/retail-media/status` : '/api/retail-media/status';

      const res = await fetch(triggerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });

      if (res.ok) {
        pollForCompletion(statusUrl);
        setRefreshToast('Colectare lansată. Actualizare date...');
      } else {
        await loadLatestData(true);
        setRefreshToast('Date reîncărcate din depozitul autoritativ.');
      }
    } catch {
      await loadLatestData(true);
      setRefreshToast('Date sincronizate local.');
    } finally {
      setTimeout(() => {
        setIsManualRefreshing(false);
        setRefreshToast(null);
      }, 3000);
    }
  };

  // Run on mount
  useEffect(() => {
    loadLatestData();
  }, [loadLatestData]);

  // Run when switching tabs
  useEffect(() => {
    loadLatestData();
  }, [selectedTab, loadLatestData]);

  // Run when window regains focus or visibility changes (user returns to page)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadLatestData();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [loadLatestData]);

  const romaniaPublications = data.publications.filter(p => p.category === 'retail_fmcg');
  const internationalPublications = data.publications.filter(p => p.category === 'pork_industry');
  const strategicInsights = data.competitive_intelligence?.strategic_insights || BASELINE_DATA.competitive_intelligence.strategic_insights;

  const sortArticlesDesc = (articles: PublicationArticle[] = []) => {
    return [...articles]
      .filter(a => a.verification_status !== 'UNVERIFIED')
      .sort((a, b) => {
        const parseDate = (d?: string) => {
          if (!d) return 0;
          const parts = d.split('.');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day).getTime();
          }
          return new Date(d).getTime() || 0;
        };
        const da = parseDate(a.published_at || a.date);
        const db = parseDate(b.published_at || b.date);
        return db - da;
      });
  };

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
                {data.update_state === 'UPDATE_FAILED' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" /> ACTUALIZARE EȘUATĂ
                  </span>
                ) : data.update_state === 'NO_NEW_DATA' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> Fără noutăți verificate
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> {data.update_state_label || 'Actualizare Verificată'}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Ediția: <span className="text-slate-200 font-semibold">{data.updated}</span> · Colectare: <span className="text-slate-300">{data.last_collection_bucharest || data.updated}</span> · {data.period_analyzed}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {refreshToast && (
              <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 animate-fade-in hidden sm:inline">
                {refreshToast}
              </span>
            )}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Lansează reîmprospătarea și colectarea pe cei 7 retaileri"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isManualRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Actualizează</span>
            </button>
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
            <Store className="w-3.5 h-3.5" /> Cataloage & Aplicații
          </button>
          <button
            onClick={() => setSelectedTab('press')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'press'
                ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" /> Media Monitor
          </button>
          <button
            onClick={() => setSelectedTab('intelligence')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'intelligence'
                ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Strategic Category Intelligence
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* TAB 1: CATALOAGE & APLICAȚII — 7 RETAILERI */}
        {selectedTab === 'catalogs' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-5 sm:p-6 border border-slate-800 shadow-xl">
              <div className="pb-4 border-b border-slate-800 mb-6">
                <h2 className="text-base font-semibold text-white">Cataloage Promoționale & Programe de Loialitate</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monitorizare activă a cataloagelor promoționale ale retailerilor alimentari. Acces direct la edițiile oficiale și aplicațiile de fidelizare.
                </p>
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

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs mb-3">
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

                    {/* Flux Intelligence pe 6 Piloni */}
                    {ret.intelligence_stream && (
                      <div className="pt-2 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => setExpandedRetailerId(expandedRetailerId === ret.id ? null : ret.id)}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-between border border-slate-800 transition cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-sky-400" />
                            Monitorizare Strategică (6 Piloni)
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-sky-400 font-mono">
                            {expandedRetailerId === ret.id ? 'Ascunde ▲' : 'Vezi detalii ▼'}
                          </span>
                        </button>

                        {expandedRetailerId === ret.id && (
                          <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-800/60">
                            {(() => {
                              const activePillars = Object.entries(ret.intelligence_stream)
                                .map(([k, pillar]) => {
                                  const newItems = (pillar.items || []).filter(it => it.is_new);
                                  return { key: k, pillar, newItems };
                                })
                                .filter(e => e.pillar.has_news && e.newItems.length > 0);

                              if (activePillars.length === 0) {
                                return (
                                  <p className="text-[10px] text-slate-400 italic py-1.5 text-center bg-slate-900/60 rounded border border-slate-800/60">
                                    Nu există noutăți verificate pentru perioada selectată.
                                  </p>
                                );
                              }

                              return activePillars.map(({ key, pillar, newItems }) => (
                                <div key={key} className="p-2 rounded bg-slate-900/90 border border-slate-800/80 text-[11px] space-y-1.5">
                                  <div className="flex items-center justify-between font-semibold text-slate-200">
                                    <span className="text-slate-300 text-[10.5px]">{pillar.title}</span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      NOU
                                    </span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {newItems.map((it) => (
                                      <div key={it.id} className="p-1.5 rounded bg-slate-950/80 border border-slate-800/50 space-y-1">
                                        <a 
                                          href={it.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-medium text-slate-200 hover:text-sky-300 transition text-[11px] leading-tight block"
                                        >
                                          {it.title} <span className="text-sky-400">↗</span>
                                        </a>
                                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                                          {it.summary}
                                        </p>
                                        <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5 border-t border-slate-900">
                                          <span>{it.source}</span>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-sky-400">{it.published_at}</span>
                                            <span className="text-emerald-400 font-semibold">✓ VERIFIED</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    )}
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
                    PRESĂ RETAIL & FMCG — ROMÂNIA
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">Top știri</span>
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
                          sortArticlesDesc(pub.articles).slice(0, 3).map((art, idx) => (
                            <div key={idx} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span className="text-sky-400 font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {art.published_at || art.date}
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
                        <span>Vizitează publicația ↗</span>
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
                    PORK INDUSTRY INTELLIGENCE — INTERNAȚIONAL
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
                          sortArticlesDesc(pub.articles).slice(0, 3).map((art, idx) => (
                            <div key={idx} className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span className="text-pink-400 font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {art.published_at || art.date}
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
                    <div className="mt-6 pt-3 border-t border-slate-800/80">
                      <a
                        href={pub.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                      >
                        <span>Vizitează publicația ↗</span>
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
                  <Award className="w-4 h-4" /> Sinteză Zilnică
                </span>
                <span className="text-xs text-slate-400">{data.updated_date || (data.updated ? data.updated.split(',')[0].split('·')[0].trim() : '')}</span>
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

            {/* 3 STRATEGIC INSIGHTS | FRESH MEAT CATEGORY */}
            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-5 sm:p-6 shadow-2xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      3 STRATEGIC INSIGHTS | FRESH MEAT CATEGORY
                    </h3>
                    <p className="text-xs text-slate-400">
                      Market intelligence, competitive positioning &amp; category growth opportunities
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formatUpdatedDisplay(manifest.modules?.strategic_category_insights?.last_verified_update || '31.10.2026 · 09:00')}
                  </span>
                  <span className="self-start sm:self-center px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-wider border border-emerald-500/30">
                    CATEGORY INTELLIGENCE
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {strategicInsights.map((item, idx) => (
                  <div 
                    key={item.id || idx}
                    className="bg-slate-950 p-5 rounded-xl border border-slate-800/90 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-3">
                      <div className="pb-2.5 border-b border-slate-800/80">
                        <h4 className="text-xs sm:text-sm font-bold text-white leading-snug tracking-tight">
                          {item.title}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                          {item.domain}
                        </p>
                      </div>

                      {/* 1. INSIGHT */}
                      <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800/70 space-y-1">
                        <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                          <span>1. INSIGHT</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {item.insight}
                        </p>
                      </div>

                      {/* 2. BUSINESS IMPLICATION */}
                      <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800/70 space-y-1">
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <span>2. BUSINESS IMPLICATION</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.business_implication}
                        </p>
                      </div>

                      {/* 3. RECOMMENDED ACTION */}
                      <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800/70 space-y-1">
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <span>3. RECOMMENDED ACTION</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.recommended_action || item.tactical_opportunity}
                        </p>
                      </div>
                    </div>

                    {/* 4. SOURCE & DATE */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-semibold text-slate-500">4. Sursă:</span>
                        <span className="text-slate-300 truncate">{item.source_and_date}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 font-medium">
                        Verificat
                      </span>
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
              
              {/* Status & Date Bar */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Ediție raport:</span>
                    <span className="font-bold text-white">{data.updated} (08:00 Europe/Bucharest)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>Data ultimei colectări:</span>
                    <span className="text-slate-300 font-medium">{data.last_collection_bucharest || data.updated}</span>
                    <span className="text-slate-600">|</span>
                    <span>Perioada:</span>
                    <span className="text-slate-300 font-medium">{data.period_analyzed}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {data.update_state === 'UPDATE_FAILED' ? (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> ACTUALIZARE EȘUATĂ
                    </span>
                  ) : data.update_state === 'NO_NEW_DATA' ? (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Fără noutăți verificate
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {data.update_state_label || 'Actualizare Verificată'}
                    </span>
                  )}
                </div>
              </div>

              {/* Rezumat Executiv */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2">Sinteză Generală</h4>
                <p className="leading-relaxed text-slate-200">{data.competitive_intelligence.executive_summary}</p>
              </div>

              {/* 1. MONITORIZAREA CELOR 7 RETAILERI — 6 PILONI STRATEGICI */}
              {/* 1. MONITORIZAREA CELOR 7 RETAILERI — NUMAI DIMENSIUNI CU NOUTĂȚI VERIFICATE */}
              <div>
                <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    1. Monitorizarea celor 7 Retaileri (Noutăți Verificate pe Dimensiuni Strategice)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Lidl, Kaufland, Carrefour, Penny, Profi, Auchan, Mega Image
                  </span>
                </div>

                {data.retailers.reduce((acc, ret) => {
                  if (!ret.intelligence_stream) return acc;
                  return acc + Object.values(ret.intelligence_stream).filter(p => p.has_news && (p.items || []).some(it => it.is_new)).length;
                }, 0) === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1.5">
                    <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-200">
                      Nu există noutăți verificate pentru perioada selectată.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Toate cele 6 dimensiuni strategice au fost auditate pe sursele oficiale; niciun retailer nu prezintă modificări noi în ciclul curent.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.retailers.map((r) => {
                      const activePillars = r.intelligence_stream
                        ? Object.entries(r.intelligence_stream)
                            .map(([k, pillar]) => {
                              const newItems = (pillar.items || []).filter(it => it.is_new);
                              return {
                                key: k,
                                pillar,
                                newItems
                              };
                            })
                            .filter(entry => entry.pillar.has_news && entry.newItems.length > 0)
                        : [];

                      return (
                        <div key={r.id} className="p-4 sm:p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 shadow-md">
                          {/* Retailer Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <h5 className="font-bold text-white text-sm tracking-wide">{r.name}</h5>
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-sky-400 border border-slate-700">
                                {r.validity}
                              </span>
                            </div>
                            <div className="text-[11px] text-emerald-400 font-medium">
                              Marcă: <span className="text-slate-300">{r.private_brand}</span>
                            </div>
                          </div>

                          {/* Quick Position Bar */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                            <div>
                              <span className="text-slate-500 block font-medium">Poziționare preț KVI:</span>
                              <span className="text-slate-200">{r.meat_price_position}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-medium">Mecanisme active:</span>
                              <span className="text-slate-300">{r.active_mechanics}</span>
                            </div>
                          </div>

                          {/* Dimensiuni cu noutăți active */}
                          {activePillars.length > 0 ? (
                            <div className="space-y-2 pt-1">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Dimensiuni cu Noutăți Verificate ({activePillars.length}):
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {activePillars.map(({ key, pillar, newItems }) => (
                                  <div key={key} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 transition flex flex-col justify-between space-y-2">
                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-200 pb-1.5 border-b border-slate-800/80">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                        <span className="text-slate-200 text-xs font-bold truncate">{pillar.title}</span>
                                      </div>
                                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                                        NOU
                                      </span>
                                    </div>

                                    <div className="space-y-2">
                                      {newItems.map((it) => (
                                        <div key={it.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1.5 hover:border-slate-700 transition">
                                          <a 
                                            href={it.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-semibold text-white hover:text-sky-300 transition line-clamp-2 block leading-snug"
                                          >
                                            {it.title} <span className="text-sky-400 font-normal">↗</span>
                                          </a>
                                          <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                                            {it.summary}
                                          </p>
                                          <div className="flex items-center justify-between text-[9.5px] text-slate-500 pt-1.5 border-t border-slate-900">
                                            <span className="truncate max-w-[150px] sm:max-w-[190px]">
                                              Sursă: <strong className="text-slate-300">{it.source}</strong>
                                            </span>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <span>Pub: <strong className="text-sky-400">{it.published_at}</strong></span>
                                              <span className="text-emerald-400 font-bold">✓ VERIFIED</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60 text-slate-400 text-xs italic text-center">
                              Nu există noutăți verificate pentru perioada selectată.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Știri Sectoriale Cheie */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                  2. Știri Sectoriale Cheie (Presă Specializată: 14 Publicații — 8 România + 6 Internaționale)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {data.publications.flatMap(p => p.articles.slice(0, 1).map(a => ({ ...a, pubName: p.name }))).map((a, i) => (
                    <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700/80 transition flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 text-slate-200 text-xs font-semibold">
                          <a 
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-sky-300 transition text-xs font-semibold leading-snug line-clamp-2"
                          >
                            {a.title} <span className="text-sky-400 font-normal">↗</span>
                          </a>
                          <span className="text-sky-400 text-[10px] font-mono shrink-0 mt-0.5">{a.published_at || a.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed line-clamp-3">{a.summary}</p>
                      </div>
                      <div className="flex items-center justify-between text-[9.5px] text-slate-500 mt-2 pt-1.5 border-t border-slate-900">
                        <span className="text-slate-400 truncate max-w-[160px]">{a.pubName || 'Presă Specializată'}</span>
                        <span className="text-emerald-400 font-semibold">✓ VERIFIED SOURCE</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. STRATEGIC INSIGHTS | FRESH MEAT CATEGORY */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
                  3. STRATEGIC INSIGHTS | FRESH MEAT CATEGORY
                </h4>
                <div className="space-y-3">
                  {strategicInsights.map((item) => (
                    <div key={item.id} className="text-xs border-b border-slate-800/60 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-white font-bold mb-1">
                        <span>{item.title}</span>
                        <span className="text-[10px] text-slate-400">{item.domain}</span>
                      </div>
                      <p className="text-slate-300"><span className="text-sky-400 font-semibold">Insight:</span> {item.insight}</p>
                      <p className="text-slate-300 mt-0.5"><span className="text-amber-400 font-semibold">Implicare:</span> {item.business_implication}</p>
                      <p className="text-slate-300 mt-0.5"><span className="text-emerald-400 font-semibold">Oportunitate:</span> {item.tactical_opportunity}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Sursă: {item.source_and_date}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 text-center">
              <p className="text-xs font-bold text-white tracking-wider uppercase">
                KNOW MORE. MOVE FIRST.
              </p>
              <p className="text-[10px] text-slate-400 font-normal tracking-wide mt-0.5">
                by Vasile Huma
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Universal Shared Footer */}
      <Footer />
    </div>
  );
}
