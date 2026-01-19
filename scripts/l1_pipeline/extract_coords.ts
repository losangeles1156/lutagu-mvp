
import fs from 'fs';

const stations = JSON.parse(fs.readFileSync('scripts/data/stations_by_ward.json', 'utf8'));
const targets = [
    'Osaki', 'Takadanobaba', 'Nishi-Funabashi', 'Minami-Senju',
    'Tamachi', 'Gotanda', 'Uguisudani', 'Sugamo', 'Akabane',
    'Yotsuya', 'Ogikubo', 'Asakusabashi', 'Suidobashi',
    'Shin-Kiba', 'Kameido', 'Ichigaya'
];

targets.forEach(t => {
    const s = stations.find((x: any) => x.name_en === t);
    if (s) {
        console.log(`{ id: 'odpt.Station:JR-East.Yamanote.${t}', name: { ja: '${s.name}', en: '${t}' }, ward: '${s.ward}', location: { lat: ${s.lat}, lng: ${s.lon} }, wikiTitle: '${s.name}駅' },`);
    } else {
        console.log(`// Missing: ${t}`);
    }
});
