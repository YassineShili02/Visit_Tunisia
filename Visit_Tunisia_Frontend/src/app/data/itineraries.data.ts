import { DayData, Stop } from './models';

export const DAYS_DATA: DayData[] = [
  { id:1, label:'Jour 1', date:'Lun. 20 Juil.', city:'Tunis', stops:[
    { time:'9h00',  name:'Médina de Tunis',        cat:'Culturel',      dur:'2h',     transit:'20 min en taxi',    img:'https://images.unsplash.com/photo-1565711561500-49678a10a63f?w=120&h=80&fit=crop&auto=format', x:263,y:47, latitude: 36.7988, longitude: 10.1714 },
    { time:'11h30', name:'Musée du Bardo',          cat:'Culturel',      dur:'1h30',   transit:'25 min en voiture', img:'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=120&h=80&fit=crop&auto=format', x:255,y:50, latitude: 36.8093, longitude: 10.1344 },
    { time:'14h30', name:'Médina de Sidi Bou Saïd', cat:'Culturel',      dur:'2h',     transit:'10 min en voiture', img:'https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=120&h=80&fit=crop&auto=format', x:278,y:42, latitude: 36.8702, longitude: 10.3472 },
    { time:'19h30', name:'Dîner à La Marsa',        cat:'Gastronomique', dur:'1h30',   img:'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&h=80&fit=crop&auto=format', x:280,y:38, latitude: 36.8782, longitude: 10.3247 },
  ]},
  { id:2, label:'Jour 2', date:'Mar. 21 Juil.', city:'Carthage & Bizerte', stops:[
    { time:'9h00',  name:'Ruines de Carthage',  cat:'Culturel',  dur:'1h30', transit:'5 min à pied',      img:'https://images.unsplash.com/photo-1744512300329-e7dcca5aca9b?w=120&h=80&fit=crop&auto=format', x:272,y:44, latitude: 36.8528, longitude: 10.3233 },
    { time:'11h00', name:'Musée de Carthage',   cat:'Culturel',  dur:'1h',   transit:'45 min en voiture', img:'https://images.unsplash.com/photo-1775129068313-8be80f13f12f?w=120&h=80&fit=crop&auto=format', x:274,y:46, latitude: 36.8535, longitude: 10.3250 },
    { time:'13h30', name:'Médina de Bizerte',   cat:'Culturel',  dur:'2h',   transit:'10 min en voiture', img:'https://images.unsplash.com/photo-1565711561500-49678a10a63f?w=120&h=80&fit=crop&auto=format', x:231,y:15, latitude: 37.2746, longitude: 9.8739 },
    { time:'17h00', name:'Plage de Bizerte',    cat:'Balnéaire', dur:'2h',   img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&h=80&fit=crop&auto=format', x:228,y:18, latitude: 37.2800, longitude: 9.8700 },
  ]},
  { id:3, label:'Jour 3', date:'Mer. 22 Juil.', city:'Kairouan & El Jem', stops:[
    { time:'8h30',  name:'Grande Mosquée de Kairouan', cat:'Religieux',  dur:'1h30', transit:'5 min à pied',      img:'https://images.unsplash.com/photo-1565711561500-49678a10a63f?w=120&h=80&fit=crop&auto=format', x:254,y:121, latitude: 35.6814, longitude: 10.1025 },
    { time:'10h30', name:'Médina de Kairouan',         cat:'Culturel',   dur:'1h30', transit:'1h en voiture',     img:'https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=120&h=80&fit=crop&auto=format', x:252,y:124, latitude: 35.6780, longitude: 10.0990 },
    { time:'14h00', name:"Amphithéâtre d'El Jem",      cat:'Culturel',   dur:'2h',   transit:'30 min en voiture', img:'https://images.unsplash.com/photo-1744512300329-e7dcca5aca9b?w=120&h=80&fit=crop&auto=format', x:312,y:147, latitude: 35.2965, longitude: 10.7058 },
    { time:'18h00', name:'Plage de Mahdia',             cat:'Balnéaire',  dur:'2h',   img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&h=80&fit=crop&auto=format', x:330,y:152, latitude: 35.5047, longitude: 11.0622 },
  ]},
  { id:4, label:'Jour 4', date:'Jeu. 23 Juil.', city:'Djerba', stops:[
    { time:'9h00',  name:'Houmt Souk',              cat:'Culturel',      dur:'2h',   transit:'15 min en taxi',    img:'https://images.unsplash.com/photo-1565711561500-49678a10a63f?w=120&h=80&fit=crop&auto=format', x:315,y:255, latitude: 33.8756, longitude: 10.8575 },
    { time:'11h30', name:'Synagogue de la Ghriba',  cat:'Religieux',     dur:'1h',   transit:'20 min en voiture', img:'https://images.unsplash.com/photo-1775129068313-8be80f13f12f?w=120&h=80&fit=crop&auto=format', x:318,y:259, latitude: 33.8139, longitude: 10.8592 },
    { time:'14h00', name:'Plage Sidi Mahrez',       cat:'Balnéaire',     dur:'3h',   transit:'25 min en voiture', img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&h=80&fit=crop&auto=format', x:322,y:258, latitude: 33.8710, longitude: 10.9820 },
    { time:'19h00', name:'Dîner à Midoun',          cat:'Gastronomique', dur:'2h',   img:'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&h=80&fit=crop&auto=format', x:320,y:262, latitude: 33.8080, longitude: 10.9930 },
  ]},
  { id:5, label:'Jour 5', date:'Ven. 24 Juil.', city:'Tozeur & Douz', stops:[
    { time:'7h00',  name:'Route vers Tozeur',         cat:'Aventure',   dur:'3h route', transit:'15 min en voiture', img:'https://images.unsplash.com/photo-1767936924967-e13feccc8d29?w=120&h=80&fit=crop&auto=format', x:100,y:240, latitude: 33.9197, longitude: 8.1336 },
    { time:'11h00', name:'Oasis & Médina de Tozeur',  cat:'Culturel',   dur:'2h',       transit:'30 min en voiture', img:'https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=120&h=80&fit=crop&auto=format', x:104,y:244, latitude: 33.9186, longitude: 8.1360 },
    { time:'14h30', name:'Chott el-Jérid',            cat:'Écologique', dur:'1h30',     transit:'1h en voiture',     img:'https://images.unsplash.com/photo-1767936924967-e13feccc8d29?w=120&h=80&fit=crop&auto=format', x:130,y:258, latitude: 33.7200, longitude: 8.4300 },
    { time:'17h00', name:'Coucher de soleil à Douz',  cat:'Aventure',   dur:'2h',       img:'https://images.unsplash.com/photo-1767936924967-e13feccc8d29?w=120&h=80&fit=crop&auto=format', x:148,y:270, latitude: 33.4593, longitude: 9.0253 },
  ]},
];

export const SAMPLE_ITINERARIES = [
  { id:1, title:'Circuit du Nord', days:5, people:3, stops:['Tunis','Carthage','Bizerte','Sidi Bou Saïd'], date:'2026-01-12', color:'#1B6FA8' },
  { id:2, title:'Découverte du Sud', days:4, people:2, stops:['Tozeur','Douz','Matmata','Gabès'], date:'2026-02-28', color:'#D97D45' },
];
