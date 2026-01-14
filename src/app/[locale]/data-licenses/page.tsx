import Link from 'next/link';

type SupportedLocale = 'zh-TW' | 'en' | 'ja';

function pickLocale(locale: string): SupportedLocale {
  if (locale === 'ja') return 'ja';
  if (locale === 'en') return 'en';
  return 'zh-TW';
}

const CONTENT: Record<SupportedLocale, {
  title: string;
  updatedAt: string;
  intro: string[];
  sections: Array<{ heading: string; items: Array<string | { label: string; href: string }> }>;
}> = {
  'zh-TW': {
    title: '資料來源與授權',
    updatedAt: '2026-01-14',
    intro: [
      '本頁整理 LUTAGU 使用的主要資料來源與授權注意事項。',
      '不同資料集可能適用 CC0 / CC BY 4.0 / ODC BY 1.0 / ODbL 1.0 等不同授權，請以各資料提供者公告為準。'
    ],
    sections: [
      {
        heading: 'ODPT（公共交通オープンデータセンター）',
        items: [
          '本服務透過 ODPT API 取得公共交通資料（例如車站、路線、時刻、運行資訊等）。',
          { label: 'ODPT Terms', href: 'https://developer.odpt.org/terms' },
          'ODPT 條款要求資料使用者遵守各資料提供者在 ODPT Catalog 公布的授權條款；授權可能為 CC0、CC BY 4.0、ODC BY 1.0、ODbL 1.0 等。'
        ]
      },
      {
        heading: '共享單車（GBFS / ODPT）',
        items: [
          '本服務可能使用 ODPT 提供之 GBFS 共享單車資訊（例如站點位置、可借/可還狀態等）。',
          'ドコモ・バイクシェア（東京エリア）：CC BY 4.0。歸屬表示：株式会社ドコモ・バイクシェア / 公共交通オープンデータ協議会。',
          { label: 'ODPT Dataset: ドコモ・バイクシェア（東京エリア）', href: 'https://ckan.odpt.org/dataset/c_bikeshare_gbfs-d-bikeshare' },
          'OpenStreet（HELLO CYCLING）：CC BY 4.0 / ODC BY 1.0 / ODbL 1.0（依資料集公告）。歸屬表示：OpenStreet株式会社 / 公共交通オープンデータ協議会。',
          { label: 'ODPT Dataset: OpenStreet（ハローサイクリング）', href: 'https://ckan.odpt.org/dataset/c_bikeshare_gbfs-openstreet' }
        ]
      },
      {
        heading: 'OpenStreetMap（OSM）',
        items: [
          '本服務的地圖顯示與部分 POI/設施資料可能使用 OSM 與其衍生資料。',
          { label: 'OSM Copyright', href: 'https://www.openstreetmap.org/copyright' },
          '如對 OSM 資料做出改作並公開再散佈，通常需遵守 ODbL 1.0 的歸屬與分享相同方式（share-alike）要求。'
        ]
      },
      {
        heading: '天氣資料（Open-Meteo / 氣象警報）',
        items: [
          '本服務的即時天氣資訊由 Open-Meteo 提供，依其公告屬 CC BY 4.0，須在顯示天氣資料處提供可點擊歸屬連結。',
          { label: 'Open-Meteo Licence', href: 'https://open-meteo.com/en/licence' },
          { label: 'Weather data by Open-Meteo.com', href: 'https://open-meteo.com/' },
          '部分氣象警報/注意報資訊來源為日本氣象廳（JMA）發布資訊；詳細以官方公告為準。',
          { label: 'Japan Meteorological Agency (JMA)', href: 'https://www.jma.go.jp/jma/index.html' }
        ]
      },
      {
        heading: '百科摘要（Wikipedia）',
        items: [
          '部分站點介紹/摘要文字可能取自或改作自 Wikipedia 內容；Wikipedia 文字內容一般以 CC BY-SA 4.0（另含 GFDL 兼容條款）提供。',
          { label: 'Wikipedia Copyrights', href: 'https://en.wikipedia.org/wiki/Wikipedia:Copyrights' },
          { label: 'CC BY-SA 4.0', href: 'https://creativecommons.org/licenses/by-sa/4.0/' }
        ]
      },
      {
        heading: '外部服務連結（LUUP / GO / ecbo cloak 等）',
        items: [
          '本服務可能提供第三方服務的外部連結；點擊後之服務/內容由第三方提供並適用其條款與隱私政策。',
          { label: 'LUUP', href: 'https://luup.sc/' },
          { label: 'GO', href: 'https://go.mo-t.com/' },
          { label: 'ecbo cloak', href: 'https://cloak.ecbo.io/' }
        ]
      },
      {
        heading: '授權快速指引（摘要）',
        items: [
          'CC0：通常不要求署名；仍建議保留來源說明以利溯源。',
          'CC BY 4.0：須保留署名、授權連結、變更說明。',
          'ODC BY 1.0：類似署名要求，需保留來源與授權資訊。',
          'ODbL 1.0：通常包含署名與 share-alike（公開衍生資料庫時需採相同授權）等義務。'
        ]
      }
    ]
  },
  en: {
    title: 'Data Sources & Licenses',
    updatedAt: '2026-01-14',
    intro: [
      'This page lists key data sources used by LUTAGU and license considerations.',
      'Different datasets may be licensed under CC0 / CC BY 4.0 / ODC BY 1.0 / ODbL 1.0. Always follow the dataset-specific license published by the provider.'
    ],
    sections: [
      {
        heading: 'ODPT (Public Transportation Open Data Center)',
        items: [
          'We obtain public transportation data via ODPT APIs (e.g., stations, lines, timetables, service status).',
          { label: 'ODPT Terms', href: 'https://developer.odpt.org/terms' },
          'ODPT requires data users to comply with each data provider’s license published in the ODPT catalog; licenses may include CC0, CC BY 4.0, ODC BY 1.0, and ODbL 1.0.'
        ]
      },
      {
        heading: 'Bike Share (GBFS via ODPT)',
        items: [
          'We may use GBFS-formatted bike-share information provided via ODPT (e.g., station locations and availability).',
          'DOCOMO Bike Share (Tokyo area): licensed under CC BY 4.0. Crediting: DOCOMO BIKESHARE, INC. / Association for Open Data of Public Transportation.',
          { label: 'ODPT Dataset: DOCOMO Bike Share (Tokyo area)', href: 'https://ckan.odpt.org/dataset/c_bikeshare_gbfs-d-bikeshare' },
          'OpenStreet (HELLO CYCLING): licensed under CC BY 4.0 / ODC BY 1.0 / ODbL 1.0 (per dataset notice). Crediting: OpenStreet Corp. / Association for Open Data of Public Transportation.',
          { label: 'ODPT Dataset: OpenStreet (HELLO CYCLING)', href: 'https://ckan.odpt.org/dataset/c_bikeshare_gbfs-openstreet' }
        ]
      },
      {
        heading: 'OpenStreetMap (OSM)',
        items: [
          'Maps and certain POI/facility data may be derived from OpenStreetMap.',
          { label: 'OSM Copyright', href: 'https://www.openstreetmap.org/copyright' },
          'If you publish a derived database, ODbL 1.0 attribution and share-alike obligations may apply.'
        ]
      },
      {
        heading: 'Weather (Open-Meteo / Alerts)',
        items: [
          'Live weather data is provided by Open-Meteo and is published under CC BY 4.0; attribution links should appear next to where weather data is displayed.',
          { label: 'Open-Meteo Licence', href: 'https://open-meteo.com/en/licence' },
          { label: 'Weather data by Open-Meteo.com', href: 'https://open-meteo.com/' },
          'Some weather alerts are based on information published by the Japan Meteorological Agency (JMA).',
          { label: 'Japan Meteorological Agency (JMA)', href: 'https://www.jma.go.jp/jma/index.html' }
        ]
      },
      {
        heading: 'Encyclopedia Summaries (Wikipedia)',
        items: [
          'Some station descriptions/summaries may be derived from Wikipedia content, which is generally available under CC BY-SA 4.0 (also compatible with GFDL in some cases).',
          { label: 'Wikipedia Copyrights', href: 'https://en.wikipedia.org/wiki/Wikipedia:Copyrights' },
          { label: 'CC BY-SA 4.0', href: 'https://creativecommons.org/licenses/by-sa/4.0/' }
        ]
      },
      {
        heading: 'External Service Links (LUUP / GO / ecbo cloak)',
        items: [
          'We may show outbound links to third-party services. Third-party services and content are provided by their respective operators under their own terms and privacy policies.',
          { label: 'LUUP', href: 'https://luup.sc/' },
          { label: 'GO', href: 'https://go.mo-t.com/' },
          { label: 'ecbo cloak', href: 'https://cloak.ecbo.io/' }
        ]
      },
      {
        heading: 'Quick License Notes (Summary)',
        items: [
          'CC0: typically no attribution required (attribution is still recommended for traceability).',
          'CC BY 4.0: attribution + license link + indicate changes.',
          'ODC BY 1.0: attribution and license notice.',
          'ODbL 1.0: attribution and share-alike may apply when distributing a derived database.'
        ]
      }
    ]
  },
  ja: {
    title: 'データ出典・ライセンス',
    updatedAt: '2026-01-14',
    intro: [
      '本ページでは LUTAGU が利用する主なデータ出典とライセンス上の留意点をまとめます。',
      'データセットごとに CC0 / CC BY 4.0 / ODC BY 1.0 / ODbL 1.0 等が適用され得るため、提供者が公開するライセンス表示に従ってください。'
    ],
    sections: [
      {
        heading: 'ODPT（公共交通オープンデータセンター）',
        items: [
          '本サービスは ODPT API を通じて公共交通データ（駅、路線、時刻表、運行情報等）を取得します。',
          { label: 'ODPT Terms', href: 'https://developer.odpt.org/terms' },
          'ODPT の規約により、ODPT カタログに掲載される各提供者のライセンス（CC0、CC BY 4.0、ODC BY 1.0、ODbL 1.0 等）に従って利用します。'
        ]
      },
      {
        heading: 'シェアサイクル（GBFS / ODPT）',
        items: [
          '本サービスは、ODPT 経由で提供される GBFS 形式のシェアサイクル情報（例：ポート位置、稼働状況等）を利用する場合があります。',
          'ドコモ・バイクシェア（東京エリア）：CC BY 4.0。クレジット表示：株式会社ドコモ・バイクシェア / 公共交通オープンデータ協議会。',
          { label: 'ODPT Dataset: ドコモ・バイクシェア（東京エリア）', href: 'https://ckan.odpt.org/dataset/c_bikeshare_gbfs-d-bikeshare' },
          'OpenStreet（ハローサイクリング）：CC BY 4.0 / ODC BY 1.0 / ODbL 1.0（データセット表示に従う）。クレジット表示：OpenStreet株式会社 / 公共交通オープンデータ協議会。',
          { label: 'ODPT Dataset: OpenStreet（ハローサイクリング）', href: 'https://ckan.odpt.org/dataset/c_bikeshare_gbfs-openstreet' }
        ]
      },
      {
        heading: 'OpenStreetMap（OSM）',
        items: [
          '地図表示および一部の POI/施設情報は OpenStreetMap を利用する場合があります。',
          { label: 'OSM Copyright', href: 'https://www.openstreetmap.org/copyright' },
          '派生データベースを公開・配布する場合、ODbL 1.0 の帰属表示および share-alike が求められる可能性があります。'
        ]
      },
      {
        heading: '天気（Open-Meteo / 警報）',
        items: [
          '現在の天気情報は Open-Meteo により提供され、CC BY 4.0 として公開されています。天気データの表示箇所の近くにリンク付きの帰属表示が必要です。',
          { label: 'Open-Meteo Licence', href: 'https://open-meteo.com/en/licence' },
          { label: 'Weather data by Open-Meteo.com', href: 'https://open-meteo.com/' },
          '一部の気象警報・注意報は気象庁（JMA）が公開する情報に基づきます。',
          { label: '気象庁 (JMA)', href: 'https://www.jma.go.jp/jma/index.html' }
        ]
      },
      {
        heading: '百科要約（Wikipedia）',
        items: [
          '一部の駅紹介・要約文は Wikipedia コンテンツを参照・改変している場合があります。Wikipedia のテキストは一般に CC BY-SA 4.0（場合により GFDL 互換）で提供されます。',
          { label: 'Wikipedia:Copyrights', href: 'https://en.wikipedia.org/wiki/Wikipedia:Copyrights' },
          { label: 'CC BY-SA 4.0', href: 'https://creativecommons.org/licenses/by-sa/4.0/' }
        ]
      },
      {
        heading: '外部サービスリンク（LUUP / GO / ecbo cloak 等）',
        items: [
          '本サービスは第三者サービスへの外部リンクを表示する場合があります。第三者のサービスおよびコンテンツは各提供者の規約・プライバシーポリシーが適用されます。',
          { label: 'LUUP', href: 'https://luup.sc/' },
          { label: 'GO', href: 'https://go.mo-t.com/' },
          { label: 'ecbo cloak', href: 'https://cloak.ecbo.io/' }
        ]
      },
      {
        heading: 'ライセンス簡易メモ（概要）',
        items: [
          'CC0：通常は帰属不要（出典表記は推奨）。',
          'CC BY 4.0：帰属表示、ライセンスリンク、変更点の明示が必要。',
          'ODC BY 1.0：帰属表示とライセンス表示が必要。',
          'ODbL 1.0：帰属表示に加え、派生 DB 公開時に share-alike が必要となる場合があります。'
        ]
      }
    ]
  }
};

export default function DataLicensesPage({ params }: { params: { locale: string } }) {
  const activeLocale = pickLocale(params.locale);
  const c = CONTENT[activeLocale];
  const homeLabel = activeLocale === 'ja' ? 'ホーム' : activeLocale === 'en' ? 'Home' : '首頁';

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-slate-900">{c.title}</h1>
          <Link href={`/${params.locale}/`} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
            {homeLabel}
          </Link>
        </div>
        <div className="mt-2 text-xs font-bold text-slate-400">Last updated: {c.updatedAt}</div>

        <div className="mt-6 space-y-2 text-sm font-medium text-slate-700 leading-relaxed">
          {c.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <div className="mt-8 space-y-8">
          {c.sections.map((s) => (
            <section key={s.heading} className="space-y-3">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{s.heading}</h2>
              <ul className="space-y-2 text-sm font-medium text-slate-700 leading-relaxed">
                {s.items.map((it, idx) => {
                  if (typeof it === 'string') return <li key={`${s.heading}-${idx}`}>- {it}</li>;
                  return (
                    <li key={`${s.heading}-${idx}`}>
                      -{' '}
                      <a
                        href={it.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                      >
                        {it.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm font-bold">
          <Link href={`/${params.locale}/terms`} className="text-slate-600 hover:text-slate-900">
            Terms
          </Link>
          <Link href={`/${params.locale}/privacy`} className="text-slate-600 hover:text-slate-900">
            Privacy
          </Link>
        </div>
      </div>
    </main>
  );
}
