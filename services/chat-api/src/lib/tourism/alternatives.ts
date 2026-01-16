import { StationUIProfile } from '@/lib/types/stationStandard';

// Define the types for the tourism knowledge base
export type TourismCategory = 
  | 'Traditional & Temples' 
  | 'Retro Shopping' 
  | 'Youth Culture & Fashion' 
  | 'Nature & Relaxation'
  | 'Food & Izakaya'
  | 'Modern Shopping & Retail'
  | 'Market & Fresh Food';

export interface AccessInfo {
  summary: {
    ja: string;
    en: string;
  };
  routes: {
    from: string; // e.g., "Shinjuku", "Tokyo Station"
    method: {
      ja: string;
      en: string;
    };
    durationApprox: string; // e.g., "25 min"
  }[];
}

export interface TourismLocation {
  id: string; // Can be a station ID or a custom ID if not in L1 yet
  name: {
    ja: string;
    en: string;
  };
  description: {
    ja: string;
    en: string;
  };
  features: string[]; // Keywords
  access: AccessInfo;
  images?: string[]; // Placeholders for future use
}

export interface TourismStrategy {
  id: string;
  category: TourismCategory;
  coreVibes: string[];
  hotspot: {
    id: string;
    name: { ja: string; en: string };
    congestionLevel: 'High' | 'Very High' | 'Extreme';
  };
  alternatives: {
    type: 'nearby' | 'remote'; // 'nearby' for micro-tourism/walkable, 'remote' for alternative destination
    location: TourismLocation;
    reason: {
      ja: string;
      en: string;
    };
    matchScore: number; // 0-100, how good of a substitute it is
  }[];
}

/**
 * Tourism Dispersion Strategy Knowledge Base
 * Defines hotspots and their off-the-beaten-path alternatives.
 */
export const TOURISM_ALTERNATIVES: TourismStrategy[] = [
  // 1. Asakusa Alternatives (Traditional/Temple vibe)
  {
    id: 'strategy_traditional_asakusa',
    category: 'Traditional & Temples',
    coreVibes: ['Temple', 'Old Tokyo', 'Street Food', 'History'],
    hotspot: {
      id: 'odpt.Station:TokyoMetro.Ginza.Asakusa',
      name: { ja: '浅草', en: 'Asakusa' },
      congestionLevel: 'Extreme'
    },
    alternatives: [
      // Nearby / Micro-tourism
      {
        type: 'nearby',
        location: {
          id: 'custom.spot.kappabashi',
          name: { ja: 'かっぱ橋道具街', en: 'Kappabashi Kitchen Town' },
          description: {
            ja: '浅草と上野の中間に位置する、料理道具専門の問屋街。精巧な食品サンプルはお土産としても大人気。',
            en: 'A wholesale district for kitchenware located between Asakusa and Ueno. The elaborate fake food samples are very popular as souvenirs.'
          },
          features: ['Kitchenware', 'Fake Food Samples', 'Shopping', 'Chef Supplies'],
          access: {
            summary: {
              ja: '浅草寺から徒歩10-15分。散歩がてら立ち寄れる距離。',
              en: '10-15 min walk from Sensoji Temple. Easy to visit while strolling.'
            },
            routes: [
              {
                from: 'Asakusa (Sensoji)',
                method: { ja: '徒歩', en: 'Walk' },
                durationApprox: '12 min'
              }
            ]
          }
        },
        reason: {
          ja: '人混みの激しい仲見世通りから少し離れ、職人の街の雰囲気を楽しめる。',
          en: 'Escape the extreme crowds of Nakamise-dori and enjoy the atmosphere of a craftsman\'s district.'
        },
        matchScore: 85
      },
      {
        type: 'nearby',
        location: {
          id: 'custom.spot.imado_shrine',
          name: { ja: '今戸神社', en: 'Imado Shrine' },
          description: {
            ja: '招き猫発祥の地の一つとされ、縁結びのパワースポットとして有名。境内には多くの招き猫が置かれている。',
            en: 'Considered one of the birthplaces of the Maneki-neko (beckoning cat) and famous as a "power spot" for matchmaking. Many cats adorn the grounds.'
          },
          features: ['Maneki-neko', 'Matchmaking', 'Power Spot', 'Cats'],
          access: {
            summary: {
              ja: '浅草駅から徒歩15分。隅田川沿いの散策におすすめ。',
              en: '15 min walk from Asakusa Station. Recommended for a riverside stroll.'
            },
            routes: [
              {
                from: 'Asakusa Station',
                method: { ja: '徒歩（リバーサイドスポーツセンター方面）', en: 'Walk (towards Riverside Sports Center)' },
                durationApprox: '15 min'
              }
            ]
          }
        },
        reason: {
          ja: '浅草寺の喧騒を離れ、静かに参拝できる。猫好きにはたまらないスポット。',
          en: 'A quiet place to worship away from the hustle and bustle of Sensoji. Irresistible for cat lovers.'
        },
        matchScore: 80
      },
      // Remote / Alternative Destination
      {
        type: 'remote',
        location: {
          id: 'odpt.Station:Keisei.Kanamachi.Shibamata',
          name: { ja: '柴又', en: 'Shibamata' },
          description: {
            ja: '映画「男はつらいよ」の舞台として知られる、昭和の面影を色濃く残す街。帝釈天への参道や矢切の渡しなど、浅草よりも素朴で落ち着いた下町情緒が味わえる。',
            en: 'Famous as the setting for "Tora-san" movies, Shibamata preserves the charm of the Showa era. With the approach to Taishakuten Temple and the traditional "Yagiri no Watashi" ferry, it offers a more rustic and relaxed Shitamachi vibe than Asakusa.'
          },
          features: ['Taishakuten Temple', 'Traditional Shopping Street', 'River Ferry', 'Showa Retro'],
          access: {
            summary: {
              ja: '京成金町線「柴又駅」下車すぐ。都心からは少し離れるが、その分観光客は少なめ。',
              en: 'Immediate access from Shibamata Station on the Keisei Kanamachi Line. Slightly far from center, but less crowded.'
            },
            routes: [
              {
                from: 'Ueno',
                method: { ja: '京成本線で高砂駅へ、金町線に乗り換え', en: 'Keisei Main Line to Takasago, transfer to Kanamachi Line' },
                durationApprox: '25 min'
              },
              {
                from: 'Asakusa',
                method: { ja: '京成線直通（押上経由）で高砂駅へ、金町線に乗り換え', en: 'Keisei Line (via Oshiage) to Takasago, transfer to Kanamachi Line' },
                durationApprox: '20 min'
              }
            ]
          }
        },
        reason: {
          ja: '浅草と同じく「参道商店街＋大寺院」の構成だが、観光地化されすぎておらず、本当の日本の下町を感じられる。',
          en: 'Similar "Shopping Street + Temple" structure to Asakusa, but less commercialized and offers a genuine old Tokyo atmosphere.'
        },
        matchScore: 95
      },
      {
        type: 'remote',
        location: {
          id: 'custom.spot.jindaiji', // Not in current station list yet
          name: { ja: '深大寺', en: 'Jindaiji' },
          description: {
            ja: '浅草寺に次ぐ都内第2の古刹。豊かな湧き水と緑に囲まれ、名物の「深大寺そば」を出す店が軒を連ねる。隣接する神代植物公園も見どころ。',
            en: 'Tokyo\'s second oldest temple after Sensoji. Surrounded by lush greenery and spring water, the area is famous for "Jindaiji Soba" noodles. The adjacent Jindai Botanical Gardens are also a highlight.'
          },
          features: ['Ancient Temple', 'Soba Noodles', 'Nature', 'Botanical Garden', 'GeGeGe no Kitaro'],
          access: {
            summary: {
              ja: '調布駅またはつつじヶ丘駅からバス。少しアクセスは複雑だが、その分静寂が保たれている。',
              en: 'Bus from Chofu or Tsutsujigaoka Station. Slightly complex access preserves its tranquility.'
            },
            routes: [
              {
                from: 'Shinjuku',
                method: { ja: '京王線で調布駅へ、北口からバスで15分', en: 'Keio Line to Chofu, then Bus (15 min)' },
                durationApprox: '35 min'
              },
              {
                from: 'Kichijoji',
                method: { ja: '吉祥寺駅南口からバスで30分', en: 'Bus from Kichijoji Station South Exit (30 min)' },
                durationApprox: '30 min'
              }
            ]
          }
        },
        reason: {
          ja: '浅草の歴史感と明治神宮の自然を併せ持つ。蕎麦屋での食事体験は浅草の天丼やうなぎに匹敵する満足度。',
          en: 'Combines the history of Asakusa with the nature of Meiji Jingu. The Soba dining experience rivals Asakusa\'s tempura or eel.'
        },
        matchScore: 85
      },
      {
        type: 'remote',
        location: {
          id: 'odpt.Station:TokyoMetro.Tozai.MonzenNakacho',
          name: { ja: '門前仲町', en: 'Monzen-nakacho' },
          description: {
            ja: '深川不動堂と富岡八幡宮があり、江戸っ子の信仰を集める街。参道の商店街は活気があり、和菓子や深川めしが楽しめる。',
            en: 'Home to Fukagawa Fudoson and Tomioka Hachimangu Shrine. The approach has a lively shopping street with traditional sweets and "Fukagawa-meshi" (clam rice).'
          },
          features: ['Fukagawa Fudoson', 'Tomioka Hachimangu', 'Clam Rice', 'Old Tokyo'],
          access: {
            summary: {
              ja: '東西線・大江戸線が乗り入れ、都心からのアクセスが非常に良い。',
              en: 'Served by Tozai and Oedo Lines, offering excellent access from central Tokyo.'
            },
            routes: [
              {
                from: 'Otemachi/Tokyo',
                method: { ja: '東西線で10分', en: 'Tozai Line (10 min)' },
                durationApprox: '10 min'
              },
              {
                from: 'Roppongi',
                method: { ja: '大江戸線で20分', en: 'Oedo Line (20 min)' },
                durationApprox: '20 min'
              }
            ]
          }
        },
        reason: {
          ja: '浅草よりもコンパクトだが、寺社と商店街の距離が近く、観光しやすい。',
          en: 'More compact than Asakusa, but the temple and shopping street are close together, making it easy to tour.'
        },
        matchScore: 80
      }
    ]
  },

  // 2. Harajuku/Shibuya Alternatives (Youth Culture & Fashion)
  {
    id: 'strategy_youth_shibuya',
    category: 'Youth Culture & Fashion',
    coreVibes: ['Fashion', 'Trends', 'Cafes', 'Youth'],
    hotspot: {
      id: 'odpt.Station:JR-East.Yamanote.Shibuya',
      name: { ja: '渋谷・原宿', en: 'Shibuya / Harajuku' },
      congestionLevel: 'Extreme'
    },
    alternatives: [
      // Nearby
      {
        type: 'nearby',
        location: {
          id: 'odpt.Station:Tokyu.Toyoko.Daikanyama',
          name: { ja: '代官山', en: 'Daikanyama' },
          description: {
            ja: '渋谷から徒歩圏内ながら、洗練された大人の雰囲気が漂う街。蔦屋書店や個性的なブティックが点在し、落ち着いて買い物を楽しめる。',
            en: 'Within walking distance from Shibuya, but with a sophisticated, mature atmosphere. Dottted with unique boutiques and the famous Tsutaya Books.'
          },
          features: ['Tsutaya Books', 'High-end Boutiques', 'Cafes', 'Architecture'],
          access: {
            summary: {
              ja: '渋谷駅から東急東横線で1駅、または徒歩15分。',
              en: '1 stop from Shibuya on Tokyu Toyoko Line, or a 15-min walk.'
            },
            routes: [
              {
                from: 'Shibuya',
                method: { ja: '徒歩', en: 'Walk' },
                durationApprox: '15 min'
              }
            ]
          }
        },
        reason: {
          ja: '渋谷の人混みに疲れたら、少し歩くだけで全く違う静かな時間を過ごせる。',
          en: 'If you get tired of the Shibuya crowds, a short walk brings you to a completely different, quiet atmosphere.'
        },
        matchScore: 88
      },
      // Remote
      {
        type: 'remote',
        location: {
          id: 'odpt.Station:Odakyu.Odawara.Shimokitazawa',
          name: { ja: '下北沢', en: 'Shimokitazawa' },
          description: {
            ja: '「古着」「演劇」「音楽」の街。再開発で生まれた「ミカン下北」などの新スポットと、昔ながらの路地裏文化が共存する。歩いて回れるサイズ感が魅力。',
            en: 'The town of vintage clothing, theater, and music. New spots like "Mikan Shimokita" coexist with traditional back-alley culture. Walkable and charming.'
          },
          features: ['Vintage Clothing', 'Live Music', 'Soup Curry', 'Indie Culture'],
          access: {
            summary: {
              ja: '渋谷・新宿から急行ですぐ。アクセス抜群。',
              en: 'Express train from Shibuya or Shinjuku. Excellent access.'
            },
            routes: [
              {
                from: 'Shibuya',
                method: { ja: '京王井の頭線（急行）で4分', en: 'Keio Inokashira Line Express (4 min)' },
                durationApprox: '4 min'
              },
              {
                from: 'Shinjuku',
                method: { ja: '小田急線（急行）で8分', en: 'Odakyu Line Express (8 min)' },
                durationApprox: '8 min'
              }
            ]
          }
        },
        reason: {
          ja: '原宿のようなファッション性がありつつ、より個性的で落ち着いている。チェーン店よりも個人店が多く、探索する楽しさがある。',
          en: 'Fashionable like Harajuku but more unique and relaxed. More independent shops than chains, making it fun to explore.'
        },
        matchScore: 90
      },
      {
        type: 'remote',
        location: {
          id: 'odpt.Station:JR-East.Chuo.Kichijoji',
          name: { ja: '吉祥寺', en: 'Kichijoji' },
          description: {
            ja: '「住みたい街」常連。井の頭公園の自然と、ハモニカ横丁のディープな飲み屋街、お洒落な雑貨店が融合。一日中遊べる。',
            en: 'Perennial favorite for "places to live". Combines Inokashira Park\'s nature, Harmonica Yokocho\'s deep drinking alleys, and stylish general stores. Good for a full day.'
          },
          features: ['Inokashira Park', 'Ghibli Museum', 'Harmonica Yokocho', 'Shopping'],
          access: {
            summary: {
              ja: '新宿・渋谷から一本。中央線と井の頭線が使える。',
              en: 'Direct from Shinjuku or Shibuya via Chuo Line or Inokashira Line.'
            },
            routes: [
              {
                from: 'Shinjuku',
                method: { ja: 'JR中央線（快速）で15分', en: 'JR Chuo Line Rapid (15 min)' },
                durationApprox: '15 min'
              },
              {
                from: 'Shibuya',
                method: { ja: '京王井の頭線（急行）で16分', en: 'Keio Inokashira Line Express (16 min)' },
                durationApprox: '16 min'
              }
            ]
          }
        },
        reason: {
          ja: '渋谷のような賑わいと、代々木公園のような自然がセットになっている。買い物も食事も公園散策も一箇所で完結する。',
          en: 'Offers the bustle of Shibuya and the nature of Yoyogi Park in one place. Shopping, dining, and park strolling all in one area.'
        },
        matchScore: 92
      },
      {
        type: 'remote',
        location: {
          id: 'odpt.Station:JR-East.Chuo.Koenji',
          name: { ja: '高円寺', en: 'Koenji' },
          description: {
            ja: '日本のパンクロックや古着文化の中心地の一つ。商店街が非常に発達しており、安くて美味しい飲食店が多い。阿波踊りでも有名。',
            en: 'A center for Japanese punk rock and vintage culture. Highly developed shopping streets with many cheap and delicious eateries. Famous for Awa Odori.'
          },
          features: ['Vintage', 'Punk Rock', 'Shotengai', 'Cheap Eats'],
          access: {
            summary: {
              ja: '新宿から中央線ですぐ。土日は快速が止まらないので注意（総武線利用）。',
              en: 'Close to Shinjuku via Chuo Line. Note that Rapids don\'t stop on weekends (use Sobu Line).'
            },
            routes: [
              {
                from: 'Shinjuku',
                method: { ja: 'JR中央線/総武線で6-10分', en: 'JR Chuo/Sobu Line (6-10 min)' },
                durationApprox: '8 min'
              }
            ]
          }
        },
        reason: {
          ja: '裏原宿（ウラハラ）の雰囲気が好きならハマる街。よりディープでローカルな体験ができる。',
          en: 'If you like the Urahara vibe, you\'ll love this. Offers a deeper, more local experience.'
        },
        matchScore: 85
      }
    ]
  },

  // 3. Tsukiji Market Alternatives (Market & Fresh Food)
  {
    id: 'strategy_food_tsukiji',
    category: 'Market & Fresh Food',
    coreVibes: ['Sushi', 'Seafood', 'Market Atmosphere', 'Breakfast'],
    hotspot: {
      id: 'custom.spot.tsukiji',
      name: { ja: '築地場外市場', en: 'Tsukiji Outer Market' },
      congestionLevel: 'Extreme'
    },
    alternatives: [
      {
        type: 'nearby',
        location: {
          id: 'custom.spot.tsukishima',
          name: { ja: '月島（もんじゃストリート）', en: 'Tsukishima (Monja Street)' },
          description: {
            ja: '築地から橋を渡ってすぐ。東京のソウルフード「もんじゃ焼き」の店が数十軒並ぶ。',
            en: 'Just across the bridge from Tsukiji. Dozens of restaurants serving Tokyo\'s soul food, "Monjayaki", line the street.'
          },
          features: ['Monjayaki', 'Local Food', 'River View'],
          access: {
            summary: {
              ja: '築地から徒歩20分、または大江戸線で1駅。',
              en: '20 min walk from Tsukiji, or 1 stop on Oedo Line.'
            },
            routes: [
              {
                from: 'Tsukiji Station',
                method: { ja: '徒歩', en: 'Walk' },
                durationApprox: '20 min'
              }
            ]
          }
        },
        reason: {
          ja: '海鮮丼の代わりに、東京ならではのローカルフード体験ができる。ランチタイムの混雑も築地よりは緩和されている。',
          en: 'Experience authentic local food instead of seafood bowls. Lunch crowds are generally lighter than Tsukiji.'
        },
        matchScore: 75
      },
      {
        type: 'remote',
        location: {
          id: 'custom.spot.adachi_market',
          name: { ja: '足立市場', en: 'Adachi Market' },
          description: {
            ja: '都内唯一の水産物専門の中央卸売市場。北千住エリアにあり、一般客も利用できる食堂（市場メシ）が充実している。知る人ぞ知る穴場。',
            en: 'Tokyo\'s only central wholesale market specializing in seafood. Located near Kita-Senju, it has excellent cafeterias open to the public. A true hidden gem.'
          },
          features: ['Authentic Market', 'Sushi', 'Seafood Rice Bowls', 'No Crowds'],
          access: {
            summary: {
              ja: '京成線「千住大橋駅」から徒歩すぐ。北千住駅からも歩ける。',
              en: 'Immediate access from Senju-Ohashi Station (Keisei Line). Also walkable from Kita-Senju.'
            },
            routes: [
              {
                from: 'Ueno',
                method: { ja: '京成本線で10分（千住大橋駅）', en: 'Keisei Main Line (10 min) to Senju-Ohashi' },
                durationApprox: '10 min'
              }
            ]
          }
        },
        reason: {
          ja: '「観光地化された市場」ではなく「本物の市場」で食事がしたいならここ。行列も築地に比べれば無に等しい。',
          en: 'If you want to eat at a "real market" rather than a "tourist market", this is the place. Queues are non-existent compared to Tsukiji.'
        },
        matchScore: 98
      },
      {
        type: 'remote',
        location: {
          id: 'custom.spot.toyosu_market',
          name: { ja: '豊洲市場（千客万来）', en: 'Toyosu Market (Senkyaku Banrai)' },
          description: {
            ja: '築地から移転した新しい市場。2024年オープンの「千客万来」施設では、江戸の街並みを再現したエリアで食事や温泉が楽しめる。',
            en: 'The new market relocated from Tsukiji. The "Senkyaku Banrai" facility (opened 2024) offers dining and hot springs in a recreated Edo-style streetscape.'
          },
          features: ['Modern Market', 'Hot Springs', 'Edo Architecture', 'Sushi'],
          access: {
            summary: {
              ja: 'ゆりかもめ「市場前駅」直結。',
              en: 'Directly connected to Shijo-mae Station (Yurikamome).'
            },
            routes: [
              {
                from: 'Shimbashi',
                method: { ja: 'ゆりかもめで27分', en: 'Yurikamome Line (27 min)' },
                durationApprox: '27 min'
              },
              {
                from: 'Toyosu',
                method: { ja: 'ゆりかもめで2分', en: 'Yurikamome Line (2 min)' },
                durationApprox: '2 min'
              }
            ]
          }
        },
        reason: {
          ja: '最新の設備で清潔かつ快適。温泉施設も併設されており、食後のリラックスも可能。',
          en: 'Clean and comfortable with modern facilities. Hot springs are available for post-meal relaxation.'
        },
        matchScore: 85
      }
    ]
  },

  // 4. Shinjuku/General Shopping Alternatives (Modern Shopping & Retail)
  {
    id: 'strategy_shopping_shinjuku',
    category: 'Modern Shopping & Retail',
    coreVibes: ['Department Stores', 'Shopping Malls', 'Urban', 'Variety'],
    hotspot: {
      id: 'odpt.Station:JR-East.Yamanote.Shinjuku',
      name: { ja: '新宿', en: 'Shinjuku' },
      congestionLevel: 'Extreme'
    },
    alternatives: [
      {
        type: 'remote',
        location: {
          id: 'odpt.Station:Tokyu.DenEnToshi.FutakoTamagawa',
          name: { ja: '二子玉川', en: 'Futako Tamagawa' },
          description: {
            ja: '多摩川沿いの開放的なショッピングエリア。「二子玉川ライズ」と「玉川髙島屋」があり、都心のような混雑を感じずに優雅に買い物ができる。',
            en: 'An open shopping area along the Tama River. With "Futako Tamagawa Rise" and "Tamagawa Takashimaya", you can shop elegantly without the congestion of the city center.'
          },
          features: ['River Park', 'Modern Malls', 'Family Friendly', 'Cinema'],
          access: {
            summary: {
              ja: '渋谷から東急田園都市線で急行10分。',
              en: '10 min express ride from Shibuya on Tokyu Den-en-toshi Line.'
            },
            routes: [
              {
                from: 'Shibuya',
                method: { ja: '東急田園都市線（急行）', en: 'Tokyu Den-en-toshi Line (Express)' },
                durationApprox: '10 min'
              }
            ]
          }
        },
        reason: {
          ja: '新宿の人混みが苦手な人への最適解。通路が広く、空が見える環境で、新宿と同じブランドが揃う。',
          en: 'The perfect solution for those who hate Shinjuku crowds. Wide aisles, open sky, and the same brands as Shinjuku.'
        },
        matchScore: 92
      },
      {
        type: 'remote',
        location: {
          id: 'odpt.Station:TokyoMetro.Ginza.Nihombashi',
          name: { ja: '日本橋', en: 'Nihonbashi' },
          description: {
            ja: '「COREDO室町」などの商業施設と、老舗百貨店（三越・高島屋）が融合。客層が落ち着いており、質の高い日本製品を探すのに最適。',
            en: 'A fusion of commercial facilities like "COREDO Muromachi" and historic department stores (Mitsukoshi, Takashimaya). Mature crowd, perfect for finding high-quality Japanese products.'
          },
          features: ['Traditional Crafts', 'Architecture', 'Upscale Dining', 'History'],
          access: {
            summary: {
              ja: '東京駅から徒歩圏内。銀座線・東西線も利用可能。',
              en: 'Walking distance from Tokyo Station. Ginza Line and Tozai Line available.'
            },
            routes: [
              {
                from: 'Tokyo Station',
                method: { ja: '徒歩', en: 'Walk' },
                durationApprox: '8 min'
              },
              {
                from: 'Ginza',
                method: { ja: '銀座線で3分', en: 'Ginza Line (3 min)' },
                durationApprox: '3 min'
              }
            ]
          }
        },
        reason: {
          ja: '若者向けの喧騒（新宿・渋谷）とは対極の、大人のためのショッピング街。日本の伝統とモダンが美しく調和している。',
          en: 'The opposite of the youth-oriented hustle (Shinjuku/Shibuya); a shopping district for adults. Beautiful harmony of Japanese tradition and modernity.'
        },
        matchScore: 88
      },
      {
        type: 'remote',
        location: {
          id: 'odpt.Station:Tokyu.Toyoko.Jiyugaoka',
          name: { ja: '自由が丘', en: 'Jiyugaoka' },
          description: {
            ja: 'お洒落な雑貨店やスイーツショップが立ち並ぶ街。大型ビルではなく、路面店を巡るスタイルで、散歩しながら買い物を楽しめる。',
            en: 'A town lined with stylish general stores and sweet shops. Instead of large buildings, enjoy shopping while strolling through street-level shops.'
          },
          features: ['Sweets', 'Interior Goods', 'European Vibe', 'Relaxed'],
          access: {
            summary: {
              ja: '渋谷から東急東横線で急行8分。',
              en: '8 min express ride from Shibuya on Tokyu Toyoko Line.'
            },
            routes: [
              {
                from: 'Shibuya',
                method: { ja: '東急東横線（急行）', en: 'Tokyu Toyoko Line (Express)' },
                durationApprox: '8 min'
              }
            ]
          }
        },
        reason: {
          ja: '巨大な駅ビルに閉じ込められるのではなく、街全体を歩きながらライフスタイル雑貨を探したい人向け。',
          en: 'For those who want to find lifestyle goods while walking through the town, rather than being trapped in a huge station building.'
        },
        matchScore: 85
      }
    ]
  }
];

// Helper to find strategies
export function findAlternativesFor(hotspotNameOrId: string): TourismStrategy | undefined {
  return TOURISM_ALTERNATIVES.find(s => 
    s.hotspot.id === hotspotNameOrId || 
    s.hotspot.name.en.toLowerCase().includes(hotspotNameOrId.toLowerCase()) ||
    s.hotspot.name.ja.includes(hotspotNameOrId)
  );
}

export function getAllAlternativeLocations(): TourismLocation[] {
  return TOURISM_ALTERNATIVES.flatMap(s => s.alternatives.map(a => a.location));
}
